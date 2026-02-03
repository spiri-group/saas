'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { useShipmentsContext } from '../provider';
import { motion, AnimatePresence } from 'framer-motion';
import StartPackingDialog from './StartPackingDialog';
import UseSubmitPackedBoxesEstimate from '../_hooks/UseSubmitPackedBoxesEstimate';
import { Card, CardContent } from '@/components/ui/card';

export default function MiddlePane() {
  const { dispatch, selectedShipment, boxes, state } = useShipmentsContext();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const submitPackedBoxesEstimate = UseSubmitPackedBoxesEstimate(); 

  if (!selectedShipment) {
    return <p className="text-gray-500">Select a shipment to view its box configuration.</p>;
  }

  const isPacked = selectedShipment.packedBoxes && selectedShipment.packedBoxes.length > 0;

  const handleStartPacking = () => {
    dispatch({ type: 'SET_PACKING_STATE', payload: 'packing' });
  };

  const handleAbandonConfiguration = () => {
    setDialogOpen(false);
    dispatch({ type: 'ABANDON_CONFIGURATION' });
  };

  const handleSavePacking = async (packedBoxes) => {
      dispatch({
          type: 'SET_PACKED_BOXES',
          payload: {
              shipmentId: selectedShipment.id,
              boxes: packedBoxes
          }
      });
      dispatch({ type: 'SET_PACKING_STATE', payload: 'completed' });

      await submitPackedBoxesEstimate.mutateAsync({
          orderRef: selectedShipment.orderRef,
          shipmentId: selectedShipment.id,
          packedBoxes,
          serviceCode: selectedShipment.carrierInfo?.service.code ?? '',
          carrierCode: selectedShipment.carrierInfo?.code ?? '',
          sendFrom: selectedShipment.sendFrom,
          sendTo: selectedShipment.sendTo
      });
  };


  return (
    <>
    <div className="space-y-2">
      <h2 className="text-xl font-semibold mb-2">
        Step 2: Package Configuration
      </h2>
      <AnimatePresence mode="wait">
        <motion.p
          key={isPacked ? 'confirmed' : 'suggested'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="text-gray-500"
        >
          {isPacked ? 'Your Confirmed Box Configuration' : 'Our Suggested Boxes'} for Shipment {selectedShipment.code}
        </motion.p>
      </AnimatePresence>

      {boxes.length === 0 ? (
        <p className="text-gray-500">No box configuration available for this shipment.</p>
      ) : (
        <>
          <AnimatePresence>
            {boxes.map((box) => (
              <motion.div
                key={box.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <Card
                  variant="secondary"
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        Box Code: {box.code}
                      </p>
                      <div className="text-xs bg-white/50 backdrop-blur px-2 py-0.5 rounded-full border border-white/20 text-gray-700">
                        {box.used_weight.toFixed(2)} kg used
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      Dimensions: {box.dimensions_cm.depth}d x {box.dimensions_cm.width}w x {box.dimensions_cm.height}h cm
                    </p>
                    <p className="text-sm text-gray-700">Max Weight: {box.max_weight_kg} kg</p>
                    <p className="text-sm text-gray-700 mt-2 font-medium">Items:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700">  
                      {Object.values(
                        box.items.reduce((acc, item) => {
                          if (!acc[item.id]) {
                            acc[item.id] = { ...item };
                          } else {
                            acc[item.id].quantity += item.quantity;
                            if (isPacked) {
                              acc[item.id].packed = (acc[item.id].packed || 0) + (item.packed || 0);
                            }
                          }
                          return acc;
                        }, {} as Record<string, typeof box.items[number]>)
                      ).map((item) => (
                        <li key={item.id}>
                          {item.name} (Qty: {isPacked ? `${item.packed} / ${item.quantity}` : item.quantity})
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isPacked && (
            <Button onClick={handleStartPacking} className="mt-4 w-full">
              Start Packing
            </Button>
          )}

          {isPacked && (
            <Button variant="destructive" onClick={() => setDialogOpen(true)} className="mt-4 w-full">
              Abandon Box Configuration
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abandon Box Configuration</DialogTitle>
              </DialogHeader>

              <AnimatePresence mode="wait">
                <motion.p
                  key="abandon-warning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="text-sm text-gray-700 mt-2"
                >
                  Are you sure you want to abandon the box configuration?{' '}
                  <span className="text-red-700 font-medium">This action cannot be undone.</span>
                </motion.p>
              </AnimatePresence>

              <DialogFooter className="w-full grid grid-cols-2">
                <Button onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleAbandonConfiguration}>
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
    {state.packingState === 'packing' && selectedShipment && (
      <StartPackingDialog
        boxes={selectedShipment.suggestedBoxes} // <--- always pass suggestedBoxes
        onClose={() => dispatch({ type: 'SET_PACKING_STATE', payload: 'idle' })}
        onSave={handleSavePacking}
      />
    )}
    </>
  );
}
