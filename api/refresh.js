import { fetchFromOikotie } from './utils.js';
import { setApartments } from './data.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apartments = await fetchFromOikotie();
    setApartments(apartments);
    res.status(200).json({ success: true, count: apartments.length });
  } catch (err) {
    console.error('❌ Refresh failed:', err);
    res.status(500).json({ error: 'Failed to refresh apartments' });
  }
}