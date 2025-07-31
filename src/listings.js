// simplified-apartment-listing.js
import fetch from 'node-fetch';
import fs from 'fs';

const LOCATIONS = JSON.stringify([
  [14694, 5, "00100, Helsinki"],
  [14695, 5, "00120, Helsinki"],
  [14696, 5, "00130, Helsinki"],
  [14697, 5, "00140, Helsinki"],
  [14698, 5, "00150, Helsinki"],
  [14699, 5, "00160, Helsinki"],
  [14700, 5, "00170, Helsinki"],
  [14701, 5, "00180, Helsinki"],
  [5079889, 5, "00220, Helsinki"],
  [14705, 5, "00250, Helsinki"],
  [14706, 5, "00260, Helsinki"],
  [14709, 5, "00290, Helsinki"],
  [14725, 5, "00500, Helsinki"],
  [14726, 5, "00510, Helsinki"],
  [14728, 5, "00530, Helsinki"],
  [5079937, 5, "00540, Helsinki"],
  [14729, 5, "00550, Helsinki"],
  [14732, 5, "00580, Helsinki"]
]);

const LOCATIONS_HELSINKI = JSON.stringify([
  [64, 6, "Helsinki"]
])

const API_URL = 'https://asunnot.oikotie.fi/api/cards';
const HTML_URL = 'https://asunnot.oikotie.fi/myytavat-asunnot';

const PARAMS = {
  cardType: 100,
  limit: 100,
  offset: 0,
  locations: LOCATIONS_HELSINKI,
  'constructionYear[max]': 2025,
  'roomCount[]': [1, 2, 3, 4, 5, 6],
  'price[min]': 0,
  'price[max]': 1000000,
  'size[min]': 0,
  'size[max]': 500,
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

async function fetchApartments() {
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

    const apartments = json.cards.map(card => {
      const rawPrice = card.price;
      const size = card.size;

      // Clean price string: "287 000 €" → 287000
      const numericPrice = parseFloat(
        (rawPrice || '').replace(/[^\d,.]/g, '').replace(',', '.')
      );

      console.log(card);
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

    console.log(`✅ Found ${apartments.length} apartments.`);
    fs.writeFileSync('apartments.json', JSON.stringify(apartments, null, 2));
    console.log('📄 Saved to apartments.json');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

fetchApartments();
