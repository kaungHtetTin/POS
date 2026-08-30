<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('base_unit_cost', 18, 6)->default(0)->after('foc_base_quantity');
            $table->decimal('cost_total', 18, 2)->default(0)->after('base_unit_cost');
            $table->boolean('cost_backfilled')->default(false)->after('cost_total');
        });

        DB::statement('
            UPDATE sale_items AS si
            INNER JOIN inventory_batches AS ib ON ib.id = si.batch_id
            SET si.base_unit_cost = ib.purchase_price,
                si.cost_total = ROUND((si.base_quantity + COALESCE(si.foc_base_quantity, 0)) * ib.purchase_price, 2),
                si.cost_backfilled = 1
        ');

        Schema::table('return_items', function (Blueprint $table) {
            $table->uuid('source_sale_item_id')->nullable()->after('return_id');
            $table->decimal('base_unit_cost', 18, 6)->default(0)->after('base_quantity');
            $table->decimal('cost_total', 18, 2)->default(0)->after('base_unit_cost');
            $table->foreign('source_sale_item_id')->references('id')->on('sale_items')->nullOnDelete();
        });

        DB::statement('
            UPDATE return_items AS ri
            INNER JOIN inventory_batches AS ib ON ib.id = ri.batch_id
            SET ri.base_unit_cost = ib.purchase_price,
                ri.cost_total = ROUND(COALESCE(ri.base_quantity, 0) * ib.purchase_price, 2)
        ');
    }

    public function down(): void
    {
        Schema::table('return_items', function (Blueprint $table) {
            $table->dropForeign(['source_sale_item_id']);
            $table->dropColumn(['source_sale_item_id', 'base_unit_cost', 'cost_total']);
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['base_unit_cost', 'cost_total', 'cost_backfilled']);
        });
    }
};
