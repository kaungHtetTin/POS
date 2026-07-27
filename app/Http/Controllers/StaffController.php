<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules;

class StaffController extends Controller
{
    protected function resolveStaff(string $staff): User
    {
        return User::query()->findOrFail($staff);
    }

    public function index(Request $request)
    {
        $search = trim((string) $request->get('search', ''));

        return Inertia::render('Staff/Index', [
            'staff' => User::with([
                'roles',
                'branch:id,name',
                'branches:id,name',
            ])
            ->withCount([
                'saleStaffSales as sales_count' => function ($q) {
                    $q->where('status', '!=', 'Voided');
                },
                'cashSessions as open_pos_sessions_count' => function ($q) {
                    $q->where('status', 'open')->whereNull('closed_at');
                },
            ])
            ->withSum(['saleStaffSales as sales_total' => function ($q) {
                $q->where('status', '!=', 'Voided');
            }], 'grand_total')
            ->whereHas('roles', function($q) {
                $q->where('name', '!=', 'Root');
            })
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString(),
            'roles' => Role::where('name', '!=', 'Root')->get(),
            'branches' => Branch::select('id', 'name')->orderBy('name')->get(),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'phone' => 'nullable|string|max:20',
            'branch_id' => 'required|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'exists:branches,id',
            'role_id' => 'required|exists:roles,id',
            'image' => 'nullable|image|max:2048',
        ]);

        DB::transaction(function () use ($request) {
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('staff-images', 'public');
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'branch_id' => $request->branch_id,
                'active_branch_id' => $request->branch_id,
                'image_path' => $imagePath,
            ]);

            $branchIds = collect($request->branch_ids ?? [])
                ->filter()
                ->push($request->branch_id)
                ->unique()
                ->values()
                ->all();

            $user->branches()->sync($branchIds);
            $user->roles()->attach($request->role_id);
        });

        return redirect()->back();
    }

    public function update(Request $request, string $locale, string $staff)
    {
        $staff = $this->resolveStaff($staff);

        // Prevent modifying Root users
        if ($staff->hasRole('Root')) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class.',email,'.$staff->id,
            'phone' => 'nullable|string|max:20',
            'branch_id' => 'required|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'exists:branches,id',
            'role_id' => 'required|exists:roles,id',
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'image' => 'nullable|image|max:2048',
        ]);

        DB::transaction(function () use ($request, $staff) {
            $data = [
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'branch_id' => $request->branch_id,
                'active_branch_id' => $request->branch_id,
            ];

            if ($request->hasFile('image')) {
                // Delete old image if exists
                if ($staff->image_path) {
                    Storage::disk('public')->delete($staff->image_path);
                }
                $data['image_path'] = $request->file('image')->store('staff-images', 'public');
            }

            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            $staff->update($data);

            $branchIds = collect($request->branch_ids ?? [])
                ->filter()
                ->push($request->branch_id)
                ->unique()
                ->values()
                ->all();

            $staff->branches()->sync($branchIds);
            $staff->roles()->sync([$request->role_id]);
        });

        return redirect()->back();
    }

    public function destroy(string $locale, string $staff)
    {
        $staff = $this->resolveStaff($staff);

        if ($staff->hasRole('Root') || $staff->id === auth()->id()) {
            abort(403);
        }

        // Delete image if exists
        if ($staff->image_path) {
            Storage::disk('public')->delete($staff->image_path);
        }

        $staff->delete();

        return redirect()->back();
    }
}
