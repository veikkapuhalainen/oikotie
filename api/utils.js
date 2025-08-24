const LOCATIONS_HELSINKI = JSON.stringify([[64, 6, 'Helsinki']]);

const HTML_URL = 'https://asunnot.oikotie.fi/myytavat-asunnot';

/*
const PARAMS = {
  cardType: 100,
  limit: 1000,
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
*/

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
