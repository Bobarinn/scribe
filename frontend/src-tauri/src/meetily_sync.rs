//! Detects an existing Meetily installation on the same machine and imports
//! its meetings (transcripts, notes, summaries) plus their recording audio
//! into this app's own database and recordings folder.
//!
//! Meetily and Scribe share the same underlying Tauri app and database
//! schema; they only differ by bundle identifier (`com.meetily.ai` vs this
//! app's own identifier), so each keeps a separate, otherwise-identical
//! `meeting_minutes.sqlite` under its own app-data directory. This module
//! bridges the two by copying rows the destination doesn't already have.

use log::{info, warn};
use serde::Serialize;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};

use crate::audio::recording_preferences::{ensure_recordings_directory, load_recording_preferences};
use crate::state::AppState;

/// Bundle identifiers the original Meetily app has shipped under.
const MEETILY_IDENTIFIERS: &[&str] = &["com.meetily.ai"];

fn app_data_dir_for_identifier(identifier: &str) -> Option<PathBuf> {
    dirs::data_dir().map(|dir| dir.join(identifier))
}

fn find_meetily_db() -> Option<PathBuf> {
    for identifier in MEETILY_IDENTIFIERS {
        if let Some(dir) = app_data_dir_for_identifier(identifier) {
            let db_path = dir.join("meeting_minutes.sqlite");
            if db_path.exists() {
                return Some(db_path);
            }
        }
    }
    None
}

async fn connect_readonly(path: &str) -> Result<SqlitePool, String> {
    let url = format!("sqlite://{}?mode=ro", path);
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| format!("Failed to open Meetily database: {}", e))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeetilyDetection {
    pub db_path: String,
    pub total_meetings: i64,
    pub new_meetings: i64,
}

/// Look for an existing Meetily installation on this machine and report how
/// many of its meetings aren't already present in this app's database.
#[tauri::command]
pub async fn check_for_meetily_data<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Option<MeetilyDetection>, String> {
    let Some(db_path) = find_meetily_db() else {
        return Ok(None);
    };
    scan_meetily_db(&app, &db_path).await.map(Some)
}

async fn scan_meetily_db<R: Runtime>(
    app: &AppHandle<R>,
    db_path: &Path,
) -> Result<MeetilyDetection, String> {
    let db_path_str = db_path.to_string_lossy().to_string();
    let source_pool = connect_readonly(&db_path_str).await?;

    let source_ids: Vec<String> = sqlx::query_scalar("SELECT id FROM meetings")
        .fetch_all(&source_pool)
        .await
        .map_err(|e| format!("Failed to read Meetily meetings: {}", e))?;

    let state = app.state::<AppState>();
    let existing_ids: HashSet<String> = sqlx::query_scalar("SELECT id FROM meetings")
        .fetch_all(state.db_manager.pool())
        .await
        .map_err(|e| format!("Failed to read local meetings: {}", e))?
        .into_iter()
        .collect();

    let new_meetings = source_ids.iter().filter(|id| !existing_ids.contains(*id)).count() as i64;
    let total_meetings = source_ids.len() as i64;

    source_pool.close().await;

    Ok(MeetilyDetection {
        db_path: db_path_str,
        total_meetings,
        new_meetings,
    })
}

/// Let the user point at a Meetily database directly, for machines where
/// auto-detection doesn't find it (custom install, restored backup, etc).
#[tauri::command]
pub async fn select_meetily_database_path<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .add_filter("Meetily Database", &["sqlite"])
        .blocking_pick_file();

    Ok(file_path.map(|p| p.to_string()))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeetilyImportResult {
    pub imported_meetings: i64,
    pub skipped_existing: i64,
    pub audio_copied: i64,
    pub audio_missing: i64,
}

#[derive(sqlx::FromRow)]
struct SourceMeeting {
    id: String,
    title: String,
    created_at: String,
    updated_at: String,
    folder_path: Option<String>,
    meeting_type: Option<String>,
}

/// Import every meeting from the given Meetily database that isn't already
/// present here, copying each meeting's recording folder into this app's own
/// recordings directory and rewriting `folder_path` to match.
#[tauri::command]
pub async fn import_meetily_data<R: Runtime>(
    app: AppHandle<R>,
    db_path: String,
) -> Result<MeetilyImportResult, String> {
    let source_pool = connect_readonly(&db_path).await?;

    let dest_pool = {
        let state = app.state::<AppState>();
        state.db_manager.pool().clone()
    };

    let existing_ids: HashSet<String> = sqlx::query_scalar("SELECT id FROM meetings")
        .fetch_all(&dest_pool)
        .await
        .map_err(|e| format!("Failed to read local meetings: {}", e))?
        .into_iter()
        .collect();

    let source_meetings: Vec<SourceMeeting> = sqlx::query_as(
        "SELECT id, title, created_at, updated_at, folder_path, meeting_type FROM meetings",
    )
    .fetch_all(&source_pool)
    .await
    .map_err(|e| format!("Failed to read Meetily meetings: {}", e))?;

    let new_meetings: Vec<&SourceMeeting> = source_meetings
        .iter()
        .filter(|m| !existing_ids.contains(&m.id))
        .collect();
    let skipped_existing = (source_meetings.len() - new_meetings.len()) as i64;

    let preferences = load_recording_preferences(&app)
        .await
        .map_err(|e| format!("Failed to load recording preferences: {}", e))?;
    ensure_recordings_directory(&preferences.save_folder)
        .map_err(|e| format!("Failed to prepare recordings folder: {}", e))?;

    let mut audio_copied = 0i64;
    let mut audio_missing = 0i64;
    let mut imported_ids: Vec<String> = Vec::with_capacity(new_meetings.len());

    for meeting in &new_meetings {
        let new_folder_path = match &meeting.folder_path {
            Some(source_folder) if !source_folder.is_empty() => {
                let source_dir = PathBuf::from(source_folder);
                if source_dir.is_dir() {
                    match copy_recording_folder(&source_dir, &preferences.save_folder) {
                        Ok(dest_dir) => {
                            audio_copied += 1;
                            Some(dest_dir.to_string_lossy().to_string())
                        }
                        Err(e) => {
                            warn!(
                                "Failed to copy recording folder for meeting {}: {}",
                                meeting.id, e
                            );
                            audio_missing += 1;
                            Some(source_folder.clone())
                        }
                    }
                } else {
                    warn!(
                        "Recording folder for meeting {} no longer exists at {}",
                        meeting.id, source_folder
                    );
                    audio_missing += 1;
                    Some(source_folder.clone())
                }
            }
            _ => None,
        };

        sqlx::query(
            "INSERT OR IGNORE INTO meetings (id, title, created_at, updated_at, folder_path, meeting_type) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&meeting.id)
        .bind(&meeting.title)
        .bind(&meeting.created_at)
        .bind(&meeting.updated_at)
        .bind(&new_folder_path)
        .bind(&meeting.meeting_type)
        .execute(&dest_pool)
        .await
        .map_err(|e| format!("Failed to insert meeting {}: {}", meeting.id, e))?;

        imported_ids.push(meeting.id.clone());
    }

    if !imported_ids.is_empty() {
        copy_dependent_tables(&dest_pool, &db_path, &imported_ids).await?;
    }

    source_pool.close().await;

    info!(
        "Meetily import complete: {} imported, {} skipped (already present), {} audio folders copied, {} audio missing",
        imported_ids.len(),
        skipped_existing,
        audio_copied,
        audio_missing
    );

    Ok(MeetilyImportResult {
        imported_meetings: imported_ids.len() as i64,
        skipped_existing,
        audio_copied,
        audio_missing,
    })
}

/// Copy the transcript/summary/notes rows for the given meeting ids from the
/// Meetily database into this app's database via a temporary ATTACH, since
/// they live in a separate database file.
async fn copy_dependent_tables(
    dest_pool: &SqlitePool,
    source_db_path: &str,
    meeting_ids: &[String],
) -> Result<(), String> {
    let mut conn = dest_pool
        .acquire()
        .await
        .map_err(|e| format!("Failed to acquire database connection: {}", e))?;

    sqlx::query("ATTACH DATABASE ? AS legacy")
        .bind(source_db_path)
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Failed to attach Meetily database: {}", e))?;

    let placeholders = meeting_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    for table in ["transcripts", "summary_processes", "transcript_chunks", "meeting_notes"] {
        let sql = format!(
            "INSERT OR IGNORE INTO {table} SELECT * FROM legacy.{table} WHERE meeting_id IN ({placeholders})"
        );
        let mut query = sqlx::query(&sql);
        for id in meeting_ids {
            query = query.bind(id);
        }
        let result = query.execute(&mut *conn).await;

        // Detach before propagating any error so we don't leak the attachment
        // on the pooled connection.
        if let Err(e) = result {
            let _ = sqlx::query("DETACH DATABASE legacy").execute(&mut *conn).await;
            return Err(format!("Failed to copy {} rows: {}", table, e));
        }
    }

    sqlx::query("DETACH DATABASE legacy")
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Failed to detach Meetily database: {}", e))?;

    Ok(())
}

fn copy_recording_folder(source_dir: &Path, dest_root: &Path) -> std::io::Result<PathBuf> {
    let folder_name = source_dir
        .file_name()
        .map(|n| n.to_owned())
        .unwrap_or_else(|| std::ffi::OsString::from("imported-meeting"));

    let mut dest_dir = dest_root.join(&folder_name);
    if dest_dir.exists() {
        // Don't clobber an existing folder with the same name.
        dest_dir = dest_root.join(format!("{}-imported", folder_name.to_string_lossy()));
    }

    copy_dir_recursive(source_dir, &dest_dir)?;
    Ok(dest_dir)
}

fn copy_dir_recursive(source: &Path, dest: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dest)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else {
            std::fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}
