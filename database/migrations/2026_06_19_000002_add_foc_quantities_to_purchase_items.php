<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->integer('foc_quantity')->default(0)->after('quantity');
            $table->integer('foc_base_quantity')->default(0)->after('base_quantity');
        });
    }

    public function down()
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->dropColumn(['foc_quantity', 'foc_base_quantity']);
        });
    }
};
