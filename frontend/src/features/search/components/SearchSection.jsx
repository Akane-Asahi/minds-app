import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useLocation, useNavigate } from 'react-router-dom';
import { saveQueryOnSearch } from '../../../shared/libraryService';
import {
  getSelectedWorkspaceId,
  getWorkspaceSearchResults,
  getWorkspaceSearchBoxTerm,
  removeWorkspaceHasSearched,
  removeWorkspaceLastSearchTerm,
  removeWorkspaceSearchResults,
  setWorkspaceHasSearched,
  setWorkspaceLastSearchTerm,
} from '../../../utils/userScopedStorage';
import { INPUT_SEARCH } from '../../../theme/uiTokens';

const SearchSection = ({ getSearchResult, hasWorkspaces, isDisabled, onQuerySubmit }) => {
  const [searchTerm, setSearchTerm] = useState(() => {
    const wid = getSelectedWorkspaceId();
    return wid ? getWorkspaceSearchBoxTerm(wid) : "";
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Clear search only when the search bar becomes disabled (entering Saved tab).
  // Do NOT clear when returning to Search tab (isDisabled: true → false).
  const prevIsDisabledRef = useRef(isDisabled);
  useEffect(() => {
    const wasDisabled = prevIsDisabledRef.current;
    prevIsDisabledRef.current = isDisabled;
    if (isDisabled && !wasDisabled) {
      // Entering Saved tab — no clear needed; search state should persist.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled]);

  // On workspace change: restore the last search term for that workspace, if any.
  useEffect(() => {
    const restoreWorkspaceSearchTerm = (workspaceIdOverride) => {
      if (isDisabled) return;
      const workspaceId = workspaceIdOverride || getSelectedWorkspaceId();
      const restored = workspaceId ? getWorkspaceSearchBoxTerm(workspaceId) : "";
      setSearchTerm(restored);
    };

    const handleWorkspaceChange = (event) => {
      restoreWorkspaceSearchTerm(event?.detail?.workspaceId);
    };

    restoreWorkspaceSearchTerm();
    window.addEventListener('storage', handleWorkspaceChange);
    window.addEventListener('ws:workspace:changed', handleWorkspaceChange);
    return () => {
      window.removeEventListener('storage', handleWorkspaceChange);
      window.removeEventListener('ws:workspace:changed', handleWorkspaceChange);
    };
  }, [isDisabled, onQuerySubmit]);

  const getWorkspaceTitle = () =>
    localStorage.getItem('workspaceTitle') || '';

  const handleSearch = useCallback(async (queryOverride) => {
    if (isDisabled) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    // One canonical loading signal: set true on any submit (including blank) so SERP shows overlay
    window.dispatchEvent(new CustomEvent('serpSearchStart'));

    const q = String(queryOverride ?? searchTerm ?? '').trim();
    if (!q) {
      window.dispatchEvent(new CustomEvent('searchTermChanged', { detail: '' }));
      return;
    }

    const workspaceId = getSelectedWorkspaceId();
    const wsTitle = getWorkspaceTitle();

    setSearchTerm(q);
    localStorage.setItem('viewOnly', false);
    if (workspaceId) {
      setWorkspaceLastSearchTerm(workspaceId, q);
      setWorkspaceHasSearched(workspaceId, true);
    }
    
    // Dispatch the event immediately - this triggers search in searchResult component
    window.dispatchEvent(
      new CustomEvent("searchTermChanged", { detail: { term: q, fromSearchBar: true } })
    );

    localStorage.setItem("searchTopic", wsTitle);
    onQuerySubmit?.(q);
    navigate(`/workspace?q=${encodeURIComponent(q)}#serp`, { state: { q } });

    if (workspaceId) {
      void saveQueryOnSearch(q, workspaceId)
        .then((queryId) => {
          window.dispatchEvent(
            new CustomEvent("searchQueryCreated", {
              detail: {
                query: q,
                queryId,
                workspaceId,
              },
            })
          );
        })
        .catch((error) => {
          console.error("🔍 SearchSection: Error saving query:", error);
        });
    }
  }, [isDisabled, navigate, onQuerySubmit, searchTerm]);

  const handleInputChange = (e) => {
    if (isDisabled) return;
    const val = e.target.value;
    setSearchTerm(val);

    if (val.trim()) {
      const wsTitle = getWorkspaceTitle();
      localStorage.setItem('searchTopic', wsTitle);
    } else {
      const workspaceId = getSelectedWorkspaceId();
      if (workspaceId) {
        removeWorkspaceLastSearchTerm(workspaceId);
        removeWorkspaceHasSearched(workspaceId);
        removeWorkspaceSearchResults(workspaceId);
      }
      // Input cleared: broadcast empty term so parent resets to empty state
      // and remove ?q= from the URL so SerpView's qFromUrl also becomes empty.
      window.dispatchEvent(new CustomEvent('searchTermChanged', { detail: '' }));
      navigate('/workspace#serp', { replace: true });
    }
  };

  // Programmatic searchTermChanged (workspace restore, clear): sync UI only — no query_issued (Baseline has no query-history UI)
  useEffect(() => {
    const listener = (e) => {
      const detail = e?.detail;
      if (detail && typeof detail === "object" && detail.fromSearchBar) return;
      const newTerm =
        typeof detail === "string"
          ? detail
          : String(detail?.term ?? detail ?? "");
      const trimmed = newTerm.trim();
      setSearchTerm(trimmed);
      if (trimmed) {
        localStorage.setItem("searchTopic", getWorkspaceTitle());
        onQuerySubmit?.(trimmed);
        navigate(`/workspace?q=${encodeURIComponent(trimmed)}#serp`, { state: { q: trimmed } });
      } else {
        onQuerySubmit?.("");
      }
    };
    window.addEventListener("searchTermChanged", listener);
    return () => window.removeEventListener("searchTermChanged", listener);
  }, [navigate, onQuerySubmit]);

  useEffect(() => {
    const initialQuery = String(location.state?.initialQuery ?? "").trim();
    const shouldRunInitialQuery = location.state?.shouldRunInitialQuery === true;
    const stateWorkspaceId = location.state?.workspaceId ?? null;
    if (!initialQuery || !shouldRunInitialQuery) return;

    let cancelled = false;
    let attempts = 0;

    const runInitialQuery = async () => {
      const workspaceId = stateWorkspaceId || getSelectedWorkspaceId();
      const existingSession = workspaceId ? getWorkspaceSearchResults(workspaceId) : null;
      if (existingSession) return;

      if (!workspaceId) {
        attempts += 1;
        if (attempts < 8 && !cancelled) {
          setTimeout(runInitialQuery, 40);
        }
        return;
      }

      setSearchTerm(initialQuery);
      await handleSearch(initialQuery);
      if (cancelled) return;
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      );
    };

    runInitialQuery();
    return () => {
      cancelled = true;
    };
  }, [location.state, handleSearch]);

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSearch();
      }}
      sx={{ width: '100%' }}
    >
      <TextField
        fullWidth
        variant="outlined"
        placeholder={isDisabled ? "Search disabled in Saved Results view" : "Type to search"}
        value={searchTerm}
        onChange={handleInputChange}
        disabled={isDisabled}
        size="medium"
        inputProps={{
          type: 'text',
          name: 'search',
          autoComplete: 'off',
          'aria-label': 'Search',
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 999,
            backgroundColor: "background.paper",
            height: `${INPUT_SEARCH.height} !important`,
            minHeight: INPUT_SEARCH.height,
            display: "flex",
            alignItems: "center",
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? "not-allowed" : "text",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": {
              borderColor: "divider",
            },
            "&.Mui-focused": {
              borderColor: isDisabled ? "divider" : "rgba(0, 0, 0, 0.42)",
              borderWidth: "1px",
              boxShadow: isDisabled ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              display: "none",
            },
            "& .MuiOutlinedInput-input": {
              height: `${INPUT_SEARCH.height} !important`,
              minHeight: `${INPUT_SEARCH.height} !important`,
              padding: "0 14px !important",
              boxSizing: "border-box",
              fontSize: INPUT_SEARCH.fontSize,
              lineHeight: `${INPUT_SEARCH.height} !important`,
              display: "block",
              color: "text.primary",
              cursor: isDisabled ? "not-allowed" : "text",
            },
          },
          "& input::placeholder": {
            color: "text.secondary",
            opacity: 1,
            fontSize: INPUT_SEARCH.fontSize,
            lineHeight: `${INPUT_SEARCH.height} !important`,
          },
          "& .MuiInputAdornment-root": {
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                type="submit"
                disabled={isDisabled || !searchTerm.trim()}
                edge="end"
                size="small"
                aria-label="Search"
                sx={{
                  color: "text.secondary",
                  "&:focus-visible": {
                    outline: "2px solid rgba(0,0,0,0.42)",
                    outlineOffset: 2,
                  },
                }}
              >
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export default SearchSection;