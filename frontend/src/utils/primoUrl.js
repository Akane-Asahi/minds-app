/**
 * University of Regina Library (Primo) full display URL builder.
 * Matches baseline: SerpDocumentComponent / Contentlists buildFullDisplayUrl.
 * Used for SERP result title link and saved-doc title link (when doc_url not stored).
 *
 * @param {Object} doc - Primo hit or saved doc: pnx at doc.pnx or doc.docdata.pnx; optional doc.context, doc.adaptor
 * @returns {string|null} Full URL to open in browser, or null if recordid is missing.
 */
export function buildUReginaPrimoFullDisplayUrl(doc) {
  const pnx = doc?.pnx || doc?.docdata?.pnx;
  const docid = pnx?.control?.recordid?.[0];
  if (!docid) return null;

  const baseUrl = "https://casls-regina.primo.exlibrisgroup.com/discovery/fulldisplay?";
  const context = doc?.context ?? doc?.docdata?.context ?? "L";
  const vid = "01CASLS_REGINA:01CASLS_REGINA";
  const lang = "en";
  const search_scope = "MyInst_and_CI";
  const adaptor = doc?.adaptor ?? doc?.docdata?.adaptor ?? "Local Search Engine";
  const tab = "Everything";
  const query = "any,contains,data";
  const mode = "Basic";

  return `${baseUrl}docid=${docid}&context=${context}&vid=${vid}&lang=${lang}&search_scope=${search_scope}&adaptor=${encodeURIComponent(adaptor)}&tab=${tab}&query=${query}&mode=${mode}`;
}
