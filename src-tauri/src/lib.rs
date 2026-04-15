// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use tauri::Manager;
use std::process::{Command, Stdio};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
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
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
