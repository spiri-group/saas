'use client';


import { Card, CardContent } from '@/components/ui/card';
import { useShipmentsContext } from '../provider';

export default function LeftPane() {
  const { state, dispatch } = useShipmentsContext();

  const handleSelectShipment = (shipmentId: string) => {
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: shipmentId });
  };

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold mb-2">Step 1: Shipment Selection</h2>

      {state.loading && <p>Loading shipments...</p>}
      {state.error && <p className="text-red-500">Error: {state.error.message}</p>}

      {!state.loading && !state.error && state.shipments.length !== 0 && (
        <p className="text-gray-500">Select a shipment to configure its packaging.</p>
      )}

      {!state.loading && !state.error && state.shipments.length === 0 && (
        <p className="text-gray-500">No shipments require packing.</p>
      )}

      {state.shipments.map((shipment) => (
        <Card
          variant="secondary"
          key={shipment.id}
          selected={state.selectedShipmentId === shipment.id}
          onClick={() => handleSelectShipment(shipment.id)}
        >
          <CardContent className="p-4">
            <p className="font-medium">Shipment Code: {shipment.code}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}