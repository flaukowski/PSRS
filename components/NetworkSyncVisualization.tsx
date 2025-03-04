import { FC, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMusicSync } from "@/contexts/MusicSyncContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { NetworkNodeMap3D } from './NetworkNodeMap3D';

interface NetworkMetrics {
  timestamp: number;
  entropyError: number;
  freeEnergyError: number;
  entropyOutput: number;
  freeEnergyOutput: number;
  entropyIntegral: number;
  freeEnergyIntegral: number;
  entropyDerivative: number;
  freeEnergyDerivative: number;
  entropy: number;
  freeEnergy: number;
}

export const NetworkSyncVisualization: FC = () => {
  const { syncEnabled, cascadeMetrics, updateControlParameters, connectedNodes } = useMusicSync();
  const { isPlaying, audioRef } = useMusicPlayer();
  const [metrics, setMetrics] = useState<NetworkMetrics[]>([]);
  const [innerLoopParams, setInnerLoopParams] = useState({ kp: 0.5, ki: 0.2, kd: 0.1 });
  const [outerLoopParams, setOuterLoopParams] = useState({ kp: 0.3, ki: 0.1, kd: 0.05 });

  // Update metrics every 100ms when playing and sync is enabled
  useEffect(() => {
    if (!syncEnabled || !isPlaying) return;

    const interval = setInterval(() => {
      // Calculate entropy and free energy based on current network state
      const entropy = calculateNetworkEntropy(connectedNodes);
      const freeEnergy = calculateFreeEnergy(connectedNodes);

      const newMetric: NetworkMetrics = {
        timestamp: Date.now(),
        ...cascadeMetrics,
        entropy,
        freeEnergy
      };

      setMetrics(prev => [...prev.slice(-50), newMetric]); // Keep last 50 points
    }, 100);

    return () => clearInterval(interval);
  }, [syncEnabled, isPlaying, cascadeMetrics, connectedNodes]);

  const calculateNetworkEntropy = (nodes: typeof connectedNodes) => {
    if (nodes.length === 0) return 0;
    const totalError = nodes.reduce((sum, node) => sum + Math.abs(node.syncError), 0);
    const normalizedErrors = nodes.map(node => Math.abs(node.syncError) / totalError);
    return -normalizedErrors.reduce((entropy, p) =>
      entropy + (p > 0 ? p * Math.log(p) : 0), 0);
  };

  const calculateFreeEnergy = (nodes: typeof connectedNodes) => {
    if (nodes.length === 0) return 0;
    const avgPlaybackRate = nodes.reduce((sum, node) => sum + node.playbackRate, 0) / nodes.length;
    const avgLatency = nodes.reduce((sum, node) => sum + node.latency, 0) / nodes.length;
    return avgLatency > 0 ? Math.log(avgPlaybackRate) / avgLatency : 0;
  };

  const handleInnerLoopChange = useCallback((param: keyof typeof innerLoopParams, value: number) => {
    setInnerLoopParams(prev => {
      const updated = { ...prev, [param]: value };
      updateControlParameters({ innerLoop: updated, outerLoop: outerLoopParams });
      return updated;
    });
  }, [outerLoopParams, updateControlParameters]);

  const handleOuterLoopChange = useCallback((param: keyof typeof outerLoopParams, value: number) => {
    setOuterLoopParams(prev => {
      const updated = { ...prev, [param]: value };
      updateControlParameters({ innerLoop: innerLoopParams, outerLoop: updated });
      return updated;
    });
  }, [innerLoopParams, updateControlParameters]);

  return (
    <Card className="p-4 mt-4">
      <h3 className="text-lg font-semibold mb-4">Network Synchronization Status</h3>

      {/* Control Loop Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Inner Loop (Entropy) Parameters */}
        <Card className="p-4">
          <h4 className="font-medium mb-3">Inner Loop (Entropy) Parameters</h4>
          <div className="space-y-4">
            <div>
              <Label>Proportional Gain (Kp)</Label>
              <Slider
                value={[innerLoopParams.kp]}
                onValueChange={([value]) => handleInnerLoopChange('kp', value)}
                min={0}
                max={2}
                step={0.1}
                className="mt-2"
              />
              <span className="text-sm text-muted-foreground">{innerLoopParams.kp.toFixed(2)}</span>
            </div>
            <div>
              <Label>Integral Gain (Ki)</Label>
              <Slider
                value={[innerLoopParams.ki]}
                onValueChange={([value]) => handleInnerLoopChange('ki', value)}
                min={0}
                max={1}
                step={0.05}
                className="mt-2"
              />
              <span className="text-sm text-muted-foreground">{innerLoopParams.ki.toFixed(2)}</span>
            </div>
            <div>
              <Label>Derivative Gain (Kd)</Label>
              <Slider
                value={[innerLoopParams.kd]}
                onValueChange={([value]) => handleInnerLoopChange('kd', value)}
                min={0}
                max={1}
                step={0.05}
                className="mt-2"
              />
              <span className="text-sm text-muted-foreground">{innerLoopParams.kd.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Outer Loop (Free Energy) Parameters */}
        <Card className="p-4">
          <h4 className="font-medium mb-3">Outer Loop (Free Energy) Parameters</h4>
          <div className="space-y-4">
            <div>
              <Label>Proportional Gain (Kp)</Label>
              <Slider
                value={[outerLoopParams.kp]}
                onValueChange={([value]) => handleOuterLoopChange('kp', value)}
                min={0}
                max={2}
                step={0.1}
                className="mt-2"
              />
              <span className="text-sm text-muted-foreground">{outerLoopParams.kp.toFixed(2)}</span>
            </div>
            <div>
              <Label>Integral Gain (Ki)</Label>
              <Slider
                value={[outerLoopParams.ki]}
                onValueChange={([value]) => handleOuterLoopChange('ki', value)}
                min={0}
                max={1}
                step={0.05}
                className="mt-2"
              />
              <span className="text-sm text-muted-foreground">{outerLoopParams.ki.toFixed(2)}</span>
            </div>
            <div>
              <Label>Derivative Gain (Kd)</Label>
              <Slider
                value={[outerLoopParams.kd]}
                onValueChange={([value]) => handleOuterLoopChange('kd', value)}
                min={0}
                max={1}
                step={0.05}
                className="mt-2"
              />
              <span className="text-sm text-muted-foreground">{outerLoopParams.kd.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Controller Response Visualization */}
      <Card className="p-4 mb-6">
        <Label>Cascade Controller Response</Label>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <XAxis
                dataKey="timestamp"
                domain={['auto', 'auto']}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                formatter={(value: number) => value.toFixed(3)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="entropyError"
                stroke="#ef4444"
                dot={false}
                name="Entropy Error"
              />
              <Line
                type="monotone"
                dataKey="entropyOutput"
                stroke="#3b82f6"
                dot={false}
                name="Entropy Output"
              />
              <Line
                type="monotone"
                dataKey="freeEnergyError"
                stroke="#f97316"
                dot={false}
                name="Free Energy Error"
              />
              <Line
                type="monotone"
                dataKey="freeEnergyOutput"
                stroke="#8b5cf6"
                dot={false}
                name="Free Energy Output"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Network Flow Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <Label>Network Entropy (Flow Diversity)</Label>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <XAxis
                  dataKey="timestamp"
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis
                  domain={[0, 'auto']}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value: number) => value.toFixed(3)}
                />
                <Line
                  type="monotone"
                  dataKey="entropy"
                  stroke="#10b981"
                  dot={false}
                  name="Entropy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <Label>Network Free Energy (Signal Speed)</Label>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <XAxis
                  dataKey="timestamp"
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis
                  domain={[-2, 2]}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value: number) => value.toFixed(3)}
                />
                <Line
                  type="monotone"
                  dataKey="freeEnergy"
                  stroke="#8b5cf6"
                  dot={false}
                  name="Free Energy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Network Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Sync Status</Label>
          <div className="flex items-center mt-2">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                syncEnabled ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span>{syncEnabled ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <div>
          <Label>Network Statistics</Label>
          <div className="mt-2 space-y-1 text-sm">
            <div>Connected Nodes: {connectedNodes.length}</div>
            <div>Avg. Latency: {connectedNodes.length ?
              (connectedNodes.reduce((sum, n) => sum + n.latency, 0) / connectedNodes.length).toFixed(0)
              : 'N/A'} ms</div>
          </div>
        </div>
      </div>

      {/* 3D Network Visualization */}
      <Card className="p-4 mt-6">
        <Label>Network Node Map</Label>
        <div className="mt-2">
          <NetworkNodeMap3D nodes={connectedNodes} />
        </div>
      </Card>
    </Card>
  );
};