import { ref, onUnmounted } from 'vue';

export interface Alarm {
    id: string;
    hour: number;       // 0-23
    minute: number;     // 0-59
    label: string;
    repeatDays: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
    sound: string;
    enabled: boolean;
    snoozeEnabled: boolean;
    snoozeMinutes: number;  // 1, 5, 10, 15, 30
}

const STORAGE_KEY = 'chronos-alarms';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function loadAlarms(): Alarm[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAlarms(alarms: Alarm[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

export function useAlarms() {
    const alarms = ref<Alarm[]>(loadAlarms());
    const firedAlarms = new Set<string>(); // track fired alarms by "id-HH:MM" to avoid re-firing
    const snoozedAlarms = new Map<string, number>(); // alarm id -> snooze fire timestamp (ms)
    let checkInterval: number | null = null;
    let onAlarmFire: ((alarm: Alarm) => void) | null = null;

    function persist() {
        saveAlarms(alarms.value);
    }

    function addAlarm(alarm: Omit<Alarm, 'id'>) {
        alarms.value.push({
            ...alarm,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        });
        persist();
    }

    function updateAlarm(id: string, updates: Partial<Omit<Alarm, 'id'>>) {
        const idx = alarms.value.findIndex(a => a.id === id);
        if (idx !== -1) {
            alarms.value[idx] = { ...alarms.value[idx], ...updates };
            persist();
        }
    }

    function deleteAlarm(id: string) {
        alarms.value = alarms.value.filter(a => a.id !== id);
        persist();
    }

    function toggleAlarm(id: string) {
        const alarm = alarms.value.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            persist();
        }
    }

    function formatTime12(hour: number, minute: number): { time: string; period: string } {
        const period = hour >= 12 ? 'PM' : 'AM';
        const h = hour % 12 || 12;
        const m = String(minute).padStart(2, '0');
        return { time: `${h}:${m}`, period };
    }

    function formatRepeatDays(days: number[]): string {
        if (days.length === 0) return 'Never';
        if (days.length === 7) return 'Every day';
        const weekdays = [1, 2, 3, 4, 5];
        const weekend = [0, 6];
        if (days.length === 5 && weekdays.every(d => days.includes(d))) return 'Weekdays';
        if (days.length === 2 && weekend.every(d => days.includes(d))) return 'Weekends';
        return days.map(d => DAY_NAMES[d]).join(', ');
    }

    function setOnAlarmFire(cb: (alarm: Alarm) => void) {
        onAlarmFire = cb;
    }

    function checkAlarms() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const nowMs = now.getTime();

        for (const alarm of alarms.value) {
            if (!alarm.enabled) continue;

            // Check snoozed alarms
            const snoozeTime = snoozedAlarms.get(alarm.id);
            if (snoozeTime) {
                if (nowMs >= snoozeTime) {
                    snoozedAlarms.delete(alarm.id);
                    if (onAlarmFire) onAlarmFire(alarm);
                    // Re-snooze if snooze is still enabled
                    if (alarm.snoozeEnabled) {
                        snoozedAlarms.set(alarm.id, nowMs + alarm.snoozeMinutes * 60 * 1000);
                    }
                }
                continue;
            }

            const fireKey = `${alarm.id}-${currentHour}:${currentMinute}`;
            if (firedAlarms.has(fireKey)) continue;

            if (alarm.hour === currentHour && alarm.minute === currentMinute) {
                const shouldFire = alarm.repeatDays.length === 0 || alarm.repeatDays.includes(currentDay);
                if (shouldFire) {
                    firedAlarms.add(fireKey);
                    if (onAlarmFire) onAlarmFire(alarm);
                    // Schedule snooze if enabled
                    if (alarm.snoozeEnabled) {
                        snoozedAlarms.set(alarm.id, nowMs + alarm.snoozeMinutes * 60 * 1000);
                    }
                    // Disable non-repeating alarms after firing
                    if (alarm.repeatDays.length === 0 && !alarm.snoozeEnabled) {
                        alarm.enabled = false;
                        persist();
                    }
                }
            }
        }

        // Clean up old fired keys (keep only current minute)
        const currentKey = `${currentHour}:${currentMinute}`;
        for (const key of firedAlarms) {
            if (!key.endsWith(currentKey)) {
                firedAlarms.delete(key);
            }
        }
    }

    // Start checking every 10 seconds
    checkInterval = window.setInterval(checkAlarms, 10000);

    onUnmounted(() => {
        if (checkInterval !== null) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    });

    return {
        alarms,
        addAlarm,
        updateAlarm,
        deleteAlarm,
        toggleAlarm,
        formatTime12,
        formatRepeatDays,
        setOnAlarmFire,
        DAY_NAMES,
    };
}
