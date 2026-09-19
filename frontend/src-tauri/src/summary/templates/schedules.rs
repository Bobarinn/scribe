//! Optional time-of-day scheduling for meeting templates.
//!
//! Users can attach an approximate time of day (e.g. "09:30") to any template —
//! both bundled and custom. When a recording starts near that time, the app can
//! pre-select the matching template as the meeting type (see the frontend
//! auto-guess logic). Schedules are keyed by template id and persisted as a small
//! JSON map alongside the custom templates, so they survive app restarts and work
//! for bundled templates too (which are read-only files we cannot annotate).

use std::collections::HashMap;
use std::path::PathBuf;
use tracing::{info, warn};

/// Location of the schedules file: `<data_dir>/Scribe/template_schedules.json`.
fn schedules_path() -> Option<PathBuf> {
    let mut path = dirs::data_dir()?;
    path.push("Scribe");
    path.push("template_schedules.json");
    Some(path)
}

/// Validate a `HH:MM` (24-hour) time string, returning a normalised value.
fn normalize_time(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    let (h, m) = trimmed
        .split_once(':')
        .ok_or_else(|| "Time must be in HH:MM format".to_string())?;
    let hour: u32 = h
        .parse()
        .map_err(|_| "Hour must be a number".to_string())?;
    let minute: u32 = m
        .parse()
        .map_err(|_| "Minute must be a number".to_string())?;
    if hour > 23 {
        return Err("Hour must be between 0 and 23".to_string());
    }
    if minute > 59 {
        return Err("Minute must be between 0 and 59".to_string());
    }
    Ok(format!("{:02}:{:02}", hour, minute))
}

/// Read the full `template_id -> "HH:MM"` schedule map. Missing/corrupt files
/// are treated as an empty map so the feature degrades gracefully.
pub fn get_template_schedules() -> HashMap<String, String> {
    let Some(path) = schedules_path() else {
        return HashMap::new();
    };
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<HashMap<String, String>>(&content).unwrap_or_else(|e| {
            warn!("Failed to parse template schedules ({}): {}", path.display(), e);
            HashMap::new()
        }),
        Err(_) => HashMap::new(),
    }
}

fn write_schedules(map: &HashMap<String, String>) -> Result<(), String> {
    let path = schedules_path().ok_or_else(|| "Could not resolve data directory".to_string())?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(map)
        .map_err(|e| format!("Failed to serialize schedules: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write schedules: {}", e))?;
    Ok(())
}

/// Set (or clear, when `time` is `None`) the scheduled time for a template.
pub fn set_template_schedule(template_id: &str, time: Option<&str>) -> Result<(), String> {
    let template_id = template_id.trim();
    if template_id.is_empty() {
        return Err("Template id cannot be empty".to_string());
    }

    let mut map = get_template_schedules();
    match time {
        Some(raw) if !raw.trim().is_empty() => {
            let normalized = normalize_time(raw)?;
            map.insert(template_id.to_string(), normalized);
        }
        _ => {
            map.remove(template_id);
        }
    }
    write_schedules(&map)?;
    info!("Updated schedule for template '{}'", template_id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_valid_times() {
        assert_eq!(normalize_time("9:5").unwrap(), "09:05");
        assert_eq!(normalize_time(" 23:59 ").unwrap(), "23:59");
        assert_eq!(normalize_time("00:00").unwrap(), "00:00");
    }

    #[test]
    fn normalize_rejects_bad_times() {
        assert!(normalize_time("24:00").is_err());
        assert!(normalize_time("10:60").is_err());
        assert!(normalize_time("nope").is_err());
        assert!(normalize_time("10").is_err());
    }
}
