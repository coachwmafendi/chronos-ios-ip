use tauri::Manager;
use tauri::menu::{AboutMetadataBuilder, MenuBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_alarms_table",
            sql: "CREATE TABLE IF NOT EXISTS alarms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT,
                hour INTEGER NOT NULL,
                minute INTEGER NOT NULL,
                repeat_days TEXT NOT NULL DEFAULT '[]',
                sound TEXT NOT NULL DEFAULT 'alarm-bell',
                enabled INTEGER NOT NULL DEFAULT 1,
                snooze_enabled INTEGER NOT NULL DEFAULT 0,
                snooze_minutes INTEGER NOT NULL DEFAULT 5
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_timer_state_table",
            sql: "CREATE TABLE IF NOT EXISTS timer_state (
                id INTEGER PRIMARY KEY DEFAULT 1,
                duration INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'stopped',
                end_time TEXT,
                started_at TEXT,
                paused_at TEXT
            );
            INSERT OR IGNORE INTO timer_state (id) VALUES (1);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_timer_history_table",
            sql: "CREATE TABLE IF NOT EXISTS timer_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                duration INTEGER NOT NULL,
                started_at TEXT,
                status TEXT NOT NULL DEFAULT 'stopped'
            );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:chronos.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
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
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
