<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useTimer } from './composables/useTimer';
import { useAudio } from './composables/useAudio';
import { useHistory } from './composables/useHistory';
import { useTheme } from './composables/useTheme';
import ClockDisplay from './components/ClockDisplay.vue';
import StopwatchView from './components/StopwatchView.vue';

// Theme
const { theme, toggleTheme, initTheme } = useTheme();

// Tab
const activeTab = ref<'timer' | 'stopwatch'>('timer');

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

<style>
/* CSS custom properties — applied globally so ClockDisplay can use them */
:root {
  --bg: #1a1a1a;
  --surface: #2a2a2a;
  --text: #ffffff;
  --text-muted: #888;
  --border: #444;
  --separator: #555;
  --accent: #f0a030;
  --ring-track: #2a2a2a;
  --btn-start: #34c759;
  --btn-pause: #ff9500;
  --btn-stop: #ff3b30;
}

:root.light {
  --bg: #f5f5f5;
  --surface: #ffffff;
  --text: #1a1a1a;
  --text-muted: #666;
  --border: #ddd;
  --separator: #ccc;
  --accent: #f0a030;
  --ring-track: #e0e0e0;
  --btn-start: #34c759;
  --btn-pause: #ff9500;
  --btn-stop: #ff3b30;
}
</style>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg);
  color: var(--text);
  position: relative;
  padding: 20px;
}

/* Theme toggle */
.theme-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 18px;
  cursor: pointer;
  transition: opacity 0.2s;
  line-height: 1;
}
.theme-toggle:hover { opacity: 0.8; }

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

.timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  width: 100%;
  max-width: 360px;
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
  color: var(--text-muted);
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
  background: var(--surface);
  border-radius: 16px;
  padding: 10px 14px;
  gap: 2px;
}

.time-inputs input {
  width: 76px;
  background: transparent;
  border: none;
  color: var(--text);
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
  background: var(--accent);
  color: #fff;
}

.separator {
  font-size: 48px;
  font-weight: 300;
  color: var(--separator);
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
  width: 100%;
}

.audio-selector label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.audio-selector select {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  width: 100%;
  text-align: center;
}

.audio-selector select:focus { border-color: var(--accent); }

/* Volume */
.volume-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.volume-control label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.volume-row input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
  cursor: pointer;
}

.volume-value {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: right;
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
  color: white;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-start { background-color: var(--btn-start); }
.btn-pause { background-color: var(--btn-pause); }
.btn-stop  { background-color: var(--btn-stop); }

button:not(:disabled):hover  { opacity: 0.9; transform: scale(1.05); }
button:not(:disabled):active { transform: scale(0.95); }

/* Keyboard hint */
.kbd-hint {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-muted);
}

kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: inherit;
}

/* History */
.history-section {
  width: 100%;
}

.history-toggle {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: border-color 0.2s;
}

.history-toggle:hover {
  border-color: var(--accent);
  opacity: 1;
  transform: none;
}

.history-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.history-empty {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 12px 0;
}

.history-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface);
  border-radius: 8px;
  font-size: 13px;
  border-left: 3px solid var(--border);
}

.history-entry.completed { border-left-color: var(--btn-start); }
.history-entry.stopped   { border-left-color: var(--btn-stop); }

.h-duration { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--text); }
.h-time     { color: var(--text-muted); }
.h-status   { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
</style>
