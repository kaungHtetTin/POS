<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (!Schema::hasColumn('sales', 'sale_staff_id')) {
                $table->uuid('sale_staff_id')->nullable()->after('user_id');
                $table->foreign('sale_staff_id')->references('id')->on('users')->nullOnDelete();
                $table->index('sale_staff_id');
            }
        });

        if (Schema::hasColumn('sales', 'sale_staff_id')) {
            DB::table('sales')
                ->whereNull('sale_staff_id')
                ->update(['sale_staff_id' => DB::raw('user_id')]);
        }
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'sale_staff_id')) {
                $table->dropForeign(['sale_staff_id']);
                $table->dropIndex(['sale_staff_id']);
                $table->dropColumn('sale_staff_id');
            }
        });
    }
};
