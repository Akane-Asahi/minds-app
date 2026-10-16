// frontend/src/workspace/components/EditWorkspaceDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from "@mui/material";
import { TYPOGRAPHY } from "../../../theme/uiTokens";

export default function EditWorkspaceDialog({
  open,
  onClose,
  onSave,
  title,
  onTitleChange,
  isUpdating,
  error,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '90vw', sm: 420 },
          maxWidth: '90vw',
          borderRadius: '12px',
        }
      }}
    >
      <DialogTitle
        sx={{
          ...TYPOGRAPHY.title,
          px: 3,
          pt: 3,
          pb: 1,
        }}
      >
        Edit Workspace
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 1 }}>
        <TextField
          autoFocus
          margin="dense"
          label="Workspace Title"
          fullWidth
          variant="outlined"
          value={title}
          onChange={onTitleChange}
          onKeyDown={handleKeyDown}
          disabled={isUpdating}
          error={!!error}
          helperText={error || undefined}
          required
          name="workspaceTitle"
          autoComplete="off"
          inputProps={{ autoComplete: 'off' }}
          sx={{
            mt: 1,
            '& .MuiInputBase-input': {
              fontSize: TYPOGRAPHY.metadata.fontSize,
              paddingTop: '12px',
              paddingBottom: '12px',
              height: 'auto',
            },
            '& .MuiInputBase-root': {
              height: 'auto',
              minHeight: '48px',
            },
            '& .MuiInputLabel-root': {
              fontSize: TYPOGRAPHY.metadata.fontSize,
              fontWeight: 500,
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            fontSize: TYPOGRAPHY.metadata.fontSize,
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
          onClick={onSave}
          color="primary"
          variant="contained"
          disabled={!title.trim() || isUpdating}
          startIcon={isUpdating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{
            fontSize: TYPOGRAPHY.metadata.fontSize,
            fontWeight: 600,
            height: 36,
            px: 2,
            textTransform: 'none',
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
