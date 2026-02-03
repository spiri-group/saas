"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import ComboBox from "@/components/ux/ComboBox";
import UseReorderCategories from "../hooks/UseReorderCategories";
import { choice_node_type, recordref_type } from "@/utils/spiriverse";

type MovementType = 'AT_START' | 'BEFORE' | 'AFTER' | 'AT_END';

const moveSchema = z.object({
  placement: z.object({
    type: z.enum(['AT_START', 'BEFORE', 'AFTER', 'AT_END']),
    referenceNodeId: z.string().optional()
  }).refine((data) => {
    // If placement is 'before' or 'after', referenceNodeId is required
    if ((data.type === 'BEFORE' || data.type === 'AFTER') && !data.referenceNodeId) {
      return false;
    }
    return true;
  }, {
    message: "Reference node is required for 'before' and 'after' placement",
    path: ["referenceNodeId"]
  })
});

type MoveForm = z.infer<typeof moveSchema>;

const MOVEMENT_OPTIONS: { value: MovementType; label: string }[] = [
  { value: 'AT_START', label: 'At start' },
  { value: 'BEFORE', label: 'Before' },
  { value: 'AFTER', label: 'After' },
  { value: 'AT_END', label: 'At end' }
];

interface MoveCategoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configRef: recordref_type;
  configId: string;
  movingNode: choice_node_type;
  siblingNodes: choice_node_type[];
}

export default function MoveCategoryPanel({
  open,
  onOpenChange,
  configRef,
  configId,
  movingNode,
  siblingNodes
}: MoveCategoryPanelProps) {
  const [selectedPlacement, setSelectedPlacement] = useState<MovementType>('AT_END');
  
  // Filter out the moving node from siblings
  const availableNodes = siblingNodes.filter(node => node.id !== movingNode.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Debug logging
  console.log('MoveCategoryPanel Debug:', {
    movingNode: movingNode.label,
    siblingNodes: siblingNodes.map(n => ({ id: n.id, label: n.label })),
    availableNodes: availableNodes.map(n => ({ id: n.id, label: n.label }))
  });

  const form = useForm<MoveForm>({
    resolver: zodResolver(moveSchema),
    defaultValues: {
      placement: {
        type: 'AT_END',
        referenceNodeId: undefined
      }
    }
  });

  const handleClose = () => {
    form.reset();
    setSelectedPlacement('AT_END');
    onOpenChange(false);
  };
  
  // Update form when placement type changes
  const handlePlacementChange = (placement: MovementType) => {
    setSelectedPlacement(placement);
    const currentFormValue = form.getValues('placement');
    form.setValue('placement', {
      type: placement,
      referenceNodeId: (placement === 'BEFORE' || placement === 'AFTER') ? currentFormValue.referenceNodeId : undefined
    });
  };

  const reorderMutation = UseReorderCategories(configRef, handleClose);

  // Calculate new sort orders for movement
  const calculateMovement = (placement: MoveForm['placement']): { id: string; sortOrder: number }[] => {
    if (!availableNodes.length) return [{ id: movingNode.id, sortOrder: 0 }];
    
    let newSortOrder = 0;
    const updates: { id: string; sortOrder: number }[] = [];
    
    switch (placement.type) {
      case 'AT_START':
        newSortOrder = Math.max(0, availableNodes[0].sortOrder - 10);
        updates.push({ id: movingNode.id, sortOrder: newSortOrder });
        break;
        
      case 'AT_END':
        newSortOrder = availableNodes[availableNodes.length - 1].sortOrder + 10;
        updates.push({ id: movingNode.id, sortOrder: newSortOrder });
        break;
        
      case 'BEFORE': {
        const refNode = availableNodes.find(node => node.id === placement.referenceNodeId);
        if (refNode) {
          newSortOrder = refNode.sortOrder;
          updates.push({ id: movingNode.id, sortOrder: newSortOrder });
          
          // Reorder all nodes from reference point onwards
          let currentSortOrder = newSortOrder + 10;
          const refIndex = availableNodes.indexOf(refNode);
          for (let i = refIndex; i < availableNodes.length; i++) {
            updates.push({
              id: availableNodes[i].id,
              sortOrder: currentSortOrder
            });
            currentSortOrder += 10;
          }
        }
        break;
      }
      
      case 'AFTER': {
        const refNode = availableNodes.find(node => node.id === placement.referenceNodeId);
        if (refNode) {
          newSortOrder = refNode.sortOrder + 10;
          updates.push({ id: movingNode.id, sortOrder: newSortOrder });
          
          // Reorder all nodes after reference point
          let currentSortOrder = newSortOrder + 10;
          const refIndex = availableNodes.indexOf(refNode);
          for (let i = refIndex + 1; i < availableNodes.length; i++) {
            updates.push({
              id: availableNodes[i].id,
              sortOrder: currentSortOrder
            });
            currentSortOrder += 10;
          }
        }
        break;
      }
    }
    
    return updates;
  };

  const onSubmit = (data: MoveForm) => {
    const updates = calculateMovement(data.placement);
    
    if (updates.length > 0) {
      reorderMutation.mutate({
        configId,
        updates
      });
    }
  };

  const isPending = reorderMutation.isPending;
  const isValid = form.formState.isValid;

  if (!open) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Move Category
            </h2>
            <p className="text-sm text-slate-400">
              Moving &quot;{movingNode.label}&quot;
              {availableNodes.length > 0 && (
                <span className="block mt-1">
                  {availableNodes.length} other {availableNodes.length === 1 ? 'category' : 'categories'} at this level
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="placement.type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">New Position</FormLabel>
                  <FormControl>
                    <ComboBox
                      items={MOVEMENT_OPTIONS}
                      value={MOVEMENT_OPTIONS.find(opt => opt.value === selectedPlacement)}
                      onChange={(item) => {
                        field.onChange(item.value);
                        handlePlacementChange(item.value);
                      }}
                      fieldMapping={{
                        labelColumn: 'label',
                        keyColumn: 'value'
                      }}
                      placeholder="Select position"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(selectedPlacement === 'BEFORE' || selectedPlacement === 'AFTER') && availableNodes.length > 0 && (
              <FormField
                control={form.control}
                name="placement.referenceNodeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      {selectedPlacement === 'BEFORE' ? 'Before which category?' : 'After which category?'}
                    </FormLabel>
                    <FormControl>
                      <ComboBox
                        items={availableNodes}
                        value={availableNodes.find(node => node.id === field.value)}
                        onChange={(item) => {
                          console.log('ComboBox onChange:', item);
                          field.onChange(item.id);
                        }}
                        fieldMapping={{
                          labelColumn: 'label',
                          keyColumn: 'id'
                        }}
                        placeholder={`Select a category`}
                        className="w-full"
                        withSearch={availableNodes.length > 5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                onClick={handleClose}
                className="flex-1 border border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isValid || isPending}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending ? 'Moving...' : 'Move Category'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}