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
        Schema::create('sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('branch_id');
            $table->uuid('user_id');
            $table->uuid('customer_id')->nullable();
            $table->string('invoice_number')->unique();
            $table->decimal('total_amount', 15, 2);
            $table->decimal('discount', 15, 2)->default(0.00);
            $table->decimal('tax', 15, 2);
            $table->decimal('grand_total', 15, 2);
            $table->enum('payment_method', ['Cash', 'Card', 'Mobile', 'Wallet']);
            $table->enum('payment_status', ['Paid', 'Partial', 'Due']);
            $table->datetime('sale_date');
            $table->boolean('is_synced')->default(false);
            $table->timestamps();

            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('sales');
    }
};
