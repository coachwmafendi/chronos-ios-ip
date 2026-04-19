use tauri::Manager;
use tauri::menu::{AboutMetadataBuilder, MenuBuilder, PredefinedMenuItem, SubmenuBuilder};
use std::process::{Command, Stdio};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let about_metadata = AboutMetadataBuilder::new()
                .name(Some("Chronos"))
                .version(Some("0.1.0"))
                .short_version(Some("0.1.0"))
                .copyright(Some("© 2026 Wan Mohd Afendi. All rights reserved."))
                .comments(Some("Chronos brings essential time tools into a clean and focused experience.\n\nDesigned and developed by Wan Mohd Afendi using Rust and Tauri."))
                .build();

            let menu = MenuBuilder::new(app)
                .items(&[
                    &SubmenuBuilder::new(app, "Chronos")
                        .item(&PredefinedMenuItem::about(app, Some("About Chronos"), Some(about_metadata))?)
                        .separator()
                        .item(&PredefinedMenuItem::services(app, None)?)
                        .separator()
                        .item(&PredefinedMenuItem::hide(app, Some("Hide Chronos"))?)
                        .item(&PredefinedMenuItem::hide_others(app, None)?)
                        .item(&PredefinedMenuItem::show_all(app, None)?)
                        .separator()
                        .item(&PredefinedMenuItem::quit(app, Some("Quit Chronos"))?)
                        .build()?,
                    &SubmenuBuilder::new(app, "Edit")
                        .undo()
                        .redo()
                        .separator()
                        .cut()
                        .copy()
                        .paste()
                        .select_all()
                        .build()?,
                    &SubmenuBuilder::new(app, "Window")
                        .minimize()
                        .maximize()
                        .close_window()
                        .build()?,
                ])
                .build()?;

            app.set_menu(menu)?;
            // Resolve backend path relative to the app's resource directory
            let resource_path = app.path().resource_dir()
                .expect("Failed to get resource directory");
            let backend_path = resource_path.join("backend");

            // Fall back to development path if bundled backend doesn't exist
            let backend_dir = if backend_path.exists() {
                backend_path
            } else {
                // In dev mode, use path relative to the app's executable
                let exe_path = std::env::current_exe()
                    .expect("Failed to get executable path");
                // Walk up from src-tauri/target/debug/ to project root
                exe_path.ancestors()
                    .find(|p| p.join("backend").join("artisan").exists())
                    .expect("Could not locate backend directory")
                    .join("backend")
            };

            let _ = Command::new("php")
                .arg("artisan")
                .arg("serve")
                .arg("--port=8000")
                .current_dir(&backend_dir)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .expect("Failed to start Laravel sidecar");

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
