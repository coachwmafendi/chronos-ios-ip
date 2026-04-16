# History, Keyboard Shortcuts & Tier 3 Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Timer History (expandable log), Keyboard Shortcuts (Space/Esc), Countdown Progress Ring (thick amber SVG), Dark/Light Mode toggle (localStorage), and Volume Control (master gain slider) to TimerX.

**Architecture:** Backend gains a `timer_history` table and history endpoint. Frontend adds 4 new composables/modifications: `useHistory`, extended `useTimer` (expose `duration`), extended `useAudio` (master gain volume), and a new `useTheme`. `ClockDisplay` gets a surrounding SVG progress ring. `App.vue` gains keyboard listeners, theme toggle, history section, and volume slider — all wired via CSS custom properties for theming.

**Tech Stack:** Laravel 11 (PHP), SQLite, Vue 3 + TypeScript, Vite, CSS custom properties

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `backend/database/migrations/xxxx_create_timer_history_table.php` | Schema for timer_history |
| Create | `backend/app/Models/TimerHistory.php` | Eloquent model |
| Modify | `backend/app/Http/Controllers/TimerController.php` | Insert history on stop, add history() method |
| Modify | `backend/routes/api.php` | Add GET /timer/history |
| Create | `src/composables/useHistory.ts` | Fetch/store timer history |
| Create | `src/composables/useTheme.ts` | Dark/light mode toggle + localStorage |
| Modify | `src/composables/useTimer.ts` | Expose `duration` ref, accept `completed` flag on stopTimer |
| Modify | `src/composables/useAudio.ts` | Master GainNode, volume ref, setVolume(), load from localStorage |
| Modify | `src/components/ClockDisplay.vue` | Add `totalDuration` prop + SVG progress ring |
| Modify | `src/App.vue` | Keyboard shortcuts, theme toggle button, history section, volume slider, CSS variables |

---

### Task 1: Backend — timer_history migration and model

**Files:**
- Create: `backend/database/migrations/2026_04_16_000001_create_timer_history_table.php`
- Create: `backend/app/Models/TimerHistory.php`

- [ ] **Step 1: Create migration**

Create `backend/database/migrations/2026_04_16_000001_create_timer_history_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timer_history', function (Blueprint $table) {
            $table->id();
            $table->integer('duration'); // total seconds set
            $table->timestamp('started_at');
            $table->string('status'); // 'completed' or 'stopped'
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timer_history');
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/wmafendi/Herd/timerx/backend && php artisan migrate
```
Expected output: `Migrating: 2026_04_16_000001_create_timer_history_table` then `Migrated`.

- [ ] **Step 3: Create model**

Create `backend/app/Models/TimerHistory.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimerHistory extends Model
{
    protected $table = 'timer_history';

    protected $fillable = [
        'duration',
        'started_at',
        'status',
    ];

    protected $casts = [
        'started_at' => 'datetime',
    ];
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add backend/database/migrations/2026_04_16_000001_create_timer_history_table.php backend/app/Models/TimerHistory.php
git commit -m "feat: add timer_history migration and model"
```

---

### Task 2: Backend — history endpoint + stop records history

**Files:**
- Modify: `backend/app/Http/Controllers/TimerController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Update TimerController — add history recording and history() method**

Replace `backend/app/Http/Controllers/TimerController.php` with:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Timer;
use App\Models\TimerHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Http\JsonResponse;

class TimerController extends Controller
{
    /**
     * Start or resume the timer.
     */
    public function start(Request $request): JsonResponse
    {
        $request->validate([
            'duration' => 'required_without:resume|integer|min:1',
        ]);

        $timer = Timer::first() ?? new Timer();

        if ($request->has('duration')) {
            $duration = $request->duration;
            $timer->duration = $duration;
            $timer->end_time = Carbon::now()->addSeconds($duration);
            $timer->started_at = Carbon::now();
        } elseif ($timer->status === 'paused' && $timer->paused_at) {
            // Resume from pause: calculate remaining time based on paused_at
            $remaining = Carbon::parse($timer->end_time)->diffInSeconds($timer->paused_at);
            $timer->end_time = Carbon::now()->addSeconds($remaining);
        } else {
            return response()->json(['error' => 'No duration provided and no paused timer to resume'], 400);
        }

        $timer->status = 'running';
        $timer->paused_at = null;
        $timer->save();

        return response()->json([
            'status' => $timer->status,
            'end_time' => $timer->end_time,
            'remaining' => Carbon::now()->diffInSeconds($timer->end_time),
            'duration' => $timer->duration,
        ]);
    }

    /**
     * Pause the timer.
     */
    public function pause(): JsonResponse
    {
        $timer = Timer::first();

        if (!$timer || $timer->status !== 'running') {
            return response()->json(['error' => 'No running timer to pause'], 400);
        }

        $timer->status = 'paused';
        $timer->paused_at = Carbon::now();
        $timer->save();

        return response()->json([
            'status' => $timer->status,
            'paused_at' => $timer->paused_at,
        ]);
    }

    /**
     * Stop and reset the timer. Records history entry.
     */
    public function stop(Request $request): JsonResponse
    {
        $timer = Timer::first();

        if ($timer && in_array($timer->status, ['running', 'paused'])) {
            // Record history before resetting
            $completedFlag = $request->boolean('completed', false);
            TimerHistory::create([
                'duration'   => $timer->duration,
                'started_at' => $timer->started_at ?? Carbon::now()->subSeconds($timer->duration),
                'status'     => $completedFlag ? 'completed' : 'stopped',
            ]);

            $timer->status = 'stopped';
            $timer->end_time = null;
            $timer->paused_at = null;
            $timer->save();
        }

        return response()->json(['status' => 'stopped']);
    }

    /**
     * Get current timer status and remaining time.
     */
    public function status(): JsonResponse
    {
        $timer = Timer::first();

        if (!$timer || $timer->status === 'stopped') {
            return response()->json([
                'status' => 'stopped',
                'remaining' => 0,
                'end_time' => null,
                'duration' => $timer?->duration ?? 0,
            ]);
        }

        if ($timer->status === 'running') {
            $remaining = Carbon::now()->diffInSeconds($timer->end_time, false);
            return response()->json([
                'status' => 'running',
                'remaining' => max(0, $remaining),
                'end_time' => $timer->end_time,
                'duration' => $timer->duration,
            ]);
        }

        if ($timer->status === 'paused') {
            $remaining = Carbon::parse($timer->end_time)->diffInSeconds($timer->paused_at);
            return response()->json([
                'status' => 'paused',
                'remaining' => $remaining,
                'end_time' => $timer->end_time,
                'duration' => $timer->duration,
            ]);
        }

        return response()->json(['status' => 'unknown', 'remaining' => 0, 'duration' => 0]);
    }

    /**
     * Return last 20 timer history entries.
     */
    public function history(): JsonResponse
    {
        $entries = TimerHistory::orderBy('created_at', 'desc')->limit(20)->get();
        return response()->json($entries);
    }
}
```

- [ ] **Step 2: Add started_at column to timers table**

Create `backend/database/migrations/2026_04_16_000002_add_started_at_to_timers_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('timers', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('timers', function (Blueprint $table) {
            $table->dropColumn('started_at');
        });
    }
};
```

Run it:
```bash
cd /Users/wmafendi/Herd/timerx/backend && php artisan migrate
```
Expected: `Migrated: 2026_04_16_000002_add_started_at_to_timers_table`

- [ ] **Step 3: Add started_at to Timer model fillable**

Edit `backend/app/Models/Timer.php` — add `'started_at'` to `$fillable` and `$casts`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Timer extends Model
{
    protected $fillable = [
        'duration',
        'end_time',
        'status',
        'paused_at',
        'started_at',
    ];

    protected $casts = [
        'end_time'   => 'datetime',
        'paused_at'  => 'datetime',
        'started_at' => 'datetime',
    ];
}
```

- [ ] **Step 4: Add history route**

Edit `backend/routes/api.php` — add one line inside the timer prefix group:

```php
Route::prefix('timer')->group(function () {
    Route::get('status', [TimerController::class, 'status']);
    Route::post('start', [TimerController::class, 'start']);
    Route::post('pause', [TimerController::class, 'pause']);
    Route::post('stop', [TimerController::class, 'stop']);
    Route::get('history', [TimerController::class, 'history']);
});
```

- [ ] **Step 5: Test endpoints manually**

```bash
cd /Users/wmafendi/Herd/timerx/backend && php artisan serve --port=8000 &
sleep 1
curl -s http://127.0.0.1:8000/api/timer/history | python3 -m json.tool
```
Expected: `[]` (empty array — no history yet)

```bash
curl -s -X POST http://127.0.0.1:8000/api/timer/start \
  -H "Content-Type: application/json" \
  -d '{"duration":5}' | python3 -m json.tool
```
Expected: JSON with `status`, `remaining`, `duration: 5`

```bash
curl -s -X POST http://127.0.0.1:8000/api/timer/stop \
  -H "Content-Type: application/json" \
  -d '{"completed":false}' | python3 -m json.tool
curl -s http://127.0.0.1:8000/api/timer/history | python3 -m json.tool
```
Expected: history array with one entry, `status: "stopped"`, `duration: 5`

- [ ] **Step 6: Kill test server and commit**

```bash
kill %1 2>/dev/null; true
cd /Users/wmafendi/Herd/timerx
git add backend/database/migrations/2026_04_16_000002_add_started_at_to_timers_table.php \
        backend/app/Models/Timer.php \
        backend/app/Http/Controllers/TimerController.php \
        backend/routes/api.php
git commit -m "feat: history endpoint, record history on stop, expose duration in responses"
```

---

### Task 3: Frontend — useHistory composable

**Files:**
- Create: `src/composables/useHistory.ts`

- [ ] **Step 1: Create `src/composables/useHistory.ts`**

```typescript
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
        formatDuration,
        formatTime,
    };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/composables/useHistory.ts
git commit -m "feat: add useHistory composable"
```

---

### Task 4: Frontend — useTheme composable

**Files:**
- Create: `src/composables/useTheme.ts`

- [ ] **Step 1: Create `src/composables/useTheme.ts`**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/composables/useTheme.ts
git commit -m "feat: add useTheme composable with localStorage persistence"
```

---

### Task 5: Frontend — useTimer expose duration + completed flag

**Files:**
- Modify: `src/composables/useTimer.ts`

- [ ] **Step 1: Replace `src/composables/useTimer.ts`**

```typescript
import { ref, onUnmounted } from 'vue';
import api from '../services/api';

export function useTimer(onComplete?: () => void) {
    const status = ref<'running' | 'paused' | 'stopped'>('stopped');
    const timeLeft = ref(0);
    const duration = ref(0); // total duration of current/last timer
    const end_time = ref<string | null>(null);
    let timerInterval: number | null = null;

    async function fetchStatus() {
        try {
            const { data } = await api.get('/timer/status');
            status.value = data.status;
            timeLeft.value = Math.round(data.remaining);
            duration.value = data.duration ?? 0;
            end_time.value = data.end_time;
            // Bug #3 fix: resume countdown if timer already running on mount
            if (data.status === 'running') {
                startTick();
            }
        } catch (error) {
            console.error('Error fetching timer status:', error);
        }
    }

    function startTick() {
        if (timerInterval) return;

        timerInterval = window.setInterval(() => {
            if (status.value === 'running') {
                // Bug #4 fix: stop interval immediately to prevent repeated calls
                if (timeLeft.value <= 0) {
                    clearInterval(timerInterval!);
                    timerInterval = null;
                    status.value = 'stopped';
                    stopTimer(true).then(() => onComplete?.());
                    return;
                }
                timeLeft.value = timeLeft.value - 1;
            }
        }, 1000);
    }

    async function startTimer(secs: number) {
        try {
            const { data } = await api.post('/timer/start', { duration: secs });
            status.value = data.status;
            timeLeft.value = Math.round(data.remaining);
            duration.value = data.duration ?? secs;
            end_time.value = data.end_time;
            startTick();
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }

    // Bug #2 fix: separate resume function that doesn't send duration
    async function resumeTimer() {
        try {
            const { data } = await api.post('/timer/start', {});
            status.value = data.status;
            timeLeft.value = Math.round(data.remaining);
            duration.value = data.duration ?? duration.value;
            end_time.value = data.end_time;
            startTick();
        } catch (error) {
            console.error('Error resuming timer:', error);
        }
    }

    async function pauseTimer() {
        try {
            const { data } = await api.post('/timer/pause');
            status.value = data.status;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        } catch (error) {
            console.error('Error pausing timer:', error);
        }
    }

    async function stopTimer(completed = false) {
        try {
            const { data } = await api.post('/timer/stop', { completed });
            status.value = data.status;
            timeLeft.value = 0;
            end_time.value = null;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
        }
    }

    onUnmounted(() => {
        if (timerInterval) clearInterval(timerInterval);
    });

    return {
        status,
        timeLeft,
        duration,
        end_time,
        fetchStatus,
        startTimer,
        resumeTimer,
        pauseTimer,
        stopTimer,
    };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/composables/useTimer.ts
git commit -m "feat: expose duration ref, pass completed flag to stop endpoint"
```

---

### Task 6: Frontend — useAudio volume control

**Files:**
- Modify: `src/composables/useAudio.ts`

- [ ] **Step 1: Add master GainNode and volume to useAudio**

The key change: replace the simple `getContext()` helper with one that also manages a persistent `masterGain` node. All sound functions connect to `masterGain` instead of `ctx.destination`. Volume is saved to localStorage.

Replace the module-level singleton section (lines 23–31 in current file) and the `useAudio()` function. Full replacement of `src/composables/useAudio.ts`:

```typescript
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

type SoundFn = (ctx: AudioContext, dest: AudioNode) => void;

const VOLUME_KEY = 'timerx-volume';

// Module-level singletons
let sharedCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let loopTimer: number | null = null;

function getAudio(): { ctx: AudioContext; master: GainNode } {
    if (!sharedCtx || sharedCtx.state === 'closed') {
        sharedCtx = new AudioContext();
        masterGain = sharedCtx.createGain();
        masterGain.connect(sharedCtx.destination);
        // Restore saved volume
        const saved = parseInt(localStorage.getItem(VOLUME_KEY) ?? '80', 10);
        masterGain.gain.value = saved / 100;
    }
    return { ctx: sharedCtx, master: masterGain! };
}

function stopCurrentPlayback() {
    if (loopTimer !== null) {
        clearTimeout(loopTimer);
        loopTimer = null;
    }
}

const SOUNDS: Record<string, SoundFn> = {
    'alarm-bell': (ctx, dest) => {
        // Repeating bell: 880Hz sine, 3 rings
        const times = [0, 0.3, 0.6];
        times.forEach(t => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(dest);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.6, ctx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.25);
        });
    },
    'digital-beep': (ctx, dest) => {
        // Sharp square wave beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(dest);
        osc.type = 'square';
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },
    'gentle-chime': (ctx, dest) => {
        // Soft sine wave chime, slow decay
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(dest);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 1.0);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 1.0);
        });
    },
    'radar': (ctx, dest) => {
        // Ascending ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(dest);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    },
    'notification-pop': (ctx, dest) => {
        // Short pop: descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(dest);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },
    'rain-drop': (ctx, dest) => {
        // High-pitched pluck
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(dest);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },
    'forest-tone': (ctx, dest) => {
        // Low warm tone with harmonics
        [220, 330, 440].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(dest);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2 / (i + 1), ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.5);
        });
    },
    'ocean-wave': (ctx, dest) => {
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
        source.connect(filter); filter.connect(gain); gain.connect(dest);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        source.start(ctx.currentTime);
        source.stop(ctx.currentTime + 0.8);
    },
    'success-fanfare': (ctx, dest) => {
        // 4-note ascending fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(dest);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
    },
    'zen-bowl': (ctx, dest) => {
        // Long, pure 432Hz sine tone — slow fade
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(dest);
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
        const { ctx, master } = getAudio();
        if (ctx.state === 'suspended') ctx.resume();

        function playLoop() {
            if (Date.now() >= endAt) return;
            soundFn(ctx, master);
            const remaining = endAt - Date.now();
            loopTimer = window.setTimeout(playLoop, Math.min(soundDuration, remaining));
        }

        playLoop();
    } catch (err) {
        console.error('Failed to play audio:', err);
    }
}

export function useAudio() {
    const selectedAudio = ref<string>(AUDIO_OPTIONS[0].id);
    const savedVol = parseInt(localStorage.getItem(VOLUME_KEY) ?? '80', 10);
    const volume = ref<number>(savedVol);

    function setVolume(v: number) {
        volume.value = v;
        localStorage.setItem(VOLUME_KEY, String(v));
        if (masterGain && sharedCtx) {
            masterGain.gain.setValueAtTime(v / 100, sharedCtx.currentTime);
        }
    }

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
        volume,
        setVolume,
        previewSelected,
        playCompletion,
    };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/composables/useAudio.ts
git commit -m "feat: master gain volume control with localStorage persistence"
```

---

### Task 7: Frontend — ClockDisplay progress ring

**Files:**
- Modify: `src/components/ClockDisplay.vue`

- [ ] **Step 1: Replace `src/components/ClockDisplay.vue`**

The SVG wraps the clock text. Ring radius = 110, stroke-width = 16 (Thick Ring B style).
Circumference = 2π × 110 ≈ 691.15. `stroke-dashoffset = circumference × (1 - progress)`.

```vue
<template>
  <div class="clock-display">
    <div class="ring-wrapper">
      <svg class="progress-ring" viewBox="0 0 260 260" width="260" height="260">
        <!-- Track -->
        <circle
          cx="130" cy="130" r="110"
          fill="none"
          stroke="var(--ring-track)"
          stroke-width="16"
        />
        <!-- Progress arc -->
        <circle
          cx="130" cy="130" r="110"
          fill="none"
          stroke="var(--accent)"
          stroke-width="16"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 130 130)"
          class="progress-arc"
        />
      </svg>
      <div class="clock-center">
        <div class="time-readout">{{ formattedTime }}</div>
        <div class="status-badge">{{ status }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  remainingSeconds: number;
  totalDuration: number;
  status: string;
}>();

const circumference = 2 * Math.PI * 110; // 691.15

const formattedTime = computed(() => {
  const total = Math.max(0, Math.floor(props.remainingSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
});

const dashOffset = computed(() => {
  if (!props.totalDuration || props.totalDuration === 0) return circumference;
  const progress = Math.max(0, Math.min(1, props.remainingSeconds / props.totalDuration));
  return circumference * (1 - progress);
});
</script>

<style scoped>
.clock-display {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
}

.ring-wrapper {
  position: relative;
  width: 260px;
  height: 260px;
}

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
}

.progress-arc {
  transition: stroke-dashoffset 0.9s linear;
}

.clock-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.time-readout {
  font-size: 52px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1;
}

.status-badge {
  margin-top: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/wmafendi/Herd/timerx && npx vue-tsc --noEmit
```
Expected: error about missing `totalDuration` prop on `<ClockDisplay>` in App.vue — this is expected and will be fixed in Task 8.

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/components/ClockDisplay.vue
git commit -m "feat: add thick SVG progress ring to ClockDisplay"
```

---

### Task 8: Frontend — App.vue full integration

**Files:**
- Modify: `src/App.vue`

This task wires everything together: keyboard shortcuts, theme toggle, history section, volume slider, CSS variables, and passes `totalDuration` to ClockDisplay.

- [ ] **Step 1: Replace `src/App.vue` with the following**

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useTimer } from './composables/useTimer';
import { useAudio } from './composables/useAudio';
import { useHistory } from './composables/useHistory';
import { useTheme } from './composables/useTheme';
import ClockDisplay from './components/ClockDisplay.vue';

// Theme
const { theme, toggleTheme, initTheme } = useTheme();

// Audio
const { selectedAudio, AUDIO_OPTIONS, volume, setVolume, previewSelected, playCompletion } = useAudio();

// Timer
const {
  status,
  timeLeft,
  duration,
  fetchStatus,
  startTimer,
  resumeTimer,
  pauseTimer,
  stopTimer,
} = useTimer(() => {
  playCompletion();
  fetchHistory();
});

// History
const { history, fetchHistory, formatDuration, formatTime } = useHistory();
const historyOpen = ref(false);

// Time picker inputs
const inputHr  = ref(0);
const inputMin = ref(0);
const inputSec = ref(15);
const activeField = ref<'hr' | 'min' | 'sec' | null>(null);

const totalSeconds = computed(() => {
  const hr  = Math.min(99, Math.max(0, inputHr.value  || 0));
  const min = Math.min(59, Math.max(0, inputMin.value || 0));
  const sec = Math.min(59, Math.max(0, inputSec.value || 0));
  return (hr * 3600) + (min * 60) + sec;
});

onMounted(() => {
  initTheme();
  fetchStatus();
  fetchHistory();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function clampField(field: 'hr' | 'min' | 'sec') {
  if (field === 'hr')  inputHr.value  = Math.min(99, Math.max(0, inputHr.value  || 0));
  if (field === 'min') inputMin.value = Math.min(59, Math.max(0, inputMin.value || 0));
  if (field === 'sec') inputSec.value = Math.min(59, Math.max(0, inputSec.value || 0));
}

async function handleStart() {
  if (status.value === 'paused') {
    await resumeTimer();
  } else {
    if (totalSeconds.value < 1) return;
    await startTimer(totalSeconds.value);
  }
}

async function handleStop() {
  await stopTimer();
  fetchHistory();
}

// Keyboard shortcuts — ignore when focus is inside an input or select
function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'SELECT') return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (status.value === 'running') {
      pauseTimer();
    } else {
      handleStart();
    }
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    handleStop();
  }
}
</script>

<template>
  <main class="container">
    <!-- Theme toggle -->
    <button class="theme-toggle" @click="toggleTheme" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
      {{ theme === 'dark' ? '☀️' : '🌙' }}
    </button>

    <div class="timer-wrapper">
      <ClockDisplay
        :remainingSeconds="timeLeft"
        :totalDuration="duration"
        :status="status"
      />

      <div class="controls">
        <!-- Time Picker -->
        <div class="time-picker">
          <div class="time-labels">
            <span class="label">hr</span>
            <span class="sep-spacer"></span>
            <span class="label">min</span>
            <span class="sep-spacer"></span>
            <span class="label">sec</span>
          </div>
          <div class="time-inputs">
            <input
              aria-label="Hours"
              type="number" v-model.number="inputHr"
              min="0" max="99"
              :class="{ active: activeField === 'hr' }"
              :disabled="status !== 'stopped'"
              @focus="activeField = 'hr'"
              @blur="activeField = null; clampField('hr')"
            />
            <span class="separator">:</span>
            <input
              aria-label="Minutes"
              type="number" v-model.number="inputMin"
              min="0" max="59"
              :class="{ active: activeField === 'min' }"
              :disabled="status !== 'stopped'"
              @focus="activeField = 'min'"
              @blur="activeField = null; clampField('min')"
            />
            <span class="separator">:</span>
            <input
              aria-label="Seconds"
              type="number" v-model.number="inputSec"
              min="0" max="59"
              :class="{ active: activeField === 'sec' }"
              :disabled="status !== 'stopped'"
              @focus="activeField = 'sec'"
              @blur="activeField = null; clampField('sec')"
            />
          </div>
        </div>

        <!-- Audio Selector -->
        <div class="audio-selector">
          <label>Sound</label>
          <select v-model="selectedAudio" @change="previewSelected">
            <option v-for="opt in AUDIO_OPTIONS" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Volume Slider -->
        <div class="volume-control">
          <label>Volume</label>
          <div class="volume-row">
            <input
              aria-label="Volume"
              type="range"
              min="0" max="100"
              :value="volume"
              @input="setVolume(+($event.target as HTMLInputElement).value)"
            />
            <span class="volume-value">{{ volume }}%</span>
          </div>
        </div>

        <!-- Buttons -->
        <div class="button-group">
          <button
            v-if="status === 'stopped' || status === 'paused'"
            @click="handleStart"
            class="btn-start"
            :disabled="status === 'stopped' && totalSeconds < 1"
          >
            {{ status === 'paused' ? 'Resume' : 'Start' }}
          </button>
          <button v-if="status === 'running'" @click="pauseTimer" class="btn-pause">
            Pause
          </button>
          <button @click="handleStop" class="btn-stop">Stop</button>
        </div>

        <!-- Keyboard hint -->
        <div class="kbd-hint">
          <span><kbd>Space</kbd> start / pause</span>
          <span><kbd>Esc</kbd> stop</span>
        </div>

        <!-- History -->
        <div class="history-section">
          <button class="history-toggle" @click="historyOpen = !historyOpen">
            History {{ historyOpen ? '▴' : '▾' }}
          </button>
          <div v-if="historyOpen" class="history-list">
            <div v-if="history.length === 0" class="history-empty">No history yet</div>
            <div
              v-for="entry in history"
              :key="entry.id"
              class="history-entry"
              :class="entry.status"
            >
              <span class="h-duration">{{ formatDuration(entry.duration) }}</span>
              <span class="h-time">{{ formatTime(entry.started_at) }}</span>
              <span class="h-status">{{ entry.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
/* CSS custom properties — applied globally so ClockDisplay can use them */
:root {
  --bg: #1a1a1a;
  --surface: #2a2a2a;
  --text: #ffffff;
  --text-muted: #888;
  --border: #444;
  --separator: #555;
  --accent: #f0a030;
  --ring-track: #2a2a2a;
  --btn-start: #34c759;
  --btn-pause: #ff9500;
  --btn-stop: #ff3b30;
}

:root.light {
  --bg: #f5f5f5;
  --surface: #ffffff;
  --text: #1a1a1a;
  --text-muted: #666;
  --border: #ddd;
  --separator: #ccc;
  --accent: #f0a030;
  --ring-track: #e0e0e0;
  --btn-start: #34c759;
  --btn-pause: #ff9500;
  --btn-stop: #ff3b30;
}
</style>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg);
  color: var(--text);
  position: relative;
  padding: 20px;
}

/* Theme toggle */
.theme-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 18px;
  cursor: pointer;
  transition: opacity 0.2s;
  line-height: 1;
}
.theme-toggle:hover { opacity: 0.8; }

.timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  width: 100%;
  max-width: 360px;
}

/* Time Picker */
.time-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.time-labels {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 4px;
}

.time-labels .label {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  text-transform: lowercase;
  letter-spacing: 1px;
}

.time-labels .sep-spacer {
  width: 28px;
  flex-shrink: 0;
}

.time-inputs {
  display: flex;
  align-items: center;
  background: var(--surface);
  border-radius: 16px;
  padding: 10px 14px;
  gap: 2px;
}

.time-inputs input {
  width: 76px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 56px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  border-radius: 10px;
  padding: 6px 2px;
  outline: none;
  transition: background 0.15s, color 0.15s;
  -moz-appearance: textfield;
}

.time-inputs input::-webkit-outer-spin-button,
.time-inputs input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.time-inputs input.active {
  background: var(--accent);
  color: #fff;
}

.separator {
  font-size: 48px;
  font-weight: 300;
  color: var(--separator);
  padding: 0 2px;
  line-height: 1;
  user-select: none;
}

/* Audio Selector */
.audio-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.audio-selector label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.audio-selector select {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  width: 100%;
  text-align: center;
}

.audio-selector select:focus { border-color: var(--accent); }

/* Volume */
.volume-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.volume-control label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.volume-row input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
  cursor: pointer;
}

.volume-value {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: right;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 12px;
}

button {
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-start { background-color: var(--btn-start); }
.btn-pause { background-color: var(--btn-pause); }
.btn-stop  { background-color: var(--btn-stop); }

button:not(:disabled):hover  { opacity: 0.9; transform: scale(1.05); }
button:not(:disabled):active { transform: scale(0.95); }

/* Keyboard hint */
.kbd-hint {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-muted);
}

kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: inherit;
}

/* History */
.history-section {
  width: 100%;
}

.history-toggle {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: border-color 0.2s;
}

.history-toggle:hover {
  border-color: var(--accent);
  opacity: 1;
  transform: none;
}

.history-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.history-empty {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 12px 0;
}

.history-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface);
  border-radius: 8px;
  font-size: 13px;
  border-left: 3px solid var(--border);
}

.history-entry.completed { border-left-color: var(--btn-start); }
.history-entry.stopped   { border-left-color: var(--btn-stop); }

.h-duration { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--text); }
.h-time     { color: var(--text-muted); }
.h-status   { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
</style>
```

- [ ] **Step 2: Build to verify no errors**

```bash
cd /Users/wmafendi/Herd/timerx && npm run build 2>&1 | tail -10
```
Expected: `✓ built` with no TypeScript or Vite errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wmafendi/Herd/timerx
git add src/App.vue
git commit -m "feat: keyboard shortcuts, theme toggle, history section, volume slider, CSS variables"
```
