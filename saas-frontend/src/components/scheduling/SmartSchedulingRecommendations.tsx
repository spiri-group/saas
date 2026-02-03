'use client';

import React from 'react';
import { Lightbulb, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { calculateTimezoneImpact, formatTimeRangeWithTimezone, WORLD_REGIONS } from '@/lib/timezone-utils';

interface SmartSchedulingRecommendationsProps {
  practitionerTimezone: string;
  currentAvailableHours?: {
    start: number;
    end: number;
  };
  targetTimezones: string[];
  className?: string;
}

/**
 * Intelligent recommendations for optimal scheduling based on target markets
 * Analyzes timezone impact and suggests best availability windows
 */
const SmartSchedulingRecommendations: React.FC<SmartSchedulingRecommendationsProps> = ({
  practitionerTimezone,
  currentAvailableHours = { start: 9, end: 17 }, // Default 9-5
  targetTimezones,
  className = ''
}) => {
  if (targetTimezones.length === 0) {
    return null;
  }

  // Calculate impact for current availability
  const currentImpact = calculateTimezoneImpact(
    practitionerTimezone,
    currentAvailableHours.start,
    currentAvailableHours.end
  );

  // Filter to only target regions
  const targetRegions = currentImpact.filter(region =>
    targetTimezones.includes(region.timezone)
  );

  // Count quality levels in target regions
  const qualityCounts = {
    excellent: targetRegions.filter(r => r.quality === 'excellent').length,
    good: targetRegions.filter(r => r.quality === 'good').length,
    fair: targetRegions.filter(r => r.quality === 'fair').length,
    poor: targetRegions.filter(r => r.quality === 'poor').length
  };

  const totalTargets = targetRegions.length;
  const excellentPercentage = Math.round((qualityCounts.excellent / totalTargets) * 100);
  const poorRegions = targetRegions.filter(r => r.quality === 'poor');

  // Generate recommendations
  const recommendations: { type: 'success' | 'warning' | 'info'; title: string; description: string; }[] = [];

  if (excellentPercentage >= 70) {
    recommendations.push({
      type: 'success',
      title: 'Excellent Coverage!',
      description: `Your current hours (${currentAvailableHours.start}:00-${currentAvailableHours.end}:00) work perfectly for ${excellentPercentage}% of your target markets. Keep these hours!`
    });
  } else {
    // Find optimal time windows that maximize coverage across ALL target regions
    type WindowScore = {
      start: number;
      end: number;
      excellentCount: number;
      goodCount: number;
      fairCount: number;
      poorCount: number;
      score: number; // Weighted score: excellent=3, good=2, fair=1, poor=0
      affectedRegions: string[];
    };

    const windowScores: WindowScore[] = [];

    // Test multiple time windows throughout the day (every 2 hours, 8-hour windows)
    for (let start = 0; start < 24; start += 2) {
      const end = (start + 8) % 24; // 8-hour window

      const testImpact = calculateTimezoneImpact(
        practitionerTimezone,
        start,
        end
      );

      // Filter to target regions only
      const targetTestRegions = testImpact.filter(r =>
        targetTimezones.includes(r.timezone)
      );

      const excellentCount = targetTestRegions.filter(r => r.quality === 'excellent').length;
      const goodCount = targetTestRegions.filter(r => r.quality === 'good').length;
      const fairCount = targetTestRegions.filter(r => r.quality === 'fair').length;
      const poorCount = targetTestRegions.filter(r => r.quality === 'poor').length;

      // Weighted score: prioritize excellent and good coverage
      const score = (excellentCount * 3) + (goodCount * 2) + (fairCount * 1);

      windowScores.push({
        start,
        end,
        excellentCount,
        goodCount,
        fairCount,
        poorCount,
        score,
        affectedRegions: targetTestRegions.filter(r => r.quality === 'excellent' || r.quality === 'good').map(r => r.name)
      });
    }

    // Sort by score (best coverage first)
    windowScores.sort((a, b) => b.score - a.score);

    // Get top 3 alternative windows
    const topWindows = windowScores.slice(0, 3).filter(w => w.score > qualityCounts.excellent * 3 + qualityCounts.good * 2);

    if (topWindows.length > 0) {
      const bestWindow = topWindows[0];
      const currentScore = (qualityCounts.excellent * 3) + (qualityCounts.good * 2) + (qualityCounts.fair * 1);

      if (bestWindow.score > currentScore) {
        recommendations.push({
          type: 'warning',
          title: '🎯 Optimal Time Window Found',
          description: `Consider ${formatTimeRangeWithTimezone(bestWindow.start, bestWindow.end, practitionerTimezone)} for better global coverage: ${bestWindow.excellentCount} regions with excellent times + ${bestWindow.goodCount} with good times (vs current ${qualityCounts.excellent + qualityCounts.good}). Covers: ${bestWindow.affectedRegions.slice(0, 3).join(', ')}${bestWindow.affectedRegions.length > 3 ? ` +${bestWindow.affectedRegions.length - 3} more` : ''}.`
        });
      }

      // Suggest ADDITIONAL windows for multi-timezone coverage
      if (poorRegions.length >= 2 && topWindows.length > 1) {
        const additionalWindow = topWindows[1];
        if (additionalWindow.score >= (totalTargets * 2)) { // At least "good" for most regions
          recommendations.push({
            type: 'info',
            title: '⏰ Consider Multiple Availability Windows',
            description: `To maximize global reach, offer TWO availability windows: ${formatTimeRangeWithTimezone(currentAvailableHours.start, currentAvailableHours.end, practitionerTimezone)} AND ${formatTimeRangeWithTimezone(additionalWindow.start, additionalWindow.end, practitionerTimezone)}. This covers ${totalTargets} regions optimally.`
          });
        }
      }
    }
  }

  // Revenue opportunity estimate
  if (poorRegions.length > 0) {
    recommendations.push({
      type: 'info',
      title: 'Revenue Opportunity',
      description: `Optimizing hours for ${poorRegions.length} underserved region${poorRegions.length > 1 ? 's' : ''} could increase weekly bookings by an estimated ${poorRegions.length * 2}-${poorRegions.length * 5} sessions.`
    });
  }

  // Market insights
  const regionsByContinent = targetRegions.reduce((acc, region) => {
    const continent = WORLD_REGIONS.find(r => r.timezone === region.timezone);
    if (!continent) return acc;

    const continentName = continent.name.split(' - ')[0]; // Extract "North America" from "North America - East"
    if (!acc[continentName]) acc[continentName] = [];
    acc[continentName].push(region);
    return acc;
  }, {} as Record<string, typeof targetRegions>);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quality Overview */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Target Market Coverage
              </h4>
              <div className="flex flex-wrap gap-2">
                {qualityCounts.excellent > 0 && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    🟢 {qualityCounts.excellent} Excellent
                  </Badge>
                )}
                {qualityCounts.good > 0 && (
                  <Badge variant="outline" className="bg-lime-100 text-lime-800 border-lime-300">
                    🟡 {qualityCounts.good} Good
                  </Badge>
                )}
                {qualityCounts.fair > 0 && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    🟠 {qualityCounts.fair} Fair
                  </Badge>
                )}
                {qualityCounts.poor > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    🔴 {qualityCounts.poor} Poor
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.map((rec, index) => (
        <Alert key={index} variant={rec.type === 'success' ? 'default' : 'destructive'}>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>{rec.title}</AlertTitle>
          <AlertDescription className="text-sm">
            {rec.description}
          </AlertDescription>
        </Alert>
      ))}

      {/* Market Breakdown */}
      {Object.keys(regionsByContinent).length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Your Target Markets
                </h4>
                <div className="space-y-2">
                  {Object.entries(regionsByContinent).map(([continent, regions]) => (
                    <div key={continent} className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{continent}:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {regions.map(r => r.name.split(' - ')[1] || r.name).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pro Tip */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Pro Tip</AlertTitle>
        <AlertDescription className="text-sm">
          Consider offering multiple availability windows to serve different time zones.
          Many successful practitioners offer both morning and evening slots to maximize global reach.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SmartSchedulingRecommendations;
