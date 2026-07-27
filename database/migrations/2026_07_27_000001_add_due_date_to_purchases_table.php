<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (!Schema::hasColumn('purchases', 'due_date')) {
                $table->date('due_date')->nullable()->after('purchase_date');
            }
        });

        if (Schema::hasColumn('purchases', 'due_date')) {
            DB::table('purchases')
                ->whereNull('due_date')
                ->orderBy('id')
                ->chunk(100, function ($purchases) {
                    foreach ($purchases as $purchase) {
                        DB::table('purchases')
                            ->where('id', $purchase->id)
                            ->update([
                                'due_date' => Carbon::parse($purchase->purchase_date)->addDays(7)->toDateString(),
                            ]);
                    }
                });
        }
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (Schema::hasColumn('purchases', 'due_date')) {
                $table->dropColumn('due_date');
            }
        });
    }
};
