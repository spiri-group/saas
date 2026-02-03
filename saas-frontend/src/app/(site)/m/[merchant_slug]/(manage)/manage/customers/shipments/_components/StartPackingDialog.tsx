'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useShipmentsContext, type PackedBox } from '../provider';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { PackageCheck, PackageSearch, Box, Boxes } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { generate_human_friendly_id } from '@/lib/functions';
import VisuallyHiddenComponent from '@/components/ux/VisuallyHidden';

interface StartPackingDialogProps {
  onClose: () => void;
  onSave?: (boxes: PackedBox[], abandoned: boolean) => void;
  boxes: PackedBox[];
}

const dimensionSchema = z.object({
  depth: z.coerce.number().positive({ message: 'Depth is required' }),
  width: z.coerce.number().positive({ message: 'Width is required' }),
  height: z.coerce.number().positive({ message: 'Height is required' }),
  max_weight: z.coerce.number().positive({ message: 'Max weight is required' }),
});

type DimensionFormValues = z.infer<typeof dimensionSchema>;

export default function StartPackingDialog({ onClose, onSave, boxes }: StartPackingDialogProps) {
  const { selectedShipment } = useShipmentsContext();
  
  const [step, setStep] = useState<'intro' | 'confirm-size' | 'pack-items' | 'manual-info' | 'manual-confirm-size' | 'manual-pack-items' | 'box-packed' | 'completed'>('intro');
  const steps = ['intro', 'confirm-size', 'pack-items', 'manual-info', 'manual-confirm-size', 'manual-pack-items', 'completed'];

  const [currentBoxIndex, setCurrentBoxIndex] = useState(0);
  const [packedItemAmounts, setPackedItemAmounts] = useState<{ [sku: string]: number }>({});
  const [remainingItems, setRemainingItems] = useState<any[]>([]);
  const [manualBoxes, setManualBoxes] = useState<PackedBox[]>([]);
  
  const currentSuggestedBox = boxes[currentBoxIndex];
  const suggestedItems = useMemo(() => currentSuggestedBox?.items ?? [], [currentSuggestedBox]);

  const form = useForm<DimensionFormValues>({
    resolver: zodResolver(dimensionSchema),
    defaultValues: {
      depth: currentSuggestedBox?.dimensions_cm.depth ?? undefined,
      width: currentSuggestedBox?.dimensions_cm.width ?? undefined,
      height: currentSuggestedBox?.dimensions_cm.height ?? undefined,
      max_weight: currentSuggestedBox?.max_weight_kg ?? undefined,
    },
  });

  const reset = useCallback(() => {
    setStep('intro');
    setCurrentBoxIndex(0);
    setManualBoxes([]);
    setRemainingItems([]);
    setPackedItemAmounts({});
    form.reset({
      depth: boxes[0]?.dimensions_cm.depth ?? undefined,
      width: boxes[0]?.dimensions_cm.width ?? undefined,
      height: boxes[0]?.dimensions_cm.height ?? undefined,
      max_weight: boxes[0]?.max_weight_kg ?? undefined,
    });
  }, [boxes, form]);

  useEffect(() => {
    if (suggestedItems) {
      const initial: { [itemId: string]: number } = {};
      suggestedItems.forEach((item) => {
        initial[item.id] = 0;
      });
      setPackedItemAmounts(initial);
    }
  }, [suggestedItems]);

  const handlePackedAmountChange = (sku: string, value: string, maxQuantity: number) => {
    const numericValue = Math.max(0, Math.min(parseInt(value) || 0, maxQuantity));
    setPackedItemAmounts(prev => ({
      ...prev,
      [sku]: numericValue,
    }));
  };

  const handleNextConfirmSize = () => {
    setStep(step === 'confirm-size' ? 'pack-items' : 'manual-pack-items');
  };

  const triggerBoxPackedAnimationAndProceed = (nextStep: typeof step) => {
    setStep('box-packed');
    setTimeout(() => {
      setStep(nextStep);
    }, 3000); // 3 seconds feels nice
  };

  const handleSave = () => {
    const itemsToCheck = step.startsWith('manual') ? remainingItems : suggestedItems;

    const aggregatedItems = aggregatePackedItems(itemsToCheck);

    const anyPacked = aggregatedItems.some(
      (item) => (packedItemAmounts[item.variantId || item.name] ?? 0) > 0
    );

    if (!anyPacked) {
      alert('You must pack at least one item in the box.');
      return;
    }

    const allPacked = aggregatedItems.every(
      (item) => (packedItemAmounts[item.variantId || item.name] ?? 0) === item.quantity
    );

    const packedBox: PackedBox = {
      ...(step.startsWith('manual') ? {
        id: uuidv4(),
        code: generate_human_friendly_id('BX'),
        name: `Manual Box ${manualBoxes.length + 1}`,
        dimensions_cm: {
          depth: form.getValues('depth'),
          width: form.getValues('width'),
          height: form.getValues('height'),
        },
        volume: form.getValues('depth') * form.getValues('width') * form.getValues('height'),
        used_weight: Object.keys(packedItemAmounts).reduce((total, key) => {
          const item = aggregatedItems.find(i => i.variantId === key || i.name === key);
          return total + ((packedItemAmounts[key] ?? 0) * (item?.weight.amount || 0));
        }, 0),
        used_volume: 0,
        max_weight_kg: form.getValues('max_weight'),
        items: aggregatedItems
          .filter(item => (packedItemAmounts[item.variantId || item.name] ?? 0) > 0)
          .map(item => ({
            ...item,
            packed: packedItemAmounts[item.variantId || item.name]
          })),
      } : {
        ...currentSuggestedBox,
        dimensions_cm: {
          depth: form.getValues('depth'),
          width: form.getValues('width'),
          height: form.getValues('height'),
        },
        volume: form.getValues('depth') * form.getValues('width') * form.getValues('height'),
        used_volume: 0,
        used_weight: Object.keys(packedItemAmounts).reduce((total, key) => {
          const item = aggregatedItems.find(i => i.variantId === key || i.name === key);
          return total + ((packedItemAmounts[key] ?? 0) * (item?.weight.amount || 0));
        }, 0),
        max_weight_kg: form.getValues('max_weight'),
        items: aggregatedItems
          .filter(item => (packedItemAmounts[item.variantId || item.name] ?? 0) > 0)
          .map(item => ({
            ...item,
            packed: packedItemAmounts[item.variantId || item.name]
          })),
      })
    };

    if (step.startsWith('manual')) {
      setManualBoxes((prev) => [...prev, packedBox]);

      const newRemainingItems = aggregatedItems
        .map(item => {
          const key = item.variantId || item.name;
          const packedAmount = packedItemAmounts[key] ?? 0;

          if (packedAmount >= item.quantity) {
            return null; // Fully packed → remove
          }

          return {
            ...item,
            quantity: item.quantity - packedAmount,
            packed: 0, // Reset packed field
          };
        })
        .filter(Boolean);

      if (newRemainingItems.length === 0) {
        triggerBoxPackedAnimationAndProceed('completed');
      } else {
        setRemainingItems(newRemainingItems);
        form.reset();
        triggerBoxPackedAnimationAndProceed('manual-confirm-size');
      }
    } else {
      if (allPacked) {
        if (currentBoxIndex + 1 < boxes.length) {
          setCurrentBoxIndex(prev => prev + 1);
          form.reset({
            depth: boxes[currentBoxIndex + 1]?.dimensions_cm.depth ?? undefined,
            width: boxes[currentBoxIndex + 1]?.dimensions_cm.width ?? undefined,
            height: boxes[currentBoxIndex + 1]?.dimensions_cm.height ?? undefined,
            max_weight: boxes[currentBoxIndex + 1]?.max_weight_kg ?? undefined,
          });
          triggerBoxPackedAnimationAndProceed('intro');
        } else {
          boxes[currentBoxIndex] = packedBox; 
          triggerBoxPackedAnimationAndProceed('completed');
        }
      } else {
        const newRemainingItems = aggregatedItems
          .map(item => {
            const key = item.variantId || item.name;
            const packedAmount = packedItemAmounts[key] ?? 0;

            if (packedAmount >= item.quantity) {
              return null;
            }

            return {
              ...item,
              quantity: item.quantity - packedAmount,
              packed: 0,
            };
          })
          .filter(Boolean)
          .concat(
            boxes.slice(currentBoxIndex + 1).flatMap(box => box.items)
          );

        setRemainingItems(newRemainingItems);
        setManualBoxes([packedBox]);
        form.reset();
        triggerBoxPackedAnimationAndProceed('manual-info');
      }
    }

  };

  const progress = useMemo(() => {
  const currentStepIndex = steps.indexOf(step);
  const totalSteps = steps.length;
  return Math.min((currentStepIndex / (totalSteps - 1)) * 100, 100);
  }, [step]);

  const aggregatePackedItems = (items: PackedBox['items']): PackedBox['items'] => {
    const grouped: Record<string, PackedBox['items'][number]> = {};

    for (const item of items) {
      const key = item.variantId || item.name; // use a unique identifier here

      if (!grouped[key]) {
        grouped[key] = { ...item };
      } else {
        grouped[key].packed += item.packed || 0;
        grouped[key].quantity += item.quantity || 0;
      }
    }

    return Object.values(grouped);
  };

  if (boxes.length === 0) {
    return (
      <Dialog open onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No boxes to pack</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500">There are no suggested boxes available for this shipment.</p>
          <DialogFooter>
            <Button onClick={() => {
              reset();
              onClose();
            }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        reset();
        onClose();
      }
    }}>
      <DialogContent className="overflow-hidden">
        {!step.startsWith('manual') && manualBoxes.length == 0 && (
          <Progress value={progress} className="mb-4" />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-4"
          >
            <DialogHeader>
              {step === 'box-packed' ? (
                <VisuallyHiddenComponent>
                  <DialogTitle>Packing Shipment {selectedShipment!.code}</DialogTitle>
                </VisuallyHiddenComponent>
              ) : step === 'intro' ? (
                <DialogTitle>Let&apos;s get packing!</DialogTitle>
              ) : (
                <DialogTitle>Packing Shipment {selectedShipment!.code}</DialogTitle>
              )}
            </DialogHeader>

            {step === 'intro' && (
              <>
                <p className="text-sm text-gray-600">
                  You are packing shipment <strong>{selectedShipment!.code}</strong>.
                </p>
                <p className="text-sm text-gray-600">
                  You’ll start by checking the box size. Then choose what items to pack inside.
                </p>
                <p className="text-sm text-blue-600 font-medium flex items-center gap-2">
                  <PackageSearch className="w-4 h-4" /> Tip: You can adjust as you go — pack in the way that works best!
                </p>
                <DialogFooter className="w-full">
                  <Button className="w-full" onClick={() => setStep('confirm-size')}>Continue</Button>
                </DialogFooter>
              </>
            )}

            {(step === 'confirm-size' || step === 'manual-confirm-size') && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleNextConfirmSize)}
                  className="space-y-4"
                >
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Box className="w-4 h-4" /> Confirm or adjust box dimensions:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {['depth', 'width', 'height', 'max_weight'].map((field) => (
                      <FormField
                        key={field}
                        control={form.control}
                        name={field as keyof DimensionFormValues}
                        render={({ field: fieldProps }) => (
                          <FormItem className="flex flex-col space-y-3">
                            <FormLabel>{field === 'max_weight' ? 'Max Weight (kg)' : `${field.charAt(0).toUpperCase() + field.slice(1)} (cm)`}</FormLabel>
                            <FormControl>
                              <Input step={"any"} type="number" {...fieldProps} placeholder={`e.g. ${field === 'max_weight' ? '10' : '30'}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <DialogFooter className="grid grid-cols-2 gap-3">
                    <Button type="button" onClick={reset} variant="ghost">Restart Packing</Button>
                    <Button type="submit">Next</Button>
                  </DialogFooter>
                </form>
              </Form>
            )}

            {(step === 'pack-items' || step === 'manual-pack-items') && (
              <>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Boxes className="w-4 h-4" /> Specify packed quantity for each item:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <p className="text-sm text-gray-600">
                    <strong>Total Packed Weight:</strong> {Object.keys(packedItemAmounts).reduce((total, key) => {
                      const item = aggregatePackedItems(step.startsWith('manual') ? remainingItems : suggestedItems).find(i => i.variantId === key || i.name === key);
                      return total + ((packedItemAmounts[key] ?? 0) * (item?.weight.amount || 0));
                    }, 0).toFixed(2)} kg
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Remaining Weight Capacity:</strong> {(form.getValues('max_weight') - Object.keys(packedItemAmounts).reduce((total, key) => {
                      const item = aggregatePackedItems(step.startsWith('manual') ? remainingItems : suggestedItems).find(i => i.variantId === key || i.name === key);
                      return total + ((packedItemAmounts[key] ?? 0) * (item?.weight.amount || 0));
                    }, 0)).toFixed(2)} kg
                  </p>
                </div>
                <ul className="space-y-2">
                  {aggregatePackedItems(step.startsWith('manual') ? remainingItems : suggestedItems).map((item) => {
                    const key = item.variantId || item.name;
                    const remainingQty = item.quantity - (packedItemAmounts[key] ?? 0);
                    return (
                      <li key={key} className="flex items-center gap-4 py-1 border-b border-gray-100 last:border-0">
                        <div className="flex-1 text-gray-700">
                          <span className="text-gray-500">{item.name}</span>
                          <span className="ml-2 font-semibold text-black">Qty: {remainingQty}</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={packedItemAmounts[key] ?? 0}
                          onChange={(e) => handlePackedAmountChange(key, e.target.value, item.quantity)}
                          className="w-40 text-right"
                        />
                      </li>
                    );
                  })}
                </ul>
                <DialogFooter className="grid grid-cols-2 gap-3">
                  <Button onClick={reset} variant="ghost">Restart Packing</Button>
                  <Button onClick={handleSave}>Finish Box</Button>
                </DialogFooter>
              </>
            )}

            {step === 'box-packed' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.3, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="flex flex-col items-center justify-center h-full py-8 px-4 text-green-700"
            >
              <PackageCheck className="w-16 h-16 mb-2 animate-bounce" />
              <p className="text-2xl font-bold">Box Packed!</p>
            </motion.div>
          )}

            {step === 'manual-info' && (
              <>
                <p className="text-lg font-semibold text-yellow-700">You’re moving to a manual packing flow</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    Because you chose not to pack all suggested items in this box, our original box suggestions are now being abandoned.
                    This means:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>The shipment will be re-rated based on your manual box selections</li>
                    <li>There may be a difference compared to the rate the customer paid</li>
                    <li>We will automatically re-estimate the rate and show you the expected difference before you confirm this shipment</li>
                  </ul>
                  <p className="font-medium text-blue-700">
                    This is normal — many shipments require manual adjustments. Please proceed carefully and we’ll guide you the rest of the way!
                  </p>
                </div>
                <DialogFooter className="grid grid-cols-2 gap-3">
                  <Button onClick={reset} variant="ghost">Restart Packing</Button>
                  <Button onClick={() => setStep('manual-confirm-size')}>Continue to Manual Packing</Button>
                </DialogFooter>
              </>
            )}

            {step === 'completed' && (
              <>
                <Confetti width={window.innerWidth} height={window.innerHeight} />
                <p className="pt-3 text-xl font-semibold text-green-700 animate-bounce flex items-center gap-2">
                  <PackageCheck className="w-6 h-6" /> 🎉 You did it!
                </p>
                <p className="text-sm text-gray-600">All items are packed. Well done!</p>
                <p className="text-sm text-blue-600 font-medium">
                  You can now confirm your configuration. 
                </p>
                <p className="text-sm text-gray-600 max-w-xl">
                  After confirmation we will show you the new estimate and you can choose to finalise the shipment.
                </p>
                <DialogFooter className="w-full">
                  <Button className="w-full" onClick={() => {
                    if (step !== 'completed') return; // safety

                    if (manualBoxes.length > 0) {
                      // Manual mode completed — preserve all boxes
                      onSave?.([
                        ...boxes.slice(0, currentBoxIndex),
                        ...manualBoxes
                      ], true);
                    } else {
                      // Normal mode completed — update box size + set packed = quantity for all items
                      boxes.forEach((box, index) => {
                        if (index === currentBoxIndex) {
                          box.dimensions_cm = {
                            depth: form.getValues('depth'),
                            width: form.getValues('width'),
                            height: form.getValues('height'),
                          };
                          box.max_weight_kg = form.getValues('max_weight');

                          // Force packed = quantity for all items
                          box.items = box.items.map(item => ({
                            ...item,
                            packed: item.quantity
                          }));
                        }
                      });

                      onSave?.([...boxes], false);
                    }

                    reset();
                    onClose();
                  }}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
