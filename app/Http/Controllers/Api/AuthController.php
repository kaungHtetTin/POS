<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login via API and return Sanctum token.
     * This is a public endpoint (no authentication required).
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'device_name' => 'nullable|string|max:255',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status === 'Inactive') {
            return response()->json([
                'message' => 'Your account is inactive. Please contact administrator.',
            ], 403);
        }

        // Create token (device_name is useful for managing multiple sessions)
        $deviceName = $validated['device_name'] ?? $request->userAgent() ?? 'Android App';
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => $user->only('id', 'name', 'email', 'branch_id', 'active_branch_id'),
        ]);
    }

    /**
     * Logout and revoke current token.
     * Requires valid Sanctum token.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current authenticated user (already exists at /api/user)
     * This method can be used if you want a dedicated /api/me endpoint.
     */
    public function me(Request $request)
    {
        return response()->json(
            $request->user()->only('id', 'name', 'email', 'branch_id', 'active_branch_id')
        );
    }
}