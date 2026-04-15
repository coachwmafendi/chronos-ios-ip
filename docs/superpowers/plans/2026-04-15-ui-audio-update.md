# TimerX UI & Audio Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single duration input with an hr/min/sec time picker styled with amber highlight, and add 10 built-in audio sounds selectable via dropdown that auto-preview on selection and play when the timer completes.

**Architecture:** All changes are frontend-only (no backend changes). A new `useAudio` composable handles sound definitions, preview, and completion playback via HTML5 Audio API. `useTimer` gains an `onComplete` callback parameter. Audio files are generated via Web Audio API (no external file downloads needed — works offline and in Tauri webview).

**Tech Stack:** Vue 3, TypeScript, Vite, HTML5 Web Audio API

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/composables/useAudio.ts` | Audio definitions, preview, playback via Web Audio API |
| Modify | `src/composables/useTimer.ts` | Add `onComplete` callback, remove old `triggerNotification` |
| Modify | `src/App.vue` | hr/min/sec time picker + audio dropdown |
| None   | `src/components/ClockDisplay.vue` | No changes needed |
| None   | `backend/` | No changes needed |

---

### Task 1: Create useAudio composable

**Files:**
- Create: `src/composables/useAudio.ts`

- [ ] **Step 1: Create the composable**

Create `src/composables/useAudio.ts` with the following content. Sounds are synthesized via Web Audio API — no mp3 files required, works in Tauri webview:

```typescript
import { ref } from 'vue';

export interface AudioOption {
    label: string;
    id: string;
}

export const AUDIO_OPTIONS: AudioOption[] = [
    { label: 'Alarm Bell',      id: 'alarm-bell' },
    { label: 'Digital Beep',    id: 'digital-beep' },
    { label: 'Gentle Chime',    id: 'gentle-chime' },
    { label: 'Radar',           id: 'radar' },
    { label: 'Notification Pop',id: 'notification-pop' },
    { label: 'Rain Drop',       id: 'rain-drop' },
    { label: 'Forest Tone',     id: 'forest-tone' },
    { label: 'Ocean Wave',      id: 'ocean-wave' },
    { label: 'Success Fanfare', id: 'success-fanfare' },
    { label: 'Zen Bowl',        id: 'zen-bowl' },
];

type SoundFn = (ctx: AudioContext) => void;

const SOUNDS: Record<string, SoundFn> = {
    'alarm-bell': (ctx) => {
        // Repeating bell: 880Hz + 1108Hz alternating, 3 rings
        const times = [0, 0.3, 0.6];
        times.forEach(t => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.6, ctx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.25);
        });
    },
    'digital-beep': (ctx) => {
        // Sharp square wave beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },
    'gentle-chime': (ctx) => {
        // Soft sine wave chime, slow decay
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 1.0);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 1.0);
        });
    },
    'radar': (ctx) => {
        // Ascending ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    },
    'notification-pop': (ctx) => {
        // Short pop: descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },
    'rain-drop': (ctx) => {
        // High-pitched pluck
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },
    'forest-tone': (ctx) => {
        // Low warm tone with harmonics
        [220, 330, 440].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2 / (i + 1), ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.5);
        });
    },
    'ocean-wave': (ctx) => {
        // Noise burst (white noise via buffer)
        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        source.buffer = buffer;
        source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        source.start(ctx.currentTime);
    },
    'success-fanfare': (ctx) => {
        // 3-note ascending fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
    },
    'zen-bowl': (ctx) => {
        // Long, pure 432Hz sine tone — slow fade
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 432;
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 3.0);
    },
};

export function useAudio() {
    const selectedAudio = ref<string>(AUDIO_OPTIONS[0].id);

    function playSound(id: string) {
        const soundFn = SOUNDS[id];
        if (!soundFn) return;
        try {
            const ctx = new AudioContext();
            soundFn(ctx);
        } catch (err) {
            console.error('Failed to play audio:', err);
        }
    }

    function previewSelected() {
        playSound(selectedAudio.value);
    }

    function playCompletion() {
        playSound(selectedAudio.value);
    }

    return {
        selectedAudio,
        AUDIO_OPTIONS,
        previewSelected,
        playCompletion,
    };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors output

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/composables/useAudio.ts
git commit -m "feat: add useAudio composable with 10 synthesized sounds"
```

---

### Task 2: Update useTimer.ts — add onComplete callback

**Files:**
- Modify: `src/composables/useTimer.ts`

Remove `triggerNotification` (replaced by `onComplete` callback from caller). Timer calls `onComplete?.()` when countdown hits zero.

- [ ] **Step 1: Replace `src/composables/useTimer.ts`**

```typescript
import { ref, onUnmounted } from 'vue';
import api from '../services/api';

export function useTimer(onComplete?: () => void) {
    const status = ref<'running' | 'paused' | 'stopped'>('stopped');
    const timeLeft = ref(0);
    const end_time = ref<string | null>(null);
    let timerInterval: number | null = null;

    async function fetchStatus() {
        try {
            const { data } = await api.get('/timer/status');
            status.value = data.status;
            timeLeft.value = data.remaining;
            end_time.value = data.end_time;
            if (data.status === 'running') {
                startTick();
            }
        } catch (error) {
            console.error('Error fetching timer status:', error);
        }
    }

    function startTick() {
        if (timerInterval) return;

        timerInterval = window.setInterval(() => {
            if (status.value === 'running') {
                if (timeLeft.value <= 0) {
                    clearInterval(timerInterval!);
                    timerInterval = null;
                    status.value = 'stopped';
                    onComplete?.();
                    stopTimer();
                    return;
                }
                timeLeft.value = timeLeft.value - 1;
            }
        }, 1000);
    }

    async function startTimer(duration: number) {
        try {
            const { data } = await api.post('/timer/start', { duration });
            status.value = data.status;
            timeLeft.value = data.remaining;
            end_time.value = data.end_time;
            startTick();
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }

    async function resumeTimer() {
        try {
            const { data } = await api.post('/timer/start', {});
            status.value = data.status;
            timeLeft.value = data.remaining;
            end_time.value = data.end_time;
            startTick();
        } catch (error) {
            console.error('Error resuming timer:', error);
        }
    }

    async function pauseTimer() {
        try {
            const { data } = await api.post('/timer/pause');
            status.value = data.status;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        } catch (error) {
            console.error('Error pausing timer:', error);
        }
    }

    async function stopTimer() {
        try {
            const { data } = await api.post('/timer/stop');
            status.value = data.status;
            timeLeft.value = 0;
            end_time.value = null;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
        }
    }

    onUnmounted(() => {
        if (timerInterval) clearInterval(timerInterval);
    });

    return {
        status,
        timeLeft,
        end_time,
        fetchStatus,
        startTimer,
        resumeTimer,
        pauseTimer,
        stopTimer,
    };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/composables/useTimer.ts
git commit -m "feat: add onComplete callback to useTimer, remove triggerNotification"
```

---

### Task 3: Update App.vue — time picker + audio dropdown

**Files:**
- Modify: `src/App.vue`

Replace duration input with three `hr/min/sec` fields (amber highlight on focus). Add audio `<select>` dropdown that calls `previewSelected()` on change.

- [ ] **Step 1: Replace `src/App.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useTimer } from './composables/useTimer';
import { useAudio } from './composables/useAudio';
import ClockDisplay from './components/ClockDisplay.vue';

const { selectedAudio, AUDIO_OPTIONS, previewSelected, playCompletion } = useAudio();

const {
  status,
  timeLeft,
  fetchStatus,
  startTimer,
  resumeTimer,
  pauseTimer,
  stopTimer
} = useTimer(() => playCompletion());

const inputHr  = ref(0);
const inputMin = ref(0);
const inputSec = ref(0);
const activeField = ref<'hr' | 'min' | 'sec' | null>(null);

const totalSeconds = computed(() =>
  (inputHr.value * 3600) + (inputMin.value * 60) + inputSec.value
);

onMounted(() => {
  fetchStatus();
});

function clampField(field: 'hr' | 'min' | 'sec') {
  if (field === 'hr')  inputHr.value  = Math.min(99, Math.max(0, inputHr.value  || 0));
  if (field === 'min') inputMin.value = Math.min(59, Math.max(0, inputMin.value || 0));
  if (field === 'sec') inputSec.value = Math.min(59, Math.max(0, inputSec.value || 0));
}

async function handleStart() {
  if (status.value === 'paused') {
    await resumeTimer();
  } else {
    if (totalSeconds.value < 1) return;
    await startTimer(totalSeconds.value);
  }
}
</script>

<template>
  <main class="container">
    <div class="timer-wrapper">
      <ClockDisplay :remainingSeconds="timeLeft" :status="status" />

      <div class="controls">
        <!-- Time Picker -->
        <div class="time-picker">
          <div class="time-labels">
            <span class="label">hr</span>
            <span class="sep-spacer"></span>
            <span class="label">min</span>
            <span class="sep-spacer"></span>
            <span class="label">sec</span>
          </div>
          <div class="time-inputs">
            <input
              type="number" v-model.number="inputHr"
              min="0" max="99"
              :class="{ active: activeField === 'hr' }"
              @focus="activeField = 'hr'"
              @blur="activeField = null; clampField('hr')"
            />
            <span class="separator">:</span>
            <input
              type="number" v-model.number="inputMin"
              min="0" max="59"
              :class="{ active: activeField === 'min' }"
              @focus="activeField = 'min'"
              @blur="activeField = null; clampField('min')"
            />
            <span class="separator">:</span>
            <input
              type="number" v-model.number="inputSec"
              min="0" max="59"
              :class="{ active: activeField === 'sec' }"
              @focus="activeField = 'sec'"
              @blur="activeField = null; clampField('sec')"
            />
          </div>
        </div>

        <!-- Audio Selector -->
        <div class="audio-selector">
          <label>Sound</label>
          <select v-model="selectedAudio" @change="previewSelected">
            <option v-for="opt in AUDIO_OPTIONS" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Buttons -->
        <div class="button-group">
          <button
            v-if="status === 'stopped' || status === 'paused'"
            @click="handleStart"
            class="btn-start"
            :disabled="status === 'stopped' && totalSeconds < 1"
          >
            {{ status === 'paused' ? 'Resume' : 'Start' }}
          </button>
          <button v-if="status === 'running'" @click="pauseTimer" class="btn-pause">
            Pause
          </button>
          <button @click="stopTimer" class="btn-stop">Stop</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1a;
  color: white;
}

.timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

/* Time Picker */
.time-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.time-labels {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 4px;
}

.time-labels .label {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #888;
  text-transform: lowercase;
  letter-spacing: 1px;
}

.time-labels .sep-spacer {
  width: 28px;
  flex-shrink: 0;
}

.time-inputs {
  display: flex;
  align-items: center;
  background: #2a2a2a;
  border-radius: 16px;
  padding: 10px 14px;
  gap: 2px;
}

.time-inputs input {
  width: 76px;
  background: transparent;
  border: none;
  color: white;
  font-size: 56px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  border-radius: 10px;
  padding: 6px 2px;
  outline: none;
  transition: background 0.15s, color 0.15s;
  -moz-appearance: textfield;
}

.time-inputs input::-webkit-outer-spin-button,
.time-inputs input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.time-inputs input.active {
  background: #f0a030;
  color: #fff;
}

.separator {
  font-size: 48px;
  font-weight: 300;
  color: #555;
  padding: 0 2px;
  line-height: 1;
  user-select: none;
}

/* Audio Selector */
.audio-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.audio-selector label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.audio-selector select {
  background: #2a2a2a;
  border: 1px solid #444;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  min-width: 200px;
  text-align: center;
}

.audio-selector select:focus {
  border-color: #f0a030;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 12px;
}

button {
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-start { background-color: #34c759; color: white; }
.btn-pause { background-color: #ff9500; color: white; }
.btn-stop  { background-color: #ff3b30; color: white; }

button:not(:disabled):hover  { opacity: 0.9; transform: scale(1.05); }
button:not(:disabled):active { transform: scale(0.95); }
</style>
```

- [ ] **Step 2: Build to verify no TypeScript or Vite errors**

```bash
cd /Users/wmafendi/Herd/timerx && npm run build
```
Expected: `✓ built` with no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/App.vue
git commit -m "feat: hr/min/sec time picker with amber highlight and audio dropdown"
```
