<?php

namespace App\Http\Controllers;

use App\Models\Timer;
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
     * Stop and reset the timer.
     */
    public function stop(): JsonResponse
    {
        $timer = Timer::first();

        if ($timer) {
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
            ]);
        }

        if ($timer->status === 'running') {
            $remaining = Carbon::now()->diffInSeconds($timer->end_time, false);
            return response()->json([
                'status' => 'running',
                'remaining' => max(0, $remaining),
                'end_time' => $timer->end_time,
            ]);
        }

        if ($timer->status === 'paused') {
            $remaining = Carbon::parse($timer->end_time)->diffInSeconds($timer->paused_at);
            return response()->json([
                'status' => 'paused',
                'remaining' => $remaining,
                'end_time' => $timer->end_time,
            ]);
        }

        return response()->json(['status' => 'unknown', 'remaining' => 0]);
    }
}

