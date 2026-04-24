<?php

namespace App\Http\Controllers;

use App\Models\Alarm;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AlarmController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Alarm::all());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => 'nullable|string',
            'hour' => 'required|integer|min:0|max:23',
            'minute' => 'required|integer|min:0|max:59',
            'repeat_days' => 'nullable|array',
            'sound' => 'required|string',
            'enabled' => 'boolean',
            'snooze_enabled' => 'boolean',
            'snooze_minutes' => 'integer|min:1',
        ]);

        $alarm = Alarm::create($validated);

        return response()->json($alarm, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $alarm = Alarm::findOrFail($id);
        $alarm->update($request->all());

        return response()->json($alarm);
    }

    public function destroy(string $id): JsonResponse
    {
        Alarm::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    public function toggle(string $id): JsonResponse
    {
        $alarm = Alarm::findOrFail($id);
        $alarm->enabled = !$alarm->enabled;
        $alarm->save();

        return response()->json($alarm);
    }
}
