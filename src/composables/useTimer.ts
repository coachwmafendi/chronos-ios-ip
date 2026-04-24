import { ref, onUnmounted } from 'vue';
import Database from '@tauri-apps/plugin-sql';

async function getDb() {
    return Database.load('sqlite:chronos.db');
}

interface TimerRow {
    id: number;
    duration: number;
    status: string;
    end_time: string | null;
    started_at: string | null;
    paused_at: string | null;
}

export function useTimer(onComplete?: () => void) {
    const status = ref<'running' | 'paused' | 'stopped'>('stopped');
    const timeLeft = ref(0);
    const duration = ref(0);
    const end_time = ref<string | null>(null);
    let timerInterval: number | null = null;

    async function fetchStatus() {
        try {
            const db = await getDb();
            const rows: TimerRow[] = await db.select(
                'SELECT id, duration, status, end_time, started_at, paused_at FROM timer_state WHERE id=1'
            );
            if (!rows.length) return;
            const row = rows[0];
            status.value = row.status as 'running' | 'paused' | 'stopped';
            duration.value = row.duration ?? 0;
            end_time.value = row.end_time;

            if (row.status === 'running' && row.end_time) {
                const remaining = Math.max(0, Math.round((new Date(row.end_time).getTime() - Date.now()) / 1000));
                timeLeft.value = remaining;
                startTick();
            } else if (row.status === 'paused') {
                timeLeft.value = row.duration ?? 0;
            } else {
                timeLeft.value = 0;
            }
        } catch (error) {
            console.error('Error fetching timer status:', error);
        }
    }

    function startTick() {
        if (timerInterval) return;
        timerInterval = window.setInterval(() => {
            if (status.value === 'running') {
                if (timeLeft.value <= 0) {
                    clearInterval(timerInterval!);
                    timerInterval = null;
                    status.value = 'stopped';
                    stopTimer(true).then(() => onComplete?.());
                    return;
                }
                timeLeft.value = timeLeft.value - 1;
            }
        }, 1000);
    }

    async function startTimer(secs: number) {
        try {
            const db = await getDb();
            await db.execute(
                "UPDATE timer_state SET status='running', duration=?, end_time=datetime('now', '+' || ? || ' seconds'), started_at=datetime('now'), paused_at=NULL WHERE id=1",
                [secs, secs]
            );
            status.value = 'running';
            timeLeft.value = secs;
            duration.value = secs;
            startTick();
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }

    async function resumeTimer() {
        try {
            const db = await getDb();
            // duration field holds remaining seconds when paused
            await db.execute(
                "UPDATE timer_state SET status='running', end_time=datetime('now', '+' || duration || ' seconds'), paused_at=NULL WHERE id=1",
                []
            );
            status.value = 'running';
            startTick();
        } catch (error) {
            console.error('Error resuming timer:', error);
        }
    }

    async function pauseTimer() {
        try {
            const db = await getDb();
            // Store remaining seconds in duration for resume
            await db.execute(
                "UPDATE timer_state SET status='paused', duration=?, paused_at=datetime('now'), end_time=NULL WHERE id=1",
                [timeLeft.value]
            );
            status.value = 'paused';
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        } catch (error) {
            console.error('Error pausing timer:', error);
        }
    }

    async function stopTimer(completed = false) {
        try {
            const db = await getDb();
            // Record history if there was a meaningful timer
            if (duration.value > 0) {
                const histStatus = completed ? 'completed' : 'stopped';
                await db.execute(
                    "INSERT INTO timer_history (duration, started_at, status) VALUES (?, datetime('now'), ?)",
                    [duration.value, histStatus]
                );
            }
            await db.execute(
                "UPDATE timer_state SET status='stopped', end_time=NULL, started_at=NULL, paused_at=NULL, duration=0 WHERE id=1",
                []
            );
            status.value = 'stopped';
            timeLeft.value = 0;
            end_time.value = null;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
        }
    }

    onUnmounted(() => {
        if (timerInterval) clearInterval(timerInterval);
    });

    return {
        status,
        timeLeft,
        duration,
        end_time,
        fetchStatus,
        startTimer,
        resumeTimer,
        pauseTimer,
        stopTimer,
    };
}
