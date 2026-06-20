<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($this->userPayload($request->user()));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'],
        ]);

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
        ]);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($request->hasFile('image')) {
            if ($user->image_path) {
                Storage::disk('public')->delete($user->image_path);
            }

            $user->image_path = $request->file('image')->store('profile-images', 'public');
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->userPayload($user->fresh(['branch', 'activeBranch'])),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    public function branches(Request $request)
    {
        $user = $request->user()->load(['branch', 'activeBranch']);
        $currentBranchId = $user->currentBranchId();
        $branches = collect();

        if ($user->branch) {
            $branches->push($user->branch);
        }

        $branches = $branches
            ->merge($user->branches()->get())
            ->unique('id')
            ->values();

        return response()->json([
            'assigned_branch' => $this->branchPayload($user->branch),
            'active_branch' => $this->branchPayload($user->activeBranch ?: $user->branch),
            'current_branch_id' => $currentBranchId,
            'branches' => $branches->map(function ($branch) use ($currentBranchId) {
                return array_merge($this->branchPayload($branch), [
                    'is_current' => $branch->id === $currentBranchId,
                ]);
            }),
        ]);
    }

    public function access(Request $request)
    {
        $user = $request->user()->loadMissing(['roles.permissions']);

        $roles = $user->roles
            ->map(fn ($role) => [
                'id' => $role->id,
                'name' => $role->name,
            ])
            ->values();

        $permissions = $user->roles
            ->flatMap->permissions
            ->unique('id')
            ->sortBy('slug')
            ->map(fn ($permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'slug' => $permission->slug,
            ])
            ->values();

        $permissionSlugs = $permissions->pluck('slug')->values();
        $roleNames = $roles->pluck('name')->values();
        $canAccessAllBranches = $roleNames->contains('Owner')
            || $roleNames->contains('Root')
            || $permissionSlugs->contains('manage_branches');

        return response()->json([
            'user_id' => $user->id,
            'roles' => $roles,
            'role_names' => $roleNames,
            'permissions' => $permissions,
            'permission_slugs' => $permissionSlugs,
            'access' => [
                'can_access_all_branches' => $canAccessAllBranches,
                'current_branch_id' => $user->currentBranchId(),
                'branch_id' => $user->branch_id,
                'active_branch_id' => $user->active_branch_id,
            ],
        ]);
    }

    public function switchBranch(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
        ]);

        $user = $request->user();
        $canAccessAllBranches = $user->hasRole('Owner')
            || $user->hasRole('Root')
            || $user->hasPermission('manage_branches');

        if (!$canAccessAllBranches && !$user->canAccessBranch($validated['branch_id'])) {
            return response()->json([
                'message' => 'You do not have access to this branch.',
            ], 403);
        }

        $user->update([
            'active_branch_id' => $validated['branch_id'],
        ]);

        return response()->json([
            'message' => 'Branch switched successfully.',
            'current_branch_id' => $user->fresh()->currentBranchId(),
        ]);
    }

    private function userPayload(User $user): array
    {
        $user->loadMissing(['branch', 'activeBranch']);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'image_url' => $user->image_path ? url('storage/' . $user->image_path) : null,
            'branch_id' => $user->branch_id,
            'active_branch_id' => $user->active_branch_id,
            'current_branch_id' => $user->currentBranchId(),
            'assigned_branch' => $this->branchPayload($user->branch),
            'active_branch' => $this->branchPayload($user->activeBranch ?: $user->branch),
        ];
    }

    private function branchPayload($branch): ?array
    {
        if (!$branch) {
            return null;
        }

        return [
            'id' => $branch->id,
            'name' => $branch->name,
            'address' => $branch->address,
            'phone' => $branch->phone,
            'email' => $branch->email,
        ];
    }
}
