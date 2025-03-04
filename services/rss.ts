import RSS from 'rss';
import { type Song } from '@db/schema';

export function generateRSSFeed(songs: Song[], baseUrl: string) {
  const feed = new RSS({
    title: 'NEO Music Portal',
    description: 'Latest music uploads and trending tracks',
    feed_url: `${baseUrl}/rss.xml`,
    site_url: baseUrl,
    image_url: `${baseUrl}/neo_token_logo_flaukowski.png`,
    managingEditor: 'NEO Music Portal',
    webMaster: 'NEO Music Portal',
    copyright: `${new Date().getFullYear()} NEO Music Portal`,
    language: 'en',
    categories: ['Music', 'Blockchain', 'Web3'],
    pubDate: new Date().toUTCString(),
    ttl: 60
  });

  songs.forEach(song => {
    feed.item({
      title: song.title,
      description: `${song.title} by ${song.artist}`,
      url: `${baseUrl}/home?play=${song.id}`,
      guid: song.id.toString(),
      categories: ['Music'],
      author: song.artist,
      date: new Date(song.createdAt || Date.now()).toUTCString(),
      enclosure: {
        url: `${baseUrl}/api/songs/${song.id}/stream`,
        type: 'audio/mpeg'
      }
    });
  });

  return feed.xml();
}
