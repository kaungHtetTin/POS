<?php

namespace App\Http\Controllers;

use App\Models\{Branch, Product, Setting, StockMovement};
use App\Support\Spa;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'branch_id' => ['nullable', 'uuid'],
            'product_id' => ['nullable', 'uuid'],
            'type' => ['nullable', Rule::in(StockMovement::TYPES)],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('date_from'), 'after_or_equal:date_from')],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $timezone = Setting::get('app.timezone', config('app.timezone'));
        $query = StockMovement::query()
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(function ($query) use ($search) {
                $query->where('product_name', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%")
                    ->orWhere('batch_number', 'like', "%{$search}%");
            }))
            ->when($filters['branch_id'] ?? null, fn ($query, $id) => $query->where('branch_id', $id))
            ->when($filters['product_id'] ?? null, fn ($query, $id) => $query->where('product_id', $id))
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($filters['date_from'] ?? null, fn ($query, $date) => $query->where('created_at', '>=', Carbon::parse($date, $timezone)->startOfDay()->utc()))
            ->when($filters['date_to'] ?? null, fn ($query, $date) => $query->where('created_at', '<', Carbon::parse($date, $timezone)->addDay()->startOfDay()->utc()));

        return Spa::render('Inventory/Movements', [
            'movements' => $query->orderByDesc('created_at')->orderByDesc('id')->paginate(25)->withQueryString(),
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'products' => Product::withTrashed()->select('id', 'name')->orderBy('name')->get(),
            'types' => StockMovement::TYPES,
            'timezone' => $timezone,
            'filters' => $request->only(['search', 'branch_id', 'product_id', 'type', 'date_from', 'date_to']),
        ]);
    }
}
