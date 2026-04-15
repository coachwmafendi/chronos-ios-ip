# TimerX UI & Audio Update — Design Spec
**Date:** 2026-04-15

## Overview
Amend TimerX's time input UI to a three-field hr/min/sec picker, and add 10 built-in audio sounds that play on timer completion with a dropdown selector.

## 1. Time Input UI
Replace the single `Duration (s)` number input with three separate numeric inputs: **hr**, **min**, **sec**.

- Each field is individually editable
- Active/focused field is highlighted with amber (#f0a030) background, matching the reference design
- Labels above each field: `hr`, `min`, `sec`
- Fields are separated by colon (`:`) separators
- Duration sent to backend = `(hr × 3600) + (min × 60) + sec`
- Minimum selectable value: 1 second total (validation before calling API)
- Max values: hr=99, min=59, sec=59

## 2. Clock Display
No changes needed. `ClockDisplay.vue` already formats as `HH:MM:SS`.

## 3. Audio Selection
A `<select>` dropdown placed below the time input.

**Behaviour:**
- Changing selection auto-plays a short preview of the selected audio
- Selected audio plays when the timer reaches zero (replaces/supplements browser Notification)
- Default selection: first audio in the list

**10 Built-in Sounds** (files in `public/sounds/`):
| Label | Filename |
|-------|----------|
| Alarm Bell | alarm-bell.mp3 |
| Digital Beep | digital-beep.mp3 |
| Gentle Chime | gentle-chime.mp3 |
| Radar | radar.mp3 |
| Notification Pop | notification-pop.mp3 |
| Rain Drop | rain-drop.mp3 |
| Forest Birds | forest-birds.mp3 |
| Ocean Wave | ocean-wave.mp3 |
| Success Fanfare | success-fanfare.mp3 |
| Zen Bowl | zen-bowl.mp3 |

Audio files are sourced from free/royalty-free libraries (e.g. Mixkit, Pixabay) and placed in `public/sounds/`.

## 4. Files Changed

| File | Change |
|------|--------|
| `src/App.vue` | Replace duration input → 3 hr/min/sec spinners; add audio dropdown |
| `src/composables/useTimer.ts` | Accept duration in seconds (no change to interface); expose `playSound(file)` |
| `public/sounds/` | Add 10 `.mp3` audio files |
| `src/components/ClockDisplay.vue` | No change |
| `backend/` | No change |

## 5. Out of Scope
- Volume control
- User-uploaded audio
- Looping audio
- Audio while timer is running
