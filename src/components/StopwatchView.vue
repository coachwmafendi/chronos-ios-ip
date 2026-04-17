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
