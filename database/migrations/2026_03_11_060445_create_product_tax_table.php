<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
        Schema::create('product_tax', function (Blueprint $table) {
            $table->uuid('product_id');
            $table->uuid('tax_id');
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('tax_id')->references('id')->on('taxes')->onDelete('cascade');
            $table->primary(['product_id', 'tax_id']);
        });

        try {
            $rows = DB::table('products')
                ->select('id', 'tax_id')
                ->whereNotNull('tax_id')
                ->get();

            foreach ($rows as $row) {
                DB::table('product_tax')->updateOrInsert(
                    ['product_id' => $row->id, 'tax_id' => $row->tax_id],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        } catch (\Throwable $e) {
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('product_tax');
    }
};
