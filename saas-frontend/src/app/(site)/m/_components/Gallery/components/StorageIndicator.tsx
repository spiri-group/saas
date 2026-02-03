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
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Storage Usage</span>
            <Badge variant="outline" className="text-xs">
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
            <span className="text-muted-foreground">
              {storageUsage.totalGB} GB total
            </span>
          </div>
          
          <Progress 
            value={storageUsage.usedPercentage} 
            className="h-2"
            // Custom progress bar color based on usage level
            style={{
              '--progress-background': warningLevel === 'critical' ? '#dc2626' : 
                                     warningLevel === 'warning' ? '#d97706' : '#059669'
            } as React.CSSProperties}
          />
          
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{storageUsage.usedPercentage}% used</span>
            <span>{storageUsage.remainingGB} GB remaining</span>
          </div>
          
          {warningLevel === 'critical' && (
            <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
              ⚠️ Storage almost full! Consider upgrading your plan or removing unused files.
            </div>
          )}
          
          {warningLevel === 'warning' && (
            <div className="text-xs text-yellow-600 mt-2 p-2 bg-yellow-50 rounded">
              📊 Storage is getting full. Consider upgrading for more space.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageIndicator;