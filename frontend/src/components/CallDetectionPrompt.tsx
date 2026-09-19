'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useRecordingState } from '@/contexts/RecordingStateContext';
import { useSidebar } from '@/components/Sidebar/SidebarProvider';

interface CallDetectedPayload {
  app: string;
  /** "app" = a known call app launched; "mic" = the mic became active. */
  source?: 'app' | 'mic';
}

interface DetectionSettings {
  enabled: boolean;
  autoStart: boolean;
}

/**
 * Global, bottom-right prompt shown when the backend detects a call starting.
 * Behavior is driven by DB-backed settings (Settings → Recordings): it can
 * auto-start recording (only for the specific app-launch signal), prompt, or be
 * disabled entirely.
 */
export function CallDetectionPrompt() {
  const { isRecording } = useRecordingState();
  const { handleRecordingToggle } = useSidebar();
  const [detectedApp, setDetectedApp] = useState<string | null>(null);
  const lastPromptRef = useRef<number>(0);
  // Read the latest recording state inside the listener without re-subscribing.
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen<CallDetectedPayload>('call-detected', async (event) => {
        if (isRecordingRef.current) return;

        let settings: DetectionSettings;
        try {
          settings = await invoke<DetectionSettings>('api_get_meeting_detection_settings');
        } catch (error) {
          console.error('Failed to read detection settings:', error);
          return;
        }
        if (!settings.enabled) return;

        // Debounce: at most one prompt/auto-start per minute.
        const now = Date.now();
        if (now - lastPromptRef.current < 60_000) return;
        lastPromptRef.current = now;

        const app = event.payload?.app || 'A call';
        const source = event.payload?.source ?? 'app';
        // Auto-start only for the specific app-launch signal, never for the
        // broader mic-in-use signal (which can fire on Voice Memos/Siri).
        const autoStart = source === 'app' && settings.autoStart;
        if (autoStart) {
          toast.success(`${app} detected — starting recording`);
          handleRecordingToggle();
        } else {
          setDetectedApp(app);
        }
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [handleRecordingToggle]);

  if (!detectedApp) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-80 rounded-xl border border-border bg-white shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-brand-eraser text-primary">
          <Mic className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{detectedApp} call detected</p>
          <p className="text-xs text-muted-foreground mt-0.5">Start recording this meeting?</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                handleRecordingToggle();
                setDetectedApp(null);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-coral hover:bg-brand-coralHover rounded-lg transition-colors shadow-record"
            >
              <Mic className="w-3.5 h-3.5" /> Start
            </button>
            <button
              onClick={() => setDetectedApp(null)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={() => setDetectedApp(null)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
