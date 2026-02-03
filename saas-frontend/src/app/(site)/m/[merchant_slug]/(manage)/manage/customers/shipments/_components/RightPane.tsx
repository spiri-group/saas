  'use client';

  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
  import { Separator } from '@/components/ui/separator';
  import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from '@/components/ui/accordion';
  import { AlertCircle, AlertTriangle, CheckCircle, PartyPopper } from 'lucide-react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { useShipmentsContext } from '../provider';
import BouncingDots from '@/icons/BouncingDots';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import UseConfirmAndFinalizeShipment from '../_hooks/UseConfirmAndFinalizeShipment';
import LabelsDialog from './LabelsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

  export default function RightPane() {
    const { state } = useShipmentsContext();
    const finalizedShipment = UseConfirmAndFinalizeShipment();
    const [showLabelDialog, setShowLabelDialog] = useState(false);

    const selectedShipment = state.shipments.find(
      (shipment) => shipment.id === state.selectedShipmentId
    );
    
    if (!selectedShipment) {
      return <p className="text-gray-500">Select a shipment to view packed summary.</p>;
    }

    const labelData = selectedShipment.label;

    const packedBoxes = selectedShipment.packedBoxes || [];
    const suggestedBoxes = selectedShipment.suggestedBoxes || [];
    const packedPricing = selectedShipment.packedPricing;
    const suggestedPricing = selectedShipment.suggestedPricing;

    const suggestedTotal = (suggestedPricing.subtotal_amount.amount + suggestedPricing.tax_amount.amount) / 100;
    const packedTotal = packedPricing
      ? (packedPricing.subtotal_amount.amount + packedPricing.tax_amount.amount) / 100
      : 0;

    const pricingDifferenceAmount = packedPricing && suggestedPricing
      ? packedTotal - suggestedTotal
      : 0;

    const formattedDifference = Math.abs(pricingDifferenceAmount);

    const currency = packedPricing?.subtotal_amount.currency ?? suggestedPricing.subtotal_amount.currency;

    const showPricingDifferenceWarning =
      formattedDifference > 5 ||
      formattedDifference > (suggestedPricing.subtotal_amount.amount / 100) * 0.05;
    const pricingDifferenceColor =
      pricingDifferenceAmount > 0 ? 'text-red-700' : 'text-green-700';

    // Production-proven thresholds:
    // Show warning if delta > 5 USD or >5% of suggested subtotal
    const BoxSummaryBadges = () => {
      if (packedBoxes.length === 0) {
        return null; // Do not show badge if nothing is packed yet
      }

      let boxMatchResultText = '';
      let boxMatchResultColor = 'text-gray-700';
      let badgeIcon: React.ReactNode = null;

      if (suggestedBoxes.length === 0) {
        boxMatchResultText = '';
      } else if (packedBoxes.length === 0) {
        boxMatchResultText = `0% match`;
        boxMatchResultColor = 'text-gray-700';
      } else if (packedBoxes.length === suggestedBoxes.length) {
        boxMatchResultText = `Matched suggested configuration`;
        boxMatchResultColor = 'text-green-700 font-semibold';
        badgeIcon = <PartyPopper className="w-4 h-4 flex-shrink-0" />;
      } else if (packedBoxes.length <= suggestedBoxes.length && suggestedBoxes.length - packedBoxes.length === 1) {
        boxMatchResultText = `Optimal packing`;
        boxMatchResultColor = 'text-green-700 font-semibold';
        badgeIcon = <CheckCircle className="w-4 h-4 flex-shrink-0" />;
      } else if (packedBoxes.length < suggestedBoxes.length - 1) {
        boxMatchResultText = `Excellent efficiency! You packed significantly fewer boxes.`;
        boxMatchResultColor = 'text-green-700 font-semibold';
        badgeIcon = <CheckCircle className="w-4 h-4 flex-shrink-0" />;
      } else {
        const extraBoxes = packedBoxes.length - suggestedBoxes.length;
        boxMatchResultText = `Overpacked (+${extraBoxes} box${extraBoxes > 1 ? 'es' : ''})`;
        boxMatchResultColor = 'text-red-700 font-semibold';
        badgeIcon = <AlertCircle className="w-4 h-4 flex-shrink-0" />;
      }

      return (
        <p className="text-sm text-gray-700 flex flex-wrap items-center">
          <motion.span
            key={boxMatchResultText} // animate on text change
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center space-x-1 ml-1 px-2 py-1 rounded border ${
              badgeIcon
                ? badgeIcon.type === CheckCircle
                  ? 'bg-green-50 border-green-200'
                  : badgeIcon.type === PartyPopper
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                : ''
            }`}
          >
            {badgeIcon}
            <span className={boxMatchResultColor}>{boxMatchResultText}</span>
          </motion.span>
        </p>
      );
    };

    const suggestedTotalVolume = suggestedBoxes.reduce((sum, box) => {
      const boxVolume = box.dimensions_cm.depth * box.dimensions_cm.width * box.dimensions_cm.height;
      return sum + boxVolume;
    }, 0);

    const PackingEfficiencyBadge = () => {
      if (
        packedBoxes.length === 0 ||
        suggestedBoxes.length === 0 ||
        suggestedTotalVolume === 0
      ) {
        return null;
      }

      const extraBoxes = packedBoxes.length - suggestedBoxes.length;
      const level =
        extraBoxes <= -2
          ? "excellent"
          : extraBoxes === -1
          ? "optimal"
          : extraBoxes === 0
          ? "matched"
          : extraBoxes <= 2
          ? "minorOverpack"
          : "overpacked";

      const colorMap: Record<string, string> = {
        excellent: "bg-green-700",
        optimal: "bg-green-700",
        matched: "bg-green-700",
        minorOverpack: "bg-yellow-700",
        overpacked: "bg-red-700",
      };

      const tooltipMap: Record<string, string> = {
        excellent: "Excellent efficiency — you used significantly fewer boxes than suggested.",
        optimal: "Great job — one fewer box than suggested.",
        matched: "Perfect match — used the suggested number of boxes.",
        minorOverpack: `Slight overpack — ${extraBoxes} extra box${extraBoxes > 1 ? 'es' : ''}.`,
        overpacked: `Overpacked — ${extraBoxes} extra boxes used. Try reducing to avoid extra shipping costs.`,
      };

      const shouldPulse = level === "overpacked";

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={`w-3 h-3 rounded-full ${colorMap[level]}`}
              animate={shouldPulse ? { scale: [1, 1.5, 1] } : false}
              transition={shouldPulse ? { duration: 1, repeat: Infinity } : undefined}
            />
          </TooltipTrigger>
          <TooltipContent side="top">{tooltipMap[level]}</TooltipContent>
        </Tooltip>
      );
    };

    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold mb-1">
          Step 3: Review & Finalise
        </h2>
        <p className="text-gray-500 text-sm">Review details and confirm pricing changes.</p>
        {/* Section 1 — Shipment Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">Shipment Summary</CardTitle>
            <PackingEfficiencyBadge />
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-gray-700 py-3">
            {selectedShipment.carrierInfo && (
              <>
                <div>Carrier: {selectedShipment.carrierInfo.name}</div>
                <div>
                  Service: {selectedShipment.carrierInfo.service.name}  —{' '}
                  {selectedShipment.carrierInfo.service.delivery_days} business days
                </div>
              </>
            )}

            {/* Example static Packed by — replace with your actual value */}
            <div>Packed by: John Doe</div>
            <div>Packed at: {new Date().toLocaleString()}</div>

            <Separator />

            <div className="flex flex-row items-center justify-between py-2">
              <div>Packed Boxes: {packedBoxes.length} / Suggested: {suggestedBoxes.length}</div>
              <BoxSummaryBadges />
            </div>
            
          </CardContent>
        </Card>

        {/* Section 2 — Shipment Details */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Shipment Details</CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <Accordion type="single" collapsible>
              <AccordionItem value="boxes" className="border-0">
                <AccordionTrigger className="py-2 text-sm">Packed Boxes ({packedBoxes.length})</AccordionTrigger>
                <AccordionContent className="pb-0">
                  {packedBoxes.length === 0 ? (
                    <p className="text-gray-500 text-xs">No boxes packed yet.</p>
                  ) : (
                    <ul className="text-xs text-gray-700 space-y-0.5">
                      {packedBoxes.map((box) => (
                        <li key={box.id} className="truncate">
                          {box.code} — {box.dimensions_cm.depth}×{box.dimensions_cm.width}×{box.dimensions_cm.height}cm
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section 3 — Pricing */}
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Shipping Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs text-gray-700 py-2">
            {/* Left: Customer Paid */}
            <div>
              <div className="font-medium">Customer Paid:</div>
              <div className="mt-1 text-sm font-bold text-neutral-900">
                {suggestedTotal.toFixed(2)} {suggestedPricing.subtotal_amount.currency}
              </div>
            </div>

            {/* Right: Packed Pricing */}
            <div>
              <div className="font-medium">Packed Pricing:</div>

              {state.estimatingShipmentId === state.selectedShipmentId && !packedPricing ? (
                <div className="mt-1">
                  <BouncingDots />
                </div>
              ) : packedPricing ? (
                <div className="mt-1 text-sm font-bold text-neutral-900">
                  {packedTotal.toFixed(2)} {packedPricing.subtotal_amount.currency}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>


        {/* Pricing Difference Warning — only if delta is large */}
        <AnimatePresence>
          {showPricingDifferenceWarning && (
            <motion.div
              key="pricing-warning"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              className="flex items-start space-x-2 text-yellow-800 mt-2 bg-yellow-100 p-3 rounded-md border border-yellow-200 shadow-sm"
            >
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm leading-snug space-y-2">
                <div>
                  <span className="font-medium">Shipping cost difference detected.</span>
                </div>
                <div className={`${pricingDifferenceColor}`}>
                  {pricingDifferenceAmount > 0 ? (
                    <>
                      An additional <span className="font-semibold text-base">{formattedDifference.toFixed(2)} {currency}</span> may apply to your final shipping charge after processing.
                    </>
                  ) : (
                    `Great job! You packed more efficiently than the estimate. No additional charge will apply.`
                  )}
                </div>
                <div className="text-yellow-800">
                  The carrier may debit or credit your account after shipment processing. The customer is not responsible for this difference.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          className="w-full mt-3"
          onClick={() => {
            finalizedShipment.mutate({
              shipmentId: selectedShipment.id,
              orderRef: selectedShipment.orderRef
            }, {
              onSuccess: () => {
                setShowLabelDialog(true);
              },
            });
          }}
          disabled={state.estimatingShipmentId == state.selectedShipmentId || state.finalizingShipmentId == state.selectedShipmentId}
        >
          {state.finalizingShipmentId == state.selectedShipmentId ? <BouncingDots /> : 'Finalize Shipment & Generate Label'}
        </Button>
        
        { labelData &&
          <LabelsDialog
            open={showLabelDialog}
            onOpenChange={(open) => setShowLabelDialog(open)}
          />
        }
      </div>
    );
  }