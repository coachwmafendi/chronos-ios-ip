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

const API_BASE = 'http://127.0.0.1:8000/api/alarms';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Global state to track active firing alarm
export const activeFiringAlarm = ref<Alarm | null>(null);

async function loadAlarms(): Promise<Alarm[]> {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        // Map backend snake_case to frontend camelCase
        return data.map((a: any) => ({
            id: a.id.toString(),
            hour: a.hour,
            minute: a.minute,
            label: a.label,
            repeatDays: a.repeat_days || [],
            sound: a.sound,
            enabled: a.enabled,
            snoozeEnabled: a.snooze_enabled,
            snoozeMinutes: a.snooze_minutes,
        }));
    } catch {
        return [];
    }
}

export function useAlarms() {
    const alarms = ref<Alarm[]>([]);
    const firedAlarms = new Set<string>(); // track fired alarms by "id-HH:MM" to avoid re-firing
    const snoozedAlarms = new Map<string, number>(); // alarm id -> snooze fire timestamp (ms)
    let checkInterval: number | null = null;
    let onAlarmFire: ((alarm: Alarm) => void) | null = null;

    async function refresh() {
        alarms.value = await loadAlarms();
    }

    async function addAlarm(alarm: Omit<Alarm, 'id'>) {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...alarm,
                repeat_days: alarm.repeatDays,
                snooze_enabled: alarm.snoozeEnabled,
                snooze_minutes: alarm.snoozeMinutes,
            }),
        });
        if (res.ok) await refresh();
    }

    async function updateAlarm(id: string, updates: Partial<Omit<Alarm, 'id'>>) {
        const body: any = { ...updates };
        if ('repeatDays' in updates) body.repeat_days = updates.repeatDays;
        if ('snoozeEnabled' in updates) body.snooze_enabled = updates.snoozeEnabled;
        if ('snoozeMinutes' in updates) body.snooze_minutes = updates.snoozeMinutes;
        delete body.repeatDays;
        delete body.snoozeEnabled;
        delete body.snoozeMinutes;

        await fetch(`${API_BASE}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        await refresh();
    }

    async function deleteAlarm(id: string) {
        await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        await refresh();
    }

    async function toggleAlarm(id: string) {
        await fetch(`${API_BASE}/${id}/toggle`, { method: 'POST' });
        await refresh();
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

    function snoozeAlarm(id: string) {
        const alarm = alarms.value.find(a => a.id === id);
        if (alarm) {
            const nowMs = Date.now();
            snoozedAlarms.set(id, nowMs + alarm.snoozeMinutes * 60 * 1000);
            activeFiringAlarm.value = null;
        }
    }

    function stopAlarm(id: string) {
        snoozedAlarms.delete(id);
        activeFiringAlarm.value = null;
    }

    function checkAlarms() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const nowMs = now.getTime();

        for (const alarm of alarms.value) {
            if (!alarm.enabled) continue;

            const snoozeTime = snoozedAlarms.get(alarm.id);
            if (snoozeTime) {
                if (nowMs >= snoozeTime) {
                    snoozedAlarms.delete(alarm.id);
                    activeFiringAlarm.value = alarm;
                    if (onAlarmFire) onAlarmFire(alarm);
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
                    activeFiringAlarm.value = alarm;
                    if (onAlarmFire) onAlarmFire(alarm);
                    if (alarm.snoozeEnabled) {
                        snoozedAlarms.set(alarm.id, nowMs + alarm.snoozeMinutes * 60 * 1000);
                    }
                    if (alarm.repeatDays.length === 0 && !alarm.snoozeEnabled) {
                        toggleAlarm(alarm.id);
                    }
                }
            }
        }

        const currentKey = `${currentHour}:${currentMinute}`;
        for (const key of firedAlarms) {
            if (!key.endsWith(currentKey)) {
                firedAlarms.delete(key);
            }
        }
    }

    checkInterval = window.setInterval(checkAlarms, 1000);
    refresh();

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
        snoozeAlarm,
        stopAlarm,
        DAY_NAMES,
        refresh,
    };
}
