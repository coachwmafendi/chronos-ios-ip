import { ref } from 'vue';

export interface Preset {
    id: string;
    name: string;
    seconds: number;
}

const STORAGE_KEY = 'chronos-presets';

const DEFAULT_PRESETS: Preset[] = [
    { id: 'p1', name: '5 min', seconds: 300 },
    { id: 'p2', name: '10 min', seconds: 600 },
    { id: 'p3', name: '25 min', seconds: 1500 },
    { id: 'p4', name: '1 hour', seconds: 3600 },
];

function loadPresets(): Preset[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [...DEFAULT_PRESETS];
        return JSON.parse(raw);
    } catch {
        return [...DEFAULT_PRESETS];
    }
}

function saveToStorage(presets: Preset[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function usePresets() {
    const presets = ref<Preset[]>(loadPresets());

    function addPreset(name: string, seconds: number) {
        const id = `p${Date.now()}`;
        presets.value.push({ id, name, seconds });
        saveToStorage(presets.value);
    }

    function deletePreset(id: string) {
        presets.value = presets.value.filter(p => p.id !== id);
        saveToStorage(presets.value);
    }

    function formatSeconds(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return s > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${h}h ${m}m` : `${h}h`;
        if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
        return `${s}s`;
    }

    return {
        presets,
        addPreset,
        deletePreset,
        formatSeconds,
    };
}
