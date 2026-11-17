import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import CsvExportButton from '@/Components/CsvExportButton';
import { Head, Link, router, usePage } from '@/spa';
import { Box, Button, Chip, Divider, MenuItem, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SimpleIcon from '@/Components/SimpleIcon';

export default function Dashboard({ auth, stats = {}, lowStockAlerts = [], expiryAlerts = [], branches = [], filters = {} }) {
    const { settings = {} } = usePage().props;
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [riskTab, setRiskTab] = useState('stock');
    const permissions = auth.user?.permissions || [];
    const can = (permission) => (Array.isArray(permission) ? permission : [permission]).some((value) => permissions.includes(value));
    const firstName = auth.user?.name?.split(' ')[0] || 'there';
    const branchLabel = branches.find((branch) => String(branch.id) === String(filters.branch_id))?.name || 'All accessible branches';
    const currency = settings.app?.currency_symbol || '$';
    const cards = [
        { label: 'Medicines in catalog', value: stats.total_products || 0, icon: 'box', detail: 'Your product collection', permission: 'manage_inventory', url: route('products.index') },
        { label: 'Supplier network', value: stats.total_suppliers || 0, icon: 'store', detail: 'Purchasing partners', permission: 'manage_suppliers', url: route('suppliers.index') },
        { label: 'Returns to review', value: stats.pending_returns || 0, icon: 'rotate', detail: 'Pending processing', permission: ['process_sale', 'manage_payments'], url: route('returns.index') },
    ];
    const actions = [
        { title: 'Receive stock', detail: 'Manage supplier purchases', icon: 'box', permission: 'manage_purchases', url: route('purchases.index') },
        { title: 'Review inventory', detail: 'Check stock across branches', icon: 'grid', permission: 'manage_inventory', url: route('inventory.index') },
        { title: 'Manage returns', detail: 'Review customer and supplier returns', icon: 'rotate', permission: ['process_sale', 'manage_payments'], url: route('returns.index') },
        { title: 'Financial reports', detail: 'Understand business performance', icon: 'chart', permission: 'view_financial_reports', url: route('reports.index') },
    ].filter((action) => can(action.permission));
    const currentRows = riskTab === 'stock' ? lowStockAlerts : expiryAlerts;
    return <MainLayout auth={auth} header="Pharmacy Dashboard">
        <Head title="Workspace overview" />
        <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
                <Box><Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>YOUR WORKSPACE</Typography><Typography component="h1" sx={{ fontSize: { xs: 23, md: 26 }, fontWeight: 700, letterSpacing: '-0.6px', lineHeight: 1.2 }}>Welcome back, {firstName}.</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>A clear view of your pharmacy. A confident next step.</Typography></Box>
                {can('process_sale') && <Button component={Link} href={route('pos.index')} variant="contained" startIcon={<SimpleIcon name="plus" size={18} />} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, px: 1.5, minHeight: { xs: 40, md: 34 } }}>New sale</Button>}
            </Stack>
            {branches.length > 1 && <Stack component="form" onSubmit={(event) => { event.preventDefault(); router.get(route('dashboard'), { branch_id: branchId }, { preserveState: true, preserveScroll: true }); }} direction="row" spacing={1} alignItems="center">
                <TextField select label="Branch scope" value={branchId} onChange={(event) => setBranchId(event.target.value)} sx={{ maxWidth: 280 }}><MenuItem value="">All accessible branches</MenuItem>{branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}</TextField><Button type="submit" variant="outlined">Apply</Button>
            </Stack>}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
                {cards.map((card) => <Paper key={card.label} component={can(card.permission) ? Link : 'div'} href={can(card.permission) ? card.url : undefined} sx={{ p: 1.5, textDecoration: 'none', color: 'inherit', transition: 'border-color 160ms', '&:hover': { borderColor: 'primary.main' } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center"><Box sx={{ width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center', bgcolor: 'primary.soft', color: 'primary.main' }}><SimpleIcon name={card.icon} size={20} /></Box>{can(card.permission) && <SimpleIcon name="arrowRight" size={16} />}</Stack>
                    <Typography sx={{ mt: 1, fontSize: 24, fontWeight: 700, letterSpacing: '-1px' }}>{Number(card.value).toLocaleString()}</Typography><Typography variant="body2" fontWeight={600}>{card.label}</Typography><Typography variant="caption" color="text.secondary">{card.detail}</Typography>
                </Paper>)}
                <Paper sx={{ p: 1.5, bgcolor: '#173C34', color: '#FFFFFF', borderColor: '#173C34', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} alignItems="center"><SimpleIcon name="shieldCheck" size={19} /><Typography variant="body2" sx={{ color: '#D3E8DF' }}>Stock watch</Typography></Stack>
                    <Box sx={{ mt: 1 }}><Typography sx={{ fontSize: 24, fontWeight: 700, letterSpacing: '-1px' }}>{lowStockAlerts.length + expiryAlerts.length}</Typography><Typography variant="body2">Items and batches needing attention</Typography><Typography variant="caption" sx={{ color: '#BAD4C8' }}>{branchLabel}</Typography></Box>
                </Paper>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 260px' }, gap: 1.5, alignItems: 'start' }}>
                <Paper sx={{ overflow: 'hidden' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ p: 1.5 }}><Box><Typography component="h2" variant="h6">Inventory attention desk</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Resolve stock risks before they interrupt your day.</Typography></Box><CsvExportButton source={currentRows} filename={riskTab === 'stock' ? 'low-stock-alerts.csv' : 'expiry-alerts.csv'} /></Stack>
                    <Tabs value={riskTab} onChange={(_, value) => setRiskTab(value)} aria-label="Inventory risk category" sx={{ px: 1.5 }}><Tab value="stock" label={`Low stock (${lowStockAlerts.length})`} /><Tab value="expiry" label={`Expiry watch (${expiryAlerts.length})`} /></Tabs>
                    <Divider />
                    <TableContainer sx={{ maxHeight: 480 }}><Table stickyHeader size="small" aria-label={riskTab === 'stock' ? 'Low stock medicines' : 'Expiring medicine batches'}><TableHead><TableRow><TableCell>Medicine</TableCell><TableCell>Branch</TableCell><TableCell>{riskTab === 'stock' ? 'Available / minimum' : 'Batch / expiry'}</TableCell><TableCell align="right">Status</TableCell></TableRow></TableHead><TableBody>
                        {currentRows.map((item, index) => <TableRow key={`${item.id}-${item.branch_name}-${index}`} hover><TableCell><Typography variant="body2" fontWeight={600}>{item.name || item.product_name}</Typography></TableCell><TableCell>{item.branch_name}</TableCell><TableCell>{riskTab === 'stock' ? `${item.current_quantity} / ${item.min_level}` : <>{item.batch_number}<Typography display="block" variant="caption" color="text.secondary">{item.expiry_date}</Typography></>}</TableCell><TableCell align="right"><Chip size="small" variant="outlined" color={riskTab === 'stock' ? (item.current_quantity === 0 ? 'error' : 'warning') : (item.days_left <= 0 ? 'error' : 'warning')} label={riskTab === 'stock' ? (item.current_quantity === 0 ? 'Out of stock' : 'Low stock') : (item.days_left <= 0 ? 'Expired' : `${item.days_left} days left`)} /></TableCell></TableRow>)}
                        {!currentRows.length && <TableRow><TableCell colSpan={4}><Box sx={{ display: 'grid', justifyItems: 'center', gap: 0.5, py: 3, px: 1, textAlign: 'center', whiteSpace: 'normal' }}><SimpleIcon name="shieldCheck" size={30} /><Typography fontWeight={600}>Looking healthy</Typography><Typography variant="body2" color="text.secondary">{riskTab === 'stock' ? 'No low-stock alerts in this branch scope.' : 'No batches are near expiry in this branch scope.'}</Typography></Box></TableCell></TableRow>}
                    </TableBody></Table></TableContainer>
                </Paper>
                <Stack spacing={1.5}>
                    {actions.length > 0 && <Paper sx={{ p: 1.5 }}><Typography component="h2" variant="h6" sx={{ mb: 1 }}>Make your next move</Typography><Stack spacing={0.5}>{actions.map((action) => <Button key={action.title} component={Link} href={action.url} sx={{ p: 0.75, justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left', color: 'text.primary' }}><Box sx={{ mr: 1.5, color: 'primary.main', display: 'flex' }}><SimpleIcon name={action.icon} size={20} /></Box><Box><Typography variant="body2" fontWeight={600}>{action.title}</Typography><Typography variant="caption" color="text.secondary">{action.detail}</Typography></Box></Button>)}</Stack></Paper>}
                    {can('view_financial_reports') && <Paper sx={{ p: 1.5, bgcolor: 'primary.soft', borderColor: 'transparent' }}><Typography variant="body2" color="text.secondary">Inventory value</Typography><Typography sx={{ mt: 1, mb: 1, fontSize: 22, fontWeight: 700, wordBreak: 'break-word' }}>{currency}{Number(stats.total_stock_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography><Typography variant="caption" color="text.secondary">Current batch stock at purchase cost. {branchLabel}.</Typography>{can('manage_payments') && <><Divider sx={{ my: 2 }} /><Typography variant="body2">{stats.pending_purchases || 0} unpaid purchases</Typography></>}</Paper>}
                </Stack>
            </Box>
        </Stack>
    </MainLayout>;
}
