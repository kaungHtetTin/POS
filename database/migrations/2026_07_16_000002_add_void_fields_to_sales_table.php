<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (!Schema::hasColumn('sales', 'status')) {
                $table->enum('status', ['Completed', 'Voided'])->default('Completed')->after('payment_status');
            }

            if (!Schema::hasColumn('sales', 'voided_by_user_id')) {
                $table->uuid('voided_by_user_id')->nullable()->after('status');
                $table->foreign('voided_by_user_id')->references('id')->on('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('sales', 'voided_at')) {
                $table->timestamp('voided_at')->nullable()->after('voided_by_user_id');
            }

            if (!Schema::hasColumn('sales', 'void_reason')) {
                $table->text('void_reason')->nullable()->after('voided_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'voided_by_user_id')) {
                $table->dropForeign(['voided_by_user_id']);
            }

            foreach (['void_reason', 'voided_at', 'voided_by_user_id', 'status'] as $column) {
                if (Schema::hasColumn('sales', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
