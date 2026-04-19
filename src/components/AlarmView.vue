<template>
  <div class="alarm-view">
    <!-- Add/Edit alarm form -->
    <div v-if="showForm" class="alarm-form-card">
      <div class="form-body">
        <span class="form-title">{{ editingId ? 'Edit Alarm' : 'New Alarm' }}</span>

        <!-- Flip-clock time picker -->
        <div class="flip-clock">
          <div class="flip-clock-row">
            <div
              class="flip-tile"
              :class="{ focused: focusedField === 'hour' }"
              tabindex="0"
              @click="focusedField = 'hour'"
              @focus="focusedField = 'hour'"
              @blur="focusedField = null"
              @wheel.prevent="scrollDigit('hour', $event)"
              @keydown="handleTileKey('hour', $event)"
            >
              <span class="flip-value">{{ padTwo(formHour) }}</span>
              <div class="flip-arrows">
                <button class="arrow-btn" @click.stop="nudge('hour', 1)">&#9650;</button>
                <button class="arrow-btn" @click.stop="nudge('hour', -1)">&#9660;</button>
              </div>
            </div>
            <div class="flip-colon">
              <span class="colon-dot"></span>
              <span class="colon-dot"></span>
            </div>
            <div
              class="flip-tile"
              :class="{ focused: focusedField === 'minute' }"
              tabindex="0"
              @click="focusedField = 'minute'"
              @focus="focusedField = 'minute'"
              @blur="focusedField = null"
              @wheel.prevent="scrollDigit('minute', $event)"
              @keydown="handleTileKey('minute', $event)"
            >
              <span class="flip-value">{{ padTwo(formMinute) }}</span>
              <div class="flip-arrows">
                <button class="arrow-btn" @click.stop="nudge('minute', 1)">&#9650;</button>
                <button class="arrow-btn" @click.stop="nudge('minute', -1)">&#9660;</button>
              </div>
            </div>
          </div>
          <div class="period-row">
            <button
              class="period-btn"
              :class="{ active: formPeriod === 'AM' }"
              @click="formPeriod = 'AM'"
            >AM</button>
            <button
              class="period-btn"
              :class="{ active: formPeriod === 'PM' }"
              @click="formPeriod = 'PM'"
            >PM</button>
          </div>
        </div>

        <!-- Label -->
        <div class="form-field">
          <label>Label</label>
          <input v-model="formLabel" type="text" placeholder="Alarm" class="form-input" />
        </div>

        <!-- Repeat days -->
        <div class="form-field">
          <label>Repeat</label>
          <div class="day-chips">
            <button
              v-for="(name, idx) in DAY_NAMES"
              :key="idx"
              class="day-chip"
              :class="{ active: formDays.includes(idx) }"
              @click="toggleDay(idx)"
            >
              {{ name.charAt(0) }}
            </button>
          </div>
        </div>

        <!-- Sound -->
        <div class="form-field">
          <label>Sound</label>
          <select v-model="formSound" class="form-input">
            <option v-for="opt in AUDIO_OPTIONS" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Snooze -->
        <div class="form-field">
          <label>Snooze</label>
          <div class="snooze-row">
            <label class="toggle" @click.stop>
              <input type="checkbox" v-model="formSnoozeEnabled" />
              <span class="toggle-slider"></span>
            </label>
            <select
              v-if="formSnoozeEnabled"
              v-model.number="formSnoozeMinutes"
              class="snooze-select"
            >
              <option :value="1">1 min</option>
              <option :value="5">5 min</option>
              <option :value="10">10 min</option>
              <option :value="15">15 min</option>
              <option :value="30">30 min</option>
            </select>
            <span v-else class="snooze-off">Off</span>
          </div>
        </div>
        <!-- Action buttons -->
        <div class="form-actions">
          <button class="action-btn cancel-btn" @click="cancelForm">Cancel</button>
          <button class="action-btn save-btn" @click="saveForm">Save</button>
        </div>
      </div>
    </div>

    <!-- Alarm list -->
    <template v-if="!showForm">
      <div v-if="alarms.length === 0" class="alarm-empty">
        No alarms yet
      </div>

      <div v-if="alarms.length > 0" class="alarm-grid">
      <div
        v-for="alarm in alarms"
        :key="alarm.id"
        class="alarm-card"
        @click="editAlarm(alarm)"
      >
        <div class="alarm-card-content">
          <div class="alarm-time-row">
            <span class="alarm-time">{{ formatTime12(alarm.hour, alarm.minute).time }}</span>
            <span class="alarm-period">{{ formatTime12(alarm.hour, alarm.minute).period }}</span>
          </div>
          <div class="alarm-label">{{ alarm.label || 'Alarm' }}</div>
          <div class="alarm-meta">Repeat: {{ formatRepeatDays(alarm.repeatDays) }}</div>
          <div class="alarm-meta">Sound: {{ getSoundLabel(alarm.sound) }}</div>
          <div v-if="alarm.snoozeEnabled" class="alarm-meta">Snooze: {{ alarm.snoozeMinutes }} min</div>
          <div class="alarm-card-footer">
            <label class="toggle" @click.stop>
              <input
                type="checkbox"
                :checked="alarm.enabled"
                @change="toggleAlarm(alarm.id)"
              />
              <span class="toggle-slider"></span>
            </label>
            <button class="alarm-delete" @click.stop="deleteAlarm(alarm.id)">Delete</button>
          </div>
        </div>
      </div>

      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAlarms, type Alarm } from '../composables/useAlarms';
import { useAudio } from '../composables/useAudio';

const {
  alarms,
  addAlarm,
  updateAlarm,
  deleteAlarm,
  toggleAlarm,
  formatTime12,
  formatRepeatDays,
  setOnAlarmFire,
  DAY_NAMES,
} = useAlarms();

const { AUDIO_OPTIONS, playCompletion } = useAudio();

setOnAlarmFire(() => {
  playCompletion();
});

const showForm = ref(false);
const editingId = ref<string | null>(null);
const formHour = ref(7);
const formMinute = ref(0);
const formPeriod = ref<'AM' | 'PM'>('AM');
const formLabel = ref('');
const formDays = ref<number[]>([]);
const formSound = ref('alarm-bell');
const formSnoozeEnabled = ref(true);
const formSnoozeMinutes = ref(5);
const focusedField = ref<'hour' | 'minute' | null>(null);

function getSoundLabel(id: string): string {
  return AUDIO_OPTIONS.find(o => o.id === id)?.label ?? id;
}

function toggleDay(day: number) {
  const idx = formDays.value.indexOf(day);
  if (idx >= 0) formDays.value.splice(idx, 1);
  else formDays.value.push(day);
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

function nudge(field: 'hour' | 'minute', dir: number) {
  if (field === 'hour') {
    formHour.value = ((formHour.value - 1 + dir + 12) % 12) + 1;
  } else {
    formMinute.value = (formMinute.value + dir + 60) % 60;
  }
}

function scrollDigit(field: 'hour' | 'minute', e: WheelEvent) {
  nudge(field, e.deltaY < 0 ? 1 : -1);
}

const numBuffer = ref('');
let numTimer: number | null = null;

function handleTileKey(field: 'hour' | 'minute', e: KeyboardEvent) {
  if (e.code === 'ArrowUp') {
    e.preventDefault();
    nudge(field, 1);
    return;
  }
  if (e.code === 'ArrowDown') {
    e.preventDefault();
    nudge(field, -1);
    return;
  }

  // Number keys (main keyboard + numpad)
  const digit = e.key;
  if (/^[0-9]$/.test(digit)) {
    e.preventDefault();
    if (numTimer) clearTimeout(numTimer);
    numBuffer.value += digit;

    if (numBuffer.value.length >= 2) {
      applyNumBuffer(field);
    } else {
      numTimer = window.setTimeout(() => applyNumBuffer(field), 800);
    }
  }
}

function applyNumBuffer(field: 'hour' | 'minute') {
  const val = parseInt(numBuffer.value, 10);
  numBuffer.value = '';
  if (numTimer) { clearTimeout(numTimer); numTimer = null; }

  if (field === 'hour') {
    formHour.value = Math.min(12, Math.max(1, val || 1));
  } else {
    formMinute.value = Math.min(59, Math.max(0, val));
  }
}

function openAddForm() {
  editingId.value = null;
  const now = new Date();
  const h = now.getHours();
  formHour.value = h % 12 || 12;
  formMinute.value = now.getMinutes();
  formPeriod.value = h >= 12 ? 'PM' : 'AM';
  formLabel.value = '';
  formDays.value = [];
  formSound.value = 'alarm-bell';
  formSnoozeEnabled.value = true;
  formSnoozeMinutes.value = 5;
  showForm.value = true;
}

function editAlarm(alarm: Alarm) {
  editingId.value = alarm.id;
  const h = alarm.hour % 12 || 12;
  formHour.value = h;
  formMinute.value = alarm.minute;
  formPeriod.value = alarm.hour >= 12 ? 'PM' : 'AM';
  formLabel.value = alarm.label;
  formDays.value = [...alarm.repeatDays];
  formSound.value = alarm.sound;
  formSnoozeEnabled.value = alarm.snoozeEnabled ?? false;
  formSnoozeMinutes.value = alarm.snoozeMinutes ?? 5;
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  editingId.value = null;
}

function saveForm() {
  let hour24 = formHour.value;
  if (formPeriod.value === 'PM' && hour24 !== 12) hour24 += 12;
  if (formPeriod.value === 'AM' && hour24 === 12) hour24 = 0;

  const data = {
    hour: hour24,
    minute: formMinute.value,
    label: formLabel.value,
    repeatDays: [...formDays.value].sort(),
    sound: formSound.value,
    enabled: true,
    snoozeEnabled: formSnoozeEnabled.value,
    snoozeMinutes: formSnoozeMinutes.value,
  };

  if (editingId.value) {
    updateAlarm(editingId.value, data);
  } else {
    addAlarm(data);
  }

  showForm.value = false;
  editingId.value = null;
}

defineExpose({ openAddForm });
</script>

<style scoped>
.alarm-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Alarm grid */
.alarm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  width: 100%;
}

/* Alarm cards */
.alarm-card {
  background: var(--surface);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.alarm-card:hover {
  opacity: 0.85;
}

.alarm-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alarm-time-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.alarm-time {
  font-size: 48px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1;
}

.alarm-period {
  font-size: 20px;
  font-weight: 500;
  color: var(--text);
}

.alarm-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  margin-top: 4px;
}

.alarm-meta {
  font-size: 14px;
  color: var(--text-muted);
}

.alarm-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

/* Toggle switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 30px;
  cursor: pointer;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 30px;
  transition: background 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* Delete button */
.alarm-delete {
  background: none;
  border: none;
  color: var(--btn-stop);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
}

.alarm-delete:hover {
  opacity: 0.7;
}

/* Empty state */
.alarm-empty {
  font-size: 16px;
  color: var(--text-muted);
  padding: 40px 0;
}


/* ── Form card ── */
.alarm-form-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border-radius: 16px;
  padding: 24px;
  align-self: center;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.action-btn {
  padding: 10px 24px;
  border-radius: 980px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  opacity: 0.85;
}

.save-btn {
  background: var(--accent);
  color: #fff;
}

.cancel-btn {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

/* ── Flip-clock time picker ── */
.flip-clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.flip-clock-row {
  display: flex;
  align-items: center;
  gap: 0;
}

.flip-tile {
  width: 72px;
  height: 72px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: background 0.2s, border-color 0.2s;
}

.flip-tile:first-child {
  border-radius: 12px 0 0 12px;
}

.flip-tile:last-child {
  border-radius: 0 12px 12px 0;
}

.flip-tile.focused {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.flip-value {
  font-size: 36px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  user-select: none;
}

.flip-arrows {
  position: absolute;
  right: 4px;
  top: 4px;
  bottom: 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.2s;
}

.flip-tile:hover .flip-arrows,
.flip-tile.focused .flip-arrows {
  opacity: 0.7;
}

.arrow-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 8px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.flip-colon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 20px;
  height: 72px;
}

.colon-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}

/* AM/PM row */
.period-row {
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.period-btn {
  padding: 8px 24px;
  border: none;
  background: var(--bg);
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.period-btn + .period-btn {
  border-left: 1px solid var(--border);
}

.period-btn.active {
  background: var(--border);
  color: var(--text);
}

.period-btn:hover {
  opacity: 0.85;
}

/* ── Form fields ── */
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
}

.form-input:focus {
  border-color: var(--accent);
}

/* Day chips */
.day-chips {
  display: flex;
  gap: 6px;
}

.day-chip {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.day-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.day-chip:hover {
  opacity: 0.8;
}

/* Snooze */
.snooze-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.snooze-select {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}

.snooze-select:focus {
  border-color: var(--accent);
}

.snooze-off {
  font-size: 14px;
  color: var(--text-muted);
}
</style>
