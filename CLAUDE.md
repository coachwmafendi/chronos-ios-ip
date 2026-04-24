# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Chronos is an iOS Timer application ported from Clock. It uses a fully Flutter-based architecture for high performance and cross-platform capability.

- **Framework**: Flutter (Dart)
- **State Management**: Riverpod / Provider
- **Database**: Isar / SQLite
- **Target Platform**: iOS

## High-Level Architecture
The application follows a clean architecture pattern:
- `lib/core/`: Shared utilities, constants, and theme.
- `lib/features/timer/`: Timer logic, state management, and UI components.
- `lib/features/presets/`: Management of saved timer presets.
- `lib/data/`: Local persistence layer (Isar/SQLite).

## Development Commands

### Flutter
- Run app: `flutter run`
- Build iOS: `flutter build ios`
- Get dependencies: `flutter pub get`
- Run tests: `flutter test`

### General
- Initialize git: `git init`
