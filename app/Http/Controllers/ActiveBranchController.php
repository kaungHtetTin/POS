<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CashSession;
use Illuminate\Http\Request;

class ActiveBranchController extends Controller
{
    public function update(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
        ]);

        $branchId = $validated['branch_id'];
        $user = $request->user();

        $hasOpenSession = CashSession::where('user_id', $user->id)
            ->where('status', 'open')
            ->whereNull('closed_at')
            ->exists();

        if ($hasOpenSession) {
            return redirect()->back()->withErrors([
                'branch_id' => 'Close your active cash session before switching branches.',
            ]);
        }

        $canAccessAllBranches = $user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches');

        if (!$canAccessAllBranches && !$user->canAccessBranch($branchId)) {
            abort(403);
        }

        $user->update([
            'active_branch_id' => $branchId,
        ]);

        return redirect()->back();
    }
}
