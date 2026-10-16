/**
 * DocumentAbstract Component
 *
 * Centralized component for rendering document abstracts in result cards.
 * Handles abstract extraction and conditional rendering based on showAbstract flag.
 *
 * When showAbstract = false, returns null (no empty gaps).
 * When showAbstract = true, extracts abstract and renders AbstractToggle if text exists.
 */

import React from "react";
import { getRawAbstract, normalizeAbstract } from "../../utils/abstractUtils";
import AbstractToggle from "./AbstractToggle";
import { SHOW_ABSTRACTS } from "../../config/uiFlags";

/**
 * @param {Object} props
 * @param {Object} props.doc - Document object with pnx or docdata.pnx
 * @param {boolean} [props.showAbstract] - Override; when undefined, uses SHOW_ABSTRACTS
 * @param {number} props.clampLines - Number of lines to clamp (default: 2)
 */
const DEFAULT_SHOW_ABSTRACTS = true;

export default function DocumentAbstract({ doc, showAbstract, clampLines = 2, onExpand, onCollapse }) {
  const shouldShow =
    typeof showAbstract === "boolean"
      ? showAbstract
      : (typeof SHOW_ABSTRACTS === "boolean" ? SHOW_ABSTRACTS : DEFAULT_SHOW_ABSTRACTS);

  if (!shouldShow) {
    return null;
  }

  const abstract = getRawAbstract(doc);
  const text = normalizeAbstract(abstract);

  if (!text.trim()) {
    return null;
  }

  return (
    <AbstractToggle
      abstractText={text}
      clampLines={clampLines}
      show={true}
      onExpand={onExpand}
      onCollapse={onCollapse}
    />
  );
}
