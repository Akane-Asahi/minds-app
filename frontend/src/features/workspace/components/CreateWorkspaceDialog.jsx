// frontend/src/workspace/components/CreateWorkspaceDialog.jsx
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
import AddIcon from "@mui/icons-material/Add";
import { TYPOGRAPHY } from "../../../theme/uiTokens";

export default function CreateWorkspaceDialog({
  open,
  onClose,
  onCreate,
  title,
  onTitleChange,
  isCreating,
  error,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCreate();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // MUI Dialog centers by default; PaperProps only controls size/shape.
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
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          ...TYPOGRAPHY.title,
          pb: 1,
          px: 3,
          pt: 3,
        }}
      >
        <AddIcon sx={{ fontSize: '1.3rem', color: 'primary.main' }} />
        Create New Workspace
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
          disabled={isCreating}
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
          disabled={isCreating}
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
          onClick={onCreate}
          color="primary"
          variant="contained"
          disabled={!title.trim() || isCreating}
          startIcon={isCreating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{
            fontSize: TYPOGRAPHY.metadata.fontSize,
            fontWeight: 600,
            height: 36,
            px: 2,
            textTransform: 'none',
            '&:disabled': {
              backgroundColor: 'divider',
              color: '#9e9e9e',
            },
          }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
