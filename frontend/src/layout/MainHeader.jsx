import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SearchSection from "../features/search/components/SearchSection";
import { getSelectedWorkspaceId } from "../utils/userScopedStorage";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
} from "@mui/material";
import Logout from "@mui/icons-material/Logout";
import ListAltOutlined from "@mui/icons-material/ListAltOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { useParticipantSession } from "../session/ParticipantSessionContext";
import { performParticipantLogout } from "../session/participantSessionLifecycle";
import { TYPOGRAPHY, PAGE_CONTAINER, HEADER_ACTION_WIDTH } from "../theme/uiTokens";

const DEFAULT_HEADER_BG = "background.paper";

export default function MainHeader({ participant, hasAnyWorkspace, activeTab, onTabChange, selectedWorkspace }) {
  const headerBg = selectedWorkspace?.color ?? DEFAULT_HEADER_BG;
  const [anchorEl, setAnchorEl] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuOpen = Boolean(anchorEl);
  const navigate = useNavigate();
  const location = useLocation();
  const { clearParticipant } = useParticipantSession();

  const isWorkspaceAll = location.hash?.includes("all") || location.pathname.endsWith("/all");

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleArchive = () => {
    setAnchorEl(null);
    navigate('/workspaces');
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setAnchorEl(null);
    try {
      await performParticipantLogout({ clearParticipant });
      navigate("/start", { replace: true });
    } catch (e) {
      console.error("[MainHeader] Logout error:", e);
      navigate("/start", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          height: 64,
        }}
      >
        <Box
          component="header"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: headerBg,
            borderBottom: 1,
            borderColor: "divider",
            height: 64,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            width: "100%",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
        {/* Inner container — same PAGE_CONTAINER token as breadcrumb and body grid */}
        <Box sx={{
          ...PAGE_CONTAINER,
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "nowrap",
        }}>
          <Box
            component="img"
            src="/logo.png"
            alt="University of Regina Library"
            onClick={() => navigate('/workspaces')}
            sx={{
              height: 40,
              width: "auto",
              flexShrink: 0,
              cursor: "pointer",
            }}
          />

          {location.pathname !== "/workspaces" && (
            <Box sx={{
              flex: "1 1 auto",
              minWidth: 400,
              ml: 2,
              mr: 1,
            }}>
              <SearchSection
                key={`search-${getSelectedWorkspaceId() ?? "none"}`}
                participant={participant}
                onSearchResultsChange={() => {}}
                onTotalRecordsChange={() => {}}
                onCurrentQueryChange={() => {}}
                isDisabled={isWorkspaceAll}
              />
            </Box>
          )}

          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexShrink: 0,
            ml: "auto",
          }}>
            <IconButton
              onClick={handleMenuClick}
              aria-label="Account menu"
              sx={{
                color: '#1E2A44',
              }}
            >
              <PersonOutline />
            </IconButton>

            <Button
              variant="outlined"
              role="button"
              aria-pressed={isWorkspaceAll}
              aria-label={isWorkspaceAll ? "Switch to Search view" : "Switch to Saved Results view"}
              startIcon={isWorkspaceAll ? <SearchOutlined sx={{ color: "inherit", fontSize: 20 }} /> : <FolderOutlined sx={{ color: "inherit", fontSize: 20 }} />}
              onClick={() => onTabChange(isWorkspaceAll ? "serp" : "saved-results")}
              sx={{
                color: 'text.primary',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                textTransform: 'none',
                borderRadius: '20px',
                fontWeight: 500,
                fontSize: TYPOGRAPHY.metadata.fontSize,
                px: 2,
                height: 40,
                whiteSpace: "nowrap",
                // Matches header action column width elsewhere
                width: HEADER_ACTION_WIDTH,
                borderWidth: "1px",
              }}
            >
              {isWorkspaceAll ? "Return to Search" : "Saved Results"}
            </Button>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={handleArchive}>
              <ListItemIcon>
                <ListAltOutlined fontSize="small" />
              </ListItemIcon>
              <ListItemText>All Workspaces</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout} disabled={loggingOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>{loggingOut ? "Logging out…" : "Logout"}</ListItemText>
            </MenuItem>
          </Menu>
        </Box>{/* /inner container */}
        </Box>{/* /outer absolute row */}
      </Box>{/* /sticky wrapper */}
    </>
  );
}
