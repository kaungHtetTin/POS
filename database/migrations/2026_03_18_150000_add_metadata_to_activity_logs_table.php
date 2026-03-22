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
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->uuid('branch_id')->nullable()->after('user_id');
            $table->string('method', 10)->nullable()->after('description');
            $table->string('route_name')->nullable()->after('method');
            $table->text('url')->nullable()->after('route_name');
            $table->string('ip_address', 45)->nullable()->after('url');
            $table->text('user_agent')->nullable()->after('ip_address');
            $table->json('properties')->nullable()->after('user_agent');

            $table->index('branch_id');
            $table->index('action');
            $table->index('created_at');

            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropIndex(['branch_id']);
            $table->dropIndex(['action']);
            $table->dropIndex(['created_at']);
            $table->dropColumn([
                'branch_id',
                'method',
                'route_name',
                'url',
                'ip_address',
                'user_agent',
                'properties',
            ]);
        });
    }
};
