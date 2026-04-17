# Stopwatch Feature — Design Spec

## Overview

Add a Stopwatch tab to TimerX alongside the existing Timer. Users switch between Timer and Stopwatch via a pill toggle at the top. The stopwatch counts up with centisecond precision, supports lap/split times, and is entirely frontend-based (no backend persistence).

## Tab Navigation

- **Style**: Pill toggle bar centered at top of the app, below the title bar area
- **Tabs**: "Timer" | "Stopwatch"
- **Active indicator**: Amber `#f0a030` background with white text, rounded `10px`
- **Inactive**: No background, muted text `var(--text-muted)`
- **Container**: `var(--surface)` background, `border-radius: 12px`, `padding: 4px`
- **Placement**: Between the theme toggle button and the main content area
- **Behavior**: Switching tabs preserves each tab's state independently (a running timer continues while viewing stopwatch and vice versa)

## Stopwatch Display

- **Time format**: `MM:SS.cs` (minutes, seconds, centiseconds) — e.g., `00:12.34`
- **Font**: 64px, weight 600, tabular-nums, `var(--text)` color
- **Status label**: Below time — "stopped" / "running" / "paused"
  - Running: `var(--btn-start)` color
  - Paused: `var(--btn-pause)` color
  - Stopped: `var(--text-muted)` color
- **No progress ring** — distinct from Timer tab

## States & Controls

### Stopped (initial)
- Display: `00:00.00`
- Buttons: **Start** (green `var(--btn-start)`)
- Keyboard: `Space` → start

### Running
- Display: Counting up with centisecond updates
- Buttons: **Lap** (outlined, `var(--surface)` bg + `var(--border)` border) + **Stop** (red `var(--btn-stop)`)
- Keyboard: `Space` → stop, `L` → lap

### Paused
- Display: Frozen at current elapsed time
- Buttons: **Resume** (green `var(--btn-start)`) + **Reset** (red `var(--btn-stop)`)
- Keyboard: `Space` → resume, `Esc` → reset

## Lap Times

- **Container**: Rounded card (`var(--surface)` bg, `border-radius: 8px`, `padding: 8px`)
- **Each row**: Lap number (left, muted) + split time (right, white, tabular-nums)
- **Order**: Newest lap on top
- **Separator**: `1px solid var(--border)` between rows
- **Max height**: `200px` with `overflow-y: auto` for scrolling
- **Reset**: Clears all laps
- **Lap time**: Records the time elapsed since the previous lap (or since start for lap 1)

## Keyboard Shortcuts

| Key | Stopped | Running | Paused |
|-----|---------|---------|--------|
| Space | Start | Stop | Resume |
| L | — | Record lap | — |
| Esc | — | — | Reset |

Shortcuts are disabled when focus is inside an `INPUT` or `SELECT` element. Shortcuts apply to whichever tab is active.

## Technical Implementation

### Composable: `useStopwatch.ts`

- **Timing**: Uses `performance.now()` for high-resolution elapsed time
- **Update loop**: `requestAnimationFrame` for smooth centisecond rendering (not `setInterval`)
- **State**: `status` ref (`'stopped' | 'running' | 'paused'`), `elapsed` ref (ms), `laps` ref array
- **Functions**: `start()`, `stop()`, `resume()`, `reset()`, `recordLap()`
- **Lap data**: Each lap stores `{ lapNumber, splitTime }` where splitTime is ms since previous lap
- **No backend calls** — pure frontend state

### Component: `StopwatchView.vue`

- Receives stopwatch state and actions as props/composable
- Renders: time display, status badge, control buttons, lap list
- Uses CSS variables from `:root` for theming (dark/light mode works automatically)

### App.vue Changes

- Add `activeTab` ref (`'timer' | 'stopwatch'`)
- Render pill toggle above existing content
- Conditionally render Timer content vs `<StopwatchView />` based on active tab
- Keyboard handler checks `activeTab` to route shortcuts correctly
- Timer state persists when switching tabs (backend keeps running)

## File Map

| Action | File |
|--------|------|
| Create | `src/composables/useStopwatch.ts` |
| Create | `src/components/StopwatchView.vue` |
| Modify | `src/App.vue` |
