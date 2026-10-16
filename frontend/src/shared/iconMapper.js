// src/utils/iconMapper.js
import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import { getDocumentType, extractFormatAndGenre as extractFormatAndGenreFromService } from '../utils/documentTypeUtils';

import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ChromeReaderModeOutlinedIcon from '@mui/icons-material/ChromeReaderModeOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import FeedOutlinedIcon from '@mui/icons-material/FeedOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import FilterFramesOutlinedIcon from '@mui/icons-material/FilterFramesOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';

// Single source of truth — only lowercase normalized keys.
const TYPE_MAP = {
  thesis: { Comp: SchoolOutlinedIcon, label: 'Thesis' },
  dissertation: { Comp: SchoolOutlinedIcon, label: 'Thesis' },
  dataset: { Comp: TableChartOutlinedIcon, label: 'Dataset' },
  'data set': { Comp: TableChartOutlinedIcon, label: 'Dataset' },
  article: { Comp: DescriptionOutlinedIcon, label: 'Article' },
  'journal article': { Comp: DescriptionOutlinedIcon, label: 'Article' },
  'research-article': { Comp: DescriptionOutlinedIcon, label: 'Article' },
  journal: { Comp: AutoStoriesOutlinedIcon, label: 'Journal' },
  periodical: { Comp: AutoStoriesOutlinedIcon, label: 'Journal' },
  magazine: { Comp: AutoStoriesOutlinedIcon, label: 'Journal' },
  'conference proceeding': { Comp: GroupsOutlinedIcon, label: 'Conference' },
  conference: { Comp: GroupsOutlinedIcon, label: 'Conference' },
  proceedings: { Comp: GroupsOutlinedIcon, label: 'Proceedings' },
  'book chapter': { Comp: ChromeReaderModeOutlinedIcon, label: 'Chapter' },
  chapter: { Comp: ChromeReaderModeOutlinedIcon, label: 'Chapter' },
  'e-book': { Comp: SmartphoneOutlinedIcon, label: 'E-book' },
  'e book': { Comp: SmartphoneOutlinedIcon, label: 'E-book' },
  ebook: { Comp: SmartphoneOutlinedIcon, label: 'E-book' },
  'electronic book': { Comp: SmartphoneOutlinedIcon, label: 'E-book' },
  book: { Comp: MenuBookOutlinedIcon, label: 'Book' },
  proceeding: { Comp: GroupsOutlinedIcon, label: 'Proceeding' },
  video: { Comp: MovieOutlinedIcon, label: 'Video' },
  audio: { Comp: HeadphonesOutlinedIcon, label: 'Audio' },
  report: { Comp: SummarizeOutlinedIcon, label: 'Report' },
  // "general document" is a backend fallback for unclassified docs — map to Other,
  // not Book.  TYPE_MAP is bypassed for it via AMBIGUOUS_TYPES anyway, but this
  // ensures correctness if that set ever changes.
  'general document': { Comp: InsertDriveFileOutlinedIcon, label: 'Other' },
  'guide':            { Comp: LibraryBooksOutlinedIcon, label: 'Library Guide' },
  'guides':           { Comp: LibraryBooksOutlinedIcon, label: 'Library Guide' },
  'library guide':    { Comp: LibraryBooksOutlinedIcon, label: 'Library Guide' },
  'library_guide':    { Comp: LibraryBooksOutlinedIcon, label: 'Library Guide' },
  'research guide':   { Comp: LibraryBooksOutlinedIcon, label: 'Library Guide' },
  'research_guide':   { Comp: LibraryBooksOutlinedIcon, label: 'Library Guide' },
  'web resource': { Comp: PublicOutlinedIcon, label: 'Web Resource' },
  'web resources': { Comp: PublicOutlinedIcon, label: 'Web Resources' },
  'website': { Comp: PublicOutlinedIcon, label: 'Web Resource' },
  'online resource': { Comp: PublicOutlinedIcon, label: 'Web Resource' },
  database: { Comp: StorageOutlinedIcon, label: 'Database' },
  'multiple versions': { Comp: FilterFramesOutlinedIcon, label: 'Multiple Versions' },
  microform: { Comp: CollectionsBookmarkOutlinedIcon, label: 'Microform' },
};

// Order matters: more specific patterns (e.g. "journal article") must come before general ones.
const TOKEN_RULES = [
  { test: /(thesis|dissertation)\b/i, icon: { Comp: SchoolOutlinedIcon, label: 'Thesis' } },
  { test: /\b(data[\s-]?set|dataset|table)\b/i, icon: { Comp: TableChartOutlinedIcon, label: 'Dataset' } },
  { test: /\b(ebook|e-book|electronic\s?book)\b/i, icon: { Comp: SmartphoneOutlinedIcon, label: 'E-book' } },
  // Check for journal BEFORE article to prioritize journal icon for standalone journals
  // But "journal article" pattern should match first due to specificity
  { test: /\b(journal\s?article|research-article)\b/i, icon: { Comp: DescriptionOutlinedIcon, label: 'Article' } }, // Journal articles are articles
  { test: /\b(journal|periodical|magazine)\b/i, icon: { Comp: AutoStoriesOutlinedIcon, label: 'Journal' } }, // Standalone journals
  { test: /\b(article|paper|preprint)\b/i, icon: { Comp: DescriptionOutlinedIcon, label: 'Article' } }, // Other articles
  { test: /\b(conference|proceedings|symposium|workshop)\b/i, icon: { Comp: GroupsOutlinedIcon, label: 'Conference' } },
  { test: /\b(book[_\s-]?chapter|chapter)\b/i, icon: { Comp: ChromeReaderModeOutlinedIcon, label: 'Chapter' } },
  // "book" must be checked BEFORE "map/atlas" so a book with genre=map is not misclassified.
  // E-book is already caught higher up; this catches plain "book" and "general document".
  // "general document" is intentionally excluded: it is the backend's fallback for
  // truly unclassifiable docs and should render as "Other", not "Book".
  { test: /\bbook\b/i, icon: { Comp: MenuBookOutlinedIcon, label: 'Book' } },
  { test: /\b(video|film|movie|episode)\b/i, icon: { Comp: MovieOutlinedIcon, label: 'Video' } },
  { test: /\b(audio|audiobook|podcast)\b/i, icon: { Comp: HeadphonesOutlinedIcon, label: 'Audio' } },
  { test: /\b(music|score)\b/i, icon: { Comp: MusicNoteOutlinedIcon, label: 'Music' } },
  { test: /\b(map|atlas)\b/i, icon: { Comp: MapOutlinedIcon, label: 'Map' } },
  { test: /\breport\b/i, icon: { Comp: SummarizeOutlinedIcon, label: 'Report' } },
  { test: /\b(newspaper|news)\b/i, icon: { Comp: FeedOutlinedIcon, label: 'News' } },
  { test: /\b(web\s?resource|online\s?resource|website|online\s?access|internet)\b/i, icon: { Comp: PublicOutlinedIcon, label: 'Web Resource' } },
  // Handle both space and underscore separators: "library guide", "library_guide"
  // "guide" / "guides" are Primo's bare content-type strings for LibGuides content.
  // Compound forms (library_guide, research guide) are also matched here as a safety net
  // in case type/format/genre fields contain them after normalisation fails to catch them.
  { test: /\bguides?\b|\b(library[\s_]?guide|research[\s_]?guide|libguide)\b/i, icon: { Comp: LibraryBooksOutlinedIcon, label: 'Library Guide' } },
  { test: /\b(database|databases)\b/i, icon: { Comp: StorageOutlinedIcon, label: 'Database' } },
  { test: /\b(microform|microfiche|microfilm)\b/i, icon: { Comp: CollectionsBookmarkOutlinedIcon, label: 'Microform' } },
  { test: /\b(multiple\s?versions|multiple\s?editions)\b/i, icon: { Comp: FilterFramesOutlinedIcon, label: 'Multiple Versions' } },
];

// Cache for normalized strings.
const normalizeCache = new Map();

function normalize(s = '') {
  if (!s) return '';
  if (normalizeCache.has(s)) {
    return normalizeCache.get(s);
  }
  
  const normalized = s
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s-]/g, ' ')                          // remove punctuation
    .replace(/\s+/g, ' ')                               // collapse spaces
    .trim();
  
  if (normalizeCache.size < 1000) {
    normalizeCache.set(s, normalized);
  }
  
  return normalized;
}

// Cache for pickIcon results.
const iconCache = new Map();
const DEFAULT_ICON = { Comp: InsertDriveFileOutlinedIcon, label: 'Other' };

// For ambiguous types the TYPE_MAP exact-match shortcut is skipped so the full haystack
// (format + type + genre) can be evaluated by TOKEN_RULES.  The primary case is
// type="Book" + format="Electronic Book" → should resolve to E-book, not Book.
// We no longer need 'book' here because TOKEN_RULES now has an explicit \bbook\b rule
// placed AFTER the e-book rule, so the more-specific e-book wins automatically.
const AMBIGUOUS_TYPES = new Set(['general document']);

export function pickIcon({ format, type, genre }) {
  const cacheKey = `${format || ''}|${type || ''}|${genre || ''}`;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }

  const normType = normalize(type || '');

  // Try exact match in TYPE_MAP — but skip for ambiguous types whose format field may
  // carry a more specific classification (e.g. type="Book" + format="Electronic Book").
  if (normType && TYPE_MAP[normType] && !AMBIGUOUS_TYPES.has(normType)) {
    iconCache.set(cacheKey, TYPE_MAP[normType]);
    return TYPE_MAP[normType];
  }

  // Combine and normalize all fields for pattern matching
  const haystack = normalize([format, type, genre].filter(Boolean).join(' '));

  // Test against regex patterns - order matters!
  // More specific patterns first (e.g., "journal article" before "journal" or "article")
  for (const rule of TOKEN_RULES) {
    if (rule.test.test(haystack)) {
      iconCache.set(cacheKey, rule.icon);
      return rule.icon;
    }
  }
  
  iconCache.set(cacheKey, DEFAULT_ICON);
  return DEFAULT_ICON;
}

// Document metadata extraction centralized in documentTypeUtils.js
// - getDocumentType() - single source of truth for type classification
// - extractFormatAndGenre() - single source of truth for format/genre extraction

// Single-pass extraction using documentTypeUtils
// This is the ONLY function that extracts all resource type info - all components use this
export function getResourceType(data) {
  if (!data) return { format: 'other', type: '', genre: '' };
  
  // Use centralized functions as single source of truth
  const type = getDocumentType(data);
  const { format, genre } = extractFormatAndGenreFromService(data);
  
  return {
    format: format || 'other',
    type,
    genre,
  };
}

// Component remains the same but benefits from optimized pickIcon
const IconMapper = ({
  format,
  type,
  genre,
  size = 28,
  color = 'inherit',
  sx,
  circularBackground = false,
  iconOpacity = 1,
  circularBackgroundColor = '#F7FAFF',
  context,
}) => {
  const meta = useMemo(() => pickIcon({ format, type, genre }), [format, type, genre]);
  const { Comp, label } = meta;

  const isMiniTimeline = context === 'miniTimeline';
  const safeSx = isMiniTimeline
    ? { fontSize: size, color, opacity: iconOpacity, m: 0, p: 0, display: 'block', ...sx }
    : { fontSize: size, color, opacity: iconOpacity, ...sx };

  const iconElement = (
    <Comp
      sx={safeSx}
      aria-label={label}
      role="img"
    />
  );

  if (circularBackground && !isMiniTimeline) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          backgroundColor: circularBackgroundColor,
          borderRadius: '50%',
          opacity: 1,
        }}
      >
        {iconElement}
      </Box>
    );
  }

  return iconElement;
};

export default React.memo(IconMapper);