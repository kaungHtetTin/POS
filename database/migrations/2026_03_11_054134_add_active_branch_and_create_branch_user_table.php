<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('active_branch_id')->nullable()->after('branch_id');
            $table->foreign('active_branch_id')->references('id')->on('branches')->onDelete('set null');
        });

        Schema::create('branch_user', function (Blueprint $table) {
            $table->uuid('branch_id');
            $table->uuid('user_id');
            $table->timestamps();

            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->primary(['branch_id', 'user_id']);
        });

        try {
            $users = DB::table('users')->select('id', 'branch_id', 'active_branch_id')->get();

            foreach ($users as $user) {
                if (!$user->branch_id) {
                    continue;
                }

                DB::table('branch_user')->updateOrInsert(
                    ['branch_id' => $user->branch_id, 'user_id' => $user->id],
                    ['created_at' => now(), 'updated_at' => now()]
                );

                if (!$user->active_branch_id) {
                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['active_branch_id' => $user->branch_id]);
                }
            }
        } catch (\Throwable $e) {
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('branch_user');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['active_branch_id']);
            $table->dropColumn('active_branch_id');
        });
    }
};
