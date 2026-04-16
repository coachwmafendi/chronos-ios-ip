<template>
  <div class="clock-display">
    <div class="time-readout">{{ formattedTime }}</div>
    <div class="status-badge">{{ status }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  remainingSeconds: number;
  status: string;
}>();

const formattedTime = computed(() => {
  const total = Math.max(0, Math.floor(props.remainingSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
});
</script>

<style scoped>
.clock-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.time-readout {
  font-size: 80px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #fff;
  margin-bottom: 10px;
}

.status-badge {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #aaa;
}
</style>
