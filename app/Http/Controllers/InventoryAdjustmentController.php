<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use App\Models\InventoryBatch;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InventoryAdjustmentController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryAdjustment::with(['product:id,name', 'branch:id,name', 'batch:id,batch_number', 'user:id,name']);

        if ($request->search) {
            $query->whereHas('product', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%");
            });
        }

        return Inertia::render('Inventory/Adjustments', [
            'adjustments' => $query->latest()->paginate(15)->withQueryString(),
            'products' => Product::select('id', 'name')->where('status', 'Active')->orderBy('name')->get(),
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'product_id' => 'required|exists:products,id',
            'inventory_batch_id' => 'nullable|exists:inventory_batches,id',
            'adjustment_type' => 'required|in:Damage,Return,Correction,Expiry,Theft,Other',
            'quantity' => 'required|integer|not_in:0',
            'reason' => 'nullable|string|max:255',
            'adjustment_date' => 'required|date|before_or_equal:today',
        ]);

        DB::transaction(function () use ($validated) {
            $adjustment = InventoryAdjustment::create([
                'branch_id' => $validated['branch_id'],
                'product_id' => $validated['product_id'],
                'inventory_batch_id' => $validated['inventory_batch_id'],
                'user_id' => auth()->id(),
                'adjustment_type' => $validated['adjustment_type'],
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'adjustment_date' => $validated['adjustment_date'],
            ]);

            // Update Global Inventory
            $inventory = Inventory::firstOrCreate(
                ['branch_id' => $validated['branch_id'], 'product_id' => $validated['product_id']],
                ['quantity' => 0]
            );
            $inventory->increment('quantity', $validated['quantity']);

            // Update Batch Inventory if specified
            if ($validated['inventory_batch_id']) {
                $batch = InventoryBatch::findOrFail($validated['inventory_batch_id']);
                $batch->increment('quantity', $validated['quantity']);
            }
        });

        return redirect()->back()->with('success', 'Inventory adjustment recorded successfully.');
    }

    public function getBatches(string $locale, string $product, string $branch)
    {
        $batches = InventoryBatch::where('product_id', $product)
            ->where('branch_id', $branch)
            ->where('quantity', '>', 0)
            ->select('id', 'batch_number', 'quantity', 'expiry_date')
            ->orderBy('expiry_date')
            ->get();

        return response()->json($batches);
    }
}
