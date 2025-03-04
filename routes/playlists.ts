import { Router } from 'express';
import { db } from '@db';
import { songs } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get featured or user-specific playlist
router.get("/current", async (req, res) => {
  try {
    // Get featured playlist for landing page
    const playlistItems = await db.query.songs.findMany({
      orderBy: (songs, { desc }) => [desc(songs.createdAt)],
      limit: 10,
    });

    // Transform to playlist format, handling optional fields
    const playlist = {
      id: 'featured',
      items: playlistItems.map((song, index) => ({
        id: song.id,
        title: song.title || 'Untitled',
        artist: song.artist || 'Unknown Artist',
        ipfsHash: song.ipfsHash,
        order: index,
      })),
      timestamp: Date.now(),
      signature: '' // Will be used for proof verification
    };

    // Log the response for debugging
    console.log('Sending playlist response:', { 
      itemCount: playlist.items.length,
      firstItem: playlist.items[0]
    });

    res.json(playlist);
  } catch (error) {
    console.error('Error getting playlist:', error);
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

// Submit playback proof
router.post("/proofs", async (req, res) => {
  const { proof } = req.body;
  try {
    // Store proof for future AI analysis
    // This will be expanded with actual proof verification
    console.log('Received playback proof:', proof);
    res.json({ success: true });
  } catch (error) {
    console.error('Error storing proof:', error);
    res.status(500).json({ error: 'Failed to store proof' });
  }
});

export default router;