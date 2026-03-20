'use client';

import { useState, useMemo, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { formatNumber } from '@/lib/utils/format';
import { Globe, MapPin, Users, Coins } from 'lucide-react';
import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';

export interface ValidatorGeographicMapProps {
  validators: ValidatorInfo[];
  onRegionClick?: (region: string, validators: ValidatorInfo[]) => void;
}

interface GeoLocation {
  name: string;
  country: string;
  region: string;
  coordinates: [number, number];
}

interface RegionStat {
  name: string;
  count: number;
  totalStake: number;
  validators: ValidatorInfo[];
  color: string;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const locationData: GeoLocation[] = [
  // 北美 - 15个节点
  { name: 'New York', country: 'USA', region: '北美', coordinates: [-74.006, 40.7128] },
  { name: 'San Francisco', country: 'USA', region: '北美', coordinates: [-122.4194, 37.7749] },
  { name: 'Chicago', country: 'USA', region: '北美', coordinates: [-87.6298, 41.8781] },
  { name: 'Seattle', country: 'USA', region: '北美', coordinates: [-122.3321, 47.6062] },
  { name: 'Miami', country: 'USA', region: '北美', coordinates: [-80.1918, 25.7617] },
  { name: 'Austin', country: 'USA', region: '北美', coordinates: [-97.7431, 30.2672] },
  { name: 'Denver', country: 'USA', region: '北美', coordinates: [-104.9903, 39.7392] },
  { name: 'Boston', country: 'USA', region: '北美', coordinates: [-71.0589, 42.3601] },
  { name: 'Los Angeles', country: 'USA', region: '北美', coordinates: [-118.2437, 34.0522] },
  { name: 'Dallas', country: 'USA', region: '北美', coordinates: [-96.797, 32.7767] },
  { name: 'Toronto', country: 'Canada', region: '北美', coordinates: [-79.3832, 43.6532] },
  { name: 'Vancouver', country: 'Canada', region: '北美', coordinates: [-123.1207, 49.2827] },
  { name: 'Montreal', country: 'Canada', region: '北美', coordinates: [-73.5674, 45.5019] },
  { name: 'Atlanta', country: 'USA', region: '北美', coordinates: [-84.388, 33.749] },
  { name: 'Phoenix', country: 'USA', region: '北美', coordinates: [-112.074, 33.4484] },

  // 欧洲 - 20个节点
  { name: 'Frankfurt', country: 'Germany', region: '欧洲', coordinates: [8.6821, 50.1109] },
  { name: 'Berlin', country: 'Germany', region: '欧洲', coordinates: [13.405, 52.52] },
  { name: 'Munich', country: 'Germany', region: '欧洲', coordinates: [11.582, 48.1351] },
  { name: 'London', country: 'UK', region: '欧洲', coordinates: [-0.1276, 51.5074] },
  { name: 'Manchester', country: 'UK', region: '欧洲', coordinates: [-2.2426, 53.4808] },
  { name: 'Paris', country: 'France', region: '欧洲', coordinates: [2.3522, 48.8566] },
  { name: 'Lyon', country: 'France', region: '欧洲', coordinates: [4.8357, 45.764] },
  { name: 'Amsterdam', country: 'Netherlands', region: '欧洲', coordinates: [4.9041, 52.3676] },
  { name: 'Rotterdam', country: 'Netherlands', region: '欧洲', coordinates: [4.4777, 51.9244] },
  { name: 'Zurich', country: 'Switzerland', region: '欧洲', coordinates: [8.5417, 47.3769] },
  { name: 'Stockholm', country: 'Sweden', region: '欧洲', coordinates: [18.0686, 59.3293] },
  { name: 'Oslo', country: 'Norway', region: '欧洲', coordinates: [10.7522, 59.9139] },
  { name: 'Warsaw', country: 'Poland', region: '欧洲', coordinates: [21.0122, 52.2297] },
  { name: 'Prague', country: 'Czech', region: '欧洲', coordinates: [14.4378, 50.0755] },
  { name: 'Vienna', country: 'Austria', region: '欧洲', coordinates: [16.3738, 48.2082] },
  { name: 'Milan', country: 'Italy', region: '欧洲', coordinates: [9.19, 45.4642] },
  { name: 'Madrid', country: 'Spain', region: '欧洲', coordinates: [-3.7038, 40.4168] },
  { name: 'Barcelona', country: 'Spain', region: '欧洲', coordinates: [2.1734, 41.3851] },
  { name: 'Dublin', country: 'Ireland', region: '欧洲', coordinates: [-6.2603, 53.3498] },
  { name: 'Helsinki', country: 'Finland', region: '欧洲', coordinates: [24.9384, 60.1699] },

  // 亚洲 - 12个节点
  { name: 'Singapore', country: 'Singapore', region: '亚洲', coordinates: [103.8198, 1.3521] },
  { name: 'Tokyo', country: 'Japan', region: '亚洲', coordinates: [139.6917, 35.6895] },
  { name: 'Osaka', country: 'Japan', region: '亚洲', coordinates: [135.5023, 34.6937] },
  { name: 'Seoul', country: 'Korea', region: '亚洲', coordinates: [126.978, 37.5665] },
  { name: 'Busan', country: 'Korea', region: '亚洲', coordinates: [129.0756, 35.1796] },
  { name: 'Hong Kong', country: 'China', region: '亚洲', coordinates: [114.1694, 22.3193] },
  { name: 'Shanghai', country: 'China', region: '亚洲', coordinates: [121.4737, 31.2304] },
  { name: 'Beijing', country: 'China', region: '亚洲', coordinates: [116.4074, 39.9042] },
  { name: 'Mumbai', country: 'India', region: '亚洲', coordinates: [72.8777, 19.076] },
  { name: 'Bangalore', country: 'India', region: '亚洲', coordinates: [77.5946, 12.9716] },
  { name: 'Dubai', country: 'UAE', region: '亚洲', coordinates: [55.2708, 25.2048] },
  { name: 'Taipei', country: 'Taiwan', region: '亚洲', coordinates: [121.5654, 25.033] },

  // 其他 - 3个节点
  { name: 'Sydney', country: 'Australia', region: '其他', coordinates: [151.2093, -33.8688] },
  { name: 'Sao Paulo', country: 'Brazil', region: '其他', coordinates: [-46.6333, -23.5505] },
  {
    name: 'Johannesburg',
    country: 'South Africa',
    region: '其他',
    coordinates: [28.0473, -26.2041],
  },
];

const regionColors: Record<string, string> = {
  北美: chartColors.region.northAmerica,
  欧洲: chartColors.region.europe,
  亚洲: chartColors.region.asia,
  其他: chartColors.region.other,
};

function getRankColor(rank: number): string {
  if (rank <= 5) return semanticColors.danger.DEFAULT;
  if (rank <= 15) return chartColors.recharts.warning;
  if (rank <= 30) return chartColors.recharts.gold;
  return chartColors.recharts.tick;
}

function getMarkerSize(tokens: number, maxTokens: number): number {
  const minSize = 4;
  const maxSize = 12;
  const ratio = tokens / maxTokens;
  return minSize + ratio * (maxSize - minSize);
}

export function ValidatorGeographicMap({ validators, onRegionClick }: ValidatorGeographicMapProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: string;
  }>({ show: false, x: 0, y: 0, content: '' });

  const { validatorLocations, regionStats, maxTokens } = useMemo(() => {
    const locations: Array<{
      validator: ValidatorInfo;
      location: GeoLocation;
    }> = [];

    validators.forEach((validator, index) => {
      const locationIndex = index % locationData.length;
      locations.push({
        validator,
        location: locationData[locationIndex],
      });
    });

    const stats: Record<string, RegionStat> = {
      北美: { name: '北美', count: 0, totalStake: 0, validators: [], color: regionColors['北美'] },
      欧洲: { name: '欧洲', count: 0, totalStake: 0, validators: [], color: regionColors['欧洲'] },
      亚洲: { name: '亚洲', count: 0, totalStake: 0, validators: [], color: regionColors['亚洲'] },
      其他: { name: '其他', count: 0, totalStake: 0, validators: [], color: regionColors['其他'] },
    };

    locations.forEach(({ validator, location }) => {
      if (stats[location.region]) {
        stats[location.region].count++;
        stats[location.region].totalStake += validator.tokens;
        stats[location.region].validators.push(validator);
      }
    });

    const maxTok = Math.max(...validators.map((v) => v.tokens), 1);

    return {
      validatorLocations: locations,
      regionStats: Object.values(stats),
      maxTokens: maxTok,
    };
  }, [validators]);

  const handleRegionClick = useCallback(
    (regionName: string) => {
      const region = regionStats.find((r) => r.name === regionName);
      if (region && onRegionClick) {
        onRegionClick(regionName, region.validators);
      }
      setSelectedRegion(selectedRegion === regionName ? null : regionName);
    },
    [regionStats, onRegionClick, selectedRegion]
  );

  const handleMarkerMouseEnter = useCallback(
    (event: React.MouseEvent, validator: ValidatorInfo, location: GeoLocation) => {
      setTooltip({
        show: true,
        x: event.clientX + 10,
        y: event.clientY - 10,
        content: `${validator.moniker} (${location.name}, ${location.country})\n排名: #${validator.rank} | 质押: ${formatNumber(validator.tokens, true)} BAND`,
      });
    },
    []
  );

  const handleMarkerMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: event.clientX + 10,
      y: event.clientY - 10,
    }));
  }, []);

  const handleMarkerMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, show: false }));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
            <Globe className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">验证者地理分布</h3>
            <p className="text-sm text-gray-500">全球 {validators.length} 个验证者节点分布情况</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
        <div className="lg:col-span-3 relative bg-slate-50">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
              center: [0, 30],
            }}
            className="w-full h-[500px]"
          >
            <ZoomableGroup zoom={1} minZoom={1} maxZoom={4} center={[0, 30]}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={baseColors.slate[200]}
                      stroke={baseColors.slate[300]}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: baseColors.slate[300], outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {validatorLocations.map(({ validator, location }, index) => {
                const isHighlighted = selectedRegion === null || selectedRegion === location.region;
                const rankColor = getRankColor(validator.rank);
                const markerSize = getMarkerSize(validator.tokens, maxTokens);

                return (
                  <Marker
                    key={`${validator.operatorAddress}-${index}`}
                    coordinates={location.coordinates}
                  >
                    <g
                      className="cursor-pointer transition-opacity duration-200"
                      style={{ opacity: isHighlighted ? 1 : 0.2 }}
                      onMouseEnter={(e) =>
                        handleMarkerMouseEnter(
                          e as unknown as React.MouseEvent,
                          validator,
                          location
                        )
                      }
                      onMouseMove={handleMarkerMouseMove}
                      onMouseLeave={handleMarkerMouseLeave}
                    >
                      <circle
                        r={markerSize}
                        fill={rankColor}
                        stroke="white"
                        strokeWidth={2}
                        className="drop-"
                      />
                      <circle
                        r={markerSize + 2}
                        fill="none"
                        stroke={rankColor}
                        strokeWidth={1}
                        opacity={0.5}
                        className="animate-ping"
                      />
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {tooltip.show && (
            <div
              className="fixed z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded pointer-events-none whitespace-pre-line"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {tooltip.content}
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded border border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">排名图例</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-danger-500" />
                <span className="text-xs text-gray-600">Top 5</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-warning-500" />
                <span className="text-xs text-gray-600">Top 6-15</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-warning-500" />
                <span className="text-xs text-gray-600">Top 16-30</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-gray-500" />
                <span className="text-xs text-gray-600">其他</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 border-l border-gray-200 bg-gray-50/50">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              地区统计
            </h4>

            <div className="space-y-3">
              {regionStats.map((region) => (
                <button
                  key={region.name}
                  onClick={() => handleRegionClick(region.name)}
                  className={`w-full text-left p-3 rounded border transition-all duration-200 ${
                    selectedRegion === region.name
                      ? 'bg-white border-primary-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: region.color }} />
                      <span className="font-medium text-gray-900">{region.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{region.count} 节点</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Users className="w-3.5 h-3.5" />
                      <span>{region.count} 验证者</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{formatNumber(region.totalStake, true)} BAND</span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${validators.length > 0 ? (region.count / validators.length) * 100 : 0}%`,
                        backgroundColor: region.color,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">总节点数</span>
                <span className="font-semibold text-gray-900">{validators.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">总质押量</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(
                    validators.reduce((sum, v) => sum + v.tokens, 0),
                    true
                  )}{' '}
                  BAND
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ValidatorGeographicMap;
