<script setup lang="ts">
import { computed } from 'vue';
import { activeFiringAlarm, useAlarms } from '../composables/useAlarms';
import { useAudio } from '../composables/useAudio';

const { snoozeAlarm, stopAlarm } = useAlarms();
const { stopCurrentPlayback } = useAudio();

const alarm = computed(() => activeFiringAlarm.value);

function formatAlarmTime(hour: number, minute: string): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${minute} ${period}`;
}

function handleSnooze() {
  if (alarm.value) {
    stopCurrentPlayback();
    snoozeAlarm(alarm.value.id);
  }
}

function handleStop() {
  if (alarm.value) {
    stopCurrentPlayback();
    stopAlarm(alarm.value.id);
  }
}
</script>

<template>
  <div v-if="alarm" class="ringing-overlay">
    <div class="ringing-card">
      <div class="alarm-status">ALARM RINGING</div>
      <div class="alarm-time">{{ formatAlarmTime(alarm.hour, String(alarm.minute).padStart(2, '0')) }}</div>
      <div class="alarm-label">{{ alarm.label || 'Alarm' }}</div>

      <div class="action-group">
        <button class="btn-snooze" @click="handleSnooze">Snooze</button>
        <button class="btn-stop" @click="handleStop">Stop</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ringing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
  animation: pulse-bg 2s infinite;
}

@keyframes pulse-bg {
  0% { background: rgba(0, 0, 0, 0.8); }
  50% { background: rgba(50, 0, 0, 0.8); }
  100% { background: rgba(0, 0, 0, 0.8); }
}

.ringing-card {
  background: var(--surface);
  padding: 40px;
  border-radius: 32px;
  text-align: center;
  border: 1px solid var(--border);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  min-width: 300px;
}

.alarm-status {
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 20px;
  text-transform: uppercase;
}

.alarm-time {
  font-size: 64px;
  font-weight: 700;
  margin-bottom: 10px;
  font-variant-numeric: tabular-nums;
}

.alarm-label {
  font-size: 20px;
  color: var(--text-muted);
  margin-bottom: 40px;
}

.action-group {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-snooze, .btn-stop {
  padding: 16px 32px;
  border-radius: 980px;
  border: none;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s;
}

.btn-snooze {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-stop {
  background: var(--btn-stop);
  color: white;
}

.btn-snooze:active, .btn-stop:active {
  transform: scale(0.95);
}
</style>
