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
