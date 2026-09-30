<?php

namespace App\Support;

final class PharmacyAccess
{
    public const OWNER = 'Owner';
    public const MANAGER = 'Manager';
    public const ACCOUNTANT = 'Accountant';
    public const CASHIER = 'Cashier';

    public const ROLES = [
        self::OWNER,
        self::MANAGER,
        self::ACCOUNTANT,
        self::CASHIER,
    ];

    public const PERMISSIONS = [
        ['name' => 'Process Sales', 'slug' => 'process_sale', 'category' => 'Sales', 'description' => 'Use the POS, maintain customers, and create returns.'],
        ['name' => 'Cancel Transactions', 'slug' => 'cancel_transaction', 'category' => 'Sales', 'description' => 'Void completed sales and cancel transactions.'],
        ['name' => 'Approve Returns', 'slug' => 'approve_returns', 'category' => 'Sales', 'description' => 'Approve or reject returns and their inventory movements.'],
        ['name' => 'Manage Products', 'slug' => 'manage_products', 'category' => 'Inventory', 'description' => 'Maintain medicines, categories, taxes, labels, and product imports.'],
        ['name' => 'Manage Inventory', 'slug' => 'manage_inventory', 'category' => 'Inventory', 'description' => 'View stock, batches, expiry, and low stock information.'],
        ['name' => 'Adjust Stock', 'slug' => 'adjust_stock', 'category' => 'Inventory', 'description' => 'Create stock adjustments and branch transfers.'],
        ['name' => 'Manage Suppliers', 'slug' => 'manage_suppliers', 'category' => 'Purchasing', 'description' => 'Maintain supplier records and imports.'],
        ['name' => 'Manage Purchases', 'slug' => 'manage_purchases', 'category' => 'Purchasing', 'description' => 'Create, edit, and review inventory purchases.'],
        ['name' => 'View Financial Reports', 'slug' => 'view_financial_reports', 'category' => 'Finance', 'description' => 'View sales, purchasing, cash session, and finance reports.'],
        ['name' => 'Manage Expenses', 'slug' => 'manage_expenses', 'category' => 'Finance', 'description' => 'Maintain expenses and expense categories.'],
        ['name' => 'Manage Payments', 'slug' => 'manage_payments', 'category' => 'Finance', 'description' => 'Record customer, supplier, and approved return settlements and review balances.'],
        ['name' => 'Manage Branches', 'slug' => 'manage_branches', 'category' => 'Administration', 'description' => 'Maintain branches and access data across all branches.'],
        ['name' => 'Manage Staff', 'slug' => 'manage_staff', 'category' => 'Administration', 'description' => 'Create and maintain staff accounts and branch assignments.'],
        ['name' => 'Manage Roles and Permissions', 'slug' => 'manage_roles_permissions', 'category' => 'Administration', 'description' => 'Define roles and assign system permissions.'],
        ['name' => 'Monitor Activity', 'slug' => 'monitor_activity', 'category' => 'Administration', 'description' => 'Review system activity logs.'],
        ['name' => 'Manage Settings', 'slug' => 'manage_settings', 'category' => 'Administration', 'description' => 'Maintain business, POS, pricing, invoice, and application settings.'],
    ];

    public const ROLE_PERMISSIONS = [
        self::MANAGER => [
            'process_sale',
            'cancel_transaction',
            'approve_returns',
            'manage_products',
            'manage_inventory',
            'adjust_stock',
            'manage_suppliers',
            'manage_purchases',
            'view_financial_reports',
            'manage_expenses',
            'manage_payments',
            'manage_staff',
            'monitor_activity',
            'manage_settings',
        ],
        self::ACCOUNTANT => [
            'view_financial_reports',
            'manage_expenses',
            'manage_payments',
        ],
        self::CASHIER => [
            'process_sale',
        ],
    ];

    public static function permissionSlugs(): array
    {
        return array_column(self::PERMISSIONS, 'slug');
    }
}
