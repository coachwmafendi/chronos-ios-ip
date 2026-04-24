import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface City {
    name: string;
    country: string;
    timezone: string;
    lat: number;
    lng: number;
}

const MAX_CITIES = 9;

export const CITY_LIST: City[] = [
    { name: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur', lat: 3.14, lng: 101.69 },
    { name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', lat: 1.35, lng: 103.82 },
    { name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', lat: 35.68, lng: 139.69 },
    { name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', lat: 37.57, lng: 126.98 },
    { name: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai', lat: 31.23, lng: 121.47 },
    { name: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai', lat: 25.20, lng: 55.27 },
    { name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', lat: 19.08, lng: 72.88 },
    { name: 'Jakarta', country: 'Indonesia', timezone: 'Asia/Jakarta', lat: -6.21, lng: 106.85 },
    { name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', lat: 13.76, lng: 100.50 },
    { name: 'London', country: 'United Kingdom', timezone: 'Europe/London', lat: 51.51, lng: -0.13 },
    { name: 'Paris', country: 'France', timezone: 'Europe/Paris', lat: 48.86, lng: 2.35 },
    { name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', lat: 52.52, lng: 13.41 },
    { name: 'Moscow', country: 'Russia', timezone: 'Europe/Moscow', lat: 55.76, lng: 37.62 },
    { name: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', lat: 41.01, lng: 28.98 },
    { name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', lat: 30.04, lng: 31.24 },
    { name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos', lat: 6.52, lng: 3.38 },
    { name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', lat: -1.29, lng: 36.82 },
    { name: 'New York', country: 'United States', timezone: 'America/New_York', lat: 40.71, lng: -74.01 },
    { name: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', lat: 34.05, lng: -118.24 },
    { name: 'Chicago', country: 'United States', timezone: 'America/Chicago', lat: 41.88, lng: -87.63 },
    { name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', lat: 43.65, lng: -79.38 },
    { name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', lat: -23.55, lng: -46.63 },
    { name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', lat: 19.43, lng: -99.13 },
    { name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', lat: -33.87, lng: 151.21 },
    { name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', lat: -36.85, lng: 174.76 },
    { name: 'Honolulu', country: 'United States', timezone: 'Pacific/Honolulu', lat: 21.31, lng: -157.86 },
    { name: 'Anchorage', country: 'United States', timezone: 'America/Anchorage', lat: 61.22, lng: -149.90 },
    { name: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', lat: 24.71, lng: 46.68 },
    { name: 'Mecca', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', lat: 21.39, lng: 39.86 },
    { name: 'Medina', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', lat: 24.47, lng: 39.61 },
    { name: 'Baitul Muqaddas', country: 'Palestine', timezone: 'Asia/Jerusalem', lat: 31.77, lng: 35.23 },
];

const STORAGE_KEY = 'chronos-worldclock-cities';

function loadSavedCities(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : ['Kuala Lumpur'];
    } catch {
        return ['Kuala Lumpur'];
    }
}

function saveCities(names: string[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

export function useWorldClock() {
    const savedNames = loadSavedCities();
    const selectedCities = ref<City[]>(
        savedNames.map(n => CITY_LIST.find(c => c.name === n)!).filter(Boolean)
    );
    const activeCityIndex = ref(0);
    const now = ref(new Date());
    let timer: number | null = null;

    function tick() {
        now.value = new Date();
        timer = requestAnimationFrame(tick);
    }

    onMounted(() => {
        timer = requestAnimationFrame(tick);
    });

    onUnmounted(() => {
        if (timer !== null) cancelAnimationFrame(timer);
    });

    function addCity(city: City) {
        if (selectedCities.value.length >= MAX_CITIES) return;
        if (!selectedCities.value.find(c => c.name === city.name)) {
            selectedCities.value.push(city);
            saveCities(selectedCities.value.map(c => c.name));
        }
    }

    function isMaxReached() {
        return selectedCities.value.length >= MAX_CITIES;
    }

    function removeCity(name: string) {
        selectedCities.value = selectedCities.value.filter(c => c.name !== name);
        if (activeCityIndex.value >= selectedCities.value.length) {
            activeCityIndex.value = Math.max(0, selectedCities.value.length - 1);
        }
        saveCities(selectedCities.value.map(c => c.name));
    }

    const activeCity = computed(() => selectedCities.value[activeCityIndex.value] || null);

    function getCityTime(city: City): Date {
        const str = now.value.toLocaleString('en-US', { timeZone: city.timezone });
        return new Date(str);
    }

    function formatCityTime(city: City): string {
        return now.value.toLocaleTimeString('en-US', {
            timeZone: city.timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }

    function getOffsetLabel(city: City): string {
        const localOffset = now.value.getTimezoneOffset(); // in minutes, inverted
        const cityStr = now.value.toLocaleString('en-US', { timeZone: city.timezone });
        const cityDate = new Date(cityStr);
        const utcStr = now.value.toLocaleString('en-US', { timeZone: 'UTC' });
        const utcDate = new Date(utcStr);
        const cityOffsetMin = (cityDate.getTime() - utcDate.getTime()) / 60000;
        const localOffsetMin = -localOffset;
        const diffHours = (cityOffsetMin - localOffsetMin) / 60;
        const sign = diffHours >= 0 ? '+' : '';
        return `Today, ${sign}${diffHours} HRS`;
    }

    // Sun position calculations
    function getSunDeclination(): number {
        const dayOfYear = getDayOfYear(now.value);
        return -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
    }

    function getDayOfYear(date: Date): number {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        return Math.floor(diff / 86400000);
    }

    function getSubSolarLongitude(): number {
        const utcHours = now.value.getUTCHours() + now.value.getUTCMinutes() / 60;
        return -((utcHours / 24) * 360 - 180);
    }

    // Get terminator points for SVG polygon (night area)
    function getTerminatorPoints(width: number, height: number): string {
        const decl = getSunDeclination() * (Math.PI / 180);
        const subLng = getSubSolarLongitude();
        const points: string[] = [];

        // Generate terminator line
        for (let lng = -180; lng <= 180; lng += 2) {
            const lngRad = lng * (Math.PI / 180);
            const subLngRad = subLng * (Math.PI / 180);
            const hourAngle = lngRad - subLngRad;
            const lat = Math.atan(-Math.cos(hourAngle) / Math.tan(decl)) * (180 / Math.PI);

            const x = ((lng + 180) / 360) * width;
            const y = ((90 - lat) / 180) * height;
            points.push(`${x},${y}`);
        }

        // Determine which side is night
        // If declination > 0, north pole has sun, so night extends from terminator to bottom (south)
        // If declination < 0, south pole has sun
        if (getSunDeclination() >= 0) {
            // Night is below terminator
            points.push(`${width},${height}`);
            points.push(`0,${height}`);
        } else {
            // Night is above terminator
            points.push(`${width},0`);
            points.push(`0,0`);
        }

        return points.join(' ');
    }

    // Sunrise/sunset calculation
    function getSunTimes(city: City): { sunrise: string; sunset: string } {
        const decl = getSunDeclination() * (Math.PI / 180);
        const latRad = city.lat * (Math.PI / 180);

        const cosHourAngle = -Math.tan(latRad) * Math.tan(decl);

        // Polar day or polar night
        if (cosHourAngle < -1) return { sunrise: '--', sunset: '--' }; // midnight sun
        if (cosHourAngle > 1) return { sunrise: '--', sunset: '--' }; // polar night

        const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);
        const solarNoon = 12 - (city.lng / 15); // UTC solar noon

        // Get timezone offset for the city
        const cityStr = now.value.toLocaleString('en-US', { timeZone: city.timezone });
        const cityDate = new Date(cityStr);
        const utcStr = now.value.toLocaleString('en-US', { timeZone: 'UTC' });
        const utcDate = new Date(utcStr);
        const offsetHours = (cityDate.getTime() - utcDate.getTime()) / 3600000;

        const sunriseUTC = solarNoon - hourAngle / 15;
        const sunsetUTC = solarNoon + hourAngle / 15;

        const sunriseLocal = (sunriseUTC + offsetHours + 24) % 24;
        const sunsetLocal = (sunsetUTC + offsetHours + 24) % 24;

        return {
            sunrise: formatHourMin(sunriseLocal),
            sunset: formatHourMin(sunsetLocal),
        };
    }

    function formatHourMin(decimalHours: number): string {
        const h = Math.floor(decimalHours);
        const m = Math.round((decimalHours - h) * 60);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }

    // Analog clock angles
    function getClockAngles(city: City): { hour: number; minute: number; second: number } {
        const t = getCityTime(city);
        const h = t.getHours() % 12;
        const m = t.getMinutes();
        const s = t.getSeconds();
        return {
            hour: (h + m / 60) * 30,
            minute: (m + s / 60) * 6,
            second: s * 6,
        };
    }

    // Map coordinates
    function cityToMapCoords(city: City, width: number, height: number): { x: number; y: number } {
        return {
            x: ((city.lng + 180) / 360) * width,
            y: ((90 - city.lat) / 180) * height,
        };
    }

    return {
        selectedCities,
        activeCityIndex,
        activeCity,
        now,
        addCity,
        removeCity,
        getCityTime,
        formatCityTime,
        getOffsetLabel,
        getTerminatorPoints,
        getSunTimes,
        getClockAngles,
        cityToMapCoords,
        isMaxReached,
        CITY_LIST,
    };
}
