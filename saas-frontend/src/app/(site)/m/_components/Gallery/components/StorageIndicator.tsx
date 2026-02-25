'use client'

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  StorageUsage,
  getStorageWarningLevel,
  getStorageWarningColor
} from '../utils/storageUtils';

interface Props {
  storageUsage: StorageUsage;
  planName: string;
  className?: string;
}

const StorageIndicator: React.FC<Props> = ({
  storageUsage,
  planName,
  className
}) => {
  const warningLevel = getStorageWarningLevel(storageUsage.usedPercentage);
  const colorClass = getStorageWarningColor(warningLevel);

  const getIcon = () => {
    switch (warningLevel) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default: return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <Card dark className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium">Storage</span>
            <Badge variant="outline" className="text-xs border-white/20 text-slate-300">
              {planName}
            </Badge>
          </div>
          {getIcon()}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className={colorClass}>
              {storageUsage.usedGB} GB used
            </span>
            <span className="text-slate-400">
              {storageUsage.totalGB} GB total
            </span>
          </div>

          <Progress
            value={storageUsage.usedPercentage}
            className="h-2"
            style={{
              '--progress-background': warningLevel === 'critical' ? '#f87171' :
                                     warningLevel === 'warning' ? '#fbbf24' : '#6ee7b7'
            } as React.CSSProperties}
          />

          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>{storageUsage.usedPercentage}% used</span>
            <span>{storageUsage.remainingGB} GB remaining</span>
          </div>

          {warningLevel === 'critical' && (
            <div className="text-xs text-red-300 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
              Storage almost full. Consider upgrading your plan or removing unused files.
            </div>
          )}

          {warningLevel === 'warning' && (
            <div className="text-xs text-amber-300 mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
              Storage is getting full. Consider upgrading for more space.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageIndicator;
