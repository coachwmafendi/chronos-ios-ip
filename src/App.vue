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
