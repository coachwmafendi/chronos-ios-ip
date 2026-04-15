<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTimer } from './composables/useTimer';
import ClockDisplay from './components/ClockDisplay.vue';

const {
  status,
  timeLeft,
  fetchStatus,
  startTimer,
  resumeTimer,
  pauseTimer,
  stopTimer
} = useTimer();

const inputDuration = ref(60);

onMounted(() => {
  fetchStatus();
});

async function handleStart() {
  if (status.value === 'paused') {
    await resumeTimer();
  } else {
    await startTimer(inputDuration.value);
  }
}
</script>

<template>
  <main class="container">
    <div class="timer-wrapper">
      <ClockDisplay :remainingSeconds="timeLeft" :status="status" />

      <div class="controls">
        <div class="input-group">
          <label>Duration (s)</label>
          <input type="number" v-model.number="inputDuration" min="1" />
        </div>

        <div class="button-group">
          <button
            v-if="status === 'stopped' || status === 'paused'"
            @click="handleStart"
            class="btn-start"
          >
            Start
          </button>
          <button
            v-if="status === 'running'"
            @click="pauseTimer"
            class="btn-pause"
          >
            Pause
          </button>
          <button
            @click="stopTimer"
            class="btn-stop"
          >
            Stop
          </button>
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
  gap: 20px;
  align-items: center;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.input-group label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
}

.input-group input {
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 8px;
  border-radius: 8px;
  text-align: center;
  width: 80px;
}

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

.btn-start {
  background-color: #34c759;
  color: white;
}

.btn-pause {
  background-color: #ff9500;
  color: white;
}

.btn-stop {
  background-color: #ff3b30;
  color: white;
}

button:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

button:active {
  transform: scale(0.95);
}
</style>
