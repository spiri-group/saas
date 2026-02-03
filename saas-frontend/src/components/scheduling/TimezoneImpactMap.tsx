'use client';

import React, { useState } from 'react';
import { Globe, Clock, MapPin, Info } from 'lucide-react';
import { calculateTimezoneImpact, formatTimeRangeWithTimezone } from '@/lib/timezone-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimezoneImpactMapProps {
  practitionerTimezone: string;
  availableHours: {
    start: number; // 0-23
    end: number;   // 0-23
  };
  className?: string;
}

/**
 * Beautiful world map showing timezone impact of practitioner's availability
 * Uses bell curve visualization to show "good" vs "bad" times globally
 */
const TimezoneImpactMap: React.FC<TimezoneImpactMapProps> = ({
  practitionerTimezone,
  availableHours,
  className = ''
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Calculate impact for all regions
  const impactData = calculateTimezoneImpact(
    practitionerTimezone,
    availableHours.start,
    availableHours.end
  );

  // Group regions by quality for summary
  const qualitySummary = {
    excellent: impactData.filter(r => r.quality === 'excellent').length,
    good: impactData.filter(r => r.quality === 'good').length,
    fair: impactData.filter(r => r.quality === 'fair').length,
    poor: impactData.filter(r => r.quality === 'poor').length
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <CardTitle>Global Time Impact</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>This shows what time your availability window appears in different regions around the world.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Your availability: {formatTimeRangeWithTimezone(
            availableHours.start,
            availableHours.end,
            practitionerTimezone
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quality Summary */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-xs">Excellent: {qualitySummary.excellent} regions</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-lime-500"></span>
            <span className="text-xs">Good: {qualitySummary.good} regions</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-xs">Fair: {qualitySummary.fair} regions</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-xs">Poor: {qualitySummary.poor} regions</span>
          </Badge>
        </div>

        {/* World Map Visualization (SVG) */}
        <div className="relative w-full aspect-[2/1] bg-gradient-to-b from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border p-4">
          <svg
            viewBox="0 0 800 400"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* World Map Dots */}
            {impactData.map((region, index) => {
              // Convert lat/lng to SVG coordinates
              const x = ((region.lng + 180) / 360) * 800;
              const y = ((90 - region.lat) / 180) * 400;

              const isHovered = hoveredRegion === region.name;

              return (
                <g
                  key={index}
                  onMouseEnter={() => setHoveredRegion(region.name)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  {/* Bell curve / glow effect */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 35 : 25}
                    fill={region.color}
                    opacity="0.2"
                    className="transition-all duration-200"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 20 : 15}
                    fill={region.color}
                    opacity="0.4"
                    className="transition-all duration-200"
                  />
                  {/* Center dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 8 : 6}
                    fill={region.color}
                    className="transition-all duration-200"
                  />

                  {/* Hover label */}
                  {isHovered && (
                    <>
                      <rect
                        x={x - 60}
                        y={y - 50}
                        width="120"
                        height="40"
                        rx="4"
                        fill="white"
                        stroke={region.color}
                        strokeWidth="2"
                        className="drop-shadow-lg"
                      />
                      <text
                        x={x}
                        y={y - 35}
                        textAnchor="middle"
                        className="text-xs font-semibold fill-gray-800"
                      >
                        {region.name}
                      </text>
                      <text
                        x={x}
                        y={y - 20}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {region.formattedTime}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Region Details Table */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            All Regions
          </h4>
          <div className="space-y-1">
            {impactData
              .sort((a, b) => {
                // Sort by quality first, then alphabetically
                const qualityOrder = { excellent: 0, good: 1, fair: 2, poor: 3 };
                if (qualityOrder[a.quality] !== qualityOrder[b.quality]) {
                  return qualityOrder[a.quality] - qualityOrder[b.quality];
                }
                return a.name.localeCompare(b.name);
              })
              .map((region, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    hoveredRegion === region.name
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                  onMouseEnter={() => setHoveredRegion(region.name)}
                  onMouseLeave={() => setHoveredRegion(null)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: region.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {region.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {region.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {region.formattedTime}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Insights
          </h4>
          {qualitySummary.excellent > 8 && (
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Excellent! Your availability works well for most global regions.
            </p>
          )}
          {qualitySummary.poor > 8 && (
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Consider offering additional time slots to better serve regions where your hours fall during night time.
            </p>
          )}
          {qualitySummary.excellent <= 8 && qualitySummary.poor <= 8 && (
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your availability offers a good balance across different regions.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimezoneImpactMap;
