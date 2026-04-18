# Chronos — Self-Contained macOS Deployment Design

**Date:** 2026-04-19  
**Target:** Apple Silicon macOS (arm64), personal use  
**Goal:** Bundle PHP and Laravel backend into the Tauri app so it runs on any Mac with zero setup

---

## Architecture

```
Chronos.app/
├── Contents/
│   ├── MacOS/
│   │   └── chronos                       ← Tauri/Rust binary
│   └── Resources/
│       ├── php-aarch64-apple-darwin      ← Static PHP binary (bundled)
│       └── backend/                      ← Laravel app (bundled)
│           ├── artisan
│           ├── app/
│           ├── routes/
│           ├── vendor/
│           └── ...
```

**SQLite database** lives outside the bundle at:
```
~/Library/Application Support/com.wmafendi.chronos/database.sqlite
```
This persists across app updates.

---

## PHP Binary

- Source: `static-php-cli` project — pre-built static PHP binary for `aarch64-apple-darwin`
- Placement: `src-tauri/binaries/php-aarch64-apple-darwin`
- Must be executable (`chmod +x`)
- Registered in `tauri.conf.json` under `bundle.externalBin`

Tauri automatically strips the target-triple suffix at runtime, so the binary is accessed as `php` inside the resource directory.

---

## Backend Bundling

- The entire `backend/` directory is bundled as a Tauri resource
- Excluded: `backend/node_modules/`, `backend/tests/`
- Included: `backend/vendor/` (required PHP dependencies at runtime)
- `tauri.conf.json` change:

```json
"bundle": {
  "externalBin": ["binaries/php"],
  "resources": {
    "backend/": "backend/"
  }
}
```

---

## Rust Startup Changes (`src-tauri/src/lib.rs`)

Three changes to the existing `setup` closure:

### 1. PHP Binary Path
```rust
let php_bin = resource_path.join("php");
```
Tauri resolves the bundled binary from the resource directory (target-triple suffix stripped).

### 2. Writable Database Path
```rust
let data_dir = app.path().app_data_dir()?;
std::fs::create_dir_all(&data_dir)?;
let db_path = data_dir.join("database.sqlite");
```

### 3. Launch Command
```rust
Command::new(&php_bin)
    .arg("artisan")
    .arg("serve")
    .arg("--port=8000")
    .current_dir(&backend_dir)
    .env("DB_DATABASE", db_path.to_str().unwrap())
    .env("APP_ENV", "production")
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .expect("Failed to start Laravel sidecar");
```

**Laravel `.env` preparation (before building):**
The bundled `backend/.env` must have production values baked in. The `APP_KEY` already exists and can be reused. Before running `tauri build`, update the file:
```
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:lsF6CfJD0bcn67HDRsWMCugsv2H26cwN6380a3S3NnM=
DB_CONNECTION=sqlite
DB_DATABASE=   ← left blank; overridden at runtime via env var
```
No other Laravel backend changes are required — it already reads `DB_DATABASE` from the environment.

---

## Build Output

```bash
npm run tauri build
```

Produces:
- `src-tauri/target/release/bundle/macos/Chronos.app`
- `src-tauri/target/release/bundle/dmg/Chronos_0.1.0_aarch64.dmg`

The `.dmg` is the distributable — copy it to other Macs, drag to Applications, done.

---

## Out of Scope

- Code signing / notarization (not needed for personal use)
- Intel / universal binary support
- App Store distribution
- Automatic updates
