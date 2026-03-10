<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->uuid('unit_id')->nullable()->after('product_id');
            $table->integer('base_quantity')->default(0)->after('quantity');
            $table->foreign('unit_id')->references('id')->on('units')->nullOnDelete();
        });

        DB::table('purchase_items')->update([
            'base_quantity' => DB::raw('quantity'),
        ]);
    }

    public function down()
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->dropForeign(['unit_id']);
            $table->dropColumn(['unit_id', 'base_quantity']);
        });
    }
};
