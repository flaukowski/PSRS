import React from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

interface AggregatedMetric {
  bucket: string;
  data_type: string;
  aggregates: Record<string, number>;
  count: number;
}

// Process raw metrics into chart-friendly format
function processMetrics(rawMetrics: AggregatedMetric[]) {
  if (!Array.isArray(rawMetrics) || rawMetrics.length === 0) {
    return [];
  }

  // Group by data_type
  const metricsByType = new Map<string, Array<{
    timestamp: string;
    value: number;
    metric: string;
  }>>();

  rawMetrics.forEach(metric => {
    if (!metricsByType.has(metric.data_type)) {
      metricsByType.set(metric.data_type, []);
    }

    // Convert aggregates into separate data points
    Object.entries(metric.aggregates).forEach(([key, value]) => {
      metricsByType.get(metric.data_type)!.push({
        timestamp: metric.bucket,
        value: value,
        metric: key
      });
    });
  });

  // Convert to array format for charts
  return Array.from(metricsByType.entries()).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    data: data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }));
}

// Time range options with translations
const timeRanges = [
  { value: '1h', label: 'analytics.time.1h' },
  { value: '6h', label: 'analytics.time.6h' },
  { value: '24h', label: 'analytics.time.24h' },
  { value: '7d', label: 'analytics.time.7d' },
  { value: '30d', label: 'analytics.time.30d' }
];

export default function LumiraData() {
  const { t } = useDimensionalTranslation();
  const [selectedRange, setSelectedRange] = React.useState('24h');

  // Calculate start time based on selected range
  const getTimeRange = () => {
    const end = new Date();
    const start = new Date();

    switch (selectedRange) {
      case '1h':
        start.setHours(end.getHours() - 1);
        return { start, end };
      case '6h':
        start.setHours(end.getHours() - 6);
        return { start, end };
      case '24h':
        start.setHours(end.getHours() - 24);
        return { start, end };
      case '7d':
        start.setDate(end.getDate() - 7);
        return { start, end };
      case '30d':
        start.setDate(end.getDate() - 30);
        return { start, end };
      default:
        start.setHours(end.getHours() - 24);
        return { start, end };
    }
  };

  const { start, end } = getTimeRange();

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["/api/lumira/metrics", { start: start.toISOString(), end: end.toISOString() }],
    select: processMetrics,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data fresh for 15 seconds
  });

  // Show loading state only when we have no data at all
  const showLoading = isLoading && metrics.length === 0;

  if (showLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
            <Skeleton className="h-10 w-[180px]" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Skeleton className="h-full w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return selectedRange === '1h' ? 
      date.toLocaleTimeString() : 
      date.toLocaleString();
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
          <Select value={selectedRange} onValueChange={setSelectedRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('analytics.select.range')} />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{t(label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {metrics.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">{t('analytics.no.data')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader>
                  <CardTitle>
                    {t('analytics.metric.title', { 
                      type: metric.name 
                    }, { 
                      formatted: true 
                    })}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('analytics.privacy.note')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metric.data}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                        <XAxis 
                          dataKey="timestamp"
                          tickFormatter={formatDate}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          labelFormatter={formatDate}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}