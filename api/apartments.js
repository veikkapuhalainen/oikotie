import { getHeaders } from './utils.js';

const API_URL = 'https://asunnot.oikotie.fi/api/search';

// caps & batch size for manual mode
const MAX_MANUAL_FETCH = 2000;
const BATCH_SIZE = 1500;


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

  // Helper to build URLSearchParams with array support
  function buildParams(obj, roomList) {
    const p = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach(val => p.append(k, String(val)));
    else p.append(k, String(v));
  });
    if (roomList && roomList.length) {
      roomList.forEach(r => p.append('roomCount[]', String(r)));
    }
    if (conditionList && conditionList.length) {
      conditionList.forEach(c => p.append('conditionType[]', String(c)));
  }
    return p;
  };


export default async function handler(req, res) {
  const { method } = req;
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
    conditions,
    sort = 'published_sort_desc',
  } = req.query;

  const pageNum = Number(page);
  const size = Number(pageSize);
  const offset = (pageNum - 1) * size;

  try {
    const headers = await getHeaders();

    const baseParams = {
      cardType: 100,
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

    let conditionList = null;
    if (conditions) {
      conditionList = conditions.split(',').map(s => s.trim()).filter(Boolean);
    }

    const totalParams = buildParams({...baseParams, limit: 0, offset: 0, }, roomList, conditionList);
    const totalRes = await fetch(`${API_URL}?${totalParams}`, { headers });
    const totalJson = await totalRes.json();
    const totalUnfiltered = totalJson.found || 0;

    
    const needsManual = Boolean(minPricePerSqm || maxPricePerSqm);

    if (needsManual) {
      // ---- Manual mode: fetch many, filter locally, then paginate ----
      const toFetch = Math.min(totalUnfiltered, MAX_MANUAL_FETCH);
      let fetched = 0;
      const allFiltered = [];

      while (fetched < toFetch) {
        const limit = Math.min(BATCH_SIZE, toFetch - fetched);
        const params = buildParams(
          { ...baseParams, limit, offset: fetched, sortBy: sort },
          roomList,
          conditionList
        );

        const resp = await fetch(`${API_URL}?${params}`, { headers });
        const json = await resp.json();
        const cards = Array.isArray(json.cards) ? json.cards : [];
        if (cards.length === 0) break;

        const batch = cards.map(normalizeApartment);

        // local €/m² filters
        let filtered = batch;
        if (minPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm >= Number(minPricePerSqm));
        if (maxPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm <= Number(maxPricePerSqm));

        // Keep order as provided by Oikotie across batches
        allFiltered.push(...filtered);

        fetched += cards.length;
        if (!json.cards || cards.length < limit) break;
      }

      const total = allFiltered.length;
      const apartments = allFiltered.slice(offset, offset + size);

      return res.json({
        apartments,
        total, // correct total after €/m²
        page: pageNum,
        pageSize: size,
      });
    }

  // Normal mode
    const pageParams = buildParams({
      ...baseParams,
      limit: size,
      offset,
      sortBy: sort
    }, roomList, conditionList);

    const pageRes = await fetch(`${API_URL}?${pageParams}`, { headers });
    const pageJson = await pageRes.json();
    const cards = Array.isArray(pageJson.cards) ? pageJson.cards : [];
    const apartments = cards.map(normalizeApartment);


    /* ---Old manual style---

    // Local filtering (for pricePerSqm) — not supported directly by Oikotie
    if (minPricePerSqm) {
      apartments = apartments.filter(a => a.pricePerSqm >= Number(minPricePerSqm));
    }
    if (maxPricePerSqm) {
      apartments = apartments.filter(a => a.pricePerSqm <= Number(maxPricePerSqm));
    }
      */

    res.json({
      apartments,
      total: totalUnfiltered,
      page: pageNum,
      pageSize: size,
    });

  } catch (err) {
    console.error('❌ Error in /api/apartments:', err);
    res.status(500).json({ error: 'Failed to fetch apartments' });
  }
}
