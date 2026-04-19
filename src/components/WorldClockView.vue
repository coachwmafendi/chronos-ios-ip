<template>
  <div class="wc-view">
    <!-- City selector -->
    <div v-if="showCityPicker" class="wc-picker-backdrop" @click.self="showCityPicker = false">
    <div class="wc-city-picker">
      <div class="picker-header">
        <span class="picker-title">Add City</span>
        <button class="picker-close" @click="showCityPicker = false">Done</button>
      </div>
      <input
        v-model="citySearch"
        class="picker-search"
        placeholder="Search city..."
        type="text"
      />
      <div class="picker-list">

        <div v-if="isMaxReached() && !isAdded(filteredCities[0])" class="picker-limit">Maximum 9 cities reached</div>
        <button
          v-for="city in filteredCities"
          :key="city.name"
          class="picker-item"
          :class="{ added: isAdded(city), disabled: !isAdded(city) && isMaxReached() }"
          @click="toggleCity(city)"
          :disabled="!isAdded(city) && isMaxReached()"
        >
          <div class="picker-city-info">
            <span class="picker-city-name">{{ city.name }}</span>
            <span class="picker-city-country">{{ city.country }}</span>
          </div>
          <span class="picker-check">{{ isAdded(city) ? '✓' : '+' }}</span>
        </button>
      </div>
    </div>
    </div>

    <template v-else>
      <!-- World map -->
      <div class="wc-map-container">
        <svg
          class="wc-map"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid meet"
        >
          <!-- Map background -->
          <rect width="800" height="400" fill="#111" />

          <!-- Latitude/longitude grid -->
          <g stroke="#1e1e1e" stroke-width="0.4" fill="none">
            <line v-for="i in 35" :key="'v'+i" :x1="i*800/36" y1="0" :x2="i*800/36" y2="400" />
            <line v-for="i in 17" :key="'h'+i" x1="0" :y1="i*400/18" x2="800" :y2="i*400/18" />
          </g>
          <!-- Equator & prime meridian -->
          <line x1="0" y1="200" x2="800" y2="200" stroke="#252525" stroke-width="0.6" />
          <line x1="400" y1="0" x2="400" y2="400" stroke="#252525" stroke-width="0.6" />

          <!-- Countries (Natural Earth 110m) -->
          <g fill="#2d3035" stroke="#3a3f45" stroke-width="0.5" stroke-linejoin="round">
            <path v-for="(d, i) in countryPaths" :key="i" :d="d" />
          </g>

          <!-- Night overlay with soft edge -->
          <defs>
            <filter id="nightBlur">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <polygon
            :points="terminatorPoints"
            fill="rgba(0,0,0,0.5)"
            filter="url(#nightBlur)"
          />

          <!-- City markers -->
          <g v-for="(city, idx) in selectedCities" :key="city.name">
            <!-- Glow for active -->
            <circle
              v-if="idx === activeCityIndex"
              :cx="cityCoords(city).x"
              :cy="cityCoords(city).y"
              r="8"
              fill="none"
              stroke="#f0a030"
              stroke-width="1"
              opacity="0.4"
            />
            <circle
              :cx="cityCoords(city).x"
              :cy="cityCoords(city).y"
              :r="idx === activeCityIndex ? 5 : 3.5"
              :fill="idx === activeCityIndex ? '#f0a030' : '#aaa'"
              :stroke="idx === activeCityIndex ? '#ffd080' : '#fff'"
              stroke-width="1"
              class="city-marker"
              @click="activeCityIndex = idx"
            />
            <text
              :x="cityCoords(city).x + 10"
              :y="cityCoords(city).y + 4"
              fill="#fff"
              font-size="11"
              font-weight="600"
              font-family="SF Pro Text, -apple-system, sans-serif"
              class="city-map-label"
            >{{ city.name }}</text>
            <text
              :x="cityCoords(city).x + 10"
              :y="cityCoords(city).y + 16"
              fill="#888"
              font-size="9"
              font-family="SF Pro Text, -apple-system, sans-serif"
            >{{ formatCityTime(city) }}</text>
          </g>
        </svg>
      </div>

      <!-- City cards grid -->
      <div class="wc-grid">
        <div
          v-for="(city, idx) in selectedCities"
          :key="city.name"
          class="wc-card"
          :class="{ active: idx === activeCityIndex }"
          @click="activeCityIndex = idx"
        >
          <!-- Delete button -->
          <button class="wc-card-delete" @click.stop="removeCity(city.name)">×</button>

          <!-- Analog clock -->
          <svg viewBox="0 0 120 120" class="wc-analog">
            <circle cx="60" cy="60" r="56" fill="var(--surface)" stroke="var(--border)" stroke-width="1.5" />
            <g v-for="h in 12" :key="h">
              <line
                :x1="60 + 46 * Math.sin(h * 30 * Math.PI / 180)"
                :y1="60 - 46 * Math.cos(h * 30 * Math.PI / 180)"
                :x2="60 + 50 * Math.sin(h * 30 * Math.PI / 180)"
                :y2="60 - 50 * Math.cos(h * 30 * Math.PI / 180)"
                stroke="var(--text)"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <text
                :x="60 + 40 * Math.sin(h * 30 * Math.PI / 180)"
                :y="60 - 40 * Math.cos(h * 30 * Math.PI / 180) + 3.5"
                fill="var(--text)"
                font-size="8"
                font-weight="500"
                text-anchor="middle"
                font-family="SF Pro Text, -apple-system, sans-serif"
              >{{ h }}</text>
            </g>
            <line
              x1="60" y1="60"
              :x2="60 + 28 * Math.sin(getClockAngles(city).hour * Math.PI / 180)"
              :y2="60 - 28 * Math.cos(getClockAngles(city).hour * Math.PI / 180)"
              stroke="var(--text)" stroke-width="2.5" stroke-linecap="round"
            />
            <line
              x1="60" y1="60"
              :x2="60 + 38 * Math.sin(getClockAngles(city).minute * Math.PI / 180)"
              :y2="60 - 38 * Math.cos(getClockAngles(city).minute * Math.PI / 180)"
              stroke="var(--text)" stroke-width="1.5" stroke-linecap="round"
            />
            <line
              x1="60" y1="60"
              :x2="60 + 40 * Math.sin(getClockAngles(city).second * Math.PI / 180)"
              :y2="60 - 40 * Math.cos(getClockAngles(city).second * Math.PI / 180)"
              stroke="var(--accent)" stroke-width="0.8" stroke-linecap="round"
            />
            <circle cx="60" cy="60" r="2.5" fill="var(--accent)" />
          </svg>

          <!-- City info -->
          <div class="wc-card-info">
            <div class="wc-card-name">{{ city.name }}, {{ formatCityTime(city) }}</div>
            <div class="wc-card-meta">{{ getOffsetLabel(city) }}</div>
            <div class="wc-card-meta">Sunrise: {{ getSunTimes(city).sunrise }}</div>
            <div class="wc-card-meta">Sunset: {{ getSunTimes(city).sunset }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useWorldClock, CITY_LIST, type City } from '../composables/useWorldClock';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';

const {
  selectedCities,
  activeCityIndex,
  addCity,
  removeCity,
  isMaxReached,
  formatCityTime,
  getOffsetLabel,
  getTerminatorPoints,
  getSunTimes,
  getClockAngles,
  cityToMapCoords,
} = useWorldClock();

const showCityPicker = ref(false);
const citySearch = ref('');

// World map paths
const MAP_W = 800;
const MAP_H = 400;

const countryPaths = ref<string[]>([]);

onMounted(async () => {
  const topo = await import('world-atlas/countries-110m.json') as unknown as Topology;
  const countries = feature(topo, topo.objects.countries as any);
  const projection = geoEquirectangular()
    .scale(MAP_H / Math.PI)
    .translate([MAP_W / 2, MAP_H / 2]);
  const path = geoPath(projection);
  countryPaths.value = (countries as any).features.map((f: any) => path(f) || '');
});

const filteredCities = computed(() => {
  const q = citySearch.value.toLowerCase();
  return CITY_LIST.filter(c => c.name.toLowerCase().includes(q));
});

function isAdded(city: City): boolean {
  return !!selectedCities.value.find(c => c.name === city.name);
}

function toggleCity(city: City) {
  if (isAdded(city)) {
    removeCity(city.name);
  } else {
    addCity(city);
  }
}

function openCityPicker() {
  citySearch.value = '';
  showCityPicker.value = true;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showCityPicker.value) {
    showCityPicker.value = false;
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const terminatorPoints = computed(() => getTerminatorPoints(MAP_W, MAP_H));

function cityCoords(city: City) {
  return cityToMapCoords(city, MAP_W, MAP_H);
}


defineExpose({ openCityPicker });
</script>

<style scoped>
.wc-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Map */
.wc-map-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.wc-map {
  display: block;
  width: 100%;
  height: auto;
}

.city-marker {
  cursor: pointer;
  transition: r 0.2s;
}

.city-marker:hover {
  r: 6;
}

/* City cards grid */
.wc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  width: 100%;
}

.wc-card {
  background: var(--surface);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  position: relative;
  transition: opacity 0.2s;
}

.wc-card:hover {
  opacity: 0.9;
}

.wc-card.active {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* Delete button — top-left, visible on hover */
.wc-card-delete {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: var(--border);
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 0;
}

.wc-card:hover .wc-card-delete {
  opacity: 1;
}

.wc-card-delete:hover {
  background: var(--btn-stop);
  color: #fff;
}

.wc-analog {
  width: 130px;
  height: 130px;
}

.wc-card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
}

.wc-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.wc-card-meta {
  font-size: 12px;
  color: var(--text-muted);
}

/* City picker backdrop */
.wc-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

/* City picker */
.wc-city-picker {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: center;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.picker-close {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
}

.picker-search {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
}

.picker-search:focus {
  border-color: var(--accent);
}

.picker-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.15s;
}

.picker-item:hover {
  background: var(--bg);
}

.picker-item.added {
  color: var(--accent);
}

.picker-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.picker-city-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.picker-city-name {
  font-weight: 600;
}

.picker-city-country {
  font-size: 12px;
  color: var(--text-muted);
}

.picker-item.added .picker-city-country {
  color: var(--accent);
  opacity: 0.7;
}

.picker-check {
  font-size: 16px;
  font-weight: 600;
}

.picker-limit {
  font-size: 13px;
  color: var(--btn-stop);
  text-align: center;
  padding: 6px 0;
}
</style>
