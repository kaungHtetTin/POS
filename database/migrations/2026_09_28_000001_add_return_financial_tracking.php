<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('return_credit_amount', 15, 2)->default(0);
        });

        Schema::table('returns', function (Blueprint $table) {
            $table->decimal('credit_applied', 15, 2)->default(0);
            $table->decimal('settlement_due', 15, 2)->default(0);
            $table->decimal('settlement_paid', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->timestamp('approved_at')->nullable();
        });

        DB::table('returns')->where('status', 'Approved')->update(['approved_at' => DB::raw('updated_at')]);

        Schema::table('return_items', function (Blueprint $table) {
            $table->decimal('quantity', 10, 2)->change();
            $table->uuid('source_purchase_item_id')->nullable()->index();
            $table->decimal('paid_quantity', 10, 2)->default(0);
            $table->decimal('foc_quantity', 10, 2)->default(0);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
        });

        DB::table('return_items')->update([
            'paid_quantity' => DB::raw('quantity'),
            'refund_amount' => DB::raw('ROUND(quantity * refund_price, 2)'),
        ]);

        Schema::create('return_settlements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('return_id');
            $table->uuid('user_id')->nullable();
            $table->uuid('cash_session_id')->nullable();
            $table->decimal('amount', 15, 2);
            $table->enum('payment_method', ['Cash', 'Card', 'Mobile', 'Wallet']);
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('settled_at');
            $table->timestamps();
            $table->foreign('return_id')->references('id')->on('returns')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('cash_session_id')->references('id')->on('cash_sessions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_settlements');
        Schema::table('return_items', function (Blueprint $table) {
            $table->dropColumn(['source_purchase_item_id', 'paid_quantity', 'foc_quantity', 'refund_amount', 'tax_amount']);
            $table->integer('quantity')->change();
        });
        Schema::table('returns', function (Blueprint $table) {
            $table->dropColumn(['credit_applied', 'settlement_due', 'settlement_paid', 'tax_amount', 'approved_at']);
        });
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('return_credit_amount');
        });
    }
};
