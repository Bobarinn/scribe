//! Lightweight detection of started calls/meetings.
//!
//! A background task polls the process list and emits a `call-detected` event
//! when a known call app *starts* (a rising edge), so the UI can offer to start
//! recording (or auto-start, depending on the user's settings).
//!
//! Detection is intentionally conservative: we key off apps/helper processes
//! that are typically launched per call (e.g. Zoom's in-meeting `CptHost`
//! process, Webex, FaceTime) rather than always-on chat apps, which keeps false
//! positives low. The frontend decides what to do with the event (notify vs.
//! auto-start) and can disable it entirely.

use std::collections::HashSet;
use std::time::Duration;

use serde::Serialize;
use sysinfo::{ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Runtime};
use tracing::info;

/// `(process-name substring in lowercase, friendly label)`.
///
/// Zoom's `CptHost`/`aomhost` processes only exist while in a meeting, making
/// them a strong "call started" signal. `zoom.us` covers launching the app.
const KNOWN_CALL_APPS: &[(&str, &str)] = &[
    ("cpthost", "Zoom"),
    ("aomhost", "Zoom"),
    ("zoom.us", "Zoom"),
    ("webex", "Webex"),
    ("facetime", "FaceTime"),
];

/// Payload emitted to the frontend on the `call-detected` event.
#[derive(Debug, Clone, Serialize)]
pub struct CallDetectedPayload {
    /// Friendly app name(s) that were just detected (e.g. "Zoom").
    pub app: String,
    /// How it was detected: "app" (a known call app launched) or "mic" (the
    /// microphone started being used by another app). The frontend only allows
    /// auto-start for the more specific "app" source.
    pub source: String,
}

/// macOS: detect whether the default input device is currently being used by any
/// process, via CoreAudio's `kAudioDevicePropertyDeviceIsRunningSomewhere`. This
/// is a generic "a call/mic app is active" signal that also covers Teams, Slack,
/// and browser-based Google Meet. CoreAudio is already linked via `cpal`.
#[cfg(target_os = "macos")]
mod macos_mic {
    use std::ffi::c_void;
    use std::mem::size_of;

    #[repr(C)]
    struct AudioObjectPropertyAddress {
        selector: u32,
        scope: u32,
        element: u32,
    }

    #[link(name = "CoreAudio", kind = "framework")]
    extern "C" {
        fn AudioObjectGetPropertyData(
            in_object_id: u32,
            in_address: *const AudioObjectPropertyAddress,
            in_qualifier_data_size: u32,
            in_qualifier_data: *const c_void,
            io_data_size: *mut u32,
            out_data: *mut c_void,
        ) -> i32;
    }

    const fn fourcc(s: &[u8; 4]) -> u32 {
        ((s[0] as u32) << 24) | ((s[1] as u32) << 16) | ((s[2] as u32) << 8) | (s[3] as u32)
    }

    const SYSTEM_OBJECT: u32 = 1; // kAudioObjectSystemObject
    const SCOPE_GLOBAL: u32 = fourcc(b"glob"); // kAudioObjectPropertyScopeGlobal
    const ELEMENT_MAIN: u32 = 0; // kAudioObjectPropertyElementMain
    const DEFAULT_INPUT_DEVICE: u32 = fourcc(b"dIn "); // kAudioHardwarePropertyDefaultInputDevice
    const IS_RUNNING_SOMEWHERE: u32 = fourcc(b"gone"); // kAudioDevicePropertyDeviceIsRunningSomewhere

    fn default_input_device() -> Option<u32> {
        let addr = AudioObjectPropertyAddress {
            selector: DEFAULT_INPUT_DEVICE,
            scope: SCOPE_GLOBAL,
            element: ELEMENT_MAIN,
        };
        let mut device_id: u32 = 0;
        let mut size = size_of::<u32>() as u32;
        let status = unsafe {
            AudioObjectGetPropertyData(
                SYSTEM_OBJECT,
                &addr,
                0,
                std::ptr::null(),
                &mut size,
                &mut device_id as *mut u32 as *mut c_void,
            )
        };
        if status == 0 && device_id != 0 {
            Some(device_id)
        } else {
            None
        }
    }

    /// Returns true if the default input device is in use by any process.
    pub fn is_microphone_in_use() -> bool {
        let Some(device) = default_input_device() else {
            return false;
        };
        let addr = AudioObjectPropertyAddress {
            selector: IS_RUNNING_SOMEWHERE,
            scope: SCOPE_GLOBAL,
            element: ELEMENT_MAIN,
        };
        let mut running: u32 = 0;
        let mut size = size_of::<u32>() as u32;
        let status = unsafe {
            AudioObjectGetPropertyData(
                device,
                &addr,
                0,
                std::ptr::null(),
                &mut size,
                &mut running as *mut u32 as *mut c_void,
            )
        };
        status == 0 && running != 0
    }
}

#[cfg(target_os = "macos")]
fn microphone_in_use() -> bool {
    macos_mic::is_microphone_in_use()
}

#[cfg(not(target_os = "macos"))]
fn microphone_in_use() -> bool {
    false
}

/// Friendly names of known call apps currently running.
fn detect_running_call_apps(sys: &System) -> HashSet<String> {
    let mut found = HashSet::new();
    for process in sys.processes().values() {
        let name = process.name().to_string_lossy().to_lowercase();
        for (needle, label) in KNOWN_CALL_APPS {
            if name.contains(needle) {
                found.insert((*label).to_string());
            }
        }
    }
    found
}

/// Spawn the background detection loop. Safe to call once at app setup.
pub fn spawn_call_detection<R: Runtime>(app: AppHandle<R>) {
    tauri::async_runtime::spawn(async move {
        let mut sys = System::new();

        // Prime once so apps already running at launch don't immediately fire.
        sys.refresh_processes(ProcessesToUpdate::All, true);
        let mut previously_running = detect_running_call_apps(&sys);
        let mut mic_in_use = microphone_in_use();
        info!(
            "Call detection started (initially running: {:?}, mic in use: {})",
            previously_running, mic_in_use
        );

        loop {
            tokio::time::sleep(Duration::from_secs(6)).await;

            sys.refresh_processes(ProcessesToUpdate::All, true);
            let running = detect_running_call_apps(&sys);

            // Rising edge: apps that were not running before but are now.
            let newly: Vec<String> = running
                .difference(&previously_running)
                .cloned()
                .collect();
            previously_running = running;

            // Rising edge for microphone usage (covers Teams/Slack/browser Meet).
            let mic_now = microphone_in_use();
            let mic_rising = mic_now && !mic_in_use;
            mic_in_use = mic_now;

            // Don't prompt while our own recording is in progress (this also
            // avoids reacting to the mic usage caused by our own capture).
            if crate::audio::recording_commands::is_recording().await {
                continue;
            }

            if !newly.is_empty() {
                // A known call app launched — specific signal, allows auto-start.
                let app_name = newly.join(", ");
                info!("Detected call app started: {}", app_name);
                let _ = app.emit(
                    "call-detected",
                    CallDetectedPayload {
                        app: app_name,
                        source: "app".to_string(),
                    },
                );
            } else if mic_rising {
                // Generic mic signal — prompt only, never auto-start.
                info!("Detected microphone became active (possible call)");
                let _ = app.emit(
                    "call-detected",
                    CallDetectedPayload {
                        app: "Microphone".to_string(),
                        source: "mic".to_string(),
                    },
                );
            }
        }
    });
}
