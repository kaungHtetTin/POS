<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use App\Support\Spa;

class BranchController extends Controller
{
    public function index()
    {
        return Spa::render('Branches/Index', [
            'branches' => Branch::withCount('users')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:branches,name',
            'address' => 'required|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $branch = Branch::create($validated);

        // Automatically assign new branch to all Root users
        $rootUsers = User::whereHas('roles', function($q) {
            $q->where('name', 'Root');
        })->get();

        foreach ($rootUsers as $user) {
            if (!$user->branches()->where('branches.id', $branch->id)->exists()) {
                $user->branches()->attach($branch->id);
            }
        }

        return redirect()->back();
    }

    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:branches,name,' . $branch->id,
            'address' => 'required|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $branch->update($validated);

        return redirect()->back();
    }

    public function destroy(Branch $branch)
    {
        if ($branch->users()->exists()) {
            abort(403, 'Branch cannot be deleted because it has assigned staff members.');
        }

        $branch->delete();

        return redirect()->back();
    }
}
