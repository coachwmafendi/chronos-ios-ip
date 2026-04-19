import { ref } from 'vue';
import api from '../services/api';

export interface HistoryEntry {
    id: number;
    duration: number;        // seconds
    started_at: string;      // ISO datetime string
    status: 'completed' | 'stopped';
    created_at: string;
}

export function useHistory() {
    const history = ref<HistoryEntry[]>([]);

    async function fetchHistory() {
        try {
            const { data } = await api.get('/timer/history');
            history.value = data;
        } catch (error) {
            console.error('Error fetching timer history:', error);
        }
    }

    async function deleteHistory(id: number) {
        try {
            await api.delete(`/timer/history/${id}`);
            history.value = history.value.filter(e => e.id !== id);
        } catch (error) {
            console.error('Error deleting history entry:', error);
        }
    }

    function formatDuration(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
    }

    function formatTime(isoString: string): string {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return {
        history,
        fetchHistory,
        deleteHistory,
        formatDuration,
        formatTime,
    };
}
