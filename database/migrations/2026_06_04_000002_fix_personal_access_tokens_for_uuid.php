<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Step 1: Drop the old integer tokenable_id and its index
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            // Drop existing index if it exists
            try {
                $table->dropIndex('personal_access_tokens_tokenable_type_tokenable_id_index');
            } catch (\Exception $e) {
                // Index might not exist, ignore
            }
            
            $table->dropColumn('tokenable_id');
        });

        // Step 2: Add tokenable_id as UUID
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->uuid('tokenable_id')->after('tokenable_type');
            
            // Create new index for UUID lookup
            $table->index(['tokenable_type', 'tokenable_id'], 'personal_access_tokens_tokenable_uuid_index');
        });
    }

    public function down()
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            try {
                $table->dropIndex('personal_access_tokens_tokenable_uuid_index');
            } catch (\Exception $e) {}
            
            $table->dropColumn('tokenable_id');
        });

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->unsignedBigInteger('tokenable_id')->after('tokenable_type');
            $table->index(['tokenable_type', 'tokenable_id']);
        });
    }
};