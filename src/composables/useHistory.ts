import { ref } from 'vue';
import Database from '@tauri-apps/plugin-sql';

export interface HistoryEntry {
    id: number;
    duration: number;
    started_at: string;
    status: 'completed' | 'stopped';
}

async function getDb() {
    return Database.load('sqlite:chronos.db');
}

export function useHistory() {
    const history = ref<HistoryEntry[]>([]);

    async function fetchHistory() {
        try {
            const db = await getDb();
            const rows: HistoryEntry[] = await db.select(
                'SELECT id, duration, started_at, status FROM timer_history ORDER BY id DESC LIMIT 20'
            );
            history.value = rows;
        } catch (error) {
            console.error('Error fetching timer history:', error);
        }
    }

    async function deleteHistory(id: number) {
        try {
            const db = await getDb();
            await db.execute('DELETE FROM timer_history WHERE id=?', [id]);
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
