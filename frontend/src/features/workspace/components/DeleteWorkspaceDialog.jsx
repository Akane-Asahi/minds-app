// frontend/src/workspace/components/DeleteWorkspaceDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { TYPOGRAPHY } from "../../../theme/uiTokens";

export default function DeleteWorkspaceDialog({
  open,
  onClose,
  onConfirm,
  workspaceTitle,
  isDeleting,
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          ...TYPOGRAPHY.title,
          px: 3,
          pt: 3,
          pb: 1,
        }}
      >
        Archive Workspace
      </DialogTitle>
      <DialogContent sx={{ px: 3 }}>
        <DialogContentText sx={{ fontSize: TYPOGRAPHY.metadata.fontSize }}>
          Are you sure you want to archive &ldquo;{workspaceTitle}&rdquo;?
        </DialogContentText>
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
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
          sx={{
            fontSize: TYPOGRAPHY.metadata.fontSize,
            fontWeight: 600,
            height: 36,
            px: 2,
            textTransform: 'none',
          }}
        >
          Archive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
