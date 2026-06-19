<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('discount_percentage', 5, 2)->default(0)->after('min_stock_level');
        });

        Schema::table('product_units', function (Blueprint $table) {
            $table->decimal('wholesale_price', 15, 2)->default(0)->after('selling_price');
        });

        DB::table('product_units')->update([
            'wholesale_price' => DB::raw('selling_price'),
        ]);

        Schema::table('sale_items', function (Blueprint $table) {
            $table->enum('price_type', ['retail', 'wholesale'])->default('retail')->after('unit_price');
            $table->decimal('original_unit_price', 15, 2)->default(0)->after('price_type');
            $table->decimal('discount_percentage', 5, 2)->default(0)->after('original_unit_price');
            $table->decimal('discount_amount', 15, 2)->default(0)->after('discount_percentage');
        });
    }

    public function down()
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn([
                'price_type',
                'original_unit_price',
                'discount_percentage',
                'discount_amount',
            ]);
        });

        Schema::table('product_units', function (Blueprint $table) {
            $table->dropColumn('wholesale_price');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('discount_percentage');
        });
    }
};
