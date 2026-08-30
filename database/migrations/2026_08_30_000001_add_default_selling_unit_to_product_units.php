<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_units', function (Blueprint $table) {
            $table->boolean('is_default_selling_unit')->default(false)->after('is_base_unit');
        });

        DB::table('product_units')
            ->where('is_base_unit', true)
            ->update(['is_default_selling_unit' => true]);
    }

    public function down(): void
    {
        Schema::table('product_units', function (Blueprint $table) {
            $table->dropColumn('is_default_selling_unit');
        });
    }
};
