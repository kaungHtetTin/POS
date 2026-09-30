<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Branch;
use Illuminate\Http\Request;
use App\Support\Spa;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules;

class StaffController extends Controller
{
    private const PROTECTED_ROLES = ['Owner', 'Root'];

    protected function resolveStaff(string $staff): User
    {
        return User::query()->findOrFail($staff);
    }

    public function index(Request $request)
    {
        $search = trim((string) $request->get('search', ''));
        $branchIds = $this->accessibleBranchIds($request->user());
        $roles = Role::with('permissions')
            ->whereNotIn('name', self::PROTECTED_ROLES)
            ->orderBy('name')
            ->get()
            ->filter(fn (Role $role) => $this->canAssignRole($request->user(), $role))
            ->values();

        return Spa::render('Staff/Index', [
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
                $q->whereNotIn('name', self::PROTECTED_ROLES);
            })
            ->whereIn('branch_id', $branchIds)
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
            'roles' => $roles,
            'branches' => Branch::select('id', 'name')->whereIn('id', $branchIds)->orderBy('name')->get(),
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
            'image' => 'nullable|image|max:250',
        ]);

        $this->ensureAssignableRole($request->user(), $request->role_id);
        $this->ensureAssignableBranches($request->user(), $request->branch_id, $request->branch_ids ?? []);

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

    public function update(Request $request, string $staff)
    {
        $staff = $this->resolveStaff($staff);

        $this->ensureCanManageStaff($request->user(), $staff);

        if ($this->hasProtectedRole($staff)) {
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
            'image' => 'nullable|image|max:250',
        ]);

        $this->ensureAssignableRole($request->user(), $request->role_id);
        $this->ensureAssignableBranches($request->user(), $request->branch_id, $request->branch_ids ?? []);

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

    public function destroy(string $staff)
    {
        $staff = $this->resolveStaff($staff);

        $this->ensureCanManageStaff(auth()->user(), $staff);

        if ($this->hasProtectedRole($staff) || $staff->id === auth()->id()) {
            abort(403);
        }

        // Delete image if exists
        if ($staff->image_path) {
            Storage::disk('public')->delete($staff->image_path);
        }

        $staff->delete();

        return redirect()->back();
    }

    private function hasProtectedRole(User $user): bool
    {
        return $user->roles()->whereIn('name', self::PROTECTED_ROLES)->exists();
    }

    private function ensureAssignableRole(User $actor, string $roleId): void
    {
        $role = Role::with('permissions')->findOrFail($roleId);

        abort_unless(
            $this->canAssignRole($actor, $role),
            403,
            'You cannot assign a role with permissions outside your own access.'
        );
    }

    private function canAssignRole(User $actor, Role $role): bool
    {
        if (in_array($role->name, self::PROTECTED_ROLES, true)) {
            return false;
        }

        if ($actor->hasRole('Owner') || $actor->hasRole('Root')) {
            return true;
        }

        return $role->permissions->every(fn ($permission) => $actor->hasPermission($permission->slug));
    }

    private function accessibleBranchIds(User $user)
    {
        if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
            return Branch::pluck('id');
        }

        return collect([$user->branch_id, $user->active_branch_id])
            ->merge($user->branches()->pluck('branches.id'))
            ->filter()
            ->unique()
            ->values();
    }

    private function ensureAssignableBranches(User $actor, string $primaryBranchId, array $additionalBranchIds): void
    {
        $allowed = $this->accessibleBranchIds($actor);
        $requested = collect($additionalBranchIds)->push($primaryBranchId)->filter()->unique();

        abort_if($requested->diff($allowed)->isNotEmpty(), 403, 'You cannot assign staff to a branch outside your access.');
    }

    private function ensureCanManageStaff(User $actor, User $staff): void
    {
        $staffBranchIds = collect([$staff->branch_id])
            ->merge($staff->branches()->pluck('branches.id'))
            ->filter()
            ->unique();

        abort_if(
            $staffBranchIds->diff($this->accessibleBranchIds($actor))->isNotEmpty(),
            403,
            'You cannot manage staff assigned outside your branches.'
        );
    }
}
