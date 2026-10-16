/**
 * Entry gate: participant enters ID, we establish session and redirect.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  GlobalStyles,
} from "@mui/material";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import LoginIcon from "@mui/icons-material/Login";
import { useContext } from "react";
import { ParticipantSessionContext } from "../ParticipantSessionContext";
import { startParticipantSession } from "../sessionService";
import { authLog, loginLog } from "../../utils/debugLog";
import {
  prepareParticipantLogin,
  finalizeParticipantLogin,
} from "../participantSessionLifecycle";
import { clearWorkspaceCacheOnUserSwitch } from "../../utils/userScopedStorage";
import { brandColors } from "../../theme/colors";

const COLORS = {
  primary: brandColors.primary[500],
  primaryDark: "#1259a8",
  text: "#111827",
  border: "#d7dbe0",
  borderHover: "#9aa5b1",
};

const SESSION_EXPIRED_MESSAGE = "Session expired—please sign in again.";

export default function StartPage() {
  const { setParticipant, clearParticipant } = useContext(ParticipantSessionContext);
  const [participantId, setParticipantId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem("sessionExpiredMessage")) {
        sessionStorage.removeItem("sessionExpiredMessage");
        setSessionExpired(true);
      }
    } catch (_) {}
    // /start is the study gate — drop any stale auth/workspace state from a prior participant
    clearParticipant();
    clearWorkspaceCacheOnUserSwitch();
  }, [clearParticipant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    const pid = String(participantId ?? "").trim();
    if (!pid) {
      setError("Participant ID is required.");
      setSubmitting(false);
      return;
    }

    try {
      authLog(`login start participant=${pid}`);
      clearParticipant();
      prepareParticipantLogin();
      const session = await startParticipantSession(pid);
      const loginStatus = session?.token ? 200 : "no_token";
      authLog(
        `login success participantId=${session?.participantId ?? pid} userId=${session?._id ?? ""}`
      );
      loginLog(`participant-login status=${loginStatus}`);
      loginLog(`token present=${Boolean(session?.token)}`);

      if (session?.participantId) {
        setParticipant(session);
        finalizeParticipantLogin();
        window.dispatchEvent(new CustomEvent("auth:user:switched", { detail: { userId: session._id } }));

        loginLog("navigating to=/workspaces");
        navigate("/workspaces", { replace: true });
      } else {
        setError("Could not start session. Please try again.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to start session";
      loginLog(`error=${msg}`);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": { borderColor: COLORS.border },
      "&.Mui-focused fieldset": { borderColor: COLORS.primary, borderWidth: 2 },
    },
    "& .MuiInputBase-input": { fontSize: 16, py: 1.2 },
    "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": {
      WebkitBoxShadow: "0 0 0px 1000px #fff inset",
      WebkitTextFillColor: COLORS.text,
      caretColor: COLORS.text,
      transition: "background-color 9999s ease-out 0s",
    },
  };

  return (
    <>
      <GlobalStyles
        styles={{
          "input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus": {
            WebkitBoxShadow: "0 0 0px 1000px #fff inset",
            WebkitTextFillColor: COLORS.text,
            caretColor: COLORS.text,
            transition: "background-color 9999s ease-out 0s",
          },
        }}
      />

      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          px: { xs: 2, sm: 4, md: 6 },
          pt: { xs: 6, sm: 8, md: 20 },
          pb: { xs: 6, md: 8 },
          background:
            "radial-gradient(1200px 600px at 50% -10%, #f2f7ff 0%, #f8fbff 45%, #f6f8fb 100%)",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 480 }}>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              color: COLORS.primary,
              textAlign: "left",
              mb: 2,
            }}
          >
            Academic Search
          </Typography>

          <Card elevation={8} sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography component="h2" variant="h6" sx={{ mb: 1.5 }}>
                Enter your Participant ID
              </Typography>

              {sessionExpired && (
                <Alert severity="info" sx={{ mb: 2 }} onClose={() => setSessionExpired(false)}>
                  {SESSION_EXPIRED_MESSAGE}
                </Alert>
              )}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} autoComplete="off" noValidate>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Participant ID"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  required
                  autoComplete="off"
                  disabled={submitting}
                  error={!!error}
                  helperText={error || undefined}
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeOutlined fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  disabled={!participantId.trim() || submitting}
                  startIcon={<LoginIcon />}
                  variant="contained"
                  sx={{
                    mt: 3,
                    height: 46,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: COLORS.primary,
                    gap: "8px",
                    "& .MuiButton-startIcon": { margin: 0, marginRight: "8px" },
                  }}
                >
                  {submitting ? "Starting…" : "Start"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </>
  );
}
