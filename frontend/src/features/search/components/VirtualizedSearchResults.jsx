import React, { useMemo, useCallback, forwardRef } from "react";
import { FixedSizeList } from "react-window";
import { Box, Fade } from "@mui/material";
import Records from "./ResultRow";

const SerpVirtualListOuter = forwardRef(function SerpVirtualListOuter(props, ref) {
  return <div ref={ref} {...props} data-baseline-scroll-inner="serp" />;
});

/**
 * Virtualized SERP list. Bookmark state comes only from SavedBookmarksContext via getSavedocIdForSerpHit.
 */
export default function VirtualizedSearchResults({
  searchResults,
  cnFromHit,
  getSavedocIdForSerpHit,
  getDetails,
  savedDocsList,
  participant,
  selectedWorkspace,
  searchTerm,
  setPageLoading,
  setSavedDocsList,
  savedDocsCatsList,
  setSavedDocsCatsList,
  savedDocsItems,
  setSavedDocsItems,
  currentQueryId = null,
  containerHeight = 600,
  itemHeight = 200,
  resultsPage = 1,
}) {
  const itemData = useMemo(
    () => ({
      searchResults,
      cnFromHit,
      getSavedocIdForSerpHit,
      getDetails,
      savedDocsList,
      participant,
      selectedWorkspace,
      searchTerm,
      setPageLoading,
      setSavedDocsList,
      savedDocsCatsList,
      setSavedDocsCatsList,
      savedDocsItems,
      setSavedDocsItems,
      currentQueryId,
      resultsPage,
      savedDocsCount: Array.isArray(savedDocsItems) ? savedDocsItems.length : 0,
    }),
    [
      searchResults,
      cnFromHit,
      getSavedocIdForSerpHit,
      getDetails,
      savedDocsList,
      participant,
      selectedWorkspace,
      searchTerm,
      setPageLoading,
      setSavedDocsList,
      savedDocsCatsList,
      setSavedDocsCatsList,
      savedDocsItems,
      setSavedDocsItems,
      currentQueryId,
      resultsPage,
    ]
  );

  const Row = useCallback(({ index, style, data }) => {
    const {
      searchResults: rows,
      cnFromHit: cnFn,
      getSavedocIdForSerpHit: resolveSaved,
      getDetails: gd,
      savedDocsList: sdl,
      participant: p,
      selectedWorkspace: sw,
      searchTerm: st,
      setPageLoading: spl,
      setSavedDocsList: ssdl,
      savedDocsCatsList: sdcl,
      setSavedDocsCatsList: ssdcl,
      savedDocsItems: sdi,
      setSavedDocsItems: ssdi,
      currentQueryId: cqid,
      resultsPage: rp,
      savedDocsCount: sdc,
    } = data;

    const resultData = rows[index];
    if (!resultData) return null;

    const cn = cnFn(resultData);
    const externalId =
      resultData?.externalId ||
      resultData?.ControlNumber ||
      cn ||
      resultData?.pnx?.control?.recordid?.[0] ||
      `doc-${index}`;

    const resolvedSavedocId =
      typeof resolveSaved === "function" ? resolveSaved(cn, externalId) : undefined;

    return (
      <div style={style}>
        <Fade in timeout={160}>
          <Box>
            <Records
              data={resultData}
              getDetails={gd}
              savedDocsList={sdl}
              participant={p}
              searchTopic={
                sw?.ws_title ||
                (typeof localStorage !== "undefined" ? localStorage.getItem("workspaceTitle") : "") ||
                ""
              }
              query={st}
              setPageLoading={spl}
              hideSaveButton={false}
              setSavedDocsList={ssdl}
              savedDocsCatsList={sdcl}
              setSavedDocsCatsList={ssdcl}
              savedDocsItems={sdi}
              setSavedDocsItems={ssdi}
              savedocId={resolvedSavedocId}
              currentQueryId={cqid}
              resultsPage={rp}
              resultRank={index + 1}
              savedDocsCount={sdc}
            />
          </Box>
        </Fade>
      </div>
    );
  }, []);

  if (searchResults.length === 0) {
    return null;
  }

  return (
    <Box sx={{ py: 1 }}>
      <FixedSizeList
        height={containerHeight}
        itemCount={searchResults.length}
        itemSize={itemHeight}
        itemData={itemData}
        width="100%"
        overscanCount={3}
        outerElementType={SerpVirtualListOuter}
      >
        {Row}
      </FixedSizeList>
    </Box>
  );
}
