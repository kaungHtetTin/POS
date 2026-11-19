<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Keep the audit trail when a source document or catalog record is removed.
            $table->uuid('product_id')->index();
            $table->uuid('branch_id')->index();
            $table->uuid('user_id')->nullable();
            $table->string('product_name');
            $table->string('branch_name');
            $table->string('user_name')->nullable();
            $table->string('type', 40)->index();
            $table->bigInteger('quantity');
            $table->bigInteger('balance_before');
            $table->bigInteger('balance_after');
            $table->string('source_type')->nullable();
            $table->uuid('source_id')->nullable();
            $table->string('reference')->nullable();
            $table->string('batch_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at', 6)->index();
            $table->index(['product_id', 'branch_id', 'created_at']);
        });

        DB::table('inventories')->orderBy('id')->chunkById(500, function ($inventories) {
            $products = DB::table('products')->whereIn('id', $inventories->pluck('product_id'))->pluck('name', 'id');
            $branches = DB::table('branches')->whereIn('id', $inventories->pluck('branch_id'))->pluck('name', 'id');
            $now = now();
            DB::table('stock_movements')->insert($inventories->map(fn ($inventory) => [
                'id' => (string) Str::uuid(),
                'product_id' => $inventory->product_id,
                'branch_id' => $inventory->branch_id,
                'product_name' => $products[$inventory->product_id] ?? 'Deleted product',
                'branch_name' => $branches[$inventory->branch_id] ?? 'Deleted branch',
                'type' => 'Opening balance',
                'quantity' => $inventory->quantity,
                'balance_before' => 0,
                'balance_after' => $inventory->quantity,
                'notes' => 'Balance when movement tracking started. Earlier actions are not reconstructed.',
                'created_at' => $now,
            ])->all());
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
