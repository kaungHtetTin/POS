import React from 'react';
import { Autocomplete, TextField } from '@mui/material';

export default function CategorySelect({ categories = [], value, onChange, error, sx }) {
    return (
        <Autocomplete
            fullWidth
            size="small"
            options={categories}
            value={categories.find((category) => String(category.id) === String(value)) || null}
            getOptionLabel={(category) => category.name}
            getOptionKey={(category) => category.id}
            isOptionEqualToValue={(option, selected) => String(option.id) === String(selected.id)}
            onChange={(_, category) => onChange(category?.id ?? '')}
            autoHighlight
            noOptionsText="No categories found"
            sx={sx}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Category"
                    placeholder="Search categories..."
                    required
                    error={Boolean(error)}
                    helperText={error}
                />
            )}
        />
    );
}
