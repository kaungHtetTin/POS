<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('return_items', function (Blueprint $table) {
            $table->uuid('batch_id')->nullable()->after('product_id');
            $table->uuid('unit_id')->nullable()->after('batch_id');
            $table->integer('base_quantity')->nullable()->after('quantity');

            $table->foreign('batch_id')->references('id')->on('inventory_batches')->onDelete('set null');
            $table->foreign('unit_id')->references('id')->on('units')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('return_items', function (Blueprint $table) {
            $table->dropForeign(['batch_id']);
            $table->dropForeign(['unit_id']);
            $table->dropColumn(['batch_id', 'unit_id', 'base_quantity']);
        });
    }
};
