import { usePage } from '@inertiajs/react';

/**
 * Custom hook to check if the current user has a specific permission.
 */
export const usePermission = () => {
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions || [];

    const hasPermission = (permission) => {
        if (!permission) return true;
        return permissions.includes(permission);
    };

    const hasAnyPermission = (requiredPermissions = []) => {
        if (requiredPermissions.length === 0) return true;
        return requiredPermissions.some(p => permissions.includes(p));
    };

    return { hasPermission, hasAnyPermission, permissions };
};

/**
 * Functional helper to check permissions outside of hooks (if needed).
 * Note: Requires the permissions array to be passed in.
 */
export const checkPermission = (userPermissions, permission) => {
    if (!permission) return true;
    return userPermissions.includes(permission);
};
