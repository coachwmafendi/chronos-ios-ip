import { ref } from 'vue';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'timerx-theme';

export function useTheme() {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark';
    const theme = ref<Theme>(saved);

    function applyTheme(t: Theme) {
        if (t === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
        localStorage.setItem(STORAGE_KEY, t);
    }

    function toggleTheme() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark';
        applyTheme(theme.value);
    }

    function initTheme() {
        applyTheme(theme.value);
    }

    return { theme, toggleTheme, initTheme };
}
