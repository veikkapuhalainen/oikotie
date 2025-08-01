import fetch from 'node-fetch';

const LOCATIONS_HELSINKI = JSON.stringify([[64, 6, 'Helsinki']]);

const API_URL = 'https://asunnot.oikotie.fi/api/cards';
const HTML_URL = 'https://asunnot.oikotie.fi/myytavat-asunnot';

const PARAMS = {
  cardType: 100,
  limit: 5000,
  offset: 0,
  locations: LOCATIONS_HELSINKI,
  'constructionYear[max]': 2025,
  'roomCount[]': [1, 2, 3, 4, 5, 6],
  'price[min]': 0,
  'price[max]': 100000000,
  'size[min]': 0,
  'size[max]': 10000,
  sortBy: 'published_sort_desc'
};

export async function getHeaders() {
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

export async function fetchFromOikotie() {
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

  if (!json.cards) {
    console.log(`❌ Fetching apartments failed from Oikotie.`);
    return [];
  } else {
    return json.cards.map(card => {
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
  }
}
