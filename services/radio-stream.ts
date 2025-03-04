import axios from 'axios';

interface RadioStation {
  name: string;
  url: string;
  codec: string;
  bitrate: number;
  tags: string[];
  country: string;
  votes: number;
}

const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json/stations';

export async function searchStations(query: string): Promise<RadioStation[]> {
  try {
    const response = await axios.get(`${RADIO_BROWSER_API}/byname/${encodeURIComponent(query)}`, {
      params: {
        limit: 10,
        hidebroken: true,
        order: 'votes',
        reverse: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching radio stations:', error);
    return [];
  }
}

export async function getTopStations(limit = 10): Promise<RadioStation[]> {
  try {
    const response = await axios.get(`${RADIO_BROWSER_API}/search`, {
      params: {
        limit,
        hidebroken: true,
        order: 'votes',
        reverse: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching top stations:', error);
    return [];
  }
}

export async function getStationsByGenre(genre: string): Promise<RadioStation[]> {
  try {
    const response = await axios.get(`${RADIO_BROWSER_API}/bytag/${encodeURIComponent(genre)}`, {
      params: {
        limit: 10,
        hidebroken: true,
        order: 'votes',
        reverse: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stations by genre:', error);
    return [];
  }
}
