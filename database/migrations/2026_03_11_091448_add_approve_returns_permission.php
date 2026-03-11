<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $existing = DB::table('permissions')->where('slug', 'approve_returns')->first();
        $permissionId = $existing?->id ?: (string) Str::uuid();

        if (!$existing) {
            DB::table('permissions')->insert([
                'id' => $permissionId,
                'name' => 'Approve Returns',
                'slug' => 'approve_returns',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $roleIds = DB::table('roles')
            ->whereIn('name', ['Owner', 'Root', 'Manager'])
            ->pluck('id');

        foreach ($roleIds as $roleId) {
            DB::table('permission_role')->updateOrInsert(
                ['permission_id' => $permissionId, 'role_id' => $roleId],
                []
            );
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        $permission = DB::table('permissions')->where('slug', 'approve_returns')->first();
        if (!$permission) {
            return;
        }

        DB::table('permission_role')->where('permission_id', $permission->id)->delete();
        DB::table('permissions')->where('id', $permission->id)->delete();
    }
};
