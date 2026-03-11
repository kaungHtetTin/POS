<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->uuid('expense_category_id')->nullable()->after('branch_id');
            $table->index('expense_category_id');
            $table->foreign('expense_category_id')
                ->references('id')
                ->on('expense_categories')
                ->onDelete('set null');
        });

        $existing = DB::table('expense_categories')->where('name', 'General')->first();
        $categoryId = $existing?->id ?: (string) Str::uuid();

        if (!$existing) {
            DB::table('expense_categories')->insert([
                'id' => $categoryId,
                'name' => 'General',
                'description' => 'Default expense category',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('expenses')
            ->whereNull('expense_category_id')
            ->update([
                'expense_category_id' => $categoryId,
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['expense_category_id']);
            $table->dropIndex(['expense_category_id']);
            $table->dropColumn('expense_category_id');
        });
    }
};
