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

  const key = sortMap[sortKey] || 'published_sort';
  const orderSuffix = sortOrder === 'asc' ? 'asc' : 'desc';

  return `${key}_${orderSuffix}`; // e.g., "price_asc", "published_sort_desc"
}

function normalizeApartment(card) {
  const size = card.size;
  const price = parseFloat((card.price || '').replace(/[^\d,.]/g, '').replace(',', '.'));
  const pricePerSqm = price && size ? Math.round(price / size) : null;

  return {
    id: card.id,
    url: card.url,
    description: card.description,
    roomConfiguration: card.roomConfiguration,
    rooms: card.rooms,
    published: card.published,
    size,
    price: card.price,
    pricePerSqm,
    address: card.buildingData?.address,
    district: card.buildingData?.district,
    city: card.buildingData?.city,
    year: card.buildingData?.year,
    buildingType: card.buildingData?.buildingType,
    brand: card.brand?.name,
    visits: card.visits,
    visitsWeekly: card.visits_weekly,
    location: card.location,
    image: card.images?.wide
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
  const offset = (page - 1) * pageSize;

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
    if (rooms) {
      const roomList = rooms.split(',');
      roomList.forEach(r => baseParams['roomCount[]'] = roomList); // send array
    }

    const totalParams = new URLSearchParams(baseParams);
    const totalRes = await fetch(`${API_URL}?${totalParams}`, { headers });
    const totalJson = await totalRes.json();
    const total = totalJson.found || 0;

    // Actual page fetch
    const pageParams = new URLSearchParams({
      ...baseParams,
      limit: size,
      offset,
      sortBy: getOikotieSortBy(sort, order)
    });

    const pageRes = await fetch(`${API_URL}?${pageParams}`, { headers });
    const pageJson = await pageRes.json();

    let apartments = (pageJson.cards || []).map( card => normalizeApartment(card));

    // Optional fallback filtering (e.g., pricePerSqm) — not supported directly by Oikotie
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
      pageSize: size
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