import React, { useEffect, useState } from 'react';
import { useForm, usePage } from '@/spa';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { automaticPrice } from '@/Utils/automaticPricing';

function RuleEditor({ rule, onDirty }) {
    const { csrf_token } = usePage().props;
    const form = useForm({ pricing_mode: rule.pricing_mode, markup_percent: rule.markup_percent, rounding: rule.rounding,
        minimum_profit: rule.minimum_profit, version: rule.version, apply_to_existing: false, preview_token: '' });
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sampleCost, setSampleCost] = useState('1000');
    useEffect(() => { onDirty(rule.code, form.isDirty); }, [form.isDirty, rule.code]);
    const change = (field, value) => {
        form.setData((current) => ({ ...current, [field]: value, preview_token: '',
            ...(field === 'pricing_mode' && value === 'manual' ? { apply_to_existing: false } : {}) }));
        form.clearErrors();
        setPreview(null);
    };
    const automatic = form.data.pricing_mode === 'automatic';
    const review = async () => {
        setLoading(true);
        form.clearErrors();
        try {
            const response = await fetch(route('pricing.preview', rule.code), {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf_token },
                body: JSON.stringify(form.data),
            });
            const payload = await response.json();
            if (!response.ok) {
                Object.entries(payload.errors || { pricing: payload.message || 'Preview failed.' }).forEach(([key, value]) => form.setError(key, value));
                return;
            }
            setPreview(payload);
            form.setData('preview_token', payload.token);
        } catch { form.setError('pricing', 'Unable to preview prices. Please try again.'); }
        finally { setLoading(false); }
    };
    const sample = automaticPrice(sampleCost, form.data);
    return <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="h6" fontWeight={800}>{rule.name}</Typography><Chip size="small" label={rule.pricing_mode === 'automatic' ? 'Automatic' : 'Manual'} color={rule.pricing_mode === 'automatic' ? 'primary' : 'default'} /></Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <TextField select size="small" label="Pricing mode" value={form.data.pricing_mode} disabled={loading || form.processing} onChange={(event) => change('pricing_mode', event.target.value)}><MenuItem value="manual">Manual</MenuItem><MenuItem value="automatic">Automatic</MenuItem></TextField>
                {[['markup_percent', 'Markup %', '0.0001'], ['minimum_profit', 'Minimum profit per base unit', '0.01'], ['rounding', 'Round base price up to nearest', '1']].map(([field, label, step]) => <TextField key={field} size="small" type="number" label={label} value={form.data[field]} disabled={!automatic || loading || form.processing} inputProps={{ min: field === 'rounding' ? 1 : 0, step }} onChange={(event) => change(field, event.target.value)} error={!!form.errors[field]} helperText={form.errors[field]} />)}
            </Box>
            {automatic ? <>
                <Typography variant="body2" color="text.secondary">Take the larger of cost + markup or cost + minimum profit, round upward, then multiply by the unit conversion factor.</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}><TextField size="small" label="Example base-unit cost" type="number" value={sampleCost} onChange={(event) => setSampleCost(event.target.value)} sx={{ maxWidth: 240 }} /><Typography variant="body2">Example price: <strong>{sample || 'Cost required'}</strong></Typography></Stack>
                <FormControlLabel control={<Checkbox checked={form.data.apply_to_existing} disabled={loading || form.processing} onChange={(event) => change('apply_to_existing', event.target.checked)} />} label="Apply Automatic mode to all active medicines, including manual overrides" />
                <Typography variant="caption" color="text.secondary">When unchecked, saved automatic units follow this rule and manual prices stay unchanged. New medicine units can use the rule. Prices without a buying cost retain their saved amount and show Cost required.</Typography>
            </> : <Typography variant="body2" color="text.secondary">Manual mode keeps the current amounts and stops automatic updates for this price type.</Typography>}
            {Object.values(form.errors).flat().length > 0 && <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>{Object.values(form.errors).flat().join('\n')}</Alert>}
            {preview && <Box>
                <Alert severity="info">{preview.products} medicines · {preview.prices} unit prices · {preview.manual_overrides} manual overrides included · {preview.cost_required} need a cost</Alert>
                {preview.examples.length > 0 && <TableContainer sx={{ maxHeight: 300 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell>Medicine / unit</TableCell><TableCell align="right">Current</TableCell><TableCell align="right">Calculated</TableCell></TableRow></TableHead><TableBody>{preview.examples.map((row, index) => <TableRow key={index}><TableCell>{row.product} / {row.unit}</TableCell><TableCell align="right">{row.old_price}</TableCell><TableCell align="right">{row.new_price ?? 'Cost required'}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
                <Typography variant="caption" color="text.secondary">Showing up to 20 example rows. Save applies the full previewed scope.</Typography>
            </Box>}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                {automatic && <Button variant="outlined" onClick={review} disabled={loading || form.processing}>{loading ? 'Calculating…' : 'Preview impact'}</Button>}
                <Button variant="contained" disabled={loading || form.processing || (automatic && !preview)} onClick={() => form.patch(route('pricing.update', rule.code), { preserveScroll: true, onError: () => { setPreview(null); form.setData('preview_token', ''); } })}>{form.processing ? 'Saving…' : 'Save pricing rule'}</Button>
            </Stack>
        </Stack>
    </Paper>;
}

export default function Pricing({ rules, changes, onDirtyChange }) {
    const [dirty, setDirty] = useState({});
    const onDirty = (code, value) => setDirty((current) => ({ ...current, [code]: value }));
    useEffect(() => { onDirtyChange(Object.values(dirty).some(Boolean)); }, [dirty, onDirtyChange]);
    return <Stack spacing={2}>
        <Box><Typography variant="h6" fontWeight={900}>Automatic Pricing</Typography><Typography variant="body2" color="text.secondary">Organization-wide rules for selling and wholesale prices.</Typography></Box>
        <Alert severity="info">Buying cost comes from the latest purchase date across branches, per base unit. Free quantities do not reduce this pricing cost. Before the first purchase, the medicine's starting buying cost is used. CSV prices are manual overrides.</Alert>
        {rules.map((rule) => <RuleEditor key={`${rule.code}-${rule.version}`} rule={rule} onDirty={onDirty} />)}
        <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="subtitle1" fontWeight={800}>Recent price changes</Typography><Typography variant="caption" color="text.secondary">Latest 30 recorded changes. Completed sales and purchase costs are unchanged.</Typography>
            <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Medicine / unit</TableCell><TableCell>Price</TableCell><TableCell align="right">Before</TableCell><TableCell align="right">After</TableCell><TableCell>Reason</TableCell><TableCell>Time</TableCell></TableRow></TableHead><TableBody>{changes.map((row) => <TableRow key={row.id}><TableCell>{row.product_name} / {row.unit_name}</TableCell><TableCell>{row.price_type === 'selling_price' ? 'Selling' : 'Wholesale'}</TableCell><TableCell align="right">{row.old_price}</TableCell><TableCell align="right">{row.new_price}</TableCell><TableCell>{row.trigger.replaceAll('_', ' ')}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{row.created_at}</TableCell></TableRow>)}{!changes.length && <TableRow><TableCell colSpan={6}>No price changes recorded yet.</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </Paper>
    </Stack>;
}
