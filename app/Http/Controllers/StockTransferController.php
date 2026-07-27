<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $query = StockTransfer::with(['fromBranch:id,name', 'toBranch:id,name'])
            ->withCount('items');

        if ($request->search) {
            $query->where('reference_number', 'like', "%{$request->search}%");
        }

        return Inertia::render('Inventory/Transfers', [
            'transfers' => $query->latest()->get(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Inventory/Transfers/Create', [
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'products' => Product::with('category:id,name')
                ->with('inventories:id,product_id,branch_id,quantity')
                ->select('id', 'category_id', 'name', 'generic_name', 'brand_name', 'barcode', 'image_path')
                ->where('status', 'Active')
                ->orderBy('name')
                ->get(),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'from_branch_id' => 'required|exists:branches,id',
            'to_branch_id' => 'required|exists:branches,id|different:from_branch_id',
            'transfer_date' => 'required|date|before_or_equal:today',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.inventory_batch_id' => 'required|exists:inventory_batches,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($validated) {
            $transfer = StockTransfer::create([
                'from_branch_id' => $validated['from_branch_id'],
                'to_branch_id' => $validated['to_branch_id'],
                'transfer_date' => $validated['transfer_date'],
                'status' => 'Completed', // For now, we auto-complete the transfer
                'reference_number' => 'TRF-' . strtoupper(bin2hex(random_bytes(4))),
                'notes' => $validated['notes'],
            ]);

            foreach ($validated['items'] as $item) {
                // 1. Check if source batch has enough stock
                $sourceBatch = InventoryBatch::where('id', $item['inventory_batch_id'])
                    ->where('branch_id', $validated['from_branch_id'])
                    ->firstOrFail();

                if ($sourceBatch->quantity < $item['quantity']) {
                    throw new \Exception("Insufficient stock in batch {$sourceBatch->batch_number} at source branch.");
                }

                // 2. Create transfer item
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'inventory_batch_id' => $item['inventory_batch_id'],
                    'quantity' => $item['quantity'],
                ]);

                // 3. Deduct from source inventory and batch
                $sourceBatch->decrement('quantity', $item['quantity']);
                Inventory::where('branch_id', $validated['from_branch_id'])
                    ->where('product_id', $item['product_id'])
                    ->decrement('quantity', $item['quantity']);

                // 4. Add to destination inventory and batch (or create new batch record at destination)
                $destBatch = InventoryBatch::where('branch_id', $validated['to_branch_id'])
                    ->where('product_id', $item['product_id'])
                    ->where('batch_number', $sourceBatch->batch_number)
                    ->where('expiry_date', $sourceBatch->expiry_date)
                    ->first();

                if ($destBatch) {
                    $destBatch->increment('quantity', $item['quantity']);
                } else {
                    InventoryBatch::create([
                        'branch_id' => $validated['to_branch_id'],
                        'product_id' => $item['product_id'],
                        'batch_number' => $sourceBatch->batch_number,
                        'expiry_date' => $sourceBatch->expiry_date,
                        'quantity' => $item['quantity'],
                        'purchase_price' => $sourceBatch->purchase_price,
                        'selling_price' => $sourceBatch->selling_price,
                    ]);
                }

                $destInventory = Inventory::firstOrCreate(
                    ['branch_id' => $validated['to_branch_id'], 'product_id' => $item['product_id']],
                    ['quantity' => 0]
                );
                $destInventory->increment('quantity', $item['quantity']);
            }
        });

        return redirect()->route('inventory.transfers.index')->with('success', 'Stock transfer completed successfully.');
    }
}
