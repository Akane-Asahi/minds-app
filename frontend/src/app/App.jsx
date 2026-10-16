// src/App.js
import React, { Suspense, lazy, useMemo, useEffect, useState, useCallback, memo } from "react";
import { ThemeProvider, CssBaseline, CircularProgress, Box, Typography, Button, Alert, Collapse } from "@mui/material";
import lightTheme from "../theme/theme";
import { SURFACE_APP_SHELL } from "../theme/uiTokens";
import { componentSizes } from "../theme/designTokens";
const AppRouter = lazy(() => import("./router"));

// Shared sx constants
const loadingContainerSx = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  flexDirection: "column",
  gap: 3,
  bgcolor: "background.default",
};

const loadingCardSx = {
  backgroundColor: "background.paper",
  borderRadius: SURFACE_APP_SHELL.cardRadius,
  padding: SURFACE_APP_SHELL.cardPadding,
  boxShadow: SURFACE_APP_SHELL.cardShadow,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
};

const errorPageSx = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: 3,
  textAlign: "center",
  bgcolor: "background.default",
};

const errorCardSx = {
  maxWidth: 600,
  width: "100%",
  backgroundColor: "background.paper",
  borderRadius: SURFACE_APP_SHELL.cardRadius,
  padding: SURFACE_APP_SHELL.cardPadding,
  boxShadow: SURFACE_APP_SHELL.cardShadow,
};

const errorButtonSx = {
  padding: SURFACE_APP_SHELL.buttonPadding,
  fontSize: SURFACE_APP_SHELL.buttonFontSize,
  fontWeight: 500,
  borderRadius: SURFACE_APP_SHELL.buttonRadius,
  textTransform: "none",
};

const LoadingFallback = memo(function LoadingFallback() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={3} sx={loadingContainerSx}>
      <Box sx={loadingCardSx}>
        <CircularProgress
          size={Number.parseInt(componentSizes.icon.huge, 10) || 48}
          thickness={4}
          sx={{ color: "primary.main" }}
        />
      </Box>
    </Box>
  );
});

const ErrorFallback = memo(function ErrorFallback({ error, resetError, errorId }) {
  const [showDetails, setShowDetails] = useState(false);

  const handleRetry = useCallback(() => {
    resetError();
  }, [resetError]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <Box role="alert" aria-live="polite" sx={errorPageSx}>
      <Box sx={errorCardSx}>
        <Box sx={{ marginBottom: 3 }}>
          <Typography
            component="span"
            variant="h1"
            sx={{ fontSize: "48px", marginBottom: 2, color: "error.main" }}
            aria-hidden="true"
          >
            ⚠️
          </Typography>
          <Typography
            component="h1"
            variant="h4"
            sx={{ color: "error.main", marginBottom: 2, fontWeight: 600, fontSize: "24px" }}
          >
            Application Error
          </Typography>
          <Typography
            variant="body1"
            sx={{ marginBottom: 3, color: "text.secondary", fontSize: "1rem", lineHeight: 1.5 }}
          >
            Something went wrong while loading the application. Please try refreshing the page or contact support if the problem persists.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap", marginBottom: 3 }}>
          <Button variant="contained" onClick={handleRetry} sx={errorButtonSx}>
            Try Again
          </Button>
          <Button variant="outlined" onClick={handleReload} sx={errorButtonSx}>
            Refresh Page
          </Button>
        </Box>

        {process.env.NODE_ENV === "development" && error && (
          <Box sx={{ marginTop: 3 }}>
            <Button
              variant="text"
              onClick={() => setShowDetails(!showDetails)}
              sx={{ fontSize: "0.875rem", fontWeight: 500, textTransform: "none", color: "text.secondary" }}
            >
              {showDetails ? "Hide" : "Show"} Error Details (Development Only)
            </Button>

            <Collapse in={showDetails}>
              <Box sx={{ marginTop: 2 }}>
                {errorId && (
                  <Alert severity="info" sx={{ marginBottom: 2 }}>
                    <Typography variant="body2">
                      <strong>Error ID:</strong> {errorId}
                    </Typography>
                  </Alert>
                )}
                <Box
                  component="pre"
                  sx={{
                    bgcolor: "grey.100",
                    padding: 2,
                    borderRadius: 1,
                    overflow: "auto",
                    fontSize: "0.75rem",
                    lineHeight: 1.4,
                    border: 1,
                    borderColor: "divider",
                    textAlign: "left",
                  }}
                >
                  {error.toString()}
                  {error.stack && `\n\nStack Trace:\n${error.stack}`}
                </Box>
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    </Box>
  );
});

function App() {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);
  const [errorId, setErrorId] = useState(null);

  const theme = useMemo(() => lightTheme, []);

  const resetError = useCallback(() => {
    setHasError(false);
    setError(null);
    setErrorId(null);
  }, []);

  useEffect(() => {
    const handleError = (event) => {
      const id = `app_error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      if (process.env.NODE_ENV !== "production") {
        console.group("🚨 Global error caught in App");
        console.error("Error:", event.error);
        console.error("Error ID:", id);
        console.error("URL:", window.location.href);
        console.error("User Agent:", navigator.userAgent);
        console.groupEnd();
      }
      setError(event.error);
      setErrorId(id);
      setHasError(true);
    };

    const handleUnhandledRejection = (event) => {
      const id = `app_promise_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      if (process.env.NODE_ENV !== "production") {
        console.group("🚨 Unhandled promise rejection in App");
        console.error("Reason:", event.reason);
        console.error("Error ID:", id);
        console.error("URL:", window.location.href);
        console.groupEnd();
      }
      setError(event.reason);
      setErrorId(id);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return <ErrorFallback error={error} resetError={resetError} errorId={errorId} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense fallback={<LoadingFallback />}>
        <AppRouter />
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
