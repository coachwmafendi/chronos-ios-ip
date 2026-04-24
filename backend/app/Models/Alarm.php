<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Alarm extends Model
{
    protected $fillable = [
        'label',
        'hour',
        'minute',
        'repeat_days',
        'sound',
        'enabled',
        'snooze_enabled',
        'snooze_minutes',
    ];

    protected $casts = [
        'repeat_days' => 'array',
        'enabled' => 'boolean',
        'snooze_enabled' => 'boolean',
    ];
}
