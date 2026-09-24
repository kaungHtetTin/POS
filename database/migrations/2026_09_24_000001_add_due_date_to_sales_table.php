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
        Schema::table('sales', function (Blueprint $table) {
            $table->date('due_date')->nullable()->index();
        });

        DB::table('sales')->whereIn('payment_status', ['Partial', 'Due'])
            ->orderBy('id')->chunkById(500, function ($sales) {
                foreach ($sales as $sale) {
                    DB::table('sales')->where('id', $sale->id)->update([
                        'due_date' => Carbon::parse($sale->sale_date)->addDays(7)->toDateString(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('sales', fn (Blueprint $table) => $table->dropColumn('due_date'));
    }
};
