import { ref, onUnmounted } from 'vue';

export interface Lap {
    lapNumber: number;
    splitTime: number; // ms since previous lap (or since start for lap 1)
}

export function useStopwatch() {
    const status = ref<'stopped' | 'running' | 'paused'>('stopped');
    const elapsed = ref(0); // total elapsed ms
    const laps = ref<Lap[]>([]);

    let startTimestamp = 0;   // performance.now() when started/resumed
    let accumulatedMs = 0;    // ms accumulated before current run segment
    let rafId: number | null = null;

    function tick() {
        elapsed.value = accumulatedMs + (performance.now() - startTimestamp);
        rafId = requestAnimationFrame(tick);
    }

    function start() {
        if (status.value === 'stopped') {
            accumulatedMs = 0;
            elapsed.value = 0;
            laps.value = [];
        }
        startTimestamp = performance.now();
        status.value = 'running';
        rafId = requestAnimationFrame(tick);
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
    }

    function resume() {
        if (status.value !== 'paused') return;
        startTimestamp = performance.now();
        status.value = 'running';
        rafId = requestAnimationFrame(tick);
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
    }

    function recordLap() {
        if (status.value !== 'running') return;
        const totalElapsed = accumulatedMs + (performance.now() - startTimestamp);
        const previousLapsTotal = laps.value.reduce((sum, l) => sum + l.splitTime, 0);
        const splitTime = totalElapsed - previousLapsTotal;
        laps.value.unshift({
            lapNumber: laps.value.length + 1,
            splitTime,
        });
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

    return {
        status,
        elapsed,
        laps,
        start,
        stop,
        resume,
        reset,
        recordLap,
        formatElapsed,
    };
}
