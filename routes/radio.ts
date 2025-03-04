import { Router } from 'express';
import { searchStations, getTopStations, getStationsByGenre } from '../services/radio-stream';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const stations = await searchStations(query);
    res.json(stations);
  } catch (error) {
    console.error('Radio search error:', error);
    res.status(500).json({ error: 'Failed to search radio stations' });
  }
});

router.get('/top', async (req, res) => {
  try {
    const { limit } = req.query;
    const stations = await getTopStations(Number(limit) || 10);
    res.json(stations);
  } catch (error) {
    console.error('Radio top stations error:', error);
    res.status(500).json({ error: 'Failed to fetch top radio stations' });
  }
});

router.get('/genre/:genre', async (req, res) => {
  try {
    const { genre } = req.params;
    const stations = await getStationsByGenre(genre);
    res.json(stations);
  } catch (error) {
    console.error('Radio genre search error:', error);
    res.status(500).json({ error: 'Failed to fetch radio stations by genre' });
  }
});

export default router;
