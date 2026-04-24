<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TimerController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('timer')->group(function () {
    Route::get('status', [TimerController::class, 'status']);
    Route::post('start', [TimerController::class, 'start']);
    Route::post('pause', [TimerController::class, 'pause']);
    Route::post('stop', [TimerController::class, 'stop']);
    Route::get('history', [TimerController::class, 'history']);
    Route::delete('history/{id}', [TimerController::class, 'deleteHistory']);
});

Route::prefix('alarms')->group(function () {
    Route::get('/', [App\Http\Controllers\AlarmController::class, 'index']);
    Route::post('/', [App\Http\Controllers\AlarmController::class, 'store']);
    Route::patch('/{id}', [App\Http\Controllers\AlarmController::class, 'update']);
    Route::delete('/{id}', [App\Http\Controllers\AlarmController::class, 'destroy']);
    Route::post('/{id}/toggle', [App\Http\Controllers\AlarmController::class, 'toggle']);
});
