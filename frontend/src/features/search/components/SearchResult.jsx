import React, {
  useEffect,
  useState,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Backdrop,
  Box,
  CircularProgress,
  Typography,
  Paper,
  Skeleton,
  Stack,
  Button,
  Fade,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowLeftIcon from "@mui/icons-material/ArrowBackIosNew";

import Records from "./ResultRow";
import VirtualizedSearchResults from "./VirtualizedSearchResults";
import { LAYOUT } from "../../../theme/uiTokens";

import {
  getSearchResult,
  getDetails,
} from "../../../shared/libraryService";
import { WorkspaceContext } from "../../workspace/context/WorkspaceContext";
import { useSavedBookmarks } from "../../workspace/context/SavedBookmarksContext";
import {
  getSelectedWorkspaceId,
  getWorkspaceSearchResults,
  setWorkspaceSearchResults,
} from "../../../utils/userScopedStorage";
import { getControlNumber } from "../../../utils/documentUtils";

const PAGE_SIZE = 10;
const FALLBACK_MAX_VALID_PAGE = 101;

function normalizeStoredSearchSession(value) {
  if (!value || typeof value !== "object") return null;
  const searchResults = Array.isArray(value.searchResults) ? value.searchResults : [];
  return {
    term: typeof value.term === "string" ? value.term : "",
    searchResults,
    resultsPage: Number(value.resultsPage) > 0 ? Number(value.resultsPage) : 1,
    totalRecordsFound: Number.isFinite(Number(value.totalRecordsFound))
      ? Number(value.totalRecordsFound)
      : 0,
    maxValidPage: Number(value.maxValidPage) > 0 ? Number(value.maxValidPage) : null,
    resultsLoaded: value.resultsLoaded === true || searchResults.length > 0,
  };
}

function getPageCluster(current, total, { siblingCount = 1 } = {}) {
  const c = Math.max(1, Math.min(Number(current) || 1, Number(total) || 1));
  const t = Math.max(1, Number(total) || 1);

  const start = Math.max(1, c - siblingCount);
  const end = Math.min(t, c + siblingCount);

  const items = [];
  for (let p = start; p <= end; p += 1) items.push(p);

  if (start > 2) items.unshift("ellipsis");
  if (start > 1) items.unshift(1);

  if (end < t - 1) items.push("ellipsis");
  if (end < t) items.push(t);

  const cleaned = [];
  for (const it of items) {
    const prev = cleaned[cleaned.length - 1];
    if (it === "ellipsis" && prev === "ellipsis") continue;
    cleaned.push(it);
  }
  return cleaned;
}

const LoadingSkeletonList = ({ rows = 8 }) => (
  <Box>
    {[...Array(rows)].map((_, i) => (
      <Paper
        key={i}
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1.5,
          borderRadius: 2,
          border: "1px solid rgba(2,6,23,.06)",
          bgcolor: "#fbfcff",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Skeleton variant="rounded" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={24} />
            <Skeleton variant="text" width="45%" height={16} />
            <Skeleton variant="text" width="35%" height={16} />
          </Box>
        </Stack>
      </Paper>
    ))}
  </Box>
);

const EmptyResults = ({ term, onBack }) => (
  <Paper
    elevation={0}
    sx={{
      p: 4,
      borderRadius: 3,
      border: "1px solid rgba(2,6,23,.06)",
      bgcolor: "linear-gradient(180deg,#fff, #fbfcff)",
      textAlign: "center",
    }}
  >
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="center"
      sx={{ mb: 2, color: "text.secondary" }}
    >
      <SearchIcon fontSize="large" />
    </Stack>
    <Typography component="h2" variant="h5" sx={{ mb: 1 }}>
      no results for "{term}".
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      try different keywords.
    </Typography>
    <Stack direction="row" justifyContent="center" spacing={1.5}>
      <Button
        variant="contained"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("searchTermChanged", { detail: "" }));
        }}
        sx={{ fontSize: 16 }}
      >
        clear term
      </Button>
      <Button variant="outlined" onClick={onBack} startIcon={<ArrowLeftIcon />} sx={{ fontSize: 16 }}>
        back to workspace list
      </Button>
    </Stack>
  </Paper>
);

const SearchResult = ({
  participant,
  setActiveTab: _setActiveTab,
  setResourceChange: _setResourceChange,
  activeTab: _activeTab,
  searchTerm: searchTermProp,
  workspace,
  workspaceTitle: workspaceTitleProp,
  wsId: wsIdProp,
}) => {
  useEffect(() => {
    document.title = "Search results";
  }, []);

  const navigate = useNavigate();
  const { selectedWorkspace } = useContext(WorkspaceContext);
  const { getSavedocIdForSerpHit } = useSavedBookmarks();

  const initialWorkspaceId =
    getSelectedWorkspaceId() || selectedWorkspace?.ws_id || selectedWorkspace?._id || null;
  const initialStoredSession = normalizeStoredSearchSession(
    initialWorkspaceId ? getWorkspaceSearchResults(initialWorkspaceId) : null
  );
  const resultsContainerRef = useRef(null);
  const searchAbortRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(600);

  const [searchResults, setSearchResults] = useState(() => initialStoredSession?.searchResults || []);
  const [resultsPage, setResultsPage] = useState(() => initialStoredSession?.resultsPage || 1);
  const [pageLoading, setPageLoading] = useState(false);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [totalRecordsFound, setTotalRecordsFound] = useState(
    () => initialStoredSession?.totalRecordsFound || 0
  );
  const [maxValidPage, setMaxValidPage] = useState(() => initialStoredSession?.maxValidPage || null);

  const resultsTopRef = useRef(null);
  const leftColumnScrollRef = useRef(null);
  const prevPageLoadingRef = useRef(false);

  useEffect(() => {
    const wasLoading = prevPageLoadingRef.current;
    prevPageLoadingRef.current = pageLoading;
    if (!wasLoading || pageLoading) return;
    if (isPageChanging) {
      requestAnimationFrame(() => {
        resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setIsPageChanging(false);
      });
    } else {
      requestAnimationFrame(() => {
        if (leftColumnScrollRef.current) {
          leftColumnScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, [pageLoading, isPageChanging]);

  const applySessionSnapshot = useCallback((snapshot) => {
    setSearchTerm(snapshot.term);
    setSearchResults(snapshot.searchResults);
    setResultsPage(snapshot.resultsPage);
    setTotalRecordsFound(snapshot.totalRecordsFound);
    setMaxValidPage(snapshot.maxValidPage);
    setResultsLoaded(snapshot.resultsLoaded);
  }, []);

  useEffect(() => {
    const handleWorkspaceChange = (event) => {
      const workspaceId = event.detail?.workspaceId || getSelectedWorkspaceId();
      setPageLoading(false);

      const restored = workspaceId
        ? normalizeStoredSearchSession(getWorkspaceSearchResults(workspaceId))
        : null;
      if (restored?.term) {
        restoredSessionRef.current = true;
        applySessionSnapshot(restored);
      } else {
        setSearchTerm("");
        setSearchResults([]);
        setResultsPage(1);
        setTotalRecordsFound(0);
        setMaxValidPage(null);
        setResultsLoaded(false);
      }
    };

    window.addEventListener("ws:workspace:changed", handleWorkspaceChange);
    return () => window.removeEventListener("ws:workspace:changed", handleWorkspaceChange);
  }, [participant?._id, applySessionSnapshot]);

  const [savedDocsList, setSavedDocsList] = useState([]);
  const [savedDocsCatsList, setSavedDocsCatsList] = useState([]);
  const [savedDocsItems, setSavedDocsItems] = useState([]);
  const [resultsLoaded, setResultsLoaded] = useState(() => initialStoredSession?.resultsLoaded === true);

  const [currentQueryId, setCurrentQueryId] = useState(() => {
    const workspaceId = getSelectedWorkspaceId();
    return workspaceId ? localStorage.getItem(`currentQueryId_${workspaceId}`) : null;
  });
  const [searchTerm, setSearchTerm] = useState(() => initialStoredSession?.term || searchTermProp || "");
  const restoredSessionRef = useRef(Boolean(initialStoredSession?.term));

  const workspaceId =
    wsIdProp || getSelectedWorkspaceId() || selectedWorkspace?.ws_id || selectedWorkspace?._id || null;

  const restoreExistingWorkspaceSession = useCallback((nextWorkspaceId) => {
    if (!nextWorkspaceId) return false;
    const stored = normalizeStoredSearchSession(getWorkspaceSearchResults(nextWorkspaceId));
    if (!stored || !stored.term) return false;

    restoredSessionRef.current = true;
    applySessionSnapshot(stored);
    setPageLoading(false);
    return true;
  }, [applySessionSnapshot]);

  const resetSearchUI = useCallback(() => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    setSearchTerm("");
    setSearchResults([]);
    setTotalRecordsFound(0);
    setResultsPage(1);
    setResultsLoaded(false);
    setPageLoading(false);
    setCurrentQueryId(null);
  }, []);

  const prevWorkspaceIdRef = useRef(undefined);
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== undefined && prevWorkspaceIdRef.current !== workspaceId) {
      resetSearchUI();
    }
    if (workspaceId) {
      restoreExistingWorkspaceSession(workspaceId);
    }
    prevWorkspaceIdRef.current = workspaceId;
  }, [workspaceId, resetSearchUI, restoreExistingWorkspaceSession]);

  useEffect(() => {
    const handleSearchQueryCreated = (event) => {
      const { queryId, workspaceId: eventWorkspaceId } = event.detail || {};
      const currentWorkspaceId = getSelectedWorkspaceId();

      if (queryId && eventWorkspaceId === currentWorkspaceId) {
        setCurrentQueryId(queryId);
        localStorage.setItem(`currentQueryId_${currentWorkspaceId}`, queryId);
      }
    };

    window.addEventListener("searchQueryCreated", handleSearchQueryCreated);
    return () => window.removeEventListener("searchQueryCreated", handleSearchQueryCreated);
  }, []);

  useEffect(() => {
    const wid = getSelectedWorkspaceId();
    const storedQueryId = wid ? localStorage.getItem(`currentQueryId_${wid}`) : null;
    setCurrentQueryId(storedQueryId);
  }, [selectedWorkspace]);

  const runFetch = useCallback((page, term, fetchOpts = {}) => {
    const { signal } = fetchOpts;
    const t = (term || "").trim();
    if (!t) {
      return;
    }

    setPageLoading(true);
    setResultsLoaded(false);

    const uiPage = page || 1;
    const apiPage = Math.max(0, uiPage - 1);
    const opts = signal ? { signal } : {};

    getSearchResult(
      apiPage,
      t,
      (normalizedDocs) => setSearchResults(normalizedDocs || []),
      (count) => {
        setTotalRecordsFound(count);
        setResultsLoaded(true);
      },
      () => setResultsPage(uiPage),
      setPageLoading,
      opts,
      setMaxValidPage
    );
  }, []);

  useEffect(() => {
    const term = (searchTermProp || "").trim();
    const localTerm = (searchTerm || "").trim();
    if (term || localTerm) return;

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }
    setSearchTerm("");
    setSearchResults([]);
    setTotalRecordsFound(0);
    setResultsPage(1);
    setResultsLoaded(false);
    setPageLoading(false);
    setMaxValidPage(null);
  }, [searchTermProp, searchTerm]);

  const [searchSeq, setSearchSeq] = useState(0);
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail;
      const q = (
        typeof detail === "string"
          ? detail
          : String(detail?.term ?? detail ?? "")
      ).trim();
      if (q) setSearchSeq((s) => s + 1);
    };
    window.addEventListener("searchTermChanged", handler);
    return () => window.removeEventListener("searchTermChanged", handler);
  }, []);

  useEffect(() => {
    const handler = () => setPageLoading(true);
    window.addEventListener("serpSearchStart", handler);
    return () => window.removeEventListener("serpSearchStart", handler);
  }, []);

  // Read latest values without re-running the fetch effect when they change (prevents duplicate fetches).
  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  useEffect(() => {
    const term = (searchTermProp || "").trim();
    if (!term) return;
    if (restoredSessionRef.current && term === (searchTermRef.current || "").trim()) {
      restoredSessionRef.current = false;
      return;
    }

    setPageLoading(true);
    setResultsLoaded(false);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = new AbortController();
    const signal = searchAbortRef.current.signal;

    setSearchTerm(term);
    setResultsPage(1);
    runFetch(1, term, { signal });

    return () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, [searchTermProp, workspaceId, searchSeq, runFetch]);

  useEffect(() => {
    const term = (searchTerm || "").trim();
    if (!workspaceId || !term || !resultsLoaded) return;

    setWorkspaceSearchResults(workspaceId, {
      term,
      searchResults,
      resultsPage,
      totalRecordsFound,
      maxValidPage,
      resultsLoaded: true,
    });
  }, [
    workspaceId,
    searchTerm,
    searchResults,
    resultsPage,
    totalRecordsFound,
    maxValidPage,
    resultsLoaded,
  ]);

  useEffect(() => {
    const total = Number(totalRecordsFound || 0);
    if (total === 0) return;
    const cap = maxValidPage ?? FALLBACK_MAX_VALID_PAGE;
    const totalPagesReal = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const totalPagesNavigable = Math.min(totalPagesReal, cap);
    if (resultsPage > totalPagesNavigable) {
      setResultsPage(totalPagesNavigable);
      runFetch(totalPagesNavigable, searchTerm);
    }
  }, [totalRecordsFound, resultsPage, searchTerm, runFetch, maxValidPage]);

  useEffect(() => {
    if (totalRecordsFound > 0) {
      window.dispatchEvent(
        new CustomEvent("totalResultsUpdated", {
          detail: { totalResults: totalRecordsFound },
        })
      );
    }
  }, [totalRecordsFound]);

  useEffect(() => {
    const updateHeight = () => {
      if (resultsContainerRef.current) {
        const rect = resultsContainerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100;
        setContainerHeight(Math.max(400, availableHeight));
      } else {
        setContainerHeight(window.innerHeight - 200);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [searchResults.length]);

  const resolveSavedoc = useCallback(
    (cn, externalId) => getSavedocIdForSerpHit(cn, externalId),
    [getSavedocIdForSerpHit]
  );

  const safeWorkspaceTitle =
    workspaceTitleProp ||
    workspace?.ws_title ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("workspaceTitle") : "") ||
    "";

  const paginationInfo = useMemo(() => {
    const rawPages = Math.ceil(Number(totalRecordsFound || 0) / PAGE_SIZE);
    const totalPagesReal = Math.max(1, rawPages);
    const cap = maxValidPage ?? FALLBACK_MAX_VALID_PAGE;
    const totalPagesNavigable = Math.max(1, Math.min(totalPagesReal, cap));
    const isCapActive = totalPagesReal > totalPagesNavigable;
    const currentPage = Math.max(1, Math.min(resultsPage, totalPagesNavigable));
    const showFirstLast = !isCapActive && totalPagesNavigable > 7;
    const cluster = getPageCluster(currentPage, totalPagesNavigable, { siblingCount: 1 }).filter(
      (x) => (showFirstLast ? true : x !== totalPagesNavigable)
    );
    if (!cluster.includes(currentPage)) {
      const idx = cluster.findLastIndex?.((v) => typeof v === "number") ?? -1;
      if (idx >= 0) cluster[idx] = currentPage;
      else cluster.push(currentPage);
    }
    return { totalPagesNavigable, currentPage, cluster };
  }, [totalRecordsFound, maxValidPage, resultsPage]);

  if (!((searchTermProp || "").trim() || (searchTerm || "").trim())) {
    return <Box sx={{ width: "100%", minHeight: 120 }} />;
  }

  try {
    return (
      <>
        <h1 className="visually-hidden">Search results</h1>
        <Backdrop
          open={pageLoading}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: "rgba(0,0,0,0.41)",
            color: "common.white",
          }}
        >
          <CircularProgress size={28} color="inherit" />
        </Backdrop>

        <Box
          ref={leftColumnScrollRef}
          data-baseline-scroll-root="serp"
          sx={{
            ...LAYOUT.leftColumnStyles,
            width: "100%",
            maxWidth: "100%",
            ...(pageLoading ? { pointerEvents: "none" } : {}),
          }}
          className="scrollbarOutsideCards"
        >
          <div ref={resultsTopRef} style={{ height: 0, overflow: "hidden" }} aria-hidden="true" />

          {!resultsLoaded && searchResults.length === 0 ? (
            <LoadingSkeletonList rows={8} />
          ) : searchResults.length > 0 ? (
            <Box
              ref={resultsContainerRef}
              sx={{
                py: 1,
                flex: 1,
                position: "relative",
                ...(isPageChanging && {
                  opacity: 0.45,
                  pointerEvents: "none",
                  userSelect: "none",
                }),
              }}
            >
              {/* Single loading indicator: Backdrop + spinner above when pageLoading (covers pagination + new searches). */}
              {searchResults.length > 20 ? (
                <VirtualizedSearchResults
                  searchResults={searchResults}
                  cnFromHit={getControlNumber}
                  getSavedocIdForSerpHit={resolveSavedoc}
                  getDetails={getDetails}
                  savedDocsList={savedDocsList}
                  participant={participant}
                  selectedWorkspace={selectedWorkspace}
                  searchTerm={searchTerm}
                  setPageLoading={setPageLoading}
                  setSavedDocsList={setSavedDocsList}
                  savedDocsCatsList={savedDocsCatsList}
                  setSavedDocsCatsList={setSavedDocsCatsList}
                  savedDocsItems={savedDocsItems}
                  setSavedDocsItems={setSavedDocsItems}
                  currentQueryId={currentQueryId}
                  containerHeight={containerHeight}
                  itemHeight={200}
                  resultsPage={resultsPage}
                />
              ) : (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {searchResults.map((data, i) => {
                    const cn = getControlNumber(data);
                    const externalId =
                      data?.externalId ||
                      data?.ControlNumber ||
                      cn ||
                      data?.pnx?.control?.recordid?.[0] ||
                      `doc-${i}`;
                    const resolvedSavedocId = resolveSavedoc(cn, externalId);

                    return (
                      <Fade key={externalId} in timeout={160}>
                        <Box>
                          <Records
                            data={data}
                            getDetails={getDetails}
                            savedDocsList={savedDocsList}
                            participant={participant}
                            searchTopic={safeWorkspaceTitle}
                            query={searchTerm}
                            setPageLoading={setPageLoading}
                            hideSaveButton={false}
                            setSavedDocsList={setSavedDocsList}
                            savedDocsCatsList={savedDocsCatsList}
                            setSavedDocsCatsList={setSavedDocsCatsList}
                            savedDocsItems={savedDocsItems}
                            setSavedDocsItems={setSavedDocsItems}
                            savedocId={resolvedSavedocId}
                            currentQueryId={currentQueryId}
                            resultsPage={resultsPage}
                            resultRank={i + 1}
                          />
                        </Box>
                      </Fade>
                    );
                  })}
                </Stack>
              )}
            </Box>
          ) : resultsLoaded ? (
            <EmptyResults term={searchTerm} onBack={() => navigate("/workspaces")} />
          ) : null}

          {searchResults.length > 0 && (
            <Box mt={3} display="flex" flexDirection="column" alignItems="center" flexShrink={0} gap={0.75}>
              <Box
                role="navigation"
                aria-label="Search results pagination"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                  mt: 0.75,
                  flexWrap: "wrap",
                  fontFamily: "sans-serif",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    const safePage = Math.max(1, paginationInfo.currentPage - 1);
                    if (safePage === paginationInfo.currentPage) return;
                    setResultsPage(safePage);
                    setIsPageChanging(true);
                    runFetch(safePage, searchTerm);
                  }}
                  disabled={paginationInfo.currentPage <= 1}
                  aria-label="Previous page"
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    px: 2,
                    fontSize: 16,
                    textTransform: "none",
                    borderRadius: 2,
                    fontFamily: "sans-serif",
                    "&:focus-visible": {
                      outline: "3px solid #1873cd",
                      outlineOffset: "2px",
                    },
                  }}
                >
                  Previous
                </Button>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  {paginationInfo.cluster.map((item, idx) => {
                    if (item === "ellipsis") {
                      return (
                        <Box
                          key={`el-${idx}`}
                          aria-hidden="true"
                          sx={{ minWidth: 24, textAlign: "center", fontSize: 18, color: "text.secondary" }}
                        >
                          …
                        </Box>
                      );
                    }
                    const pageNum = item;
                    const isActive = pageNum === paginationInfo.currentPage;
                    return (
                      <Button
                        key={`p-${pageNum}`}
                        onClick={() => {
                          if (pageNum === paginationInfo.currentPage) return;
                          const safePage = Math.max(1, Math.min(pageNum, paginationInfo.totalPagesNavigable));
                          setResultsPage(safePage);
                          setIsPageChanging(true);
                          runFetch(safePage, searchTerm);
                        }}
                        variant={isActive ? "contained" : "outlined"}
                        color={isActive ? "primary" : "inherit"}
                        aria-label={`Page ${pageNum}`}
                        aria-current={isActive ? "page" : undefined}
                        sx={{
                          minWidth: 44,
                          minHeight: 44,
                          px: 1.75,
                          fontSize: isActive ? 18 : 16,
                          textTransform: "none",
                          borderRadius: 2,
                          fontFamily: "sans-serif",
                          borderColor: isActive ? "primary.main" : "divider",
                          ...(isActive
                            ? {
                                boxShadow: "none",
                                color: "#fff",
                              }
                            : {
                                color: "text.primary",
                              }),
                          "&:focus-visible": {
                            outline: "3px solid #1873cd",
                            outlineOffset: "2px",
                          },
                        }}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </Box>

                <Button
                  variant="outlined"
                  onClick={() => {
                    const safePage = Math.min(paginationInfo.totalPagesNavigable, paginationInfo.currentPage + 1);
                    if (safePage === paginationInfo.currentPage) return;
                    setResultsPage(safePage);
                    setIsPageChanging(true);
                    runFetch(safePage, searchTerm);
                  }}
                  disabled={paginationInfo.currentPage >= paginationInfo.totalPagesNavigable}
                  aria-label="Next page"
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    px: 2,
                    fontSize: 16,
                    textTransform: "none",
                    borderRadius: 2,
                    fontFamily: "sans-serif",
                    "&:focus-visible": {
                      outline: "3px solid #1873cd",
                      outlineOffset: "2px",
                    },
                  }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </>
    );
  } catch (error) {
    console.error("SearchResult render error:", error);
    return (
      <Box sx={{ width: "100%", minWidth: 0 }}>
        <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
          <Typography component="h2" variant="h6" color="error">
            Error loading search results
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {error.message}
          </Typography>
        </Paper>
      </Box>
    );
  }
};

export default SearchResult;
