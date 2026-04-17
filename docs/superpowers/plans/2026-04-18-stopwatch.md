# Stopwatch Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Stopwatch tab with count-up timing, lap recording, and pill-toggle tab navigation to TimerX.

**Architecture:** Pure frontend feature — no backend changes. A `useStopwatch` composable manages elapsed time via `performance.now()` + `requestAnimationFrame`. A `StopwatchView` component renders the display, buttons, and lap list. `App.vue` gains a pill-toggle tab bar to switch between Timer and Stopwatch views.

**Tech Stack:** Vue 3 + TypeScript, Vite, CSS custom properties

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/composables/useStopwatch.ts` | Stopwatch state, timing loop, lap recording |
| Create | `src/components/StopwatchView.vue` | Stopwatch UI — display, buttons, lap list |
| Modify | `src/App.vue` | Pill toggle tabs, conditional rendering, keyboard routing |

---

### Task 1: Create useStopwatch composable

**Files:**
- Create: `src/composables/useStopwatch.ts`

- [ ] **Step 1: Create the composable**

Create `src/composables/useStopwatch.ts`:

```typescript
import { ref, onUnmounted } from 'vue';

export interface Lap {
    lapNumber: number;
    splitTime: number; // ms since previous lap (or since start for lap 1)
}

export function useStopwatch() {
    const status = ref<'stopped' | 'running' | 'paused'>('stopped');
    const elapsed = ref(0); // total elapsed ms
    const laps = ref<Lap[]>([]);

    let startTimestamp = 0;   // performance.now() when started/resumed
    let accumulatedMs = 0;    // ms accumulated before current run segment
    let rafId: number | null = null;

    function tick() {
        elapsed.value = accumulatedMs + (performance.now() - startTimestamp);
        rafId = requestAnimationFrame(tick);
    }

    function start() {
        if (status.value === 'stopped') {
            accumulatedMs = 0;
            elapsed.value = 0;
            laps.value = [];
        }
        startTimestamp = performance.now();
        status.value = 'running';
        rafId = requestAnimationFrame(tick);
    }

    function stop() {
        if (status.value !== 'running') return;
        accumulatedMs += performance.now() - startTimestamp;
        elapsed.value = accumulatedMs;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        status.value = 'paused';
    }

    function resume() {
        if (status.value !== 'paused') return;
        startTimestamp = performance.now();
        status.value = 'running';
        rafId = requestAnimationFrame(tick);
    }

    function reset() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        status.value = 'stopped';
        elapsed.value = 0;
        accumulatedMs = 0;
        laps.value = [];
    }

    function recordLap() {
        if (status.value !== 'running') return;
        const totalElapsed = accumulatedMs + (performance.now() - startTimestamp);
        const previousLapsTotal = laps.value.reduce((sum, l) => sum + l.splitTime, 0);
        const splitTime = totalElapsed - previousLapsTotal;
        laps.value.unshift({
            lapNumber: laps.value.length + 1,
            splitTime,
        });
    }

    function formatElapsed(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        const cs = String(centiseconds).padStart(2, '0');
        return `${mm}:${ss}.${cs}`;
    }

    onUnmounted(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
    });

    return {
        status,
        elapsed,
        laps,
        start,
        stop,
        resume,
        reset,
        recordLap,
        formatElapsed,
    };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/composables/useStopwatch.ts
git commit -m "feat: add useStopwatch composable with lap support"
```

---

### Task 2: Create StopwatchView component

**Files:**
- Create: `src/components/StopwatchView.vue`

- [ ] **Step 1: Create the component**

Create `src/components/StopwatchView.vue`:

```vue
<template>
  <div class="stopwatch-view">
    <!-- Time display -->
    <div class="sw-time">{{ formatElapsed(elapsed) }}</div>
    <div class="sw-status" :class="status">{{ status }}</div>

    <!-- Controls -->
    <div class="sw-controls">
      <div class="sw-buttons">
        <button
          v-if="status === 'stopped'"
          @click="start"
          class="btn-start"
        >
          Start
        </button>

        <template v-if="status === 'running'">
          <button @click="recordLap" class="btn-lap">Lap</button>
          <button @click="stop" class="btn-stop">Stop</button>
        </template>

        <template v-if="status === 'paused'">
          <button @click="resume" class="btn-start">Resume</button>
          <button @click="reset" class="btn-stop">Reset</button>
        </template>
      </div>

      <!-- Keyboard hint -->
      <div class="sw-kbd-hint">
        <template v-if="status === 'stopped'">
          <span><kbd>Space</kbd> start</span>
        </template>
        <template v-if="status === 'running'">
          <span><kbd>Space</kbd> stop</span>
          <span><kbd>L</kbd> lap</span>
        </template>
        <template v-if="status === 'paused'">
          <span><kbd>Space</kbd> resume</span>
          <span><kbd>Esc</kbd> reset</span>
        </template>
      </div>
    </div>

    <!-- Lap list -->
    <div v-if="laps.length > 0" class="sw-laps">
      <div
        v-for="lap in laps"
        :key="lap.lapNumber"
        class="sw-lap-row"
      >
        <span class="sw-lap-num">Lap {{ lap.lapNumber }}</span>
        <span class="sw-lap-time">{{ formatElapsed(lap.splitTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStopwatch } from '../composables/useStopwatch';

const {
  status,
  elapsed,
  laps,
  start,
  stop,
  resume,
  reset,
  recordLap,
  formatElapsed,
} = useStopwatch();

defineExpose({ status, start, stop, resume, reset, recordLap });
</script>

<style scoped>
.stopwatch-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 360px;
}

.sw-time {
  font-size: 64px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.sw-status {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.sw-status.running { color: var(--btn-start); }
.sw-status.paused  { color: var(--btn-pause); }

.sw-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.sw-buttons {
  display: flex;
  gap: 12px;
}

.btn-lap {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.sw-kbd-hint {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-muted);
}

.sw-kbd-hint kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: inherit;
}

.sw-laps {
  width: 100%;
  background: var(--surface);
  border-radius: 8px;
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.sw-lap-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
}

.sw-lap-row:last-child {
  border-bottom: none;
}

.sw-lap-num {
  color: var(--text-muted);
}

.sw-lap-time {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--text);
}
</style>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/components/StopwatchView.vue
git commit -m "feat: add StopwatchView component with lap list"
```

---

### Task 3: Add tab navigation to App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Update script section**

In `src/App.vue`, replace the `<script setup>` block (lines 1–97) with:

```typescript
<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useTimer } from './composables/useTimer';
import { useAudio } from './composables/useAudio';
import { useHistory } from './composables/useHistory';
import { useTheme } from './composables/useTheme';
import ClockDisplay from './components/ClockDisplay.vue';
import StopwatchView from './components/StopwatchView.vue';

// Tab
const activeTab = ref<'timer' | 'stopwatch'>('timer');

// Theme
const { theme, toggleTheme, initTheme } = useTheme();

// Audio
const { selectedAudio, AUDIO_OPTIONS, volume, setVolume, previewSelected, playCompletion } = useAudio();

// Timer
const {
  status,
  timeLeft,
  duration,
  fetchStatus,
  startTimer,
  resumeTimer,
  pauseTimer,
  stopTimer,
} = useTimer(() => {
  playCompletion();
  fetchHistory();
});

// History
const { history, fetchHistory, formatDuration, formatTime } = useHistory();
const historyOpen = ref(false);

// Time picker inputs
const inputHr  = ref(0);
const inputMin = ref(0);
const inputSec = ref(15);
const activeField = ref<'hr' | 'min' | 'sec' | null>(null);

const totalSeconds = computed(() => {
  const hr  = Math.min(99, Math.max(0, inputHr.value  || 0));
  const min = Math.min(59, Math.max(0, inputMin.value || 0));
  const sec = Math.min(59, Math.max(0, inputSec.value || 0));
  return (hr * 3600) + (min * 60) + sec;
});

// Stopwatch ref for keyboard routing
const stopwatchRef = ref<InstanceType<typeof StopwatchView> | null>(null);

onMounted(() => {
  initTheme();
  fetchStatus();
  fetchHistory();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
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

async function handleStop() {
  await stopTimer();
  fetchHistory();
}

// Keyboard shortcuts — ignore when focus is inside an input or select
function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'SELECT') return;

  if (activeTab.value === 'stopwatch') {
    const sw = stopwatchRef.value;
    if (!sw) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (sw.status === 'stopped') sw.start();
      else if (sw.status === 'running') sw.stop();
      else if (sw.status === 'paused') sw.resume();
    }

    if (e.code === 'KeyL' && sw.status === 'running') {
      e.preventDefault();
      sw.recordLap();
    }

    if (e.code === 'Escape' && sw.status === 'paused') {
      e.preventDefault();
      sw.reset();
    }
    return;
  }

  // Timer tab shortcuts
  if (e.code === 'Space') {
    e.preventDefault();
    if (status.value === 'running') {
      pauseTimer();
    } else {
      handleStart();
    }
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    handleStop();
  }
}
</script>
```

- [ ] **Step 2: Update template section**

Replace the `<template>` block (lines 99–225) with:

```html
<template>
  <main class="container">
    <!-- Theme toggle -->
    <button class="theme-toggle" @click="toggleTheme" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
      {{ theme === 'dark' ? '☀️' : '🌙' }}
    </button>

    <div class="app-wrapper">
      <!-- Tab toggle -->
      <div class="tab-bar">
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'timer' }"
          @click="activeTab = 'timer'"
        >
          Timer
        </button>
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'stopwatch' }"
          @click="activeTab = 'stopwatch'"
        >
          Stopwatch
        </button>
      </div>

      <!-- Timer tab -->
      <div v-show="activeTab === 'timer'" class="timer-wrapper">
        <ClockDisplay
          :remainingSeconds="status === 'stopped' ? totalSeconds : timeLeft"
          :totalDuration="status === 'stopped' ? totalSeconds : duration"
          :status="status"
        />

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
                aria-label="Hours"
                type="number" v-model.number="inputHr"
                min="0" max="99"
                :class="{ active: activeField === 'hr' }"
                :disabled="status !== 'stopped'"
                @focus="activeField = 'hr'"
                @blur="activeField = null; clampField('hr')"
              />
              <span class="separator">:</span>
              <input
                aria-label="Minutes"
                type="number" v-model.number="inputMin"
                min="0" max="59"
                :class="{ active: activeField === 'min' }"
                :disabled="status !== 'stopped'"
                @focus="activeField = 'min'"
                @blur="activeField = null; clampField('min')"
              />
              <span class="separator">:</span>
              <input
                aria-label="Seconds"
                type="number" v-model.number="inputSec"
                min="0" max="59"
                :class="{ active: activeField === 'sec' }"
                :disabled="status !== 'stopped'"
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

          <!-- Volume Slider -->
          <div class="volume-control">
            <label>Volume</label>
            <div class="volume-row">
              <input
                aria-label="Volume"
                type="range"
                min="0" max="100"
                :value="volume"
                @input="setVolume(+($event.target as HTMLInputElement).value)"
              />
              <span class="volume-value">{{ volume }}%</span>
            </div>
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
            <button @click="handleStop" class="btn-stop">Stop</button>
          </div>

          <!-- Keyboard hint -->
          <div class="kbd-hint">
            <span><kbd>Space</kbd> start / pause</span>
            <span><kbd>Esc</kbd> stop</span>
          </div>

          <!-- History -->
          <div class="history-section">
            <button class="history-toggle" @click="historyOpen = !historyOpen">
              History {{ historyOpen ? '▴' : '▾' }}
            </button>
            <div v-if="historyOpen" class="history-list">
              <div v-if="history.length === 0" class="history-empty">No history yet</div>
              <div
                v-for="entry in history"
                :key="entry.id"
                class="history-entry"
                :class="entry.status"
              >
                <span class="h-duration">{{ formatDuration(entry.duration) }}</span>
                <span class="h-time">{{ formatTime(entry.started_at) }}</span>
                <span class="h-status">{{ entry.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stopwatch tab -->
      <StopwatchView v-show="activeTab === 'stopwatch'" ref="stopwatchRef" />
    </div>
  </main>
</template>
```

- [ ] **Step 3: Update style section**

In the `<style scoped>` block, add tab-bar styles and update `.timer-wrapper` to sit inside `.app-wrapper`. Replace the scoped style block entirely:

Add these new rules at the top of `<style scoped>` (after `.theme-toggle:hover`):

```css
.app-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

/* Tab bar */
.tab-bar {
  display: inline-flex;
  background: var(--surface);
  border-radius: 12px;
  padding: 4px;
  gap: 2px;
}

.tab-pill {
  padding: 8px 24px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  color: var(--text-muted);
  background: transparent;
  transition: all 0.2s;
}

.tab-pill:hover {
  opacity: 0.8;
  transform: none;
}

.tab-pill.active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}
```

- [ ] **Step 4: Build to verify**

```bash
cd /Users/wmafendi/Herd/timerx && npm run build 2>&1 | tail -10
```
Expected: `✓ built` with no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/App.vue dist/
git commit -m "feat: add pill-toggle tab navigation for Timer and Stopwatch"
```
