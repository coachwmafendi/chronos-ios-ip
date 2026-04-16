# TimerX — History, Keyboard Shortcuts & Tier 3 Features Design Spec
**Date:** 2026-04-16

## Overview
Add five features to TimerX: Timer History, Keyboard Shortcuts, Countdown Progress Ring, Dark/Light Mode toggle, and Volume Control.

---

## 1. Timer History

### UI
Expandable/collapsible section below the controls in `App.vue`. Header shows "History ▾" / "History ▴". Collapsed by default.

Each entry displays:
```
00:15:00  •  2:45pm  •  Completed
```
(duration set • time started • status)

Latest entries on top. Max 20 entries displayed. Entries older than 20 are not deleted from DB — just not shown.

### Backend
**New migration:** `timer_history` table
```
id, duration (integer seconds), started_at (timestamp), status (string: completed|stopped), created_at, updated_at
```

**New Model:** `App\Models\TimerHistory`

**Controller changes:** `TimerController`
- `stop()` — insert TimerHistory record with `status = 'stopped'` if timer was running or paused (not if already stopped)
- New `complete()` logic — when frontend calls stop after natural completion, pass a flag OR detect via `end_time` elapsed

**Simpler approach:** Frontend distinguishes completion from manual stop:
- Natural completion → POST `/timer/stop?completed=true`
- Manual stop → POST `/timer/stop` (no flag)

**New route:** `GET /api/timer/history` — returns last 20 records ordered by `created_at desc`

### Frontend
**New composable:** `src/composables/useHistory.ts`
- `history` ref (array of entries)
- `fetchHistory()` — GET `/api/timer/history`
- Called after every stop/complete action

---

## 2. Keyboard Shortcuts

Pure frontend. `keydown` event listener registered in `App.vue` via `onMounted` / `onUnmounted`.

| Key | Action |
|-----|--------|
| `Space` | If stopped → Start; if running → Pause; if paused → Resume |
| `Escape` | Stop |

**Guard:** Ignore shortcuts when user is focused on an input field (`event.target` is `INPUT` or `SELECT`).

---

## 3. Countdown Progress Ring

**Style:** Thick Ring (B) — stroke-width 16, dark track (#2a2a2a), amber progress (#f0a030), rounded caps.

**Location:** `ClockDisplay.vue` — SVG ring wrapping the clock text.

**Props change:** Add `totalDuration: number` prop (seconds). Progress = `remaining / totalDuration`.

**useTimer change:** Expose `duration` ref (the total duration of the current timer from server).

**Behaviour:**
- When `status === 'stopped'` or `totalDuration === 0`: ring is empty (full track, no progress arc)
- When `status === 'running'` or `'paused'`: ring shows remaining proportion
- Ring animates smoothly via CSS `transition` on `stroke-dashoffset`

---

## 4. Dark / Light Mode

**Toggle:** Small button in top-right corner of `App.vue` showing 🌙 (dark) or ☀️ (light).

**Implementation:** CSS custom properties on `:root` / `:root.light`. All color values in `App.vue` and `ClockDisplay.vue` reference variables.

| Variable | Dark | Light |
|----------|------|-------|
| `--bg` | #1a1a1a | #f5f5f5 |
| `--surface` | #2a2a2a | #ffffff |
| `--text` | #ffffff | #1a1a1a |
| `--text-muted` | #888 | #666 |
| `--border` | #444 | #ddd |
| `--separator` | #555 | #ccc |

**Persistence:** `localStorage.getItem('theme')` — `'dark'` or `'light'`. Default: `'dark'`.

**Applied:** `document.documentElement.classList.toggle('light', theme === 'light')` on mount and on toggle.

---

## 5. Volume Control

**UI:** Horizontal slider (`<input type="range">`) below the audio dropdown in `App.vue`. Range 0–100, default 80. Shows current value as percentage label.

**Implementation:** `useAudio.ts` — expose `volume` ref and `setVolume(v: number)` function. Master `GainNode` value = `volume / 100`.

The existing singleton `sharedCtx` gains a persistent `masterGain` node that all sounds route through.

**Persistence:** `localStorage.getItem('volume')` — integer 0–100. Default: 80.

---

## Files Changed

| File | Action | Change |
|------|--------|--------|
| `src/App.vue` | Modify | Keyboard listeners, theme toggle button, history section, volume slider, pass `totalDuration` to ClockDisplay |
| `src/components/ClockDisplay.vue` | Modify | Add `totalDuration` prop, SVG progress ring |
| `src/composables/useTimer.ts` | Modify | Expose `duration` ref, pass `completed` flag on natural completion stop |
| `src/composables/useAudio.ts` | Modify | Master gain node, `volume` ref, `setVolume()` |
| `src/composables/useHistory.ts` | Create | Fetch and store timer history |
| `backend/app/Http/Controllers/TimerController.php` | Modify | Insert TimerHistory on stop, add `history()` method |
| `backend/app/Models/TimerHistory.php` | Create | Eloquent model |
| `backend/database/migrations/xxxx_create_timer_history_table.php` | Create | Migration |
| `backend/routes/api.php` | Modify | Add `GET /timer/history` route |

## Out of Scope
- Deleting individual history entries
- Exporting history
- History pagination beyond 20 entries
- Per-entry notes or labels
