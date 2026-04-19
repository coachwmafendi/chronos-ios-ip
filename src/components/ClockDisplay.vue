<template>
  <div class="clock-display">
    <div class="ring-wrapper">
      <svg class="progress-ring" viewBox="0 0 240 240" width="240" height="240">
        <!-- Track -->
        <circle
          cx="120" cy="120" r="105"
          fill="none"
          stroke="var(--ring-track)"
          stroke-width="12"
        />
        <!-- Progress arc -->
        <circle
          cx="120" cy="120" r="105"
          fill="none"
          stroke="var(--accent)"
          stroke-width="12"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 120 120)"
          class="progress-arc"
        />
      </svg>
      <div class="clock-center">
        <div class="time-readout">{{ formattedTime }}</div>
        <div class="status-badge">{{ status }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  remainingSeconds: number;
  totalDuration: number;
  status: string;
}>();

const circumference = 2 * Math.PI * 105; // 659.73

const formattedTime = computed(() => {
  const total = Math.max(0, Math.floor(props.remainingSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
});

const dashOffset = computed(() => {
  if (!props.totalDuration || props.totalDuration === 0) return circumference;
  const progress = Math.max(0, Math.min(1, props.remainingSeconds / props.totalDuration));
  return circumference * (1 - progress);
});
</script>

<style scoped>
.clock-display {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.ring-wrapper {
  position: relative;
  width: 240px;
  height: 240px;
}

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
}

.progress-arc {
  transition: stroke-dashoffset 0.9s linear;
}

.clock-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.time-readout {
  font-size: 36px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1;
}

.status-badge {
  margin-top: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}
</style>
