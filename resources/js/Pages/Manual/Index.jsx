import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import {
    Box,
    Typography,
    Paper,
    Divider,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Alert,
    AlertTitle,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Circle as CircleIcon,
    Code as CodeIcon,
    Settings as SettingsIcon,
    Inventory as InventoryIcon,
    ShoppingCart as POSIcon,
    Security as SecurityIcon,
    BugReport as BugReportIcon,
    Storage as StorageIcon,
    Dashboard as DashboardIcon,
    Receipt as ReceiptIcon,
    LocalShipping as ShippingIcon,
    People as PeopleIcon,
    Store as StoreIcon,
    Assessment as AssessmentIcon,
    Tune as AdjustmentIcon,
} from '@mui/icons-material';

export default function Manual({ auth, appName }) {
    const sections = [
        {
            title: 'Technical Architecture & Stack',
            icon: <CodeIcon />,
            content: (
                <Box>
                    <Typography variant="body1" paragraph>
                        The application is built on a modern, monolithic architecture using the <strong>Laravel-Inertia-React</strong> stack. This provides the SEO and routing benefits of a traditional server-side framework with the interactivity of a Single Page Application (SPA).
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <StorageIcon color="primary" sx={{ mr: 1 }} fontSize="small" />
                                        <Typography variant="subtitle1" fontWeight="bold">Backend (Laravel 9)</Typography>
                                    </Box>
                                    <List dense>
                                        <ListItem><ListItemText primary="PHP 8.0+ Environment" secondary="Strict typing and modern syntax" /></ListItem>
                                        <ListItem><ListItemText primary="UUID Identifiers" secondary="All models use HasUuid trait for security" /></ListItem>
                                        <ListItem><ListItemText primary="Eloquent ORM" secondary="Complex relations (FEFO batch logic)" /></ListItem>
                                        <ListItem><ListItemText primary="Ziggy Routing" secondary="Named routes accessible in JS via route()" /></ListItem>
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <DashboardIcon color="primary" sx={{ mr: 1 }} fontSize="small" />
                                        <Typography variant="subtitle1" fontWeight="bold">Frontend (React 18)</Typography>
                                    </Box>
                                    <List dense>
                                        <ListItem><ListItemText primary="Vite Build Tool" secondary="Instant HMR and fast builds" /></ListItem>
                                        <ListItem><ListItemText primary="Inertia.js" secondary="State-sharing without APIs (shared props)" /></ListItem>
                                        <ListItem><ListItemText primary="Material UI (MUI)" secondary="Custom 4px radius, dense theme" /></ListItem>
                                        <ListItem><ListItemText primary="Context API" secondary="Global theme and language state" /></ListItem>
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <SettingsIcon color="primary" sx={{ mr: 1 }} fontSize="small" />
                                        <Typography variant="subtitle1" fontWeight="bold">Data Logic</Typography>
                                    </Box>
                                    <List dense>
                                        <ListItem><ListItemText primary="Multi-Branch" secondary="Active branch context via middleware" /></ListItem>
                                        <ListItem><ListItemText primary="Soft Deletes" secondary="Safe data removal for auditing" /></ListItem>
                                        <ListItem><ListItemText primary="Atomic Transactions" secondary="DB::transaction for critical operations" /></ListItem>
                                        <ListItem><ListItemText primary="Activity Logging" secondary="Comprehensive user action tracking" /></ListItem>
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )
        },
        {
            title: 'User Management & Security',
            icon: <SecurityIcon />,
            content: (
                <Box>
                    <Typography variant="body1" paragraph>
                        The system implements a granular Role-Based Access Control (RBAC) to ensure data security and operational integrity.
                    </Typography>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">1. Role & Permission Architecture</Typography>
                    <Typography variant="body2" paragraph>
                        Permissions are the smallest unit of access (e.g., <code>process_sale</code>). Roles are collections of these permissions. Users are then assigned a Role.
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.selected' }}>
                                <TableRow>
                                    <TableCell><strong>Role</strong></TableCell>
                                    <TableCell><strong>Description</strong></TableCell>
                                    <TableCell><strong>Management Scope</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Chip label="Root / Owner" size="small" color="primary" /></TableCell>
                                    <TableCell>Full System Admin</TableCell>
                                    <TableCell>Unrestricted access. Only Root can manage other Root users and system-wide configurations.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="Manager" size="small" color="secondary" /></TableCell>
                                    <TableCell>Store Supervisor</TableCell>
                                    <TableCell>Can manage inventory, staff (except Root), view financial reports, and approve returns.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="Cashier" size="small" variant="outlined" /></TableCell>
                                    <TableCell>Counter Staff</TableCell>
                                    <TableCell>Focused on POS, sales, and customer management within their assigned branch.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">2. Permission Reference</Typography>
                    <Typography variant="body2" paragraph>
                        Assign permissions through <strong>Role Management</strong>. A user can only see and use modules covered by the permissions attached to their role.
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.selected' }}>
                                <TableRow>
                                    <TableCell><strong>Permission</strong></TableCell>
                                    <TableCell><strong>Allows Access To</strong></TableCell>
                                    <TableCell><strong>Typical Users</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Chip label="manage_inventory" size="small" color="primary" variant="outlined" /></TableCell>
                                    <TableCell>Products/Medicines, purchases, suppliers, inventory, stock adjustments, stock transfers, categories, units, taxes, expiry report, and label printing.</TableCell>
                                    <TableCell>Owner, manager, inventory staff, purchasing staff.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="process_sale" size="small" color="success" variant="outlined" /></TableCell>
                                    <TableCell>POS, checkout, cash sessions, POS product/customer search, customer records, and creating return requests.</TableCell>
                                    <TableCell>Cashier, counter staff, branch operator.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="approve_returns" size="small" color="warning" variant="outlined" /></TableCell>
                                    <TableCell>Approve or reject submitted return requests. This should be separated from normal cashier sale processing when approval control is required.</TableCell>
                                    <TableCell>Manager, supervisor, owner.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="view_financial_reports" size="small" color="secondary" variant="outlined" /></TableCell>
                                    <TableCell>Sales history, reports, cash session report, expenses, and expense categories.</TableCell>
                                    <TableCell>Owner, accountant, manager.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="manage_branches" size="small" color="info" variant="outlined" /></TableCell>
                                    <TableCell>Branch management, system settings, invoice/label settings, localization settings, and all-branch operational access where supported.</TableCell>
                                    <TableCell>Owner, system administrator.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="manage_users" size="small" color="error" variant="outlined" /></TableCell>
                                    <TableCell>Staff management, role management, permission list, and activity logs.</TableCell>
                                    <TableCell>Owner, administrator.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
                        <Typography variant="caption">
                            <strong>Purchase/Product Access:</strong> To manage purchase products, medicines, suppliers, stock intake, and inventory movement, assign a role with <code>manage_inventory</code>.
                        </Typography>
                    </Alert>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">3. Staff Management & Multi-Branch Access</Typography>
                    <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.light', mb: 3 }}>
                        <Typography variant="body2" fontWeight="bold">Primary vs. Accessible Branches:</Typography>
                        <Typography variant="body2" paragraph>
                            - <strong>Primary Branch:</strong> The default branch where the staff member is stationed.<br />
                            - <strong>Accessible Branches:</strong> A staff member can be granted access to multiple branches. This allows them to switch their "Active Branch" context from the top navigation bar to view stock or process sales in different locations.
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">Staff Profiles:</Typography>
                        <Typography variant="body2">
                            Administrators can upload profile pictures, reset passwords, and update contact information (phone/email) for all staff members.
                        </Typography>
                    </Box>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">4. Activity Auditing</Typography>
                    <Typography variant="body2" paragraph>
                        Every sensitive action (Create, Update, Delete) is logged in the <strong>Activity Logs</strong>. Each log entry captures:
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                        {['User Identity', 'Timestamp', 'IP Address', 'Action Type (POST/PATCH/DELETE)', 'Resource Changed', 'Old vs New Data'].map(item => (
                            <Grid item key={item}><Chip label={item} size="small" variant="outlined" /></Grid>
                        ))}
                    </Grid>
                    <Alert severity="info" variant="outlined">
                        <Typography variant="caption"><strong>Auditor's Note:</strong> Activity logs are immutable and cannot be deleted or modified by any user, including Root, ensuring a transparent audit trail.</Typography>
                    </Alert>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 3 }}>5. Role Customization</Typography>
                    <Typography variant="body2" paragraph>
                        The <strong>Role Management</strong> module allows Administrators to create custom roles beyond the defaults. When creating or editing a role, you can selectively toggle specific permissions to match the staff member's exact responsibilities.
                    </Typography>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">6. Self-Service Profile Security</Typography>
                    <Typography variant="body2">
                        All users have access to their own <strong>Profile Settings</strong>, where they can:
                    </Typography>
                    <List dense>
                        <ListItem><ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon><ListItemText primary="Update personal information (Name/Email)." /></ListItem>
                        <ListItem><ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon><ListItemText primary="Change account password (requires current password verification)." /></ListItem>
                        <ListItem><ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon><ListItemText primary="Upload or update their profile picture." /></ListItem>
                    </List>
                </Box>
            )
        },
        {
            title: 'Master Data & Product Setup',
            icon: <SettingsIcon />,
            content: (
                <Box>
                    <Typography variant="body1" paragraph>
                        Master data management is the core of system integrity. This section covers how to configure the fundamental building blocks of your pharmacy.
                    </Typography>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">1. Categories & Classifications</Typography>
                    <Typography variant="body2" paragraph>
                        Organize your products into logical groups (e.g., <i>Antibiotics, Pain Relief, Supplements</i>). Categories are essential for:
                    </Typography>
                    <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                        {['Sales Filtering', 'Inventory Reports', 'POS Navigation'].map(item => <Chip key={item} label={item} size="small" variant="outlined" />)}
                    </Box>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">2. Multi-Unit Management</Typography>
                    <Typography variant="body2" paragraph>
                        The system supports complex unit conversions, allowing you to buy in bulk and sell in smaller increments.
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.selected' }}>
                                <TableRow>
                                    <TableCell><strong>Unit Type</strong></TableCell>
                                    <TableCell><strong>Description</strong></TableCell>
                                    <TableCell><strong>Example</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><strong>Base Unit</strong></TableCell>
                                    <TableCell>The smallest sellable unit (Conversion = 1)</TableCell>
                                    <TableCell>1 Tablet</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Secondary Unit</strong></TableCell>
                                    <TableCell>A group of base units (Conversion {'>'} 1)</TableCell>
                                    <TableCell>1 Box (30 Tablets)</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
                        <Typography variant="caption"><strong>Critical:</strong> Base units cannot be deleted if sales exist. Conversion factors must be set accurately during product creation.</Typography>
                    </Alert>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">3. Tax Configuration</Typography>
                    <Typography variant="body2" paragraph>
                        Configure multiple tax rates (VAT, GST, etc.) and assign them to products.
                    </Typography>
                    <List dense>
                        <ListItem>
                            <ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon>
                            <ListItemText primary="Inclusive Tax" secondary="Tax is already included in the Selling Price." />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon>
                            <ListItemText primary="Exclusive Tax" secondary="Tax is added on top of the Selling Price at checkout." />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon>
                            <ListItemText primary="Multiple Taxes" secondary="Assign multiple tax rates to a single product for complex regulatory requirements." />
                        </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 2 }}>4. Product Profile Deep Dive</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="bold">Key Attributes:</Typography>
                            <List dense>
                                <ListItem><ListItemText primary="Generic Name" secondary="Used for bio-equivalent drug searches." /></ListItem>
                                <ListItem><ListItemText primary="Barcode" secondary="Unique ID for high-speed POS scanning." /></ListItem>
                                <ListItem><ListItemText primary="Strength" secondary="Dosage info (e.g., 500mg, 10ml)." /></ListItem>
                            </List>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="bold">Alert Settings:</Typography>
                            <List dense>
                                <ListItem><ListItemText primary="Min Stock Level" secondary="Threshold for 'Low Stock' notifications." /></ListItem>
                                <ListItem><ListItemText primary="Expiry Alerts" secondary="Days before expiry to trigger a warning." /></ListItem>
                            </List>
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 2 }}>5. Label & Barcode Printing</Typography>
                    <Typography variant="body2">
                        Generate and print labels for medicines that don't have manufacturer barcodes. Customize label dimensions (Width/Height) and content (Pharmacy Name, Price, Expiry) in <strong>System Settings</strong>.
                    </Typography>
                </Box>
            )
        },
        {
            title: 'Inventory & Purchasing (FEFO)',
            icon: <InventoryIcon />,
            content: (
                <Box>
                    <Typography variant="body1" paragraph>
                        The system uses a sophisticated batch-tracking inventory model to ensure product safety, financial accuracy, and minimal waste.
                    </Typography>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">1. Purchasing & Stock Intake</Typography>
                    <Typography variant="body2" paragraph>
                        All new stock enters the system through the <strong>Purchases</strong> module. This is the only way to create new inventory batches with expiry dates.
                    </Typography>
                    <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.light', mb: 3 }}>
                        <Typography variant="body2"><strong>Supplier Credit:</strong> The system validates the supplier's <i>Credit Limit</i>. If a purchase's due amount exceeds this limit, the system will issue a warning or block the transaction.</Typography>
                        <Typography variant="body2"><strong>Batch Details:</strong> For every item, you must record a <i>Batch Number</i> and <i>Expiry Date</i>. If no batch number is provided, the system generates one automatically based on the date.</Typography>
                        <Typography variant="body2"><strong>Pricing:</strong> You must set both the <i>Cost Price</i> (what you paid) and the <i>Selling Price</i> (what the customer pays) for the specific batch.</Typography>
                    </Box>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">2. Inventory Architecture</Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Aggregate Inventory</Typography>
                                    <Typography variant="caption">The total quantity of a product available in a specific branch. Used for quick stock checks.</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Inventory Batches (FEFO)</Typography>
                                    <Typography variant="caption">The granular breakdown of stock by expiry date. Sales always deduct from the <strong>earliest expiring batch</strong> first.</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">3. Stock Movements</Typography>
                    <List dense>
                        <ListItem>
                            <ListItemIcon><ShippingIcon fontSize="small" /></ListItemIcon>
                            <ListItemText 
                                primary="Stock Transfers" 
                                secondary="Move batches between branches. The system maintains batch numbers and expiry dates at the destination branch." 
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><AdjustmentIcon fontSize="small" /></ListItemIcon>
                            <ListItemText 
                                primary="Inventory Adjustments" 
                                secondary="Correct discrepancies due to damage, theft, or audit errors. Adjustments can be 'Additions' or 'Subtractions' and must be tied to a specific batch." 
                            />
                        </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 2 }}>4. Returns Management</Typography>
                    <Typography variant="body2" paragraph>
                        The system supports two types of returns, both requiring a multi-step approval workflow:
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.selected' }}>
                                <TableRow>
                                    <TableCell><strong>Return Type</strong></TableCell>
                                    <TableCell><strong>Reference</strong></TableCell>
                                    <TableCell><strong>Impact</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><strong>Customer Return</strong></TableCell>
                                    <TableCell>Sale Invoice</TableCell>
                                    <TableCell>Stock returns to batch; Refund issued to customer.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Supplier Return</strong></TableCell>
                                    <TableCell>Purchase Invoice</TableCell>
                                    <TableCell>Stock deducted from batch; Supplier balance decreased.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                        <Typography variant="caption"><strong>Approval Note:</strong> Returns are created as 'Pending'. A Manager or Owner must <strong>Approve</strong> the return before stock and financial balances are actually updated.</Typography>
                    </Alert>
                </Box>
            )
        },
        {
            title: 'POS & Sales Operations',
            icon: <POSIcon />,
            content: (
                <Box>
                    <Typography variant="body1" paragraph>
                        The Point of Sale (POS) is designed for high-speed pharmacy operations, supporting barcode scanning, multi-unit sales, and cash accountability.
                    </Typography>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">1. Cashier Sessions (Shift Management)</Typography>
                    <Typography variant="body2" paragraph>
                        Every cashier must manage their shift using the <strong>Cash Session</strong> workflow to ensure financial accountability.
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Opening</Typography>
                                    <Typography variant="caption">Start shift by entering the 'Opening Cash' in drawer. This enables the checkout functionality.</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Daily Sales</Typography>
                                    <Typography variant="caption">All cash transactions are recorded against the active session. Card/Wallet payments are tracked separately.</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Closing & Audit</Typography>
                                    <Typography variant="caption">End shift by entering 'Counted Cash'. The system flags any difference between expected and actual cash.</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">2. High-Speed Checkout Workflow</Typography>
                    <List dense>
                        <ListItem>
                            <ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon>
                            <ListItemText 
                                primary="Global Barcode Scanning" 
                                secondary="The POS listens for barcode inputs globally. Simply scan an item at any time to add it to the cart." 
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon>
                            <ListItemText 
                                primary="Advanced Search" 
                                secondary="Search by Brand Name, Generic Name (to find alternatives), or Barcode." 
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon>
                            <ListItemText 
                                primary="Multi-Unit Selection" 
                                secondary="Switch between Tablet, Strip, or Box units directly in the cart. Prices and stock levels update automatically." 
                            />
                        </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 2 }}>3. Payment & Credit Management</Typography>
                    <Typography variant="body2" paragraph>
                        The system supports flexible payment workflows to accommodate various customer needs.
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.selected' }}>
                                <TableRow>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Definition</strong></TableCell>
                                    <TableCell><strong>Financial Impact</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Chip label="Paid" size="small" color="success" /></TableCell>
                                    <TableCell>Full payment received at checkout.</TableCell>
                                    <TableCell>Increases cash/bank balance immediately.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="Partial" size="small" color="warning" /></TableCell>
                                    <TableCell>Only a portion of the total was paid.</TableCell>
                                    <TableCell>Balance recorded as Customer Due (Receivable).</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="Due" size="small" color="error" /></TableCell>
                                    <TableCell>No payment received (Credit sale).</TableCell>
                                    <TableCell>Full amount added to Customer Debt.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 2 }}>4. Invoice Printing & Prescriptions</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="bold">Thermal Receipts:</Typography>
                            <Typography variant="body2">Supports 80mm and 58mm thermal printers. Can be configured for 'Silent Printing' via the QZ Tray bridge for instant output.</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="bold">Prescription Compliance:</Typography>
                            <Typography variant="body2">For controlled substances, you can upload and link a digital copy of the prescription to the sale record.</Typography>
                        </Grid>
                    </Grid>
                </Box>
            )
        },
        {
            title: 'Financials & Advanced Reporting',
            icon: <AssessmentIcon />,
            content: (
                <Box>
                    <Typography variant="body1" paragraph>
                        The system provides high-precision financial tracking by leveraging batch-level data. This allows for an accurate calculation of profitability that accounts for varying purchase costs over time.
                    </Typography>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">1. Core Profitability Metrics</Typography>
                    <Typography variant="body2" paragraph>
                        The following formulas are used to generate your real-time Profit & Loss statement:
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.selected' }}>
                                <TableRow>
                                    <TableCell><strong>Metric</strong></TableCell>
                                    <TableCell><strong>Technical Formula</strong></TableCell>
                                    <TableCell><strong>Description</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><strong>Net Sales</strong></TableCell>
                                    <TableCell>Total Sales - (Tax + Customer Returns)</TableCell>
                                    <TableCell>The actual revenue kept after taxes and refunds.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>COGS</strong></TableCell>
                                    <TableCell>Σ (Sold Qty × Batch Purchase Price)</TableCell>
                                    <TableCell>Cost of Goods Sold. Uses exact batch costs for accuracy.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Gross Profit</strong></TableCell>
                                    <TableCell>Net Sales - COGS</TableCell>
                                    <TableCell>Profit before operational expenses.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Net Profit</strong></TableCell>
                                    <TableCell>Gross Profit - Total Expenses</TableCell>
                                    <TableCell>The final "bottom line" profit for the period.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">2. Expense Management</Typography>
                    <Typography variant="body2" paragraph>
                        Operational costs (Rent, Salaries, Electricity) should be recorded in the <strong>Expenses</strong> module. 
                    </Typography>
                    <List dense sx={{ mb: 2 }}>
                        <ListItem><ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon><ListItemText primary="Categorization" secondary="Assign expenses to categories (e.g., Utilities, Marketing) to identify cost-saving opportunities." /></ListItem>
                        <ListItem><ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon><ListItemText primary="Branch Context" secondary="Expenses are tied to specific branches for localized performance reporting." /></ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">3. Operational Reports</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Expiry Report</Typography>
                                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                                        Critical for pharmacy risk management. Filter products expiring in 30, 60, or 90 days.
                                    </Typography>
                                    <Chip label="Prevents Revenue Loss" size="small" color="error" variant="outlined" sx={{ fontSize: 10 }} />
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Cash Session Audit</Typography>
                                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                                        View every cashier's opening balance, expected cash, and any discrepancies (Shortage/Overage).
                                    </Typography>
                                    <Chip label="Prevents Theft" size="small" color="success" variant="outlined" sx={{ fontSize: 10 }} />
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 3 }}>4. Data Visualization & Filters</Typography>
                    <Typography variant="body2">
                        All reports support <strong>Date Range</strong> filtering and <strong>Branch Comparison</strong>. Managers can view trends (Daily, Monthly, Yearly) through interactive charts to monitor business growth.
                    </Typography>
                </Box>
            )
        },
        {
            title: 'Troubleshooting & Support',
            icon: <BugReportIcon />,
            content: (
                <Box>
                    <Typography variant="body1" paragraph>
                        Find solutions to common operational and technical issues. For unresolved problems, please contact the system administrator.
                    </Typography>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">1. Common Operational Issues</Typography>
                    <Accordion variant="outlined" sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2" fontWeight="bold">Error: "Insufficient Stock" (Physical stock exists)</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="caption" display="block" paragraph>
                                <strong>Cause:</strong> The system only sells from <strong>Active, Unexpired</strong> batches. If your physical stock is expired in the system, it will be blocked from sale.
                            </Typography>
                            <Typography variant="caption" display="block">
                                <strong>Solution:</strong> Check the <i>Expiry Report</i>. If the stock is indeed expired, it must be removed via a <i>Supplier Return</i> or <i>Inventory Adjustment</i>. If the system date is wrong, update the batch details.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion variant="outlined" sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2" fontWeight="bold">Error: "Session Already Open" / "Locked"</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="caption" display="block" paragraph>
                                <strong>Cause:</strong> A cashier can only have one active session at a time across all branches.
                            </Typography>
                            <Typography variant="caption" display="block">
                                <strong>Solution:</strong> Ensure you have closed your session from the previous shift or branch before starting a new one. Administrators can force-close a session from the <i>Cash Session Report</i> if necessary.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion variant="outlined" sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2" fontWeight="bold">Thermal Printer Not Printing</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="caption" display="block" paragraph>
                                <strong>Cause:</strong> Browser block, driver issue, or QZ Tray connection failure.
                            </Typography>
                            <Typography variant="caption" display="block">
                                <strong>Solution:</strong> 1. Ensure the printer is 'Ready' in Windows. 2. Restart the QZ Tray application. 3. Check <i>POS Settings</i> to ensure the correct printer name is selected.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary" sx={{ mt: 3 }}>2. Technical Support & Maintenance</Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Backend Logs</Typography>
                                    <Typography variant="caption" display="block">
                                        Server-side errors (500 errors, DB failures) are logged in:<br />
                                        <code>storage/logs/laravel.log</code>
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight="bold">Frontend Debugging</Typography>
                                    <Typography variant="caption" display="block">
                                        UI crashes or Inertia errors can be inspected by pressing <code>F12</code> and checking the <strong>Console</strong> tab.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary">3. Database Maintenance</Typography>
                    <Typography variant="body2" paragraph>
                        To ensure system speed, administrators should periodically:
                    </Typography>
                    <List dense>
                        <ListItem><ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon><ListItemText primary="Optimize Tables" secondary="Run 'OPTIMIZE TABLE' on large sales/logs tables." /></ListItem>
                        <ListItem><ListItemIcon><CircleIcon sx={{ fontSize: 8 }} /></ListItemIcon><ListItemText primary="Clear Cache" secondary="Run 'php artisan optimize:clear' after configuration changes." /></ListItem>
                    </List>

                    <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
                        <AlertTitle>Session Locked</AlertTitle>
                        <Typography variant="caption">A cashier cannot open a new session if they have an 'Open' session in another branch. Close the previous session first.</Typography>
                    </Alert>

                    <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
                        <AlertTitle>Data Sync Warning</AlertTitle>
                        <Typography variant="caption">Ensure you have a stable internet connection for sales. If a sale fails with "Insufficient Stock" but physical stock exists, it may be due to unexpired stock in other batches not being updated yet.</Typography>
                    </Alert>

                    <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                        <AlertTitle>Emergency Contact</AlertTitle>
                        <Typography variant="caption">
                            For critical system failures (System Offline), contact the Technical Support Team at:<br />
                            <strong>kaunghtettin17204@gmail.com</strong> | 09682537158
                        </Typography>
                    </Alert>
                </Box>
            )
        }
    ];

    return (
        <MainLayout auth={auth} header="System Operating Procedure (SOP)">
            <Head title="SOP Manual" />

            <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4, px: 2 }}>
                <Paper variant="outlined" sx={{ p: 4, mb: 4, borderRadius: 1, background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)', color: 'white', border: 'none' }}>
                    <Typography variant="h3" gutterBottom sx={{ fontWeight: 800, letterSpacing: -1 }}>
                        {appName} Live Manual
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                        Official Standard Operating Procedures & Technical Documentation
                    </Typography>
                    <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.2)' }} />
                    
                    <Typography variant="body1" sx={{ maxWidth: 800 }}>
                        This manual is dynamically generated based on the current system architecture. It serves as the primary training resource for staff and a technical reference for system administrators.
                    </Typography>
                </Paper>

                {sections.map((section, index) => (
                    <Accordion key={index} defaultExpanded={index === 0} variant="outlined" sx={{ mb: 2, borderRadius: '4px !important', overflow: 'hidden', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {React.cloneElement(section.icon, { color: 'primary' })}
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{section.title}</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', p: 4 }}>
                            {section.content}
                        </AccordionDetails>
                    </Accordion>
                ))}

                <Box sx={{ mt: 8, textAlign: 'center', p: 4, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        {appName} | Enterprise Pharmacy Management System
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Version 1.1.0 | Documentation Generated: {new Date().toLocaleDateString()} | © {new Date().getFullYear()} All Rights Reserved.
                    </Typography>
                </Box>
            </Box>
        </MainLayout>
    );
}
