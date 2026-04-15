import { ref, onUnmounted } from 'vue';
import api from '../services/api';

export function useTimer() {
    const status = ref<'running' | 'paused' | 'stopped'>('stopped');
    const timeLeft = ref(0);
    const end_time = ref<string | null>(null);
    let timerInterval: number | null = null;

    async function fetchStatus() {
        try {
            const { data } = await api.get('/timer/status');
            status.value = data.status;
            timeLeft.value = data.remaining;
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
                if (timeLeft.value <= 0) {
                    // Bug #4 fix: stop interval immediately to prevent repeated calls
                    clearInterval(timerInterval!);
                    timerInterval = null;
                    status.value = 'stopped';
                    triggerNotification();
                    stopTimer();
                    return;
                }
                timeLeft.value = timeLeft.value - 1;
            }
        }, 1000);
    }

    async function triggerNotification() {
        try {
            if (!("Notification" in window)) {
                throw new Error("This browser does not support desktop notifications");
            }

            if (Notification.permission === "granted") {
                new Notification("Timer Finished!", {
                    body: "Your timer has reached zero.",
                });
            } else if (Notification.permission !== "denied") {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    new Notification("Timer Finished!", {
                        body: "Your timer has reached zero.",
                    });
                }
            }
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    async function startTimer(duration: number) {
        try {
            const { data } = await api.post('/timer/start', { duration });
            status.value = data.status;
            timeLeft.value = data.remaining;
            end_time.value = data.end_time;
            startTick();
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }

    // Bug #2 fix: separate resume function that doesn't send duration
    async function resumeTimer() {
        try {
            const { data } = await api.post('/timer/start', {});
            status.value = data.status;
            timeLeft.value = data.remaining;
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

    async function stopTimer() {
        try {
            const { data } = await api.post('/timer/stop');
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
        end_time,
        fetchStatus,
        startTimer,
        resumeTimer,
        pauseTimer,
        stopTimer
    };
}
