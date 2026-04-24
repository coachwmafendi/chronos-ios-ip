import { ref, onUnmounted } from 'vue';
import Database from '@tauri-apps/plugin-sql';

export interface Alarm {
    id: string;
    hour: number;
    minute: number;
    label: string;
    repeatDays: number[];  // 0=Sun … 6=Sat
    sound: string;
    enabled: boolean;
    snoozeEnabled: boolean;
    snoozeMinutes: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Global state for the currently ringing alarm
export const activeFiringAlarm = ref<Alarm | null>(null);

async function getDb() {
    return Database.load('sqlite:chronos.db');
}

function rowToAlarm(row: any): Alarm {
    return {
        id: String(row.id),
        hour: row.hour,
        minute: row.minute,
        label: row.label ?? '',
        repeatDays: typeof row.repeat_days === 'string' ? JSON.parse(row.repeat_days) : (row.repeat_days ?? []),
        sound: row.sound ?? 'alarm-bell',
        enabled: Boolean(row.enabled),
        snoozeEnabled: Boolean(row.snooze_enabled),
        snoozeMinutes: row.snooze_minutes ?? 5,
    };
}

async function loadAlarms(): Promise<Alarm[]> {
    try {
        const db = await getDb();
        const rows: any[] = await db.select(
            'SELECT id, label, hour, minute, repeat_days, sound, enabled, snooze_enabled, snooze_minutes FROM alarms ORDER BY hour, minute'
        );
        return rows.map(rowToAlarm);
    } catch {
        return [];
    }
}

export function useAlarms() {
    const alarms = ref<Alarm[]>([]);
    const firedAlarms = new Set<string>();
    const snoozedAlarms = new Map<string, number>();
    let checkInterval: number | null = null;
    let onAlarmFire: ((alarm: Alarm) => void) | null = null;

    async function refresh() {
        alarms.value = await loadAlarms();
    }

    async function addAlarm(alarm: Omit<Alarm, 'id'>) {
        const db = await getDb();
        await db.execute(
            'INSERT INTO alarms (label, hour, minute, repeat_days, sound, enabled, snooze_enabled, snooze_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                alarm.label || null,
                alarm.hour,
                alarm.minute,
                JSON.stringify(alarm.repeatDays),
                alarm.sound,
                alarm.enabled ? 1 : 0,
                alarm.snoozeEnabled ? 1 : 0,
                alarm.snoozeMinutes,
            ]
        );
        await refresh();
    }

    async function updateAlarm(id: string, updates: Partial<Omit<Alarm, 'id'>>) {
        const db = await getDb();
        const rows: any[] = await db.select('SELECT * FROM alarms WHERE id=?', [id]);
        if (!rows.length) return;
        const current = rowToAlarm(rows[0]);
        const merged = { ...current, ...updates };
        await db.execute(
            'UPDATE alarms SET label=?, hour=?, minute=?, repeat_days=?, sound=?, enabled=?, snooze_enabled=?, snooze_minutes=? WHERE id=?',
            [
                merged.label || null,
                merged.hour,
                merged.minute,
                JSON.stringify(merged.repeatDays),
                merged.sound,
                merged.enabled ? 1 : 0,
                merged.snoozeEnabled ? 1 : 0,
                merged.snoozeMinutes,
                id,
            ]
        );
        await refresh();
    }

    async function deleteAlarm(id: string) {
        const db = await getDb();
        await db.execute('DELETE FROM alarms WHERE id=?', [id]);
        await refresh();
    }

    async function toggleAlarm(id: string) {
        const db = await getDb();
        await db.execute('UPDATE alarms SET enabled = NOT enabled WHERE id=?', [id]);
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
            snoozedAlarms.set(id, Date.now() + alarm.snoozeMinutes * 60 * 1000);
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
