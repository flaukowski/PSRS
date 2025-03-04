import { FC, useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Layout } from "@/components/Layout";
import { useIntl } from "react-intl";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { GpsVisualizationToolkit, MarkerLayer, PathLayer, HeatmapLayer } from "@/components/GpsVisualizationToolkit";

interface MapData {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;
      listenerCount: number;
      anonCount: number;
    };
  };
  totalListeners: number;
  allLocations: Array<[number, number]>;
}

interface VisualizationOptions {
  showHeatmap: boolean;
  showMarkers: boolean;
  showPaths: boolean;
  markerSize: number;
  pathColor: string;
}

const MapPage: FC = () => {
  const { address } = useAccount();
  const { isSynced } = useMusicPlayer();
  const intl = useIntl();
  const [mapError, setMapError] = useState<string | null>(null);
  const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions>({
    showHeatmap: true,
    showMarkers: false,
    showPaths: false,
    markerSize: 8,
    pathColor: "#3b82f6"
  });

  // Test location - Null Island
  const testLocation: Array<[number, number]> = [[0, 0]];

  // Fetch map data with polling
  const { data: mapData, isLoading, error } = useQuery<MapData>({
    queryKey: ['/api/music/map'],
    refetchInterval: 15000, // Poll every 15 seconds
    queryFn: async () => {
      try {
        const headers: Record<string, string> = address
          ? { 'x-wallet-address': address }
          : { 'x-internal-token': 'landing-page' };

        const response = await fetch('/api/music/map', { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.statusText}`);
        }
        const data = await response.json();
        return data as MapData;
      } catch (error) {
        console.error('Map data fetch error:', error);
        throw error;
      }
    }
  });

  // Process locations for heatmap and markers with proper type checking
  const locationData = useMemo(() => {
    if (!mapData?.allLocations || !isSynced) return testLocation;
    return mapData.allLocations;
  }, [mapData, isSynced]);

  const hasNoData = !isLoading && (!mapData || (mapData.totalListeners ?? 0) === 0);

  // Check for leaflet.heat availability
  useEffect(() => {
    if (typeof (L as any).heatLayer !== 'function') {
      setMapError('Heatmap functionality not available');
      console.error('L.heatLayer is not defined');
    }
  }, []);

  const handleVisualizationOptionsChange = (newOptions: VisualizationOptions) => {
    setVisualizationOptions(newOptions);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:py-6 max-w-full">
        <h1 className="text-2xl md:text-4xl font-bold mb-4">
          {intl.formatMessage({ id: 'map.title' })}
        </h1>

        <div className="text-sm text-muted-foreground mb-4">
          {!isSynced ? (
            intl.formatMessage({ id: 'map.noActivity' })
          ) : error ? (
            <span className="text-red-500">
              {intl.formatMessage(
                { id: 'map.error' },
                { error: (error as Error).message }
              )}
            </span>
          ) : hasNoData ? (
            intl.formatMessage({ id: 'map.noData' })
          ) : (
            intl.formatMessage(
              { id: 'map.totalListeners' },
              { count: mapData?.totalListeners ?? 0 }
            )
          )}
        </div>

        <Card className="p-2 md:p-4 bg-background">
          <div 
            className="relative w-full rounded-lg overflow-hidden"
            style={{ height: 'calc(100vh - 200px)' }}
          >
            {mapError ? (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 p-4 text-center">
                {mapError}
              </div>
            ) : (
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
                minZoom={2}
                maxZoom={7}
                maxBounds={[[-90, -180], [90, 180]]}
                className="z-0"
                zoomControl={false}
              >
                <div className="absolute top-2 right-2 z-[1000]">
                  <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg">
                    <div className="leaflet-control-zoom leaflet-bar">
                      <button 
                        className="leaflet-control-zoom-in"
                        title="Zoom in"
                        aria-label="Zoom in"
                        onClick={() => {
                          const map = document.querySelector('.leaflet-container') as HTMLElement;
                          if (map && (map as any)._leaflet_map) {
                            (map as any)._leaflet_map.zoomIn();
                          }
                        }}
                      >+</button>
                      <button 
                        className="leaflet-control-zoom-out"
                        title="Zoom out"
                        aria-label="Zoom out"
                        onClick={() => {
                          const map = document.querySelector('.leaflet-container') as HTMLElement;
                          if (map && (map as any)._leaflet_map) {
                            (map as any)._leaflet_map.zoomOut();
                          }
                        }}
                      >−</button>
                    </div>
                  </div>
                </div>

                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  className="dark-tiles"
                />

                {/* Always show test marker regardless of sync state */}
                <MarkerLayer 
                  data={testLocation}
                  options={{
                    showMarkers: true,
                    markerSize: 20,
                    pathColor: "#ff0000",  // Red color for test marker
                    showHeatmap: false,
                    showPaths: false
                  }}
                />

                {isSynced && locationData.length > 0 && (
                  <>
                    {visualizationOptions.showHeatmap && (
                      <HeatmapLayer data={locationData} />
                    )}

                    {visualizationOptions.showMarkers && (
                      <MarkerLayer 
                        data={locationData}
                        options={visualizationOptions}
                      />
                    )}

                    {visualizationOptions.showPaths && (
                      <PathLayer 
                        coordinates={locationData.map(([lat, lng]) => ({ lat, lng }))} 
                        options={visualizationOptions}
                      />
                    )}

                    <GpsVisualizationToolkit
                      data={locationData}
                      onOptionChange={handleVisualizationOptionsChange}
                    />
                  </>
                )}
              </MapContainer>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MapPage;