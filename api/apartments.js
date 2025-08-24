import { getHeaders } from './utils.js';

const API_URL = 'https://asunnot.oikotie.fi/api/search';

// Batch size for manual mode
const BATCH_SIZE = 250;


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
  function buildParams(obj, roomList, conditionList) {
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


  /*
async function fetchFilteredAll({
  baseParams,
  roomList,
  conditionList,
  sort,
  headers,
  offset,
  size,
  minPricePerSqm,
  maxPricePerSqm,
  totalUnfiltered,   // 👈 iterate all results
}) {
  const acc = [];
  let fetched = 0;

  while (fetched < totalUnfiltered) {
    const limit = Math.min(BATCH_SIZE, totalUnfiltered - fetched);
    const params = buildParams(
      { ...baseParams, limit, offset: fetched, sortBy: sort },
      roomList,
      conditionList
    );

    const resp = await fetch(`${API_URL}?${params}`, { headers });
    const json = await resp.json();
    const cards = Array.isArray(json.cards) ? json.cards : [];
    if (!cards.length) break; // API ended early

    const batch = cards.map(normalizeApartment);

    // €/m² local filter (keep only valid values)
    let filtered = batch;
    if (minPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm != null && a.pricePerSqm >= Number(minPricePerSqm));
    if (maxPricePerSqm) filtered = filtered.filter(a => a.pricePerSqm != null && a.pricePerSqm <= Number(maxPricePerSqm));

    acc.push(...filtered);

    fetched += cards.length;
    if (cards.length < limit) break; // safety: API returned fewer than requested
  }

  const total = acc.length; // exact filtered total
  const apartments = acc.slice(offset, offset + size);
  return { apartments, total };
}
  */


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

    /*
    if (needsManual) {
      // ---- Manual €/m² mode: scan ALL results for exact total ----
      const { apartments, total } = await fetchFilteredAll({
        baseParams,
        roomList,
        conditionList,
        sort,
        headers,
        offset,
        size,
        minPricePerSqm,
        maxPricePerSqm,
        totalUnfiltered,
      });

      return res.json({
        apartments,
        total,                 // exact total after €/m² filtering
        page: pageNum,
        pageSize: size,
        manualMode: true,
        manualCapped: false    // we scanned everything
      });
    }
      */

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


    // If €/m² filters are set, filter ONLY this page locally
    if (needsManual) {
      if (minPricePerSqm) {
        const minPPS = Number(minPricePerSqm);
        apartments = apartments.filter(a => a.pricePerSqm != null && a.pricePerSqm >= minPPS);
      }
      if (maxPricePerSqm) {
        const maxPPS = Number(maxPricePerSqm);
        apartments = apartments.filter(a => a.pricePerSqm != null && a.pricePerSqm <= maxPPS);
      }
    }

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
