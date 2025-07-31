// server.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fetch from 'node-fetch';


const app = express();
const PORT = 3001;

app.use(cors());

let apartments = [];

const LOCATIONS_HELSINKI = JSON.stringify([
  [64, 6, "Helsinki"]
])

const API_URL = 'https://asunnot.oikotie.fi/api/cards';
const HTML_URL = 'https://asunnot.oikotie.fi/myytavat-asunnot';

const PARAMS = {
  cardType: 100,
  limit: 3000,
  offset: 0,
  locations: LOCATIONS_HELSINKI,
  'constructionYear[max]': 2025,
  'roomCount[]': [1, 2, 3, 4, 5, 6],
  'price[min]': 0,
  'price[max]': 1000000,
  'size[min]': 0,
  'size[max]': 1000,
  sortBy: 'published_sort_desc'
};

async function getHeaders() {
  const response = await fetch(HTML_URL);
  const text = await response.text();

  const token = text.match(/<meta name="api-token" content="(.*?)"/)[1];
  const loaded = text.match(/<meta name="loaded" content="(.*?)"/)[1];
  const cuid = text.match(/<meta name="cuid" content="(.*?)"/)[1];

  return {
    'OTA-cuid': cuid,
    'OTA-loaded': loaded,
    'OTA-token': token
  };
}

async function fetchApartmentsFromOikotie() {
  try {
    const headers = await getHeaders();
    const url = new URL(API_URL);

    for (const key in PARAMS) {
      if (Array.isArray(PARAMS[key])) {
        PARAMS[key].forEach(val => url.searchParams.append(key, val));
      } else {
        url.searchParams.append(key, PARAMS[key]);
      }
    }

    const res = await fetch(url.href, { headers });
    const json = await res.json();

    apartments = json.cards.map(card => {
      const rawPrice = card.price;
      const size = card.size;

      // Clean price string: "287 000 €" → 287000
      const numericPrice = parseFloat(
        (rawPrice || '').replace(/[^\d,.]/g, '').replace(',', '.')
      );

      // Calculate pricePerSqm, avoid division by 0
      const pricePerSqm =
        numericPrice && size ? Math.round(numericPrice / size) : null;

      return {
        id: card.id,
        url: card.url,
        description: card.description,
        roomConfiguration: card.roomConfiguration,
        rooms: card.rooms,
        published: card.published,
        size: card.size,
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
    }
  });

    //console.log(`✅ Found ${apartments.length} apartments.`);
    //fs.writeFileSync('apartments.json', JSON.stringify(apartments, null, 2));
    //console.log('📄 Saved to apartments.json');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}


async function refreshApartments() {
  console.log('🔄 Fetching apartments...');
  const headers = await getHeaders();
  const url = new URL(API_URL);

  for (const key in PARAMS) {
    if (Array.isArray(PARAMS[key])) {
      PARAMS[key].forEach(val => url.searchParams.append(key, val));
    } else {
      url.searchParams.append(key, PARAMS[key]);
    }
  }

  const res = await fetch(url.href, { headers });
  const json = await res.json();

  apartments = json.cards.map(card => {
    const rawPrice = card.price;
    const size = card.size;
    const numericPrice = parseFloat((rawPrice || '').replace(/[^\d,.]/g, '').replace(',', '.'));
    const pricePerSqm = numericPrice && size ? Math.round(numericPrice / size) : null;

    return {
      id: card.id,
      url: card.url,
      description: card.description,
      roomConfiguration: card.roomConfiguration,
      rooms: card.rooms,
      published: card.published,
      size: card.size,
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
  });

  console.log(`✅ Fetched ${apartments.length} apartments.`);
}



// API endpoint with filtering, sorting, and pagination
app.get('/api/apartments', async (req, res) => {
  try {
    const {
      minPrice,
      maxPrice,
      rooms,
      sort = 'price',
      order = 'asc',
      page = 1,
      pageSize = 50
    } = req.query;

    if (apartments.length === 0) {
      await fetchApartmentsFromOikotie();
    }

    let filtered = apartments;

    if (minPrice) {
      filtered = filtered.filter(a => parseFloat((a.price || '').toString().replace(/[^\d.]/g, '')) >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(a => parseFloat((a.price || '').toString().replace(/[^\d.]/g, '')) <= Number(maxPrice));
    }
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
});

await refreshApartments();


app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
