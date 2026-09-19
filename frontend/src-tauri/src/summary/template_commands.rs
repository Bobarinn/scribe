use crate::summary::templates;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::Runtime;
use tracing::{info, warn};

/// Template metadata for UI display
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateInfo {
    /// Template identifier (e.g., "daily_standup", "standard_meeting")
    pub id: String,

    /// Display name for the template
    pub name: String,

    /// Brief description of the template's purpose
    pub description: String,

    /// Whether this is a user-created custom template (deletable).
    #[serde(rename = "isCustom")]
    pub is_custom: bool,
}

/// Detailed template structure for preview/debugging
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateDetails {
    /// Template identifier
    pub id: String,

    /// Display name
    pub name: String,

    /// Description
    pub description: String,

    /// List of section titles in order
    pub sections: Vec<String>,
}

/// Lists all available templates
///
/// Returns templates from both built-in (embedded) and custom (user data directory) sources.
/// Templates are automatically discovered - no code changes needed to add new templates.
///
/// # Returns
/// Vector of TemplateInfo with id, name, and description for each template
#[tauri::command]
pub async fn api_list_templates<R: Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<TemplateInfo>, String> {
    info!("api_list_templates called");

    let templates = templates::list_templates();
    let custom_ids = templates::list_custom_template_ids();

    let template_infos: Vec<TemplateInfo> = templates
        .into_iter()
        .map(|(id, name, description)| {
            let is_custom = custom_ids.contains(&id);
            TemplateInfo {
                id,
                name,
                description,
                is_custom,
            }
        })
        .collect();

    info!("Found {} available templates", template_infos.len());

    Ok(template_infos)
}

/// Create a new custom meeting type (stored as a custom template that reuses the
/// standard meeting summary format).
///
/// # Arguments
/// * `name` - Human-readable display name for the new type
///
/// # Returns
/// The generated template id on success
#[tauri::command]
pub async fn api_create_custom_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    name: String,
) -> Result<String, String> {
    info!("api_create_custom_template called with name: {}", name);
    templates::create_custom_template(&name)
}

/// Delete a user-created custom meeting type. Built-in and bundled templates
/// cannot be deleted.
///
/// # Arguments
/// * `template_id` - Identifier of the custom template to delete
#[tauri::command]
pub async fn api_delete_custom_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<(), String> {
    info!("api_delete_custom_template called for: {}", template_id);
    templates::delete_custom_template(&template_id)
}

/// Returns the `template_id -> "HH:MM"` schedule map used for time-of-day
/// auto-guessing of the meeting type.
#[tauri::command]
pub async fn api_get_template_schedules<R: Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<HashMap<String, String>, String> {
    Ok(templates::get_template_schedules())
}

/// Sets (or clears, when `time_of_day` is `None`/empty) the approximate time of
/// day for a template. Time is expected in 24-hour `HH:MM` format.
#[tauri::command]
pub async fn api_set_template_schedule<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
    time_of_day: Option<String>,
) -> Result<(), String> {
    info!(
        "api_set_template_schedule called for '{}' -> {:?}",
        template_id, time_of_day
    );
    templates::set_template_schedule(&template_id, time_of_day.as_deref())
}

/// Gets detailed information about a specific template
///
/// # Arguments
/// * `template_id` - Template identifier (e.g., "daily_standup")
///
/// # Returns
/// TemplateDetails with full template structure
#[tauri::command]
pub async fn api_get_template_details<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<TemplateDetails, String> {
    info!("api_get_template_details called for template_id: {}", template_id);

    let template = templates::get_template(&template_id)?;

    let section_titles: Vec<String> = template
        .sections
        .iter()
        .map(|section| section.title.clone())
        .collect();

    let details = TemplateDetails {
        id: template_id,
        name: template.name,
        description: template.description,
        sections: section_titles,
    };

    info!("Retrieved template details for '{}'", details.name);

    Ok(details)
}

/// Validates a custom template JSON string
///
/// Useful for template editor UI or validation before saving custom templates
///
/// # Arguments
/// * `template_json` - Raw JSON string of the template
///
/// # Returns
/// Ok(template_name) if valid, Err(error_message) if invalid
#[tauri::command]
pub async fn api_validate_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_json: String,
) -> Result<String, String> {
    info!("api_validate_template called");

    match templates::validate_and_parse_template(&template_json) {
        Ok(template) => {
            info!("Template '{}' validated successfully", template.name);
            Ok(template.name)
        }
        Err(e) => {
            warn!("Template validation failed: {}", e);
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_list_templates() {
        // This test requires the templates to be embedded/available
        // In a real test environment, you might want to mock the templates module

        // For now, just verify the function compiles and runs
        // You can expand this with more specific assertions
    }

    #[tokio::test]
    async fn test_validate_template_valid() {
        let valid_json = r#"
        {
            "name": "Test Template",
            "description": "A test template",
            "sections": [
                {
                    "title": "Summary",
                    "instruction": "Provide a summary",
                    "format": "paragraph"
                }
            ]
        }"#;

        // Mock app handle would be needed for actual testing
        // For now, test the validation logic directly
        let result = templates::validate_and_parse_template(valid_json);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_validate_template_invalid() {
        let invalid_json = "invalid json";

        let result = templates::validate_and_parse_template(invalid_json);
        assert!(result.is_err());
    }
}
