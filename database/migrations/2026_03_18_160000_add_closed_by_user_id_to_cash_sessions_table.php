<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('cash_sessions', 'closed_by_user_id')) {
            Schema::table('cash_sessions', function (Blueprint $table) {
                $table->uuid('closed_by_user_id')->nullable()->after('user_id');
                $table->foreign('closed_by_user_id')->references('id')->on('users')->nullOnDelete();
                $table->index('closed_by_user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('cash_sessions', 'closed_by_user_id')) {
            Schema::table('cash_sessions', function (Blueprint $table) {
                $table->dropForeign(['closed_by_user_id']);
                $table->dropIndex(['closed_by_user_id']);
                $table->dropColumn('closed_by_user_id');
            });
        }
    }
};
