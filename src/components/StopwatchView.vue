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
    <div v-if="laps.length > 0" class="sw-laps-section">
      <div class="sw-laps">
        <div class="sw-laps-header">
          <span class="sw-lap-num">Lap</span>
          <span class="sw-lap-time">Split</span>
          <span class="sw-lap-time">Total</span>
          <span class="sw-lap-action"></span>
        </div>
        <div
          v-for="(lap, index) in laps"
          :key="lap.lapNumber"
          class="sw-lap-row"
          :class="{
            'lap-fastest': isFastest(lap.splitTime),
            'lap-slowest': isSlowest(lap.splitTime)
          }"
        >
          <span class="sw-lap-num">#{{ lap.lapNumber }}</span>
          <span class="sw-lap-time">{{ formatElapsed(lap.splitTime) }}</span>
          <span class="sw-lap-time">{{ formatElapsed(lap.totalTime) }}</span>
          <button class="sw-lap-del" @click="removeLap(index)">×</button>
        </div>
      </div>
      <button class="sw-clear-laps" @click="clearLaps">Clear Laps</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
  removeLap,
  clearLaps,
  formatElapsed,
} = useStopwatch();

const minSplit = computed(() => {
  if (laps.value.length === 0) return Infinity;
  return Math.min(...laps.value.map(l => l.splitTime));
});

const maxSplit = computed(() => {
  if (laps.value.length === 0) return -Infinity;
  return Math.max(...laps.value.map(l => l.splitTime));
});

function isFastest(time: number) {
  if (laps.value.length <= 1) return false;
  return time === minSplit.value;
}

function isSlowest(time: number) {
  if (laps.value.length <= 1) return false;
  return time === maxSplit.value;
}

defineExpose({ status, start, stop, resume, reset, recordLap });
</script>

<style scoped>
.stopwatch-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 420px;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.sw-time {
  font-size: 64px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1;
  font-family: inherit;
}

.sw-status {
  font-size: 13px;
  font-family: inherit;
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
  gap: 14px;
}

.sw-buttons {
  display: flex;
  gap: 14px;
}

.sw-buttons button {
  padding: 14px 36px;
  font-size: 16px;
  font-family: inherit;
  border-radius: 980px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  transition: opacity 0.2s;
}

.sw-buttons button:hover {
  opacity: 0.85;
}

.sw-buttons button:active {
  opacity: 0.7;
}

.sw-buttons .btn-start {
  background-color: var(--btn-start);
}

.sw-buttons .btn-stop {
  background-color: var(--btn-stop);
}

.sw-buttons .btn-lap {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.sw-kbd-hint {
  display: flex;
  gap: 16px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-muted);
}

.sw-kbd-hint kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: inherit;
}

.sw-laps {
  width: 100%;
  background: var(--surface);
  border-radius: 10px;
  padding: 0;
  max-height: 240px;
  overflow-y: auto;
}

.sw-laps-header {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}

.sw-lap-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 16px;
  font-family: inherit;
  border-bottom: 1px solid var(--border);
}

.sw-lap-row.lap-fastest .sw-lap-time {
  color: var(--btn-start);
}

.sw-lap-row.lap-slowest .sw-lap-time {
  color: var(--btn-stop);
}

.sw-lap-row:last-child {
  border-bottom: none;
}

.sw-lap-num {
  color: var(--text-muted);
  width: 40px;
  text-align: left;
}

.sw-lap-time {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--text);
  width: 80px;
  text-align: right;
}

.sw-lap-action {
  width: 30px;
  text-align: right;
}

.sw-lap-del {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.sw-lap-del:hover {
  color: var(--btn-stop);
}

.sw-laps-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sw-clear-laps {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 980px;
  padding: 8px 20px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  align-self: center;
  transition: border-color 0.2s, color 0.2s;
}

.sw-clear-laps:hover {
  border-color: var(--btn-stop);
  color: var(--btn-stop);
}
</style>
