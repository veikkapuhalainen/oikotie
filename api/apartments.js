import { getHeaders } from './utils.js';

// Oikotie api's url
const API_URL = 'https://asunnot.oikotie.fi/api/search';

// Searching apartments only from Helsinki area
const LOCATIONS_HELSINKI = JSON.stringify([[64, 6, 'Helsinki']]);


// Helper function for parsing the desired data from an apartment card
function normalizeApartment(card) {
  const price = parseFloat((card.data.price || '').replace(/[^\d,.]/g, '').replace(',', '.'));

  let size = card.data.size.split('/')[0].trim();
  size = parseFloat(size.replace(/[^\d,.]/g, '').replace(',', '.'));

  // Count the price per square meter manually
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

  // Helper function to build URLSearchParams with array support
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



// Main function that makes the request to oikotie's api and gathers the headers and params, returns the apartments for current page, the amount of
// total apartments found, page number and size
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
      locations: LOCATIONS_HELSINKI
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

    // Make a request to api with limit and offset set to 0 to get the total amount of apartments found
    // Necessary information for pagination
    const totalParams = buildParams({...baseParams, limit: 0, offset: 0, }, roomList, conditionList);
    const totalRes = await fetch(`${API_URL}?${totalParams}`, { headers });
    const totalJson = await totalRes.json();
    const totalUnfiltered = totalJson.found || 0;


  // Create the params to request [pageSize = 50] apartments for current page
    const pageParams = buildParams({
      ...baseParams,
      limit: size,
      offset,
      sortBy: sort
    }, roomList, conditionList);

    const pageRes = await fetch(`${API_URL}?${pageParams}`, { headers });
    const pageJson = await pageRes.json();
    const cards = Array.isArray(pageJson.cards) ? pageJson.cards : [];
    let apartments = cards.map(normalizeApartment);


    // If pricePerSqm filters are set, filter ONLY this page locally
    const needsManual = Boolean(minPricePerSqm || maxPricePerSqm);

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
