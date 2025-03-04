import { Router } from 'express';
import { v2 } from '@google-cloud/translate';
import { lumiraService } from './lumira';

const router = Router();

if (!process.env.TRANSLATION_API_KEY) {
  throw new Error('TRANSLATION_API_KEY environment variable is required');
}

// Initialize Google Translate with API key from environment variable
const translate = new v2.Translate({
  key: process.env.TRANSLATION_API_KEY
});

// Helper function to translate map-specific strings
async function translateMapData(data: any, targetLanguage: string) {
  // Translate map-specific messages
  const keysToTranslate = [
    'map.title',
    'map.noActivity',
    'map.noData',
    'map.error',
    'map.totalListeners'
  ];

  const translations = await Promise.all(
    keysToTranslate.map(async (key) => {
      const [translation] = await translate.translate(data[key] || '', targetLanguage);
      return [key, translation];
    })
  );

  return Object.fromEntries(translations);
}

router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const [translation] = await translate.translate(text, targetLanguage);

    // Send anonymized translation data to Lumira for analysis
    try {
      await lumiraService.processMetricsPrivately({
        type: 'gps',
        timestamp: new Date().toISOString(),
        data: {
          sourceLanguage: 'en',
          targetLanguage,
          success: true,
          textLength: text.length
        },
        metadata: {
          source: 'translation-api',
          processed: true
        }
      });
    } catch (lumiraError) {
      console.warn('Non-critical Lumira metrics error:', lumiraError);
    }

    res.json({
      translatedText: translation,
      sourceLanguage: 'en',
      targetLanguage
    });
  } catch (error) {
    console.error('Translation error:', error);

    // Log failed translation attempt for analysis
    try {
      await lumiraService.processMetricsPrivately({
        type: 'gps',
        timestamp: new Date().toISOString(),
        data: {
          sourceLanguage: 'en',
          targetLanguage: req.body.targetLanguage,
          success: false,
          textLength: (req.body.text || '').length
        },
        metadata: {
          source: 'translation-api',
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    } catch (lumiraError) {
      console.warn('Non-critical Lumira metrics error:', lumiraError);
    }

    res.status(500).json({ 
      error: 'Translation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add map data translation endpoint
router.post('/translate/map-data', async (req, res) => {
  try {
    const { mapData, targetLanguage } = req.body;

    if (!mapData || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Translate map-specific strings
    const translatedStrings = await translateMapData(mapData, targetLanguage);

    // Process through Lumira for enhanced translation and data enrichment
    const enrichedData = await lumiraService.processMetricsPrivately({
      type: 'gps',
      timestamp: new Date().toISOString(),
      data: {
        sourceLanguage: 'en',
        targetLanguage,
        mapData: {
          ...mapData,
          translations: translatedStrings
        },
        success: true
      },
      metadata: {
        source: 'map-translation-api',
        processed: true
      }
    });

    res.json({
      translatedData: {
        ...mapData,
        translations: translatedStrings,
        ...enrichedData.data
      },
      sourceLanguage: 'en',
      targetLanguage
    });
  } catch (error) {
    console.error('Map data translation error:', error);
    res.status(500).json({
      error: 'Map data translation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;