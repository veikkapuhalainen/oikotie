import { fetchFromOikotie } from './utils.js';
import { getHeaders } from './utils.js';

const API_URL = 'https://asunnot.oikotie.fi/api/search';

const MANUAL_SORT_KEYS = new Set(['pricePerSqm', 'rooms', 'year', 'visits']);
const API_SORT_KEYS = new Set(['price', 'size', 'published']); // what Oikotie supports in your map
const MAX_MANUAL_FETCH = 500; // safety cap; tune as you like
const BATCH_SIZE = 200;

// Helper function to create right params for sorting
function getOikotieSortBy(sortKey, sortOrder) {
  const sortMap = {
    price: 'price',
    size: 'size',
    published: 'published_sort',
  };
  if (!API_SORT_KEYS.has(sortKey)) return null;
  const key = sortMap[sortKey] || 'published_sort';
  const orderSuffix = sortOrder === 'asc' ? 'asc' : 'desc';
  return `${key}_${orderSuffix}`;
}

// generic comparator with nulls pushed to the end
function compareValues(a, b, order = 'asc') {
  const dir = order === 'asc' ? 1 : -1;
  const an = (a === null || a === undefined || Number.isNaN(a));
  const bn = (b === null || b === undefined || Number.isNaN(b));
  if (an && bn) return 0;
  if (an) return 1;      // nulls last
  if (bn) return -1;
  if (a < b) return -1 * dir;
  if (a > b) return 1 * dir;
  return 0;
}

// derive the field we sort by from normalized apartment
function getSortField(ap, key) {
  switch (key) {
    case 'pricePerSqm': return ap.pricePerSqm ?? null;
    case 'rooms':       return ap.rooms != null ? Number(ap.rooms) : null;
    case 'year':        return ap.year != null && ap.year !== '' ? Number(ap.year) : null;
    case 'visits':      return ap.visits != null ? Number(ap.visits) : null;
    case 'visitsWeekly':return ap.visitsWeekly != null ? Number(ap.visitsWeekly) : null;
    case 'price': {
      const n = parseFloat((ap.price || '').toString().replace(/[^\d,.]/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    case 'size': {
      const s = parseFloat((ap.size || '').toString().split('/')[0].trim().replace(/[^\d,.]/g, '').replace(',', '.'));
      return Number.isFinite(s) ? s : null;
    }
    default: return null;
  }
}

function normalizeApartment(card) {
  const price = parseFloat((card.data.price || '').replace(/[^\d,.]/g, '').replace(',', '.'));

  let size = card.data.size.split('/')[0].trim();
  size = parseFloat(size.replace(/[^\d,.]/g, '').replace(',', '.'));
  const pricePerSqm = price && size ? Math.round(price / size) : null;

  return {
    id: card.cardId,
    url: card.url,
    description: card.data.description || '',
    roomConfiguration: card.data.roomConfiguration || '',
    rooms: card.data.rooms || null,
    size: card.data.size || '',
    price: card.data.price || '',
    pricePerSqm,
    address: card.location?.address || '',
    district: card.location?.district || '',
    city: card.location?.city || '',
    year: card.data.buildYear || '',
    buildingType: card.cardSubType || '',
    brand: card.company?.companyName || '',
    visits: card.data.visits || 0,
    visitsWeekly: card.data.visitsWeekly || 0,
    location: card.location || null,
    image: card.medias?.[0]?.imageDesktopWebP || card.medias?.[0]?.imageUrl || ''
  };
}


export default async function handler(req, res) {
  const { method, query } = req;
  if (method !== 'GET') return res.status(405).end('Method Not Allowed');

  const {
    page = 1,
    pageSize = 50,
    minPrice,
    maxPrice,
    minSize,
    maxSize,
    minPricePerSqm,
    maxPricePerSqm,
    rooms,
    sort = 'published',
    order = 'desc',
  } = req.query;

  const pageNum = Number(page);
  const size = Number(pageSize);
  const offset = (pageNum - 1) * size;

  try {
    const headers = await getHeaders();

    const baseParams = {
      cardType: 100,
      limit: 0,
      offset: 0,
      locations: JSON.stringify([[64, 6, 'Helsinki']])
    };

    if (minPrice) baseParams['price[min]'] = minPrice;
    if (maxPrice) baseParams['price[max]'] = maxPrice;
    if (minSize) baseParams['size[min]'] = minSize;
    if (maxSize) baseParams['size[max]'] = maxSize;

    let roomList = null;
    if (rooms) {
      roomList = rooms.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Helper to build URLSearchParams with array support
  const buildParams = (obj, extras = {}) => {
    const p = new URLSearchParams();
    Object.entries({ ...obj, ...extras }).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) v.forEach(val => p.append(k, String(val)));
      else p.append(k, String(v));
    });
    // Add roomCount[] correctly
    if (roomList && roomList.length) {
      roomList.forEach(r => p.append('roomCount[]', String(r)));
    }
    return p;
  };


    const totalParams = buildParams(baseParams);
    const totalRes = await fetch(`${API_URL}?${totalParams}`, { headers });
    const totalJson = await totalRes.json();
    const total = totalJson.found || 0;
    const totalUnfiltered = totalJson.found || 0;

    const apiSortStr = getOikotieSortBy(sort, order);
    const manualSort = MANUAL_SORT_KEYS.has(sort) || !apiSortStr || minPricePerSqm || maxPricePerSqm;

    let apartments = [];
    let totalFiltered = totalUnfiltered;
    if (manualSort) {
      // 2a) MANUAL: fetch all (up to cap), then sort & paginate
      const toFetch = Math.min(totalUnfiltered, MAX_MANUAL_FETCH);
      let fetched = 0;

      while (fetched < toFetch) {
        const limit = Math.min(BATCH_SIZE, toFetch - fetched);
        const p = buildParams({
          ...baseParams,
          limit,
          offset: fetched,
        });
        const resp = await fetch(`${API_URL}?${p}`, { headers });
        const json = await resp.json();
        const batch = (json.cards || []).map(normalizeApartment);

        // local per-sqm filters applied as we go
        let filtered = batch;
        if (minPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm >= Number(minPricePerSqm));
        if (maxPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm <= Number(maxPricePerSqm));

        apartments.push(...filtered);
        fetched += limit;

        if (!json.cards || json.cards.length < limit) break; // no more
      }

      totalFiltered = apartments.length;

      // sort locally
      apartments.sort((a, b) => {
        const av = getSortField(a, sort);
        const bv = getSortField(b, sort);
        return compareValues(av, bv, order);
      });

      // paginate locally
      const start = offset;
      const end = offset + size;
      apartments = apartments.slice(start, end);

    } else {

    // Actual page fetch
      const pageParams = buildParams({
        ...baseParams,
        limit: size,
        offset,
        sortBy: apiSortStr
      }, roomList);

    const pageRes = await fetch(`${API_URL}?${pageParams}`, { headers });
    const pageJson = await pageRes.json();

    apartments = (pageJson.cards || []).map(normalizeApartment);

    // Optional fallback filtering (e.g., pricePerSqm) — not supported directly by Oikotie
    if (minPricePerSqm) {
      apartments = apartments.filter(a => a.pricePerSqm >= Number(minPricePerSqm));
    }
    if (maxPricePerSqm) {
      apartments = apartments.filter(a => a.pricePerSqm <= Number(maxPricePerSqm));
    }

    totalFiltered = totalUnfiltered;
  }

    res.json({
      apartments,
      total: manualSort ? totalFiltered : totalUnfiltered,
      totalUnfiltered,
      page: pageNum,
      pageSize: size,
      manualSortApplied: manualSort,
      manualSortCap: manualSort ? MAX_MANUAL_FETCH : undefined
    });

  } catch (err) {
    console.error('❌ Error in /api/apartments:', err);
    res.status(500).json({ error: 'Failed to fetch apartments' });
  }
}



/*
Old logic:
    let filtered = [...all];

    // Apply filters like before
    if (minPrice) filtered = filtered.filter(a => parseFloat((a.price || '').toString().replace(/[^\d.]/g, '')) >= Number(minPrice));
    if (maxPrice) filtered = filtered.filter(a => parseFloat((a.price || '').toString().replace(/[^\d.]/g, '')) <= Number(maxPrice));
    if (minSize) filtered = filtered.filter(a => a.size >= Number(minSize));
    if (maxSize) filtered = filtered.filter(a => a.size <= Number(maxSize));
    if (minPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm >= Number(minPricePerSqm));
    if (maxPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm <= Number(maxPricePerSqm));
    if (rooms) {
      const selected = rooms.split(',').map(Number);
      filtered = filtered.filter(a => selected.includes(Number(a.rooms)));
    }

    filtered.sort((a, b) => {
      const aVal = parseFloat((a[sort] || '').toString().replace(/[^\d.]/g, '')) || 0;
      const bVal = parseFloat((b[sort] || '').toString().replace(/[^\d.]/g, '')) || 0;
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    const total = filtered.length;
    const pageNum = Number(page);
    const size = Number(pageSize);
    const paged = filtered.slice((pageNum - 1) * size, pageNum * size);

    res.json({
      apartments: paged,
      total,
      page: pageNum,
      pageSize: size,
    });

  } catch (err) {
    console.error('❌ Error fetching apartments:', err);
    res.status(500).json({ error: 'Failed to fetch apartments' });
  }
}

*/