<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Support\PharmacyAccess;
use App\Support\Spa;

class PermissionsController extends Controller
{
    public function index()
    {
        $definitions = collect(PharmacyAccess::PERMISSIONS)->keyBy('slug');

        return Spa::render('Permissions/Index', [
            'permissions' => Permission::query()
                ->whereIn('slug', PharmacyAccess::permissionSlugs())
                ->orderBy('name')
                ->get()
                ->map(function (Permission $permission) use ($definitions) {
                    $definition = $definitions->get($permission->slug, []);

                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'slug' => $permission->slug,
                        'category' => $definition['category'] ?? 'Other',
                        'description' => $definition['description'] ?? '',
                    ];
                })
                ->values(),
        ]);
    }
}
