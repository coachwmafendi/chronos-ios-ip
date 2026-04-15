# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
TimerX is a macOS Timer application utilizing a Sidecar Architecture.
- **Shell**: Tauri (Rust) - Handles window management and native macOS notifications.
- **Backend**: Laravel 11 (PHP) - Runs as a local API sidecar for state management and persistence.
- **Frontend**: Vue.js 3 (via Vite) - User interface for the timer.
- **Database**: SQLite - Local data storage.

## High-Level Architecture
The application follows a sidecar pattern where Tauri manages the lifecycle of a PHP binary.
- `src-tauri/`: Rust core and Tauri configuration. Manages the PHP process.
- `backend/`: Laravel application providing a REST API for timer logic.
- `frontend/`: Vue.js SPA that communicates with the Laravel API.

## Development Commands

### Backend (Laravel)
- Run server: `php artisan serve` (within `/backend`)
- Run migrations: `php artisan migrate`

### Frontend (Vue/Tauri)
- Dev mode: `npm run tauri dev`
- Build app: `npm run tauri build`

### General
- Initialize git: `git init` (Required for some tool functionalities)
