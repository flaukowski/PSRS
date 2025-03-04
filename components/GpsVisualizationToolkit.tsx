import { FC, useEffect, useRef, useState } from "react";
import { useMap, CircleMarker, Polyline } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, Map as MapIcon, Activity } from "lucide-react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface VisualizationOptions {
  showHeatmap: boolean;
  showMarkers: boolean;
  showPaths: boolean;
  markerSize: number;
  pathColor: string;
}

interface Props {
  data: Array<[number, number]>;
  userPath?: Coordinates[];
  onOptionChange?: (options: VisualizationOptions) => void;
}

// Marker visualization component
export const MarkerLayer: FC<{ 
  data: Array<[number, number]>;
  options: VisualizationOptions;
}> = ({ data, options }) => {
  return (
    <>
      {data.map(([lat, lng], index) => (
        <CircleMarker
          key={`marker-${index}`}
          center={[lat, lng]}
          pathOptions={{ 
            color: options.pathColor,
            fillColor: options.pathColor,
            fillOpacity: 0.6
          }}
          radius={options.markerSize}
        />
      ))}
    </>
  );
};

// Path visualization component
export const PathLayer: FC<{ 
  coordinates: Coordinates[];
  options: VisualizationOptions;
}> = ({ coordinates, options }) => {
  if (!coordinates?.length) return null;

  const positions = coordinates.map(coord => [coord.lat, coord.lng]) as [number, number][];

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: options.pathColor,
        weight: 3,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '5, 10'
      }}
    />
  );
};

// Heatmap Layer Component
export const HeatmapLayer: FC<{ data: Array<[number, number]> }> = ({ data }) => {
  const map = useMap();
  const heatmapLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map || !data.length) {
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
      }
      return;
    }

    try {
      // Remove existing layer
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
      }

      // Convert coordinates to heatmap points with intensity
      const points = data.map(([lat, lng]) => {
        return [lat, lng, 0.8] as [number, number, number];
      });

      // Create new heatmap layer with optimized settings
      const heatLayer = (L as any).heatLayer(points, {
        radius: 35,
        blur: 20,
        maxZoom: 10,
        minOpacity: 0.4,
        maxOpacity: 1,
        gradient: {
          0.2: '#3b82f6',
          0.4: '#60a5fa',
          0.6: '#93c5fd',
          0.8: '#bfdbfe',
          1.0: '#ffffff'
        }
      });

      heatLayer.addTo(map);
      heatmapLayerRef.current = heatLayer;
    } catch (error) {
      console.error('Error creating/updating heatmap layer:', error);
    }

    return () => {
      if (heatmapLayerRef.current) {
        try {
          map.removeLayer(heatmapLayerRef.current);
          heatmapLayerRef.current = null;
        } catch (error) {
          console.error('Error cleaning up heatmap layer:', error);
        }
      }
    };
  }, [map, data]);

  return null;
};

export const GpsVisualizationToolkit: FC<Props> = ({ 
  data, 
  userPath,
  onOptionChange 
}) => {
  const [options, setOptions] = useState<VisualizationOptions>({
    showHeatmap: true,
    showMarkers: false,
    showPaths: false,
    markerSize: 8,
    pathColor: "#3b82f6"
  });

  const handleOptionChange = (key: keyof VisualizationOptions, value: any) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    onOptionChange?.(newOptions);
  };

  return (
    <div className="absolute bottom-4 left-0 right-0 mx-auto px-4 z-[400] md:left-4 md:right-auto md:px-0 max-w-[90vw] md:max-w-[300px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-4 space-y-3 bg-background/95 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings2 className="w-4 h-4" />
              <h3 className="text-sm font-medium">Visualization Options</h3>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-heatmap" className="text-sm">Heatmap</Label>
              <Switch
                id="show-heatmap"
                checked={options.showHeatmap}
                onCheckedChange={(checked) => handleOptionChange('showHeatmap', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-markers" className="text-sm">Activity Markers</Label>
              <Switch
                id="show-markers"
                checked={options.showMarkers}
                onCheckedChange={(checked) => handleOptionChange('showMarkers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-paths" className="text-sm">User Paths</Label>
              <Switch
                id="show-paths"
                checked={options.showPaths}
                onCheckedChange={(checked) => handleOptionChange('showPaths', checked)}
              />
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};