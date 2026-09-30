<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('inventories', function (Blueprint $table) {
            $table->unique(['branch_id', 'product_id'], 'inventories_branch_product_unique');
        });

        Schema::table('inventory_batches', function (Blueprint $table) {
            $table->unique(
                ['branch_id', 'product_id', 'batch_number', 'expiry_date'],
                'inventory_batches_identity_unique'
            );
        });
    }

    public function down()
    {
        Schema::table('inventory_batches', function (Blueprint $table) {
            $table->dropUnique('inventory_batches_identity_unique');
        });

        Schema::table('inventories', function (Blueprint $table) {
            $table->dropUnique('inventories_branch_product_unique');
        });
    }
};
