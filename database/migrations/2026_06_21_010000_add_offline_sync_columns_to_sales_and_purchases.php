<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (!Schema::hasColumn('sales', 'client_reference')) {
                $table->string('client_reference')->nullable()->after('invoice_number')->unique();
            }

            if (!Schema::hasColumn('sales', 'synced_at')) {
                $table->timestamp('synced_at')->nullable()->after('is_synced');
            }
        });

        Schema::table('purchases', function (Blueprint $table) {
            if (!Schema::hasColumn('purchases', 'client_reference')) {
                $table->string('client_reference')->nullable()->after('invoice_number')->unique();
            }

            if (!Schema::hasColumn('purchases', 'user_id')) {
                $table->uuid('user_id')->nullable()->after('branch_id');
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('purchases', 'notes')) {
                $table->text('notes')->nullable()->after('payment_status');
            }

            if (!Schema::hasColumn('purchases', 'is_synced')) {
                $table->boolean('is_synced')->default(false)->after('notes');
            }

            if (!Schema::hasColumn('purchases', 'synced_at')) {
                $table->timestamp('synced_at')->nullable()->after('is_synced');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (Schema::hasColumn('purchases', 'user_id')) {
                $table->dropForeign(['user_id']);
            }
        });

        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'client_reference')) {
                $table->dropUnique(['client_reference']);
                $table->dropColumn('client_reference');
            }

            if (Schema::hasColumn('sales', 'synced_at')) {
                $table->dropColumn('synced_at');
            }
        });

        Schema::table('purchases', function (Blueprint $table) {
            if (Schema::hasColumn('purchases', 'client_reference')) {
                $table->dropUnique(['client_reference']);
                $table->dropColumn('client_reference');
            }

            foreach (['user_id', 'notes', 'is_synced', 'synced_at'] as $column) {
                if (Schema::hasColumn('purchases', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
