import { ref } from 'vue';

export interface AudioOption {
    label: string;
    id: string;
}

const AUDIO_OPTIONS: AudioOption[] = [
    { label: 'Alarm Bell',      id: 'alarm-bell' },
    { label: 'Digital Beep',    id: 'digital-beep' },
    { label: 'Gentle Chime',    id: 'gentle-chime' },
    { label: 'Radar',           id: 'radar' },
    { label: 'Notification Pop',id: 'notification-pop' },
    { label: 'Rain Drop',       id: 'rain-drop' },
    { label: 'Forest Tone',     id: 'forest-tone' },
    { label: 'Ocean Wave',      id: 'ocean-wave' },
    { label: 'Success Fanfare', id: 'success-fanfare' },
    { label: 'Zen Bowl',        id: 'zen-bowl' },
];

// Natural duration of each sound in seconds — used to schedule loop repeats
const SOUND_DURATIONS: Record<string, number> = {
    'alarm-bell':       0.9,
    'digital-beep':     0.25,
    'gentle-chime':     1.5,
    'radar':            0.35,
    'notification-pop': 0.2,
    'rain-drop':        0.25,
    'forest-tone':      1.6,
    'ocean-wave':       0.85,
    'success-fanfare':  0.9,
    'zen-bowl':         3.1,
};

type SoundFn = (ctx: AudioContext) => void;

// Module-level singleton AudioContext to prevent resource exhaustion
let sharedCtx: AudioContext | null = null;
// Pending loop timer — cleared when stopping playback
let loopTimer: number | null = null;

function getContext(): AudioContext {
    if (!sharedCtx || sharedCtx.state === 'closed') {
        sharedCtx = new AudioContext();
    }
    return sharedCtx;
}

function stopCurrentPlayback() {
    if (loopTimer !== null) {
        clearTimeout(loopTimer);
        loopTimer = null;
    }
}

const SOUNDS: Record<string, SoundFn> = {
    'alarm-bell': (ctx) => {
        // Repeating bell: 880Hz sine, 3 rings
        const times = [0, 0.3, 0.6];
        times.forEach(t => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.6, ctx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.25);
        });
    },
    'digital-beep': (ctx) => {
        // Sharp square wave beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },
    'gentle-chime': (ctx) => {
        // Soft sine wave chime, slow decay
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 1.0);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 1.0);
        });
    },
    'radar': (ctx) => {
        // Ascending ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    },
    'notification-pop': (ctx) => {
        // Short pop: descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },
    'rain-drop': (ctx) => {
        // High-pitched pluck
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },
    'forest-tone': (ctx) => {
        // Low warm tone with harmonics
        [220, 330, 440].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2 / (i + 1), ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.5);
        });
    },
    'ocean-wave': (ctx) => {
        // Noise burst (white noise via buffer)
        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        source.buffer = buffer;
        source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        source.start(ctx.currentTime);
        source.stop(ctx.currentTime + 0.8);
    },
    'success-fanfare': (ctx) => {
        // 4-note ascending fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
    },
    'zen-bowl': (ctx) => {
        // Long, pure 432Hz sine tone — slow fade
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 432;
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 3.0);
    },
};

/**
 * Play a sound on loop for the given total duration (seconds).
 * Stops any currently running playback before starting.
 */
function playForDuration(id: string, totalSeconds: number) {
    stopCurrentPlayback();

    const soundFn = SOUNDS[id];
    if (!soundFn) return;

    const soundDuration = (SOUND_DURATIONS[id] ?? 1) * 1000; // ms
    const endAt = Date.now() + totalSeconds * 1000;

    try {
        const ctx = getContext();
        if (ctx.state === 'suspended') ctx.resume();

        function playLoop() {
            if (Date.now() >= endAt) return;
            soundFn(ctx);
            const remaining = endAt - Date.now();
            // Schedule next repetition; don't exceed remaining time
            loopTimer = window.setTimeout(playLoop, Math.min(soundDuration, remaining));
        }

        playLoop();
    } catch (err) {
        console.error('Failed to play audio:', err);
    }
}

export function useAudio() {
    const selectedAudio = ref<string>(AUDIO_OPTIONS[0].id);

    // Preview: play for 5 seconds
    function previewSelected() {
        playForDuration(selectedAudio.value, 5);
    }

    // Completion: play for 12 seconds
    function playCompletion() {
        playForDuration(selectedAudio.value, 12);
    }

    return {
        selectedAudio,
        AUDIO_OPTIONS,
        previewSelected,
        playCompletion,
    };
}
