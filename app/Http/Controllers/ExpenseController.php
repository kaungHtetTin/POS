<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use App\Support\Spa;

class ExpenseController extends Controller
{
    protected function canAccessAllBranches($user): bool
    {
        return $user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches');
    }

    protected function accessibleBranchIds($user)
    {
        if ($this->canAccessAllBranches($user)) {
            return Branch::pluck('id');
        }

        $branchIds = collect([$user->branch_id, $user->active_branch_id])->filter()->values();

        try {
            $extraIds = $user->branches()->pluck('branches.id');
            $branchIds = $branchIds->merge($extraIds)->unique()->values();
        } catch (\Throwable $e) {
        }

        return $branchIds;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $branchId = $user->currentBranchId();
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        $query = Expense::query()
            ->with(['branch:id,name', 'category:id,name'])
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            }, function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            })
            ->whereIn('branch_id', $accessibleBranchIds)
            ->when($request->filled('expense_category_id'), function ($q) use ($request) {
                $q->where('expense_category_id', $request->expense_category_id);
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string) $request->search);
                $q->where('title', 'like', "%{$search}%");
            })
            ->when($request->filled('from_date'), function ($q) use ($request) {
                $q->whereDate('expense_date', '>=', $request->from_date);
            })
            ->when($request->filled('to_date'), function ($q) use ($request) {
                $q->whereDate('expense_date', '<=', $request->to_date);
            });

        $branches = Branch::select('id', 'name')
            ->whereIn('id', $accessibleBranchIds)
            ->orderBy('name')
            ->get();

        $categories = ExpenseCategory::select('id', 'name')->orderBy('name')->get();
        $summary = (clone $query)
            ->selectRaw('COUNT(*) as entries_count')
            ->selectRaw('COALESCE(SUM(amount), 0) as total_amount')
            ->first();

        return Spa::render('Expenses/Index', [
            'expenses' => $query->latest('expense_date')->latest()->paginate(15)->withQueryString(),
            'branches' => $branches,
            'categories' => $categories,
            'filters' => $request->only(['search', 'branch_id', 'expense_category_id', 'from_date', 'to_date']),
            'summary' => [
                'entries_count' => (int) ($summary->entries_count ?? 0),
                'total_amount' => (float) ($summary->total_amount ?? 0),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0|max:999999999999.99',
            'expense_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (!$this->canAccessAllBranches($request->user()) && !$request->user()->canAccessBranch($validated['branch_id'])) {
            abort(403);
        }

        Expense::create($validated);

        return redirect()->back()->with('success', 'Expense created successfully.');
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0|max:999999999999.99',
            'expense_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (!$this->canAccessAllBranches($request->user()) && !$request->user()->canAccessBranch($validated['branch_id'])) {
            abort(403);
        }

        $expense->update($validated);

        return redirect()->back()->with('success', 'Expense updated successfully.');
    }

    public function destroy(Expense $expense)
    {
        if (!$this->canAccessAllBranches(request()->user()) && !request()->user()->canAccessBranch($expense->branch_id)) {
            abort(403);
        }

        $expense->delete();

        return redirect()->back()->with('success', 'Expense deleted successfully.');
    }
}
