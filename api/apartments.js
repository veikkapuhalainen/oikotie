import { fetchFromOikotie } from './utils.js';
import { getHeaders } from './utils.js';

const API_URL = 'https://asunnot.oikotie.fi/api/search';


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
    sort = 'published_sort',
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

  // Actual page fetch
    const pageParams = buildParams({
      ...baseParams,
      limit: size,
      offset,
      sortBy: apiSortStr
    }, roomList);

    const pageRes = await fetch(`${API_URL}?${pageParams}`, { headers });
    const pageJson = await pageRes.json();

    let apartments = (pageJson.cards || []).map(normalizeApartment);

    // Local filtering (for pricePerSqm) — not supported directly by Oikotie
    if (minPricePerSqm) {
      apartments = apartments.filter(a => a.pricePerSqm >= Number(minPricePerSqm));
    }
    if (maxPricePerSqm) {
      apartments = apartments.filter(a => a.pricePerSqm <= Number(maxPricePerSqm));
    }

    res.json({
      apartments,
      total,
      page: pageNum,
      pageSize: size,
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