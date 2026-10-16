// AUDITED: No user-scoped data. Safe proxy layer.
/**
 * Library Controller
 *
 * Proxies Primo search and document details requests. API keys are read from
 * environment variables and never exposed to the frontend.
 */

const axios = require('axios');

const PRIMO_BASE_URL =
  process.env.PRIMO_BASE_URL || 'https://api-na.hosted.exlibrisgroup.com/primo/v1/search';
const PRIMO_INSTITUTION = process.env.PRIMO_INSTITUTION || '01CASLS_REGINA';
const PRIMO_TIMEOUT_MS = parseInt(process.env.PRIMO_TIMEOUT_MS || '30000', 10);
const EXTERNAL_API_BASE =
  process.env.EXTERNAL_API_BASE || 'http://147.182.148.79/sils/api/search/item/full';

// Single source of truth for fetchable range. Primo API recommended max offset is 2000; we use 1000
// so the last page is guaranteed to return results (offset 1000 = page 101).
const PRIMO_MAX_OFFSET = parseInt(process.env.PRIMO_MAX_OFFSET || '1000', 10);

const primoClient = axios.create({
  baseURL: PRIMO_BASE_URL,
  timeout: PRIMO_TIMEOUT_MS,
  headers: {
    Accept: 'application/json, text/plain',
    'Content-Type': 'application/json',
    'Accept-Language': 'en-ca'
  }
});

/**
 * GET /api/library/search
 * Proxies Primo search. API key from process.env.PRIMO_API_KEY.
 *
 * Query params: q, offset, limit (or page + limit)
 */
const searchLibraryCatalogProxy = async (req, res) => {
  const apiKey = process.env.PRIMO_API_KEY;
  if (!apiKey) {
    console.error('PRIMO_API_KEY is not set');
    return res.status(500).json({
      error: 'Library search is not configured',
      docs: [],
      info: { total: 0 }
    });
  }

  try {
    const { q, offset = 0, limit = 10 } = req.query;
    const term = (q || '').trim();

    if (!term) {
      return res.status(400).json({
        error: 'Search term (q) is required',
        docs: [],
        info: { total: 0 }
      });
    }

    const offsetRaw = Math.max(0, parseInt(offset, 10) || 0);
    const limitNum  = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50);
    // Clamp offset to the Primo navigable ceiling so we never request pages that return empty.
    const offsetNum = Math.min(offsetRaw, PRIMO_MAX_OFFSET);

    const primoParams = {
      inst: PRIMO_INSTITUTION,
      vid: `${PRIMO_INSTITUTION}:01CASLS_REGINA`,
      tab: 'Everything',
      scope: 'MyInst_and_CI',
      apikey: apiKey,
      q: `any,contains,${term}`,
      offset: offsetNum.toString(),
      limit: limitNum.toString(),
      sort: 'rank'
    };

    const primoResponse = await primoClient.get('', { params: primoParams });

    if (primoResponse.status !== 200) {
      throw new Error(`Primo API returned status ${primoResponse.status}`);
    }

    const data = primoResponse.data;
    const rawTotal = Number(data?.info?.total ?? 0);
    // maxValidPage = last page number that is actually fetchable (invariant: that page returns results).
    const maxValidPage = Math.floor(PRIMO_MAX_OFFSET / limitNum) + 1;
    res.json({
      docs: data?.docs ?? [],
      info: {
        total: rawTotal,
        maxValidOffset: PRIMO_MAX_OFFSET,
        maxValidPage,
        limit: limitNum
      }
    });
  } catch (error) {
    const trackingId =
      error?.response?.data?.errorList?.error?.[0]?.trackingId ||
      error?.response?.data?.trackingId ||
      null;
    console.error('Library search proxy error:', {
      message: error.message,
      status: error?.response?.status,
      trackingId
    });
    res.status(500).json({
      error: 'Search service temporarily unavailable',
      docs: [],
      info: { total: 0 }
    });
  }
};

/**
 * GET /api/library/details/:bibId
 * Proxies document details from external API (no Primo key required).
 */
const getDocumentDetailsProxy = async (req, res) => {
  const { bibId } = req.params;
  if (!bibId) {
    return res.status(400).json({ error: 'bibId is required' });
  }

  try {
    const url = `${EXTERNAL_API_BASE}/${encodeURIComponent(bibId)}`;
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { Accept: 'application/json' }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Library details proxy error:', { bibId, message: error.message });
    res.status(error?.response?.status || 500).json({
      error: 'Document details temporarily unavailable'
    });
  }
};

module.exports = {
  searchLibraryCatalogProxy,
  getDocumentDetailsProxy
};