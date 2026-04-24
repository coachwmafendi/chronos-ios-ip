<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useTimer } from './composables/useTimer';
import { useAudio } from './composables/useAudio';
import { useHistory } from './composables/useHistory';
import { useTheme } from './composables/useTheme';
import { useAlarms } from './composables/useAlarms';
import { usePresets } from './composables/usePresets';
import ClockDisplay from './components/ClockDisplay.vue';
import StopwatchView from './components/StopwatchView.vue';
import AlarmView from './components/AlarmView.vue';
import WorldClockView from './components/WorldClockView.vue';
import AlarmRingingOverlay from './components/AlarmRingingOverlay.vue';

// Theme
const { theme, toggleTheme, initTheme } = useTheme();

// Tab
const activeTab = ref<'timer' | 'stopwatch' | 'alarm' | 'worldclock'>('timer');

// Audio
const { selectedAudio, AUDIO_OPTIONS, volume, setVolume, previewSelected, playCompletion, playRinging } = useAudio();

// Alarms
const { setOnAlarmFire } = useAlarms();
setOnAlarmFire((alarm) => {
  console.log('Alarm firing:', alarm);
  playRinging();
});

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
const { history, fetchHistory, deleteHistory, formatDuration, formatTime } = useHistory();
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

// Presets
const { presets, addPreset, deletePreset, formatSeconds } = usePresets();
const showSavePreset = ref(false);
const presetNameInput = ref('');

function loadPreset(seconds: number) {
  if (status.value !== 'stopped') return;
  inputHr.value = Math.floor(seconds / 3600);
  inputMin.value = Math.floor((seconds % 3600) / 60);
  inputSec.value = seconds % 60;
}

function saveCurrentAsPreset() {
  if (totalSeconds.value < 1) return;
  const name = presetNameInput.value.trim() || formatSeconds(totalSeconds.value);
  addPreset(name, totalSeconds.value);
  presetNameInput.value = '';
  showSavePreset.value = false;
}

// Stopwatch ref for keyboard routing
const stopwatchRef = ref<InstanceType<typeof StopwatchView> | null>(null);
const alarmRef = ref<InstanceType<typeof AlarmView> | null>(null);
const worldClockRef = ref<InstanceType<typeof WorldClockView> | null>(null);

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
    <div class="app-wrapper">
      <!-- Top bar: context actions only -->
      <div class="top-bar">
        <span class="app-title">{{ activeTab === 'timer' ? 'Timer' : activeTab === 'stopwatch' ? 'Stopwatch' : activeTab === 'alarm' ? 'Alarm' : 'World Clock' }}</span>
        <div class="top-actions">
          <button v-if="activeTab === 'alarm'" class="top-btn" @click="alarmRef?.openAddForm()" aria-label="Add alarm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
          </button>
          <button v-if="activeTab === 'worldclock'" class="top-btn" @click="worldClockRef?.openCityPicker()" aria-label="Add city">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
            </svg>
          </button>
          <button class="top-btn theme-btn" @click="toggleTheme" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            <!-- Sun icon (light mode) -->
            <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <circle cx="8" cy="8" r="3"/>
              <line x1="8" y1="1" x2="8" y2="2.5"/>
              <line x1="8" y1="13.5" x2="8" y2="15"/>
              <line x1="1" y1="8" x2="2.5" y2="8"/>
              <line x1="13.5" y1="8" x2="15" y2="8"/>
              <line x1="3.05" y1="3.05" x2="4.1" y2="4.1"/>
              <line x1="11.9" y1="11.9" x2="12.95" y2="12.95"/>
              <line x1="12.95" y1="3.05" x2="11.9" y2="4.1"/>
              <line x1="4.1" y1="11.9" x2="3.05" y2="12.95"/>
            </svg>
            <!-- Moon icon (dark mode) -->
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Bottom navigation -->
      <nav class="bottom-nav">
        <button class="nav-item" :class="{ active: activeTab === 'timer' }" @click="activeTab = 'timer'">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="13" r="8"/>
            <polyline points="12 9 12 13 14.5 15.5"/>
            <line x1="9.5" y1="3" x2="14.5" y2="3"/>
          </svg>
          <span class="nav-label">Timer</span>
        </button>
        <button class="nav-item" :class="{ active: activeTab === 'stopwatch' }" @click="activeTab = 'stopwatch'">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="14" r="7"/>
            <polyline points="12 10 12 14"/>
            <line x1="9" y1="3" x2="15" y2="3"/>
            <line x1="22" y1="6" x2="19.5" y2="8.5"/>
          </svg>
          <span class="nav-label">Stopwatch</span>
        </button>
        <button class="nav-item" :class="{ active: activeTab === 'alarm' }" @click="activeTab = 'alarm'">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            <line x1="5" y1="3" x2="2" y2="6"/>
            <line x1="19" y1="3" x2="22" y2="6"/>
          </svg>
          <span class="nav-label">Alarm</span>
        </button>
        <button class="nav-item" :class="{ active: activeTab === 'worldclock' }" @click="activeTab = 'worldclock'">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 3C10 7 10 17 12 21M12 3C14 7 14 17 12 21"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
          </svg>
          <span class="nav-label">World Clock</span>
        </button>
      </nav>

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

        <!-- Presets -->
        <div class="presets-section">
          <div class="presets-header">
            <span class="presets-label">Presets</span>
            <button
              v-if="status === 'stopped' && totalSeconds > 0"
              class="preset-save-btn"
              @click="showSavePreset = !showSavePreset"
            >+ Save</button>
          </div>
          <div v-if="showSavePreset" class="preset-save-row">
            <input
              v-model="presetNameInput"
              class="preset-name-input"
              type="text"
              :placeholder="formatSeconds(totalSeconds)"
              @keydown.enter="saveCurrentAsPreset"
              @keydown.escape="showSavePreset = false"
            />
            <button class="preset-confirm-btn" @click="saveCurrentAsPreset">Save</button>
          </div>
          <div class="preset-chips">
            <div
              v-for="preset in presets"
              :key="preset.id"
              class="preset-chip"
              :class="{ disabled: status !== 'stopped' }"
              @click="loadPreset(preset.seconds)"
            >
              <span>{{ preset.name }}</span>
              <button
                class="preset-del"
                @click.stop="deletePreset(preset.id)"
                title="Delete preset"
              >×</button>
            </div>
          </div>
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
              <button class="h-delete" @click="deleteHistory(entry.id)">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Stopwatch tab -->
      <StopwatchView v-show="activeTab === 'stopwatch'" ref="stopwatchRef" />

      <!-- Alarm tab -->
      <AlarmView v-show="activeTab === 'alarm'" class="alarm-tab" ref="alarmRef" />

      <!-- World Clock tab -->
      <WorldClockView v-show="activeTab === 'worldclock'" class="alarm-tab" ref="worldClockRef" />

      <AlarmRingingOverlay />
    </div
>
  </main>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
}

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
  justify-content: flex-start;
  flex-direction: column;
  background-color: var(--bg);
  color: var(--text);
  position: relative;
  padding: 16px 20px 80px; /* bottom pad for nav */
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Top bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 4px;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}

.top-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.top-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
  transition: opacity 0.2s;
  line-height: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
}
.top-btn:hover { opacity: 0.75; }

/* Bottom navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 68px;
  background: var(--surface);
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
  backdrop-filter: blur(12px);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  flex: 1;
  padding: 8px 0 6px;
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: 0.2px;
}

.nav-item.active {
  color: var(--accent);
}

.nav-item:not(.active):hover {
  color: var(--text);
}

.app-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.alarm-tab {
  align-self: stretch;
}

.timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  width: 52px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 36px;
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
  font-size: 32px;
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
  font-family: inherit;
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
  gap: 14px;
}

button {
  padding: 14px 36px;
  border-radius: 980px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  color: white;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-start { background-color: var(--btn-start); }
.btn-pause { background-color: var(--btn-pause); }
.btn-stop  { background-color: var(--btn-stop); }

button:not(:disabled):hover  { opacity: 0.85; }
button:not(:disabled):active { opacity: 0.7; }

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

/* Presets */
.presets-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.presets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.presets-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.preset-save-btn {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 8px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.preset-save-btn:hover {
  opacity: 0.8;
}

.preset-save-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.preset-name-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.preset-name-input:focus {
  border-color: var(--accent);
}

.preset-confirm-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 980px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.preset-chip:not(.disabled):hover {
  border-color: var(--accent);
  color: var(--accent);
}

.preset-chip.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.preset-del {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.15s;
  font-family: inherit;
}

.preset-del:hover {
  color: var(--btn-stop);
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

.h-delete {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-entry:hover .h-delete {
  opacity: 1;
}

.h-delete:hover {
  background: var(--btn-stop);
  color: #fff;
  opacity: 1;
}
</style>
