// frontend/src/workspace/components/ColorPickerDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";

const COLOR_PALETTE = [
  { hex: '#66c2a5', name: 'Teal' },
  { hex: '#fc8d62', name: 'Orange' },
  { hex: '#8da0cb', name: 'Blue' },
  { hex: '#e78ac3', name: 'Pink' },
  { hex: '#a6d854', name: 'Green' },
  { hex: '#ffd92f', name: 'Yellow' },
  { hex: '#e5c494', name: 'Tan' },
  { hex: '#b3b3b3', name: 'Grey' },
];

export default function ColorPickerDialog({
  open,
  onClose,
  onApply,
  onReset,
  workspaceTitle,
  selectedColor,
  onColorSelect,
  isUpdating,
}) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          padding: 1,
        },
      }}
    >
      <DialogTitle sx={{ 
        fontSize: '1.2rem',
        fontWeight: 600,
        pb: 1,
        px: 2,
        pt: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          Select Workspace Color
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 2, py: 2 }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Choose a color for "{workspaceTitle}"
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1.5,
          minWidth: 280
        }}>
          {COLOR_PALETTE.map(({ hex, name }) => {
            const isSelected = selectedColor === hex;
            return (
              <Box
                key={hex}
                component="button"
                type="button"
                onClick={() => onColorSelect(hex)}
                aria-label={`Color: ${name}`}
                aria-pressed={isSelected}
                sx={{
                  width: 60,
                  height: 60,
                  padding: 0,
                  font: 'inherit',
                  backgroundColor: hex,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: isSelected ? '3px solid #1873cd' : '2px solid #919191',
                  boxShadow: isSelected
                    ? '0 0 0 3px rgba(24, 115, 205, 0.2)'
                    : '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'border 0.15s ease',
                }}
              />
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            fontSize: '0.9rem',
            fontWeight: 500,
            height: 36,
            px: 2,
            textTransform: 'none',
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onReset}
          variant="outlined"
          disabled={isUpdating}
          sx={{
            fontSize: '0.9rem',
            fontWeight: 500,
            height: 36,
            px: 2,
            textTransform: 'none',
            borderColor: '#d1d5db',
            color: '#374151',
            ml: 'auto',
          }}
        >
          Reset
        </Button>
        <Button 
          onClick={onApply} 
          color="primary"
          variant="contained"
          disabled={!selectedColor || isUpdating}
          startIcon={isUpdating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{
            fontSize: '0.9rem',
            fontWeight: 600,
            height: 36,
            px: 2,
            textTransform: 'none',
          }}
        >
          Apply Color
        </Button>
      </DialogActions>
    </Dialog>
  );
}

