import { ref, onUnmounted } from 'vue';
import api from '../services/api';

export function useTimer(onComplete?: () => void) {
    const status = ref<'running' | 'paused' | 'stopped'>('stopped');
    const timeLeft = ref(0);
    const duration = ref(0); // total duration of current/last timer
    const end_time = ref<string | null>(null);
    let timerInterval: number | null = null;

    async function fetchStatus() {
        try {
            const { data } = await api.get('/timer/status');
            status.value = data.status;
            timeLeft.value = Math.round(data.remaining);
            duration.value = data.duration ?? 0;
            end_time.value = data.end_time;
            // Bug #3 fix: resume countdown if timer already running on mount
            if (data.status === 'running') {
                startTick();
            }
        } catch (error) {
            console.error('Error fetching timer status:', error);
        }
    }

    function startTick() {
        if (timerInterval) return;

        timerInterval = window.setInterval(() => {
            if (status.value === 'running') {
                // Bug #4 fix: stop interval immediately to prevent repeated calls
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
            const { data } = await api.post('/timer/start', { duration: secs });
            status.value = data.status;
            timeLeft.value = Math.round(data.remaining);
            duration.value = data.duration ?? secs;
            end_time.value = data.end_time;
            startTick();
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }

    // Bug #2 fix: separate resume function that doesn't send duration
    async function resumeTimer() {
        try {
            const { data } = await api.post('/timer/start', { resume: true });
            status.value = data.status;
            timeLeft.value = Math.round(data.remaining);
            duration.value = data.duration ?? duration.value;
            end_time.value = data.end_time;
            startTick();
        } catch (error) {
            console.error('Error resuming timer:', error);
        }
    }

    async function pauseTimer() {
        try {
            const { data } = await api.post('/timer/pause');
            status.value = data.status;
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
            const { data } = await api.post('/timer/stop', { completed });
            status.value = data.status;
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
