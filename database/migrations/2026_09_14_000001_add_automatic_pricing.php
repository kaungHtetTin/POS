<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_states', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->unsignedBigInteger('version')->default(1);
        });
        DB::table('pricing_states')->insert(['id' => 1, 'version' => 1]);
        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->string('code', 30)->primary();
            $table->string('name');
            $table->string('pricing_mode', 16)->default('manual');
            $table->decimal('markup_percent', 8, 4)->default(0);
            $table->unsignedInteger('rounding')->default(1);
            $table->decimal('minimum_profit', 15, 2)->default(0);
            $table->unsignedBigInteger('version')->default(1);
            $table->timestamps();
        });
        foreach (['selling_price' => 'Selling price', 'wholesale_price' => 'Wholesale price'] as $code => $name) {
            DB::table('pricing_rules')->insert(['code' => $code, 'name' => $name, 'created_at' => now(), 'updated_at' => now()]);
        }
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('pricing_base_cost', 18, 6)->nullable();
            $table->decimal('pricing_buying_cost', 18, 6)->nullable();
            $table->unsignedBigInteger('pricing_version')->default(1);
        });
        Schema::table('product_units', function (Blueprint $table) {
            foreach (['selling_price', 'wholesale_price'] as $field) {
                $table->string($field.'_mode', 16)->default('manual');
                $table->string($field.'_status', 20)->default('manual');
            }
        });
        Schema::create('price_changes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('product_id');
            $table->uuid('product_unit_id')->nullable();
            $table->string('product_name');
            $table->string('unit_name');
            $table->string('price_type', 30);
            $table->decimal('old_price', 15, 2);
            $table->decimal('new_price', 15, 2);
            $table->decimal('cost_used', 18, 6)->nullable();
            $table->json('rule_snapshot')->nullable();
            $table->string('trigger', 40);
            $table->uuid('actor_id')->nullable();
            $table->timestamp('created_at');
            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_changes');
        Schema::table('product_units', function (Blueprint $table) {
            $table->dropColumn(['selling_price_mode', 'selling_price_status', 'wholesale_price_mode', 'wholesale_price_status']);
        });
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn(['pricing_base_cost', 'pricing_buying_cost', 'pricing_version']));
        Schema::dropIfExists('pricing_rules');
        Schema::dropIfExists('pricing_states');
    }
};
