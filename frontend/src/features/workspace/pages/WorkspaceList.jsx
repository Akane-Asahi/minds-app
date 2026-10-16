// Workspaces page — typography scale (single source of truth for this page):
//   CardTitle      → variant="subtitle1"  (16px / 500)  — workspace name, primary text
//   CardSecondary  → variant="body2"      (14px / 400)  — date, stat counts
//   Buttons        → TYPOGRAPHY.metadata  (16px / 500)  — New Workspace, Cancel, Save, Archive
//   DialogTitle    → TYPOGRAPHY.title     (21px / 700)  — dialog headings (see CreateWorkspaceDialog)
//   DialogLabel    → TYPOGRAPHY.metadata  (16px / 500)  — dialog field labels
//   MenuItems      → variant="body1"      (16px / 400)  — context menu rows
import React, { useState, useEffect, useContext, useCallback, useRef, useLayoutEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useParticipantSession } from "../../../session";
import { fetchAllWorkspaces, deleteWorkspace, updateWorkspace, createWorkspace } from "../api/workspaceService";
import { openWorkspace } from "../api/workspaceNavigation";
import ArchiveIcon from "@mui/icons-material/Archive";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PaletteIcon from "@mui/icons-material/Palette";
import DescriptionIcon from "@mui/icons-material/Description";
import SearchIcon from "@mui/icons-material/Search";

import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Button,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { darken } from "@mui/material/styles";
import { TYPOGRAPHY, SURFACE_WORKSPACE_CARD, BUTTON_MEDIUM } from "../../../theme/uiTokens";
import { brandColors } from "../../../theme/colors";

// Lazy load heavy dialog components
const DeleteWorkspaceDialog = lazy(() => import("../components/DeleteWorkspaceDialog"));
const EditWorkspaceDialog = lazy(() => import("../components/EditWorkspaceDialog"));
const ColorPickerDialog = lazy(() => import("../components/ColorPickerDialog"));
const CreateWorkspaceDialog = lazy(() => import("../components/CreateWorkspaceDialog"));

// Lightweight fallback for lazy-loaded dialogs
const DialogFallback = () => null; // Dialogs handle their own loading states

// Constants
const DEFAULT_WORKSPACE_COLOR = '#f6f8fb';

// Layout/sx constants — single place for workspace list and card styles
const SX_PAGE = {
  width: "100%",
  minHeight: "calc(100vh - 64px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: { xs: 10, sm: 10, md: 12, lg: 12, xl: 12 },
  paddingBottom: { xs: 4, sm: 4, md: 6, lg: 6, xl: 6 },
};

const SX_CONTAINER = {
  width: "100%",
  maxWidth: { xs: "100%", sm: "100%", md: "1100px", lg: "1200px", xl: "1280px" },
  paddingX: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 2,
};

const SX_HEADER_ROW = {
  width: "100%",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  marginBottom: 1,
};

const SX_LIST = {
  display: "flex",
  flexDirection: "column",
  // Clear separation between cards (each reads as a distinct block).
  gap: 3,
  width: "100%",
  alignItems: "flex-start",
};

// Default card border; hover uses elevation + neutral border (see map for custom-color border).
const SX_CARD = {
  mb: 0,
  cursor: "pointer",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: SURFACE_WORKSPACE_CARD.borderColor,
  borderRadius: SURFACE_WORKSPACE_CARD.borderRadius,
  backgroundColor: "background.paper",
  boxShadow: SURFACE_WORKSPACE_CARD.boxShadow,
  transform: "translateY(0)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  width: "100%",
};

const SX_CARD_CONTENT = {
  py: 2,
  px: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  boxSizing: "border-box",
  "&:last-child": { pb: 2 },
};

const SX_LEFT = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  // Title + created date as one cluster (~4px).
  gap: 0.5,
};

const SX_RIGHT = {
  display: "flex",
  flexDirection: "row",
  gap: 1,
  alignItems: "center",
  flexShrink: 0,
  marginLeft: "auto",
};

const SX_STATS_ROW = {
  display: "flex",
  flexDirection: "row",
  gap: 1,
  alignItems: "center",
};

const SX_LOADING = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "400px",
};

const SX_ERROR = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "400px",
  flexDirection: "column",
  gap: 2,
  width: "100%",
};

const SX_EMPTY = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "200px",
  width: "100%",
};

const SX_CARD_TITLE = {
  color: "text.primary",
  cursor: "pointer",
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
};

const SX_STAT_ICON = { display: "flex", alignItems: "center", gap: 1 };

const SX_STAT_ICON_TEXT = {
  fontWeight: 400,
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1',
  color: "text.secondary",
};

const NEW_WORKSPACE_BUTTON_BG = brandColors.primary[600];
const NEW_WORKSPACE_BUTTON_SHADOW = "0 2px 4px rgba(25, 118, 210, 0.3)";

const SX_NEW_WORKSPACE_BUTTON = {
  minHeight: BUTTON_MEDIUM.height,
  px: 2,
  py: 1,
  textTransform: "none",
  fontSize: BUTTON_MEDIUM.fontSize,
  fontWeight: 600,
  backgroundColor: NEW_WORKSPACE_BUTTON_BG,
  boxShadow: NEW_WORKSPACE_BUTTON_SHADOW,
  "&:hover": {
    backgroundColor: NEW_WORKSPACE_BUTTON_BG,
    boxShadow: NEW_WORKSPACE_BUTTON_SHADOW,
  },
  "&:active": {
    backgroundColor: NEW_WORKSPACE_BUTTON_BG,
    boxShadow: NEW_WORKSPACE_BUTTON_SHADOW,
  },
  "&:focus-visible": {
    outline: `2px solid ${brandColors.primary[700]}`,
    outlineOffset: 2,
  },
};

const SX_MENU_BUTTON = {
  backgroundColor: "transparent",
  color: "text.secondary",
  width: 36,
  height: 36,
  borderRadius: 2,
  flex: "0 0 auto",
  ml: 1,
};

function getWorkspaceBorderColor(color) {
  if (!color || typeof color !== "string") return null;
  try {
    // Slight darken so very light ambient colors still show on white cards.
    return darken(color, 0.22);
  } catch {
    return color;
  }
}

function hasCustomWorkspaceColor(color) {
  if (!color || typeof color !== "string") return false;
  return color.trim().toLowerCase() !== DEFAULT_WORKSPACE_COLOR.toLowerCase();
}

/** Workspace card title: single line, ellipsis when long. */
function WorkspaceCardTitle({ title }) {
  const titleRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [title]);

  return (
    <Typography
      ref={titleRef}
      variant="h6"
      component="h2"
      sx={SX_CARD_TITLE}
      aria-label={isTruncated ? title : undefined}
      title={isTruncated ? title : undefined}
    >
      {title}
    </Typography>
  );
}

// Stat icon component - shows icon with count
// Uses body1 (1rem) so stats read as important info, not subtle metadata.
// Icon is set to 20px to stay visually balanced with body1 text.
const StatIcon = ({ count, icon: Icon }) => (
  <Box sx={SX_STAT_ICON}>
    <Icon sx={{ fontSize: 20, color: "text.secondary" }} />
    <Typography variant="body1" component="span" sx={SX_STAT_ICON_TEXT}>
      {count}
    </Typography>
  </Box>
);

const WorkspaceList = ({ setHasAnyWorkspace }) => {
  useEffect(() => {
    document.title = "Workspaces";
  }, []);

  const { participant } = useParticipantSession();
  const { selectedWorkspace, setSelectedWorkspace } = useContext(WorkspaceContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: "success", msg: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTitleError, setEditTitleError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceTitle, setNewWorkspaceTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedWorkspaceForMenu, setSelectedWorkspaceForMenu] = useState(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [selectingColorFor, setSelectingColorFor] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  const navigate = useNavigate();
  const reqSeq = useRef(0);
  const loadWorkspacesRef = useRef(null);

  // Load workspaces from backend API only (never from localStorage).
  // When options.background is true (e.g. after create/event refresh), do NOT set loading true
  // so the list stays visible and we avoid a white flash.
  const loadWorkspaces = useCallback(async (signal, options = {}) => {
    const { background = false } = options;
    const activeUserId = String(participant?._id ?? "");
    if (!activeUserId) return;

    const mySeq = ++reqSeq.current;

    try {
      if (!background) {
        setLoading(true);
        setError(null);
      }

      const workspacesData = await fetchAllWorkspaces(signal);

      if (mySeq !== reqSeq.current) return;
      if (String(participant?._id ?? "") !== activeUserId) return;

      const data = workspacesData || [];
      const safe = data.filter((w) => String(w.userId) === activeUserId);
      if (safe.length !== data.length) return;
      setWorkspaces(safe);
      setHasAnyWorkspace?.(safe.length > 0);
    } catch (err) {
      if (err?.name === "AbortError" || err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      if (mySeq !== reqSeq.current) return;
      setError(err.message || "Failed to load workspaces");
      setSnack({
        open: true,
        severity: "error",
        msg: `Failed to load workspaces: ${err.message}`,
      });
    } finally {
      if (mySeq === reqSeq.current && String(participant?._id ?? "") === activeUserId) {
        setLoading(false);
      }
    }
  }, [setHasAnyWorkspace, participant]);

  loadWorkspacesRef.current = loadWorkspaces;

  // Load workspaces only when userId/token change (not when loadWorkspaces identity changes) to avoid extra refresh cycles.
  const userId = participant?._id;
  const token = participant?.token;

  useEffect(() => {
    if (!userId || !token) {
      setWorkspaces([]);
      setLoading(true);
      return;
    }

    setWorkspaces([]);
    setLoading(true);

    const controller = new AbortController();
    loadWorkspacesRef.current(controller.signal);

    return () => controller.abort();
  }, [userId, token]);

  // Clear workspaces immediately when user switches (before parent updates)
  useEffect(() => {
    const onUserSwitched = () => {
      setWorkspaces([]);
      setLoading(true);
    };
    window.addEventListener("auth:user:switched", onUserSwitched);
    return () => window.removeEventListener("auth:user:switched", onUserSwitched);
  }, []);

  // Listen for document and query events to update all counts (background refresh only)
  useEffect(() => {
    let refreshTimer = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        loadWorkspaces(undefined, { background: true });
      }, 150);
    };

    window.addEventListener("ws:document:removed", scheduleRefresh);
    window.addEventListener("ws:saved", scheduleRefresh);
    window.addEventListener("ws:unsaved", scheduleRefresh);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener("ws:document:removed", scheduleRefresh);
      window.removeEventListener("ws:saved", scheduleRefresh);
      window.removeEventListener("ws:unsaved", scheduleRefresh);
    };
  }, [loadWorkspaces]);

  const handleSelectWorkspace = (ws) => {
    if (!ws) return;
    openWorkspace(ws, navigate, "serp");
  };

  // Clear search term - only used when a workspace is archived
  const resetSearchTerm = () => {
    localStorage.removeItem('searchTerm');
    localStorage.removeItem('searchTopic');
    // Dispatch event to clear search term in components
    window.dispatchEvent(new CustomEvent('searchTermChanged', { detail: '' }));
  };

  const handleDeleteWorkspace = async () => {
    if (!pendingDelete) return;

    try {
      setDeletingId(pendingDelete.id);
      await deleteWorkspace(pendingDelete.id);

      // Remove from local state
      setWorkspaces((prev) => prev.filter((ws) => ws._id !== pendingDelete.id));

      // Clear selected workspace if it was archived
      if (selectedWorkspace?._id === pendingDelete.id) {
        setSelectedWorkspace(null);
        // Reset search term when workspace is archived
        resetSearchTerm();
      }

      setSnack({ 
        open: true, 
        severity: "success", 
        msg: `Workspace "${pendingDelete.title}" archived successfully` 
      });
    } catch {
      setSnack({ 
        open: true, 
        severity: "error", 
        msg: "Failed to archive workspace. Please try again." 
      });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleEditWorkspace = async () => {
    if (!editingWorkspace) return;

    // Check for duplicate workspace names (case-insensitive, excluding current workspace)
    const trimmedTitle = editTitle.trim();
    const isDuplicate = workspaces.some(
      (ws) =>
        ws._id !== editingWorkspace.id &&
        (ws.title || ws.ws_title || "").toLowerCase() === trimmedTitle.toLowerCase()
    );

    if (isDuplicate) {
      const dupMessage = `A workspace with the name "${trimmedTitle}" already exists. Please choose a different name.`;
      setEditTitleError(dupMessage);
      setSnack({
        open: true,
        severity: "error",
        msg: dupMessage
      });
      return;
    }

    try {
      setUpdatingId(editingWorkspace.id);
      await updateWorkspace(editingWorkspace.id, { title: trimmedTitle });

      // Update local state
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws._id === editingWorkspace.id ? { ...ws, title: trimmedTitle, ws_title: trimmedTitle } : ws
        )
      );

      // Update selected workspace if it was edited
      updateSelectedWorkspace(editingWorkspace.id, { title: trimmedTitle, ws_title: trimmedTitle });

      setSnack({
        open: true,
        severity: "success",
        msg: "Workspace updated successfully"
      });

      // Only clear state and close modal AFTER successful update
      setEditingWorkspace(null);
      setEditTitle("");
      setEditTitleError("");
      setEditDialogOpen(false);
    } catch (err) {
      const errorMessage = `Failed to update workspace: ${err.message}`;
      setEditTitleError(errorMessage);
      setSnack({
        open: true,
        severity: "error",
        msg: errorMessage
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper to update selected workspace in context (context owns localStorage)
  const updateSelectedWorkspace = useCallback((workspaceId, updates) => {
    if (selectedWorkspace?._id === workspaceId) {
      const updatedWs = { ...selectedWorkspace, ...updates };
      setSelectedWorkspace(updatedWs);
    }
  }, [selectedWorkspace, setSelectedWorkspace]);

  const handleColorUpdate = async () => {
    if (!selectingColorFor || !selectedColor) return;

    try {
      setUpdatingId(selectingColorFor.id);
      
      // Update local state immediately for instant visual feedback
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws._id === selectingColorFor.id ? { ...ws, color: selectedColor } : ws
        )
      );
      
      await updateWorkspace(selectingColorFor.id, { color: selectedColor });
      await loadWorkspaces(undefined, { background: true });
      updateSelectedWorkspace(selectingColorFor.id, { color: selectedColor });

      setSnack({ 
        open: true, 
        severity: "success", 
        msg: "Workspace color updated successfully" 
      });
    } catch (err) {
      setSnack({ 
        open: true, 
        severity: "error", 
        msg: `Failed to update workspace color: ${err.message}` 
      });
    } finally {
      setUpdatingId(null);
      setSelectingColorFor(null);
      setSelectedColor(null);
      setColorDialogOpen(false);
    }
  };

  const handleResetColor = async () => {
    if (!selectingColorFor) return;
    
    try {
      setUpdatingId(selectingColorFor.id);
      
      // Update local state immediately
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws._id === selectingColorFor.id ? { ...ws, color: DEFAULT_WORKSPACE_COLOR } : ws
        )
      );
      
      await updateWorkspace(selectingColorFor.id, { color: DEFAULT_WORKSPACE_COLOR });
      await loadWorkspaces(undefined, { background: true });
      updateSelectedWorkspace(selectingColorFor.id, { color: DEFAULT_WORKSPACE_COLOR });
      
      setSnack({ 
        open: true, 
        severity: "success", 
        msg: "Color reset to default" 
      });
      setColorDialogOpen(false);
    } catch {
      setSnack({ 
        open: true, 
        severity: "error", 
        msg: "Failed to reset color" 
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Refresh workspaces after creation (optimistic — skip full refetch)
  const handleWorkspaceCreated = (newWorkspace) => {
    setWorkspaces((prev) => {
      const id = newWorkspace?._id || newWorkspace?.ws_id;
      if (!id) return prev;
      if (prev.some((ws) => String(ws._id || ws.ws_id) === String(id))) return prev;
      return [newWorkspace, ...prev];
    });
    setSnack({
      open: true,
      severity: "success",
      msg: `Workspace "${newWorkspace?.title || newWorkspace?.ws_title || "New Workspace"}" created successfully`,
    });
  };

  const handleMenuOpen = (event, workspace) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedWorkspaceForMenu(workspace);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedWorkspaceForMenu(null);
  };

  const handleMenuAction = (action) => {
    if (!selectedWorkspaceForMenu) return;
    
    switch (action) {
      case "edit":
        setEditingWorkspace({
          id: selectedWorkspaceForMenu._id,
          title: selectedWorkspaceForMenu.title || selectedWorkspaceForMenu.ws_title,
        });
        setEditTitle(selectedWorkspaceForMenu.title || selectedWorkspaceForMenu.ws_title);
        setEditDialogOpen(true);
        break;
      case "selectColor":
        setSelectingColorFor({
          id: selectedWorkspaceForMenu._id,
          title: selectedWorkspaceForMenu.title || selectedWorkspaceForMenu.ws_title,
          currentColor: selectedWorkspaceForMenu.color || DEFAULT_WORKSPACE_COLOR,
        });
        setSelectedColor(selectedWorkspaceForMenu.color || DEFAULT_WORKSPACE_COLOR);
        setColorDialogOpen(true);
        break;
      case "delete":
        setPendingDelete({
          id: selectedWorkspaceForMenu._id,
          title: selectedWorkspaceForMenu.title || selectedWorkspaceForMenu.ws_title,
        });
        setDeleteDialogOpen(true);
        break;
      default:
        break;
    }
    handleMenuClose();
  };

  const handleCreateWorkspace = async () => {
    const trimmedTitle = newWorkspaceTitle.trim();
    
    if (!trimmedTitle) {
      setTitleError("Workspace title is required");
      setSnack({ 
        open: true, 
        severity: "error", 
        msg: "Workspace title is required" 
      });
      return;
    }
    
    // Clear any previous error
    setTitleError("");

    // Check for duplicate workspace names (case-insensitive)
    const isDuplicate = workspaces.some(
      (ws) =>
        (ws.title || ws.ws_title || "").toLowerCase() === trimmedTitle.toLowerCase()
    );

    if (isDuplicate) {
      const dupMessage = `A workspace with the name "${trimmedTitle}" already exists. Please choose a different name.`;
      setTitleError(dupMessage);
      setSnack({
        open: true,
        severity: "error",
        msg: dupMessage
      });
      return;
    }

    try {
      setCreating(true);

      const newWorkspace = await createWorkspace({
        title: trimmedTitle,
      });

      // Only clear state and close modal AFTER successful creation
      if (newWorkspace) {
        setNewWorkspaceTitle("");
        setCreateDialogOpen(false);
        setTitleError("");
        handleWorkspaceCreated(newWorkspace);
        const wid = newWorkspace?._id || newWorkspace?.ws_id;
        openWorkspace(newWorkspace, navigate, "serp", {
          state: {
            initialQuery: trimmedTitle,
            shouldRunInitialQuery: true,
            workspaceId: wid,
          },
        });
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to create workspace";
      setTitleError(errorMessage);
      setSnack({ 
        open: true, 
        severity: "error", 
        msg: errorMessage
      });
    } finally {
      setCreating(false);
    }
  };

  // Full-page spinner only when loading and list is empty (initial load). Keeps list visible during background refresh.
  if (loading && workspaces.length === 0) {
    return (
      <Box sx={SX_LOADING}>
        <CircularProgress size={40} thickness={4} />
      </Box>
    );
  }

  if (error && workspaces.length === 0) {
    return (
      <Box sx={SX_ERROR}>
        <Typography color="error">Error: {error}</Typography>
        <Button variant="contained" onClick={() => loadWorkspaces()}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={SX_PAGE}>
      <h1 className="visually-hidden">Workspaces</h1>
      <Box sx={SX_CONTAINER}>
        <Box sx={SX_HEADER_ROW}>
          <Button
            variant="contained"
            startIcon={creating ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={creating}
            sx={SX_NEW_WORKSPACE_BUTTON}
          >
            New Workspace
          </Button>
        </Box>

        <Box sx={SX_LIST}>
          {workspaces.length === 0 && (
            <Box sx={SX_EMPTY}>
              <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500 }}>
                No workspaces yet. Click "New Workspace" above to create one.
              </Typography>
            </Box>
          )}

          {workspaces.map((ws) => (
            (() => {
              const customColor = hasCustomWorkspaceColor(ws?.color);
              const borderColor = customColor ? getWorkspaceBorderColor(ws?.color) : null;
              return (
            <Card
              elevation={0}
              data-workspace-id={ws._id}
              data-workspace-name={ws.title || ws.ws_title}
              key={ws._id}
              sx={{
                ...SX_CARD,
                borderColor: borderColor || SX_CARD.borderColor,
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 10px rgba(16, 24, 40, 0.08)",
                  borderColor:
                    customColor && borderColor ? darken(borderColor, 0.1) : "#C7CED9",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectWorkspace(ws);
              }}
            >
              <CardContent sx={SX_CARD_CONTENT}>
                <Box sx={SX_LEFT}>
                  <WorkspaceCardTitle title={ws.title || ws.ws_title} />
                  <Typography variant="body2" color="text.secondary">
                    Created {ws.createdAt ? format(new Date(ws.createdAt), "MMM d, yyyy") : "Unknown date"}
                  </Typography>
                </Box>

                <Box sx={SX_RIGHT}>
                  <Box sx={SX_STATS_ROW}>
                    <StatIcon count={ws.resourceCount ?? 0} icon={DescriptionIcon} />
                    <StatIcon count={ws.queryCount ?? 0} icon={SearchIcon} />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, ws)}
                    aria-label={`Options for workspace ${ws.title || ws.ws_title || "untitled"}`}
                    sx={SX_MENU_BUTTON}
                  >
                    <MoreVertIcon sx={{ fontSize: TYPOGRAPHY.metadata.fontSize, color: "text.secondary" }} />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
              );
            })()
          ))}
        </Box>

      {/* More Options Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        MenuListProps={{ sx: { py: 0.5 } }}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 12px rgba(26, 26, 26, 0.15)',
            borderRadius: 2,
            minWidth: 180
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleMenuAction('edit')} sx={{ py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <EditIcon sx={{ color: 'text.secondary', fontSize: TYPOGRAPHY.metadata.fontSize }} />
          </ListItemIcon>
          <ListItemText
            primary="Edit Name"
            primaryTypographyProps={{ variant: 'body1' }}
          />
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('selectColor')} sx={{ py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <PaletteIcon sx={{ color: 'text.secondary', fontSize: TYPOGRAPHY.metadata.fontSize }} />
          </ListItemIcon>
          <ListItemText
            primary="Select Color"
            primaryTypographyProps={{ variant: 'body1' }}
          />
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')} sx={{ py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ArchiveIcon sx={{ color: 'text.secondary', fontSize: TYPOGRAPHY.metadata.fontSize }} />
          </ListItemIcon>
          <ListItemText
            primary="Archive"
            primaryTypographyProps={{ variant: 'body1' }}
          />
        </MenuItem>
      </Menu>


      {/* Delete Confirmation Dialog - Lazy loaded */}
      {deleteDialogOpen && (
        <Suspense fallback={<DialogFallback />}>
          <DeleteWorkspaceDialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={handleDeleteWorkspace}
            workspaceTitle={pendingDelete?.title}
            isDeleting={deletingId === pendingDelete?.id}
          />
        </Suspense>
      )}

      {/* Edit Dialog - Lazy loaded */}
      {editDialogOpen && (
        <Suspense fallback={<DialogFallback />}>
          <EditWorkspaceDialog
            open={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTitleError("");
              setEditingWorkspace(null);
              setEditTitle("");
            }}
            onSave={handleEditWorkspace}
            title={editTitle}
            onTitleChange={(e) => {
              setEditTitle(e.target.value);
              // Clear error when user starts typing
              if (editTitleError) setEditTitleError("");
            }}
            isUpdating={updatingId === editingWorkspace?.id}
            error={editTitleError}
          />
        </Suspense>
      )}

      {/* Color Picker Dialog - Lazy loaded */}
      {colorDialogOpen && (
        <Suspense fallback={<DialogFallback />}>
          <ColorPickerDialog
            open={colorDialogOpen}
            onClose={() => setColorDialogOpen(false)}
            onApply={handleColorUpdate}
            onReset={handleResetColor}
            workspaceTitle={selectingColorFor?.title}
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            isUpdating={updatingId === selectingColorFor?.id}
          />
        </Suspense>
      )}

      {/* Create Workspace Dialog - Lazy loaded */}
      {createDialogOpen && (
        <Suspense fallback={<DialogFallback />}>
          <CreateWorkspaceDialog
            open={createDialogOpen}
            onClose={() => {
              setCreateDialogOpen(false);
              setTitleError("");
              setNewWorkspaceTitle("");
            }}
            onCreate={handleCreateWorkspace}
            title={newWorkspaceTitle}
            onTitleChange={(e) => {
              setNewWorkspaceTitle(e.target.value);
              // Clear error when user starts typing
              if (titleError) setTitleError("");
            }}
            isCreating={creating}
            error={titleError}
          />
        </Suspense>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnack(prev => ({ ...prev, open: false }))} 
          severity={snack.severity}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
};

export default WorkspaceList;