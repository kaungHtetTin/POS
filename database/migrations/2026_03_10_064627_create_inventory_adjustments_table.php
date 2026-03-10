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
        Schema::create('inventory_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('product_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('inventory_batch_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignUuid('user_id')->constrained()->onDelete('cascade');
            
            $table->string('adjustment_type'); // Damage, Return, Correction, Expiry, etc.
            $table->integer('quantity'); // Positive for addition, Negative for deduction
            $table->string('reason')->nullable();
            $table->date('adjustment_date');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('inventory_adjustments');
    }
};
