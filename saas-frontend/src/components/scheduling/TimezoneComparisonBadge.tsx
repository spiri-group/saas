'use client';

import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { Badge } from '@/components/ui/badge';
import { getTimezoneOffset } from '@/lib/timezone-utils';

interface TimezoneComparisonBadgeProps {
  practitionerTime: string; // ISO time or "HH:MM"
  practitionerTimezone: string;
  customerTime: string; // ISO time or "HH:MM"
  customerTimezone: string;
  variant?: 'default' | 'inline' | 'compact';
  className?: string;
}

/**
 * Shows side-by-side comparison of time in two timezones
 * Perfect for booking interfaces to eliminate confusion
 */
const TimezoneComparisonBadge: React.FC<TimezoneComparisonBadgeProps> = ({
  practitionerTime,
  practitionerTimezone,
  customerTime,
  customerTimezone,
  variant = 'default',
  className = ''
}) => {
  // Format times
  const formatTime = (time: string, timezone: string) => {
    try {
      let dt: DateTime;
      if (time.includes('T')) {
        // ISO format
        dt = DateTime.fromISO(time, { zone: timezone });
      } else {
        // HH:MM format
        const [hour, minute] = time.split(':').map(Number);
        dt = DateTime.now().setZone(timezone).set({ hour, minute });
      }
      return dt.toFormat('h:mm a');
    } catch {
      return time;
    }
  };

  const formattedPractitionerTime = formatTime(practitionerTime, practitionerTimezone);
  const formattedCustomerTime = formatTime(customerTime, customerTimezone);

  // Get timezone abbreviations
  const practitionerTzAbbr = getTimezoneOffset(practitionerTimezone);
  const customerTzAbbr = getTimezoneOffset(customerTimezone);

  // Calculate time difference in hours
  const calculateTimeDifference = () => {
    const dt1 = DateTime.now().setZone(practitionerTimezone);
    const dt2 = DateTime.now().setZone(customerTimezone);
    const diffHours = Math.abs(dt1.offset - dt2.offset) / 60;
    const sign = dt2.offset > dt1.offset ? '+' : '-';
    return diffHours > 0 ? `${sign}${diffHours}h` : 'Same time';
  };

  const timeDiff = calculateTimeDifference();

  if (variant === 'compact') {
    return (
      <Badge variant="secondary" className={`font-mono text-xs ${className}`}>
        <Clock className="h-3 w-3 mr-1" />
        {formattedPractitionerTime} {practitionerTzAbbr} → {formattedCustomerTime} {customerTzAbbr}
      </Badge>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        <span className="font-semibold">{formattedPractitionerTime}</span>
        <span className="text-gray-500 text-xs">{practitionerTzAbbr}</span>
        <ArrowRight className="h-3 w-3 text-gray-400" />
        <span className="font-semibold text-blue-600 dark:text-blue-400">{formattedCustomerTime}</span>
        <span className="text-gray-500 text-xs">{customerTzAbbr}</span>
        {timeDiff !== 'Same time' && (
          <Badge variant="outline" className="text-xs">
            {timeDiff}
          </Badge>
        )}
      </div>
    );
  }

  // Default variant - card-like
  return (
    <div className={`flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Practitioner</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {formattedPractitionerTime}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{practitionerTzAbbr}</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <ArrowRight className="h-4 w-4 text-gray-400" />
        {timeDiff !== 'Same time' && (
          <span className="text-xs text-gray-500 mt-1">{timeDiff}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div>
          <p className="text-xs text-blue-600 dark:text-blue-400">Your time</p>
          <p className="font-semibold text-blue-700 dark:text-blue-300">
            {formattedCustomerTime}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">{customerTzAbbr}</p>
        </div>
      </div>
    </div>
  );
};

export default TimezoneComparisonBadge;
