<template>
  <div class="clock-display">
    <div class="ring-wrapper">
      <svg class="progress-ring" viewBox="0 0 260 260" width="260" height="260">
        <!-- Track -->
        <circle
          cx="130" cy="130" r="110"
          fill="none"
          stroke="var(--ring-track)"
          stroke-width="16"
        />
        <!-- Progress arc -->
        <circle
          cx="130" cy="130" r="110"
          fill="none"
          stroke="var(--accent)"
          stroke-width="16"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 130 130)"
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

const circumference = 2 * Math.PI * 110; // 691.15

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
  width: 260px;
  height: 260px;
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
  font-size: 52px;
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
