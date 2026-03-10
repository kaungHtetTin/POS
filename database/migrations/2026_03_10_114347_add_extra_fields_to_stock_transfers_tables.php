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
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('reference_number')->nullable()->after('status');
            $table->text('notes')->nullable()->after('reference_number');
        });

        Schema::table('stock_transfer_items', function (Blueprint $table) {
            $table->uuid('inventory_batch_id')->nullable()->after('product_id');
            $table->foreign('inventory_batch_id')->references('id')->on('inventory_batches')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropColumn(['reference_number', 'notes']);
        });

        Schema::table('stock_transfer_items', function (Blueprint $table) {
            $table->dropForeign(['inventory_batch_id']);
            $table->dropColumn('inventory_batch_id');
        });
    }
};
