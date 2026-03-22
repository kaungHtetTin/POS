<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('branch_id');
            $table->uuid('user_id');
            $table->uuid('closed_by_user_id')->nullable();
            $table->decimal('opening_amount', 15, 2);
            $table->decimal('cash_received_total', 15, 2)->default(0.00);
            $table->decimal('change_given_total', 15, 2)->default(0.00);
            $table->decimal('net_cash_sales', 15, 2)->default(0.00);
            $table->decimal('expected_amount', 15, 2)->default(0.00);
            $table->decimal('closing_counted_amount', 15, 2)->nullable();
            $table->decimal('difference', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();

            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('closed_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['branch_id', 'user_id', 'status']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->uuid('cash_session_id')->nullable()->after('customer_id');
            $table->foreign('cash_session_id')->references('id')->on('cash_sessions')->nullOnDelete();
            $table->index('cash_session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['cash_session_id']);
            $table->dropIndex(['cash_session_id']);
            $table->dropColumn('cash_session_id');
        });

        Schema::dropIfExists('cash_sessions');
    }
};
