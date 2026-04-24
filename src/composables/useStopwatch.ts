import { ref, onUnmounted } from 'vue';

export interface Lap {
    lapNumber: number;
    splitTime: number; // ms since previous lap
    totalTime: number; // total elapsed ms at this lap
}

interface StopwatchState {
    status: 'stopped' | 'running' | 'paused';
    accumulatedMs: number;
    startTimestamp: number | null;
    laps: Lap[];
}

const STORAGE_KEY = 'chronos-stopwatch';

export function useStopwatch() {
    const status = ref<'stopped' | 'running' | 'paused'>('stopped');
    const elapsed = ref(0);
    const laps = ref<Lap[]>([]);

    let startTimestamp = 0;
    let accumulatedMs = 0;
    let rafId: number | null = null;
    let lastLapTotalMs = 0;

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const state: StopwatchState = JSON.parse(raw);

            status.value = state.status;
            accumulatedMs = state.accumulatedMs;
            laps.value = state.laps;

            // Restore last lap total time
            if (laps.value.length > 0) {
                // Laps are unshifted (descending), so the last element is the first lap
                lastLapTotalMs = laps.value[laps.value.length - 1].totalTime;
            }

            if (state.status === 'running' && state.startTimestamp) {
                const now = Date.now();
                const start = state.startTimestamp;
                const delta = now - start;

                // Since we're resuming, we use absolute time delta
                // We can't use performance.now() because it reset on reload
                // So we simulate the first tick
                elapsed.value = accumulatedMs + delta;
                startTimestamp = performance.now() - delta;
                rafId = requestAnimationFrame(tick);
            } else {
                elapsed.value = accumulatedMs;
            }
        } catch (e) {
            console.error('Failed to load stopwatch state', e);
        }
    }

    function saveState() {
        const state: StopwatchState = {
            status: status.value,
            accumulatedMs,
            startTimestamp: status.value === 'running' ? Date.now() : null,
            laps: laps.value,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function tick() {
        elapsed.value = accumulatedMs + (performance.now() - startTimestamp);
        rafId = requestAnimationFrame(tick);
    }

    function start() {
        if (status.value === 'running') return;
        if (status.value === 'stopped') {
            accumulatedMs = 0;
            elapsed.value = 0;
            laps.value = [];
            lastLapTotalMs = 0;
        }
        startTimestamp = performance.now();
        status.value = 'running';
        rafId = requestAnimationFrame(tick);
        saveState();
    }

    function stop() {
        if (status.value !== 'running') return;
        accumulatedMs += performance.now() - startTimestamp;
        elapsed.value = accumulatedMs;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        status.value = 'paused';
        saveState();
    }

    function resume() {
        if (status.value !== 'paused') return;
        startTimestamp = performance.now();
        status.value = 'running';
        rafId = requestAnimationFrame(tick);
        saveState();
    }

    function reset() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        status.value = 'stopped';
        elapsed.value = 0;
        accumulatedMs = 0;
        laps.value = [];
        lastLapTotalMs = 0;
        saveState();
    }

    function clearLaps() {
        laps.value = [];
        lastLapTotalMs = 0;
        saveState();
    }

    function recordLap() {
        if (status.value !== 'running') return;
        const totalElapsed = accumulatedMs + (performance.now() - startTimestamp);
        const splitTime = totalElapsed - lastLapTotalMs;
        lastLapTotalMs = totalElapsed;
        laps.value.unshift({
            lapNumber: laps.value.length + 1,
            splitTime,
            totalTime: totalElapsed,
        });
        saveState();
    }

    function removeLap(index: number) {
        laps.value.splice(index, 1);
        // Re-index lap numbers
        laps.value.forEach((lap, i) => {
            lap.lapNumber = laps.value.length - i;
        });
        // Update lastLapTotalMs if we removed the earliest lap
        if (laps.value.length > 0) {
            lastLapTotalMs = laps.value[laps.value.length - 1].totalTime;
        } else {
            lastLapTotalMs = 0;
        }
        saveState();
    }

    function formatElapsed(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        const cs = String(centiseconds).padStart(2, '0');
        return `${mm}:${ss}.${cs}`;
    }

    onUnmounted(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
    });

    // Initialize state
    loadState();

    return {
        status,
        elapsed,
        laps,
        start,
        stop,
        resume,
        reset,
        recordLap,
        removeLap,
        clearLaps,
        formatElapsed,
    };
}
