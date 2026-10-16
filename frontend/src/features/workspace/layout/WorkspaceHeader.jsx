// frontend/src/workspace/layout/WorkspaceHeader.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParticipantSession } from "../../../session/ParticipantSessionContext";
import { performParticipantLogout } from "../../../session/participantSessionLifecycle";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Logout from "@mui/icons-material/Logout";
import ListAltOutlined from "@mui/icons-material/ListAltOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import { PAGE_CONTAINER } from "../../../theme/uiTokens";

export default function WorkspaceHeader({ participant }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuOpen = Boolean(anchorEl);
  const navigate = useNavigate();
  const { clearParticipant } = useParticipantSession();

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoClick = () => {
    navigate('/workspaces');
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
      console.error("[WorkspaceHeader] Logout error:", e);
      navigate("/start", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Box
      component="header"
      className="workspace-header"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        backgroundColor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Inner container — same PAGE_CONTAINER token as MainHeader, so the logo/account menu
          sit at the same horizontal position on every view (WCAG 3.2.3, consistent navigation) */}
      <Box
        sx={{
          ...PAGE_CONTAINER,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Box
          component="img"
          src="/logo.png"
          alt="University of Regina Library"
          onClick={handleLogoClick}
          sx={{
            height: 40,
            width: "auto",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />

        {/* User IconButton - On same line as logo */}
        <IconButton
          onClick={handleMenuClick}
          aria-label="Account menu"
          sx={{
            color: "#1E2A44",
          }}
        >
          <PersonOutline />
        </IconButton>

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
          {/* Username */}
          <MenuItem disabled sx={{ 
            opacity: 1, 
            color: "text.primary",
            fontWeight: "bold",
            borderBottom: "1px solid #e0e0e0",
          }}>
            <ListItemText primary={participant?.participantId || participant?.username || "Participant"} />
          </MenuItem>
          
          {/* All Workspaces */}
          <MenuItem onClick={handleArchive}>
            <ListItemIcon>
              <ListAltOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText>All Workspaces</ListItemText>
          </MenuItem>
          
          {/* Logout */}
          <MenuItem onClick={handleLogout} disabled={loggingOut}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText>{loggingOut ? "Logging out…" : "Logout"}</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}

