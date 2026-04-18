# Self-Contained macOS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bundle a static PHP binary and the Laravel backend into the Tauri app so Chronos installs and runs on any Apple Silicon Mac with zero setup.

**Architecture:** Tauri bundles a static arm64 PHP binary (as `externalBin`) alongside the full Laravel `backend/` directory (as a resource). At launch, Rust resolves both bundled paths, creates a writable data directory in `~/Library/Application Support/com.wmafendi.chronos/`, and spawns PHP pointing to that location for both the SQLite database and Laravel's storage (logs, cache, compiled views).

**Tech Stack:** Tauri v2 (Rust), static-php-cli PHP binary (arm64), Laravel 11 (PHP), Vue 3 (Vite), SQLite

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/binaries/php-aarch64-apple-darwin` | Create (download) | Static PHP CLI binary for arm64 |
| `src-tauri/tauri.conf.json` | Modify | Register PHP as externalBin, backend as resource |
| `backend/.env` | Modify | Bake in production values |
| `backend/bootstrap/app.php` | Modify | Support `APP_STORAGE_PATH` env var for writable storage |
| `src-tauri/src/lib.rs` | Modify | Use bundled PHP binary, set up app data dir, pass env vars |

---

## Task 1: Download Static PHP Binary

**Files:**
- Create: `src-tauri/binaries/php-aarch64-apple-darwin`

- [ ] **Step 1: Create the binaries directory**

```bash
mkdir -p src-tauri/binaries
```

- [ ] **Step 2: Download the static PHP binary**

Go to: `https://github.com/crazywhalecc/static-php-cli/releases`

Find the latest release and download the file named like:
`php-8.3-cli-macos-aarch64.tar.gz` (or similar — look for `macos-aarch64` + `cli`).

Extract the binary:
```bash
cd src-tauri/binaries
tar -xzf ~/Downloads/php-8.3-cli-macos-aarch64.tar.gz
# The extracted binary will likely be named "php" — rename it:
mv php php-aarch64-apple-darwin
```

- [ ] **Step 3: Make it executable**

```bash
chmod +x src-tauri/binaries/php-aarch64-apple-darwin
```

- [ ] **Step 4: Verify it runs**

```bash
src-tauri/binaries/php-aarch64-apple-darwin --version
```

Expected output: something like `PHP 8.3.x (cli) ...`. If you see a version number, the binary works.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/binaries/php-aarch64-apple-darwin
git commit -m "feat: add static PHP arm64 binary for bundling"
```

---

## Task 2: Update tauri.conf.json

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Open the file**

File: `src-tauri/tauri.conf.json`

Current `bundle` section:
```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ],
  "shortDescription": "A simple time companion.",
  "longDescription": "...",
  "copyright": "..."
}
```

- [ ] **Step 2: Add externalBin and resources to the bundle section**

Replace the `bundle` section with:
```json
"bundle": {
  "active": true,
  "targets": "all",
  "externalBin": [
    "binaries/php"
  ],
  "resources": {
    "backend/": "backend/"
  },
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ],
  "shortDescription": "A simple time companion.",
  "longDescription": "Chronos brings essential time tools into a clean and focused experience.\n\nDesigned and developed by Wan Mohd Afendi using Rust and Tauri.",
  "copyright": "© 2026 Wan Mohd Afendi. All rights reserved."
}
```

`"binaries/php"` tells Tauri to look for `src-tauri/binaries/php-aarch64-apple-darwin` (it appends the current target triple automatically). `"backend/": "backend/"` bundles the entire `backend/` directory into `Contents/Resources/backend/` inside the app bundle.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: register PHP binary and backend as Tauri bundle resources"
```

---

## Task 3: Prepare Backend for Production

**Files:**
- Modify: `backend/.env`
- Modify: `backend/bootstrap/app.php`

### Part A — Production .env

- [ ] **Step 1: Update `backend/.env`**

Replace the entire content of `backend/.env` with:
```
APP_NAME=Chronos
APP_ENV=production
APP_KEY=base64:lsF6CfJD0bcn67HDRsWMCugsv2H26cwN6380a3S3NnM=
APP_DEBUG=false
APP_URL=http://localhost:8000

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file

BCRYPT_ROUNDS=12

LOG_CHANNEL=stderr
LOG_LEVEL=error

DB_CONNECTION=sqlite
DB_DATABASE=

SESSION_DRIVER=array
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync

CACHE_STORE=array
```

Key changes:
- `APP_ENV=production`, `APP_DEBUG=false` — safe for distribution
- `LOG_CHANNEL=stderr`, `LOG_LEVEL=error` — avoids writing log files to the read-only bundle
- `SESSION_DRIVER=array`, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync` — avoids any file writes for sessions/cache/queue
- `DB_DATABASE=` left blank — Rust will set this at runtime via env var

### Part B — Writable Storage Path

Laravel writes compiled Blade views to `storage/framework/views/`. The app bundle is read-only on macOS, so we need to redirect storage to the writable app data directory.

- [ ] **Step 2: Open `backend/bootstrap/app.php`**

Current content:
```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
```

- [ ] **Step 3: Update `backend/bootstrap/app.php` to support `APP_STORAGE_PATH`**

Replace the file content with:
```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

if ($storagePath = env('APP_STORAGE_PATH')) {
    $app->useStoragePath($storagePath);
}

return $app;
```

This lets Rust redirect Laravel's storage (views, framework cache) to the writable app data directory.

- [ ] **Step 4: Commit**

```bash
git add backend/.env backend/bootstrap/app.php
git commit -m "feat: prepare backend for bundled production deployment"
```

---

## Task 4: Update lib.rs to Use Bundled Paths

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Open `src-tauri/src/lib.rs`**

The current `setup` closure starts PHP with system `php` and uses a fallback path scan for the backend. We need to:
1. Use the bundled PHP binary (next to the Tauri executable in `Contents/MacOS/`)
2. Use the bundled backend (in `Contents/Resources/backend/`)
3. Set `DB_DATABASE` to the writable app data dir
4. Set `APP_STORAGE_PATH` to a writable subdirectory in the app data dir

- [ ] **Step 2: Replace `src-tauri/src/lib.rs` with the updated version**

```rust
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

            // Resolve the resource directory (Contents/Resources/ in the bundle)
            let resource_path = app.path().resource_dir()
                .expect("Failed to get resource directory");

            // Resolve the backend directory — bundled at Contents/Resources/backend/,
            // falls back to project root in dev mode.
            let backend_path = resource_path.join("backend");
            let backend_dir = if backend_path.join("artisan").exists() {
                backend_path
            } else {
                let exe_path = std::env::current_exe()
                    .expect("Failed to get executable path");
                exe_path.ancestors()
                    .find(|p| p.join("backend").join("artisan").exists())
                    .expect("Could not locate backend directory")
                    .join("backend")
            };

            // Resolve the PHP binary — bundled next to the Tauri binary in Contents/MacOS/,
            // falls back to system PHP in dev mode.
            let exe_path = std::env::current_exe()
                .expect("Failed to get executable path");
            let exe_dir = exe_path.parent()
                .expect("Failed to get executable directory");
            let bundled_php = exe_dir.join("php");
            let php_bin = if bundled_php.exists() {
                bundled_php
            } else {
                std::path::PathBuf::from("php") // system PHP fallback for dev
            };

            // Set up writable app data directory for database and Laravel storage.
            let data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            let db_path = data_dir.join("database.sqlite");
            let storage_path = data_dir.join("storage");

            // Create required storage subdirectories Laravel expects.
            std::fs::create_dir_all(storage_path.join("framework/views"))
                .expect("Failed to create views dir");
            std::fs::create_dir_all(storage_path.join("framework/cache/data"))
                .expect("Failed to create cache dir");
            std::fs::create_dir_all(storage_path.join("app"))
                .expect("Failed to create app storage dir");
            std::fs::create_dir_all(storage_path.join("logs"))
                .expect("Failed to create logs dir");

            // Run migrations before starting the server (blocking, idempotent).
            // On first launch this creates all tables; on subsequent launches it's a no-op.
            let _ = Command::new(&php_bin)
                .arg("artisan")
                .arg("migrate")
                .arg("--force")
                .current_dir(&backend_dir)
                .env("DB_DATABASE", db_path.to_str().unwrap())
                .env("APP_STORAGE_PATH", storage_path.to_str().unwrap())
                .env("APP_ENV", "production")
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .output()
                .expect("Failed to run migrations");

            let _ = Command::new(&php_bin)
                .arg("artisan")
                .arg("serve")
                .arg("--port=8000")
                .current_dir(&backend_dir)
                .env("DB_DATABASE", db_path.to_str().unwrap())
                .env("APP_STORAGE_PATH", storage_path.to_str().unwrap())
                .env("APP_ENV", "production")
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
```

Key changes from original:
- `php_bin` resolves to `Contents/MacOS/php` (the bundled binary) with a fallback to system `php` for dev
- `backend_dir` checks for `artisan` existence (more robust check than before)
- `data_dir` is `~/Library/Application Support/com.wmafendi.chronos/`
- `storage_path` subdirectories are created before spawning PHP
- `DB_DATABASE` and `APP_STORAGE_PATH` are passed as env vars

- [ ] **Step 3: Verify it compiles**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: `Finished` with no errors. If there are errors, fix them before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: use bundled PHP binary and writable app data dir in lib.rs"
```

---

## Task 5: Build and Verify

**Files:**
- No file changes — this is the build step.

- [ ] **Step 1: Check if backend/node_modules exists and remove it**

The `backend/` directory may contain a `node_modules/` folder (for any frontend tooling). It is not needed at runtime and will bloat the bundle unnecessarily.

```bash
ls backend/node_modules 2>/dev/null && echo "EXISTS — removing" || echo "Not present, skip"
# If it exists:
rm -rf backend/node_modules
```

- [ ] **Step 2: Run the full build**

```bash
npm run tauri build 2>&1 | tail -30
```

This will take several minutes (compiles Rust in release mode). Expected final output:
```
    Finished `release` profile
    Bundling Chronos.app (/path/to/src-tauri/target/release/bundle/macos/Chronos.app)
    Bundling Chronos_0.1.0_aarch64.dmg (...)
    Finished 2 bundles at:
        .../bundle/macos/Chronos.app
        .../bundle/dmg/Chronos_0.1.0_aarch64.dmg
```

If the build fails, check the error message:
- `file not found: binaries/php-aarch64-apple-darwin` → Task 1 PHP binary missing
- `resource not found: backend/` → backend directory path issue in tauri.conf.json
- Rust compile error → check the code in Task 4

- [ ] **Step 3: Verify the bundle contains PHP**

```bash
ls src-tauri/target/release/bundle/macos/Chronos.app/Contents/MacOS/
```

Expected: you see both `chronos` (main binary) and `php` (bundled PHP binary).

- [ ] **Step 4: Verify the bundle contains the backend**

```bash
ls src-tauri/target/release/bundle/macos/Chronos.app/Contents/Resources/backend/
```

Expected: you see `artisan`, `app/`, `routes/`, `vendor/`, etc.

- [ ] **Step 5: Verify .env is bundled**

```bash
cat "src-tauri/target/release/bundle/macos/Chronos.app/Contents/Resources/backend/.env"
```

Expected: the production `.env` content with `APP_ENV=production`. If this file is missing, Tauri's glob may have excluded hidden files — see the note below.

**If `.env` is missing from the bundle:** Add an explicit resource entry in `tauri.conf.json`:
```json
"resources": {
  "backend/": "backend/",
  "backend/.env": "backend/.env"
}
```
Then rebuild.

- [ ] **Step 6: Run the built app to smoke test it**

```bash
open src-tauri/target/release/bundle/macos/Chronos.app
```

The app should open. Check that the timer/stopwatch UI loads. The first launch may be slow (Laravel bootstraps + runs migrations on first start). If it fails to load, check console logs:

```bash
log show --predicate 'process == "chronos"' --last 1m
```

---

## Task 6: Package for Distribution

**Files:**
- No changes — this is the distribution step.

- [ ] **Step 1: Locate the DMG**

```bash
ls -lh src-tauri/target/release/bundle/dmg/
```

Expected: `Chronos_0.1.0_aarch64.dmg`

- [ ] **Step 2: Test install from DMG on your own machine**

```bash
open src-tauri/target/release/bundle/dmg/Chronos_0.1.0_aarch64.dmg
```

Drag `Chronos.app` to Applications. Open it from Applications. Verify the app works end-to-end (timers, stopwatch, history).

- [ ] **Step 3: Copy the DMG to other Macs**

Copy `Chronos_0.1.0_aarch64.dmg` to the target Mac via AirDrop, USB, or file share. On the target Mac:
1. Open the DMG
2. Drag Chronos to Applications
3. Open Chronos

On first open, macOS Gatekeeper will show "Chronos cannot be opened because it is from an unidentified developer." To bypass for personal use:
- Right-click Chronos.app → Open → Open (this one-time step is required on each new machine)

Or run once on the target machine:
```bash
xattr -d com.apple.quarantine /Applications/Chronos.app
```

- [ ] **Step 4: Commit the plan reference**

```bash
git add docs/superpowers/plans/2026-04-19-self-contained-deployment.md
git commit -m "docs: add self-contained deployment implementation plan"
```
