import { fetchFromOikotie } from './utils.js';

export default async function handler(req, res) {
  const { method, query } = req;
  if (method !== 'GET') return res.status(405).end('Method Not Allowed');

  try {
    const {
      minPrice, maxPrice,
      minSize, maxSize,
      minPricePerSqm, maxPricePerSqm,
      rooms, sort = 'price', order = 'asc',
      page = 1, pageSize = 50,
    } = query;

    const all = await fetchFromOikotie(); // fetch live instead of getApartments()

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
