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
