'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import LeftPane from './_components/LeftPane';
import MiddlePane from './_components/MiddlePane';
import RightPane from './_components/RightPane';
import { ShipmentsProvider } from './provider';

function ShipmentsLayout() {
  return (
    <div className="flex flex-col h-screen p-4 space-y-4">
      <h1 className="text-2xl font-bold">Shipments</h1>
      <div className="flex flex-1 space-x-4">
        <div className="flex-1">
          <LeftPane />
        </div>
        <div className="flex-1">
          <MiddlePane />
        </div>
        <div className="flex-1">
          <RightPane />
        </div>
      </div>
    </div>
  );
}

const UI: React.FC<{ merchantId: string }> = ({ merchantId }) => {
  return (
    <ShipmentsProvider merchantId={merchantId}>
      <TooltipProvider>
      <ShipmentsLayout />    
      </TooltipProvider>
    </ShipmentsProvider>
  );
};

export default UI;