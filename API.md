const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws/music-sync`;
```

**Client Messages:**
```typescript
// Authentication
{ type: 'auth', address: string }

// Subscribe to song updates
{ type: 'subscribe', songId: number }

// Sync playback status
{ type: 'sync', songId: number, timestamp: number, playing: boolean }

// Update location
{ type: 'location_update', coordinates: { lat: number, lng: number }, countryCode: string }
```

**Server Messages:**
```typescript
// Stats update
{ 
  type: 'stats_update',
  data: {
    activeListeners: number,
    geotaggedListeners: number,
    anonymousListeners: number,
    listenersByCountry: Record<string, number>
  }
}

// Playback sync
{ type: 'sync', songId: number, timestamp: number, playing: boolean }
```

## HTTP Endpoints

### Music Map Data

#### GET /api/music/map
Returns geographical data about music listeners, including real-time listener counts.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address (optional)
- `x-internal-token`: For landing page access (optional)

**Response:**
```typescript
{
  countries: {
    [countryCode: string]: {
      locations: [number, number][],  // [latitude, longitude] pairs
      listenerCount: number,
      anonCount: number     // non-geotagged plays
    }
  },
  totalListeners: number    // real-time active listener count
}
```

#### POST /api/music/map
Records a new listener location.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address (optional)

**Request Body:**
```typescript
{
  songId: number,
  countryCode: string,
  coordinates?: {
    lat: number,
    lng: number
  }
}
```

### Real-time Stats

#### GET /api/music/stats
Returns current platform statistics including active listeners.

**Response:**
```typescript
{
  activeListeners: number,
  geotaggedListeners: number,
  anonymousListeners: number,
  listenersByCountry: Record<string, number>
}
```

### Songs and Playlists
#### GET /api/songs/recent
Returns the most recently played songs.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address

**Response:**
```json
[
  {
    "id": "number",
    "title": "string",
    "artist": "string",
    "ipfsHash": "string",
    "createdAt": "timestamp"
  }
]
```

#### GET /api/songs/library
Returns songs uploaded by the authenticated user.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address

**Response:**
```json
[
  {
    "id": "number",
    "title": "string",
    "artist": "string",
    "ipfsHash": "string",
    "uploadedBy": "string",
    "createdAt": "timestamp"
  }
]
```

### Music Metadata

#### GET /api/music/metadata/:id
Returns metadata for a specific song.

**Parameters:**
- `id`: Song ID (number)

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "artist": "string",
  "ipfsHash": "string",
  "uploadedBy": "string",
  "createdAt": "timestamp"
}