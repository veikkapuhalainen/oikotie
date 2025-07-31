// server.js
import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());

app.post('/api/load-apartments', (req, res) => {
  exec('node listings.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    console.log('✅ Listings updated');
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
