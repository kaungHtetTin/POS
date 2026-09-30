<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use App\Support\Spa;
use App\Support\PharmacyAccess;
use Illuminate\Support\Facades\DB;

class RolesController extends Controller
{
    private const PROTECTED_ROLES = ['Owner', 'Root'];

    public function index()
    {
        return Spa::render('Roles/Index', [
            'roles' => Role::with('permissions')->withCount('users')->get(),
            'permissions' => Permission::whereIn('slug', PharmacyAccess::permissionSlugs())->orderBy('name')->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        DB::transaction(function () use ($validated) {
            $role = Role::create([
                'name' => $validated['name']
            ]);
            if (isset($validated['permissions'])) {
                $role->permissions()->sync($validated['permissions']);
            }
        });

        return redirect()->back();
    }

    public function update(Request $request, Role $role)
    {
        if (in_array($role->name, self::PROTECTED_ROLES, true)) {
            abort(403, 'The Owner role cannot be modified.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        DB::transaction(function () use ($role, $validated) {
            $role->update([
                'name' => $validated['name']
            ]);
            if (isset($validated['permissions'])) {
                $role->permissions()->sync($validated['permissions']);
            }
        });

        return redirect()->back();
    }

    public function destroy(Role $role)
    {
        if (in_array($role->name, self::PROTECTED_ROLES, true) || $role->users()->exists()) {
            abort(403, 'System roles and roles with assigned users cannot be deleted.');
        }

        $role->delete();

        return redirect()->back();
    }
}
