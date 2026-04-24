<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alarms', function (Blueprint $table) {
            $table->id();
            $table->string('label')->nullable();
            $table->integer('hour');
            $table->integer('minute');
            $table->json('repeat_days')->nullable();
            $table->string('sound');
            $table->boolean('enabled')->default(true);
            $table->boolean('snooze_enabled')->default(false);
            $table->integer('snooze_minutes')->default(5);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alarms');
    }
};
