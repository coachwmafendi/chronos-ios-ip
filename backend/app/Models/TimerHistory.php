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
