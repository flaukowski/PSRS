import { db } from '@db';
import { listeners, songs } from '@db/schema';
import { sql, eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm/expressions';
import { lumiraService } from '../routes/lumira';

export interface MapDataResponse {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;  // [latitude, longitude] pairs
      listenerCount: number;
      anonCount: number;    // Count of non-geotagged plays
    };
  };
  totalListeners: number;
}

export async function getMapData(): Promise<MapDataResponse> {
  try {
    // Get all listener data including those without coordinates
    const listenerData = await db.select({
      countryCode: listeners.countryCode,
      latitude: listeners.latitude,
      longitude: listeners.longitude,
    })
    .from(listeners)
    .where(sql`${listeners.countryCode} is not null`);

    // Process listener data by country
    const countries: { 
      [key: string]: { 
        locations: Array<[number, number]>; 
        listenerCount: number;
        anonCount: number;
      } 
    } = {};
    let totalListeners = 0;

    // Valid country code pattern (ISO 3166-1 alpha-3)
    const validCountryPattern = /^[A-Z]{3}$/;

    listenerData.forEach(({ countryCode, latitude, longitude }) => {
      // Skip invalid entries
      if (!countryCode || !validCountryPattern.test(countryCode)) {
        return;
      }

      // Skip Antarctica and invalid regions
      if (countryCode === 'ATA' || countryCode === 'ANT') {
        return;
      }

      if (!countries[countryCode]) {
        countries[countryCode] = { 
          locations: [], 
          listenerCount: 0,
          anonCount: 0 
        };
      }

      countries[countryCode].listenerCount++;
      totalListeners++;

      // Add coordinates if available and valid
      if (latitude && longitude) {
        const lat = Number(latitude);
        const lng = Number(longitude);

        // Validate coordinates are within reasonable bounds
        if (!isNaN(lat) && !isNaN(lng) && 
            Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          countries[countryCode].locations.push([lat, lng]);
        } else {
          // If coordinates are invalid, count as anonymous
          countries[countryCode].anonCount++;
        }
      } else {
        // No coordinates provided, count as anonymous
        countries[countryCode].anonCount++;
      }
    });

    // Process through Lumira for data enrichment
    try {
      const enrichedData = await lumiraService.processMetricsPrivately({
        type: 'gps',
        timestamp: new Date().toISOString(),
        data: {
          countries,
          totalListeners,
          success: true
        },
        metadata: {
          source: 'map-data-service',
          processed: true
        }
      });

      return enrichedData.data || {
        countries,
        totalListeners
      };
    } catch (lumiraError) {
      console.warn('Non-critical Lumira enrichment error:', lumiraError);
      // Return original data if Lumira processing fails
      return {
        countries,
        totalListeners
      };
    }
  } catch (error) {
    console.error('Error in getMapData:', error);
    throw error;
  }
}

export interface MusicStats {
  totalSongs: number;
  totalArtists: number;
  totalListens: number;
  topArtists: Array<{ artist: string; songCount: number }>;
  recentUploads: Array<typeof songs.$inferSelect>;
  countries: {
    [key: string]: {
      locations: Array<[number, number]>; // [latitude, longitude] pairs
    };
  };
}

export async function getMusicStats(): Promise<MusicStats> {
    // Get basic stats
    const [{ count: totalSongs }] = await db.select({
      count: sql<number>`count(*)`
    }).from(songs);

    const [{ count: totalArtists }] = await db.select({
      count: sql<number>`count(distinct ${songs.artist})`
    }).from(songs);

    const [{ sum: totalListens }] = await db.select({
      sum: sql<number>`coalesce(sum(${songs.votes}), 0)`
    }).from(songs);

    // Get top artists
    const topArtists = await db.select({
      artist: songs.artist,
      songCount: sql<number>`count(*)`
    })
    .from(songs)
    .where(sql`${songs.artist} is not null`)
    .groupBy(songs.artist)
    .orderBy(sql`count(*) desc`)
    .limit(10);

    // Get recent uploads
    const recentUploads = await db.select()
      .from(songs)
      .orderBy(desc(songs.createdAt))
      .limit(5);

    // Get all listener data with coordinates, aggregated by region
    const listenerData = await db.select({
      countryCode: listeners.countryCode,
      latitude: listeners.latitude,
      longitude: listeners.longitude,
    })
    .from(listeners)
    .where(sql`${listeners.latitude} is not null and ${listeners.longitude} is not null`);

    // Process listener data by country and aggregate locations into regions
    const countries: { [key: string]: { locations: Array<[number, number]> } } = {};
    const processedLocations = new Set<string>(); // Track processed locations to avoid duplicates

    listenerData.forEach(({ countryCode, latitude, longitude }) => {
      if (!countryCode || !latitude || !longitude) return;

      if (!countries[countryCode]) {
        countries[countryCode] = { locations: [] };
      }

      // Create a location key using rounded coordinates for aggregation
      const roundedLat = Math.round(parseFloat(latitude) * 10) / 10;
      const roundedLng = Math.round(parseFloat(longitude) * 10) / 10;
      const locationKey = `${roundedLat},${roundedLng}`;

      // Only add location if we haven't seen this rounded coordinate pair before
      if (!processedLocations.has(locationKey)) {
        processedLocations.add(locationKey);
        countries[countryCode].locations.push([roundedLat, roundedLng]);
      }
    });

    return {
      totalSongs,
      totalArtists,
      totalListens,
      topArtists: topArtists.map(({ artist, songCount }) => ({
        artist: artist || 'Unknown',
        songCount: Number(songCount)
      })),
      recentUploads,
      countries
    };
}

export async function getSongMetadata(id: number) {
  const [song] = await db.select()
    .from(songs)
    .where(eq(songs.id, id));
  return song;
}

export async function incrementListenCount(id: number, countryCode: string, coords?: { lat: number; lng: number }) {
  console.log('Received play request:', {
    songId: id,
    countryCode,
    hasLocation: coords ? true : false,
    coordinates: coords ? `${coords.lat},${coords.lng}` : 'Country-level only'
  });

  await db.transaction(async (tx) => {
    // Increment song votes
    await tx.update(songs)
      .set({ votes: sql`coalesce(${songs.votes}, 0) + 1` })
      .where(eq(songs.id, id));

    // Record listener with coordinates if provided and valid
    if (coords?.lat && coords?.lng) {
      // Validate coordinates
      if (Math.abs(coords.lat) > 90 || Math.abs(coords.lng) > 180) {
        console.warn('Invalid coordinates received:', coords);
        // Fall back to country-level recording
        await tx.insert(listeners)
          .values({
            songId: id,
            countryCode,
            latitude: null,
            longitude: null,
            timestamp: new Date()
          });
        return;
      }

      // Round coordinates to 1 decimal place for privacy
      const latitude = Math.round(coords.lat * 10) / 10;
      const longitude = Math.round(coords.lng * 10) / 10;

      console.log('Recording precise location:', {
        songId: id,
        countryCode,
        latitude,
        longitude
      });

      // Record listener location with reduced precision
      const locationData = {
        songId: id,
        countryCode,
        latitude: coords ? coords.lat.toString() : null,
        longitude: coords ? coords.lng.toString() : null,
        timestamp: new Date()
      };
      
      console.log('Recording location data:', locationData);
      
      await tx.insert(listeners).values(locationData);
      
      // Log success
      console.log(`Location data recorded for song ${id} in ${countryCode}`);
    }
  });
}