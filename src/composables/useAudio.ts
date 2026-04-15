import { ref } from 'vue';

export interface AudioOption {
    label: string;
    id: string;
}

export const AUDIO_OPTIONS: AudioOption[] = [
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

type SoundFn = (ctx: AudioContext) => void;

const SOUNDS: Record<string, SoundFn> = {
    'alarm-bell': (ctx) => {
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
    },
    'success-fanfare': (ctx) => {
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

export function useAudio() {
    const selectedAudio = ref<string>(AUDIO_OPTIONS[0].id);

    function playSound(id: string) {
        const soundFn = SOUNDS[id];
        if (!soundFn) return;
        try {
            const ctx = new AudioContext();
            soundFn(ctx);
        } catch (err) {
            console.error('Failed to play audio:', err);
        }
    }

    function previewSelected() {
        playSound(selectedAudio.value);
    }

    function playCompletion() {
        playSound(selectedAudio.value);
    }

    return {
        selectedAudio,
        AUDIO_OPTIONS,
        previewSelected,
        playCompletion,
    };
}
