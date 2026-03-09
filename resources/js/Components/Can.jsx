import React from 'react';
import { usePermission } from '@/Utils/Permissions';

/**
 * Component wrapper for conditional rendering based on permissions.
 * 
 * Usage:
 * <Can permission="process_sale">
 *     <Button>Process Sale</Button>
 * </Can>
 */
const Can = ({ permission, permissions, children, fallback = null }) => {
    const { hasPermission, hasAnyPermission } = usePermission();

    if (permission) {
        return hasPermission(permission) ? <>{children}</> : fallback;
    }

    if (permissions) {
        return hasAnyPermission(permissions) ? <>{children}</> : fallback;
    }

    return <>{children}</>;
};

export default Can;
