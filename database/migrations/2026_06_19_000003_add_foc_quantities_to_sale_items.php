<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('foc_quantity', 10, 2)->default(0)->after('quantity');
            $table->uuid('foc_unit_id')->nullable()->after('foc_quantity');
            $table->integer('foc_base_quantity')->default(0)->after('base_quantity');
            $table->foreign('foc_unit_id')->references('id')->on('units')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropForeign(['foc_unit_id']);
            $table->dropColumn(['foc_quantity', 'foc_unit_id', 'foc_base_quantity']);
        });
    }
};
