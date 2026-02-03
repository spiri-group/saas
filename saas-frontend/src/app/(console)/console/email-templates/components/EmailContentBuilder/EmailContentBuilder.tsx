"use client";

import { JSX, useState, useEffect } from "react";
import { Plus, Trash2, Edit, Settings2, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, GripVertical, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ContentBlockEditor from "./ContentBlockEditor";
import LayoutSelector from "./LayoutSelector";
import useKeyboardShortcuts from "../../hooks/UseKeyboardShortcuts";
import {
  EmailStructure,
  ContentBlock,
  ColorSwatch,
  Divider,
  createContentBlock,
  LayoutType,
  LAYOUT_DEFINITIONS,
} from "./types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface EmailContentBuilderProps {
  value?: EmailStructure;
  onChange: (structure: EmailStructure) => void;
  isActive?: boolean;
  currentStep?: 1 | 2 | 3;
  onStepChange?: (step: 1 | 2 | 3) => void;
}

export default function EmailContentBuilder({
  value,
  onChange,
  isActive = true,
  currentStep: externalCurrentStep,
  onStepChange,
}: EmailContentBuilderProps) {
  const [emailStructure, setEmailStructure] = useState<EmailStructure>(
    value || { contentBlocks: [], layout: undefined }
  );
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [internalCurrentStep, setInternalCurrentStep] = useState<1 | 2 | 3>(1);

  // Sync internal state with value prop when it changes
  useEffect(() => {
    if (value) {
      setEmailStructure(value);
    }
  }, [value]);

  // Use external step if provided, otherwise use internal
  const currentStep = externalCurrentStep ?? internalCurrentStep;
  const setCurrentStep = (step: 1 | 2 | 3) => {
    if (onStepChange) {
      onStepChange(step);
    } else {
      setInternalCurrentStep(step);
    }
  };
  const [slotSelectionOpen, setSlotSelectionOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [dividerDialogOpen, setDividerDialogOpen] = useState(false);
  const [pendingDivider, setPendingDivider] = useState<{
    orientation: "horizontal" | "vertical";
    position: number;
    maxSpan: number;
  } | null>(null);
  const [editingDivider, setEditingDivider] = useState<Divider | null>(null);
  const [dividerSpan, setDividerSpan] = useState(1);
  const [dividerColor, setDividerColor] = useState("#000000");
  const [dividerThickness, setDividerThickness] = useState(1);
  const [dividerMarginTop, setDividerMarginTop] = useState(20);
  const [dividerMarginBottom, setDividerMarginBottom] = useState(20);
  const [layoutStyleDialogOpen, setLayoutStyleDialogOpen] = useState(false);
  const [editingSlotWidth, setEditingSlotWidth] = useState<string | null>(null);
  const [formattingBlockId, setFormattingBlockId] = useState<string | null>(null);
  const [paletteDialogOpen, setPaletteDialogOpen] = useState(false);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = emailStructure.contentBlocks.findIndex((b) => b.id === active.id);
      const newIndex = emailStructure.contentBlocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        updateStructure({
          contentBlocks: arrayMove(emailStructure.contentBlocks, oldIndex, newIndex),
        });
      }
    }
  };

  const updateStructure = (updates: Partial<EmailStructure>) => {
    const newStructure = { ...emailStructure, ...updates };
    setEmailStructure(newStructure);
    onChange(newStructure);
  };

  const moveSpacerLeft = (rowIndex: number, currentPosition: number) => {
    if (!emailStructure.layout || currentPosition === 0) return;

    updateStructure({
      layout: {
        ...emailStructure.layout,
        spacerPositions: {
          ...emailStructure.layout.spacerPositions,
          [rowIndex]: currentPosition - 1,
        },
      },
    });
  };

  const moveSpacerRight = (rowIndex: number, currentPosition: number, maxPosition: number) => {
    if (!emailStructure.layout || currentPosition === maxPosition) return;

    updateStructure({
      layout: {
        ...emailStructure.layout,
        spacerPositions: {
          ...emailStructure.layout.spacerPositions,
          [rowIndex]: currentPosition + 1,
        },
      },
    });
  };

  const addContentBlock = () => {
    const newBlock = createContentBlock();
    updateStructure({
      contentBlocks: [...emailStructure.contentBlocks, newBlock],
    });
    setEditingBlockId(newBlock.id);
  };

  const updateContentBlock = (updatedBlock: ContentBlock) => {
    updateStructure({
      contentBlocks: emailStructure.contentBlocks.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block
      ),
    });
  };

  const deleteContentBlock = (blockId: string) => {
    // Remove from blocks
    const newBlocks = emailStructure.contentBlocks.filter((b) => b.id !== blockId);

    // Remove from layout slots
    const newSlots = { ...emailStructure.layout?.slots };
    Object.keys(newSlots).forEach((slotId) => {
      if (newSlots[slotId] === blockId) {
        delete newSlots[slotId];
      }
    });

    updateStructure({
      contentBlocks: newBlocks,
      layout: emailStructure.layout ? { ...emailStructure.layout, slots: newSlots } : undefined,
    });
  };

  const duplicateContentBlock = (blockId: string) => {
    const blockIndex = emailStructure.contentBlocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;
    const original = emailStructure.contentBlocks[blockIndex];
    const clone = { ...original, id: crypto.randomUUID() };
    const newBlocks = [...emailStructure.contentBlocks];
    newBlocks.splice(blockIndex + 1, 0, clone);
    updateStructure({ contentBlocks: newBlocks });
  };

  // Palette helpers
  const addPaletteColor = () => {
    const palette = emailStructure.colorPalette || [];
    updateStructure({
      colorPalette: [...palette, { id: crypto.randomUUID(), label: `Color ${palette.length + 1}`, color: "#6b21a8" }],
    });
  };

  const updatePaletteColor = (id: string, updates: Partial<ColorSwatch>) => {
    const palette = (emailStructure.colorPalette || []).map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    updateStructure({ colorPalette: palette });
  };

  const removePaletteColor = (id: string) => {
    updateStructure({
      colorPalette: (emailStructure.colorPalette || []).filter((c) => c.id !== id),
    });
  };

  const selectLayout = (layoutType: LayoutType) => {
    updateStructure({
      layout: {
        type: layoutType,
        slots: {},
        dividers: [],
        backgroundColor: undefined,
        backgroundImage: undefined,
        padding: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
      },
    });
    setCurrentStep(3);
  };

  const canProceedToStep2 = emailStructure.contentBlocks.length > 0;
  const canProceedToStep3 = emailStructure.layout !== undefined;

  const handleSlotClick = (slotId: string) => {
    setSelectedSlotId(slotId);
    setSlotSelectionOpen(true);
  };

  const handleBlockSelection = (blockId: string) => {
    if (selectedSlotId && emailStructure.layout) {
      updateStructure({
        layout: {
          ...emailStructure.layout,
          slots: {
            ...emailStructure.layout.slots,
            [selectedSlotId]: blockId,
          },
        },
      });
    }
    setSlotSelectionOpen(false);
    setSelectedSlotId(null);
  };

  const handleClearSlot = () => {
    if (selectedSlotId && emailStructure.layout) {
      const newSlots = { ...emailStructure.layout.slots };
      delete newSlots[selectedSlotId];
      updateStructure({
        layout: {
          ...emailStructure.layout,
          slots: newSlots,
        },
      });
    }
    setSlotSelectionOpen(false);
    setSelectedSlotId(null);
  };

  const handleAddDivider = (orientation: "horizontal" | "vertical", position: number, maxSpan: number) => {
    setPendingDivider({ orientation, position, maxSpan });
    setEditingDivider(null);
    setDividerSpan(maxSpan); // Default to full span
    setDividerColor("#000000");
    setDividerThickness(1);
    setDividerMarginTop(20);
    setDividerMarginBottom(20);
    setDividerDialogOpen(true);
  };

  const handleEditDivider = (divider: Divider, maxSpan: number) => {
    setEditingDivider(divider);
    setPendingDivider({ orientation: divider.orientation, position: divider.position, maxSpan });
    setDividerSpan(divider.span);
    setDividerColor(divider.style?.color || "#000000");
    setDividerThickness(divider.style?.height || 1);
    setDividerMarginTop(divider.style?.margin || 20);
    setDividerMarginBottom(divider.style?.margin || 20);
    setDividerDialogOpen(true);
  };

  const handleConfirmDivider = () => {
    if (!emailStructure.layout) return;

    if (editingDivider) {
      // Update existing divider
      updateStructure({
        layout: {
          ...emailStructure.layout,
          dividers: (emailStructure.layout.dividers || []).map(d =>
            d.id === editingDivider.id
              ? {
                  ...d,
                  span: dividerSpan,
                  style: {
                    color: dividerColor,
                    height: dividerThickness,
                    margin: dividerMarginTop, // Using top for now, can split later
                  },
                }
              : d
          ),
        },
      });
    } else if (pendingDivider) {
      // Create new divider
      const newDivider: Divider = {
        id: crypto.randomUUID(),
        orientation: pendingDivider.orientation,
        position: pendingDivider.position,
        span: dividerSpan,
        style: {
          color: dividerColor,
          height: dividerThickness,
          margin: dividerMarginTop,
        },
      };

      updateStructure({
        layout: {
          ...emailStructure.layout,
          dividers: [...(emailStructure.layout.dividers || []), newDivider],
        },
      });
    }

    setDividerDialogOpen(false);
    setPendingDivider(null);
    setEditingDivider(null);
  };

  const handleRemoveDivider = (dividerId: string) => {
    if (emailStructure.layout) {
      updateStructure({
        layout: {
          ...emailStructure.layout,
          dividers: (emailStructure.layout.dividers || []).filter(d => d.id !== dividerId),
        },
      });
    }
  };

  const editingBlock = emailStructure.contentBlocks.find(
    (b) => b.id === editingBlockId
  );

  const selectedLayoutDef = emailStructure.layout
    ? LAYOUT_DEFINITIONS.find((l) => l.type === emailStructure.layout?.type)
    : undefined;

  const selectedSlotLabel = selectedSlotId && selectedLayoutDef
    ? selectedLayoutDef.slots.find(s => s.id === selectedSlotId)?.label
    : "";

  const currentBlockInSlot = selectedSlotId && emailStructure.layout?.slots
    ? emailStructure.contentBlocks.find(b => b.id === emailStructure.layout?.slots[selectedSlotId])
    : undefined;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'n', action: addContentBlock, description: 'Create new content block' },
      { key: 'Escape', action: () => setEditingBlockId(null), description: 'Close block editor' },
    ],
    enabled: isActive && !editingBlockId && !slotSelectionOpen && !dividerDialogOpen
  });

  return (
    <>
      <div className="flex h-full relative">
        {/* Left Navigation */}
        <div className="w-64 border-r border-slate-800 p-6 space-y-2 flex-shrink-0">
          <button
            onClick={() => setCurrentStep(1)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
              currentStep === 1
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs flex-shrink-0",
              currentStep === 1
                ? "bg-white text-purple-600"
                : "bg-slate-700 text-slate-400"
            )}>
              1
            </div>
            <span className="font-medium">Create Blocks</span>
          </button>

          <button
            onClick={() => canProceedToStep2 && setCurrentStep(2)}
            disabled={!canProceedToStep2}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
              currentStep === 2
                ? "bg-purple-600 text-white"
                : canProceedToStep2
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-slate-600 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs flex-shrink-0",
              currentStep === 2
                ? "bg-white text-purple-600"
                : canProceedToStep2
                ? "bg-slate-700 text-slate-400"
                : "bg-slate-800 text-slate-600"
            )}>
              2
            </div>
            <span className="font-medium">Choose Layout</span>
          </button>

          <button
            onClick={() => canProceedToStep3 && setCurrentStep(3)}
            disabled={!canProceedToStep3}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
              currentStep === 3
                ? "bg-purple-600 text-white"
                : canProceedToStep3
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-slate-600 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs flex-shrink-0",
              currentStep === 3
                ? "bg-white text-purple-600"
                : canProceedToStep3
                ? "bg-slate-700 text-slate-400"
                : "bg-slate-800 text-slate-600"
            )}>
              3
            </div>
            <span className="font-medium">Arrange Blocks</span>
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col p-6 pr-8 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {/* Step 1: Create Blocks */}
            {currentStep === 1 && (
              <div className="h-full flex flex-col space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Create Blocks</h2>
                <p className="text-slate-400">Add text, images, or media blocks for your email template</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {emailStructure.contentBlocks.length} {emailStructure.contentBlocks.length === 1 ? 'block' : 'blocks'} created
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPaletteDialogOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Palette className="h-3 w-3 mr-1" />
                    Color Palette
                    {(emailStructure.colorPalette?.length || 0) > 0 && (
                      <span className="ml-1 text-xs text-purple-400">({emailStructure.colorPalette?.length})</span>
                    )}
                  </Button>
                  <Button
                    onClick={addContentBlock}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Block
                  </Button>
                </div>
              </div>

              {emailStructure.contentBlocks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg bg-slate-900/50">
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-600/10 flex items-center justify-center">
                      <Plus className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-slate-400 mb-4">No content blocks yet</p>
                    <Button
                      onClick={addContentBlock}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Block
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={emailStructure.contentBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {emailStructure.contentBlocks.map((block) => (
                          <SortableBlockCard
                            key={block.id}
                            block={block}
                            onEdit={() => setEditingBlockId(block.id)}
                            onDelete={() => deleteContentBlock(block.id)}
                            onDuplicate={() => duplicateContentBlock(block.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end">
                    <Button
                      onClick={() => setCurrentStep(2)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Next: Choose Layout →
                    </Button>
                  </div>
                </>
              )}
              </div>
            )}

            {/* Step 2: Choose Layout */}
            {currentStep === 2 && (
              <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Choose Layout</h2>
                <p className="text-slate-400">Select how to arrange your {emailStructure.contentBlocks.length} content blocks</p>
              </div>

              <LayoutSelector
                blockCount={emailStructure.contentBlocks.length}
                selectedLayout={emailStructure.layout?.type}
                onSelectLayout={selectLayout}
              />
              </div>
            )}

            {/* Step 3: Arrange Blocks */}
            {currentStep === 3 && selectedLayoutDef && (
              <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Arrange Blocks</h2>
                  <p className="text-slate-400">Click on each slot to assign a content block</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More Blocks
                  </Button>
                  <Button
                    onClick={() => setLayoutStyleDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Layout Style
                  </Button>
                </div>
              </div>

              <LayoutCanvas
                layout={selectedLayoutDef}
                slots={emailStructure.layout?.slots || {}}
                slotWidths={emailStructure.layout?.slotWidths || {}}
                spacerPositions={emailStructure.layout?.spacerPositions || {}}
                blocks={emailStructure.contentBlocks}
                dividers={emailStructure.layout?.dividers || []}
                backgroundColor={emailStructure.layout?.backgroundColor}
                backgroundImage={emailStructure.layout?.backgroundImage}
                padding={emailStructure.layout?.padding}
                onSlotClick={handleSlotClick}
                onSlotWidthEdit={(slotId) => setEditingSlotWidth(slotId)}
                onBlockFormat={(blockId) => setFormattingBlockId(blockId)}
                onBlockUpdate={updateContentBlock}
                onMoveSpacerLeft={moveSpacerLeft}
                onMoveSpacerRight={moveSpacerRight}
                onAddDivider={handleAddDivider}
                onEditDivider={handleEditDivider}
                onRemoveDivider={handleRemoveDivider}
              />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block Editor Panel - Floating */}
      {editingBlock && (
        <ContentBlockEditor
          block={editingBlock}
          onUpdate={updateContentBlock}
          onClose={() => setEditingBlockId(null)}
          colorPalette={emailStructure.colorPalette}
        />
      )}

      {/* Block Selection Dialog */}
      <Dialog open={slotSelectionOpen} onOpenChange={setSlotSelectionOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Assign Block to {selectedSlotLabel}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {currentBlockInSlot
                ? `Currently assigned: ${currentBlockInSlot.label || currentBlockInSlot.title || "Untitled Block"}`
                : "Choose a content block to place in this slot"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {emailStructure.contentBlocks.map((block) => {
              const hasContent = () => {
                switch (block.blockType) {
                  case "text":
                    return block.title || block.subtitle || block.description;
                  case "image":
                    return block.imageUrl;
                  case "button":
                    return block.buttonText && block.buttonUrl;
                  case "table":
                    return block.tableColumns && block.tableColumns.length > 0;
                  case "social":
                    return block.socialFacebookUrl || block.socialXUrl || block.socialInstagramUrl || block.socialLinkedinUrl || block.socialYoutubeUrl || block.socialTiktokUrl;
                  case "infoCard":
                    return block.infoCardItems && block.infoCardItems.length > 0;
                  case "hero":
                    return block.heroTitle || block.heroSubtitle;
                  case "dividerBlock":
                    return true;
                  case "spacer":
                    return true;
                  default:
                    return false;
                }
              };

              const getBlockTypeLabel = () => {
                switch (block.blockType) {
                  case "text": return "Text Block";
                  case "image": return "Image Block";
                  case "button": return "Button Block";
                  case "table": return "Table Block";
                  case "social": return "Social Block";
                  case "infoCard": return "Info Card";
                  case "hero": return "Hero / Banner";
                  case "dividerBlock": return "Divider";
                  case "spacer": return "Spacer";
                  default: return "Block";
                }
              };

              const getBlockDisplayText = () => {
                if (block.label) return block.label;
                switch (block.blockType) {
                  case "text": return block.title || block.subtitle || "Text Block";
                  case "image": return block.imageAlt || "Image Block";
                  case "button": return block.buttonText || "Button Block";
                  case "table": return "Table Block";
                  case "social": return "Social Block";
                  case "infoCard": return `Info Card (${block.infoCardItems?.length || 0} items)`;
                  case "hero": return block.heroTitle || "Hero / Banner";
                  case "dividerBlock": return "Divider";
                  case "spacer": return `Spacer (${block.spacerHeight || 20}px)`;
                  default: return "Untitled Block";
                }
              };

              const isAssigned = currentBlockInSlot?.id === block.id;

              return (
                <button
                  key={block.id}
                  onClick={() => handleBlockSelection(block.id)}
                  className={cn(
                    "w-full p-4 bg-slate-800 border border-slate-700 rounded-lg text-left hover:border-purple-500 transition-all",
                    isAssigned && "border-purple-500 bg-purple-500/10"
                  )}
                >
                  <p className="text-sm font-medium text-white truncate">
                    {getBlockDisplayText()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {getBlockTypeLabel()}
                  </p>
                  {!hasContent() && (
                    <p className="text-xs text-amber-400 mt-1">Empty block</p>
                  )}
                  {isAssigned && (
                    <p className="text-xs text-purple-400 mt-1">✓ Currently assigned</p>
                  )}
                </button>
              );
            })}
          </div>

          {currentBlockInSlot && (
            <Button
              onClick={handleClearSlot}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Clear Slot
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Layout Style Dialog */}
      <Dialog open={layoutStyleDialogOpen} onOpenChange={setLayoutStyleDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Layout Style
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure background color, image, and padding for this layout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Background Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={emailStructure.layout?.backgroundColor || "#ffffff"}
                  onChange={(e) => updateStructure({
                    layout: emailStructure.layout ? {
                      ...emailStructure.layout,
                      backgroundColor: e.target.value
                    } : undefined
                  })}
                  className="bg-slate-800 border-slate-700 w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={emailStructure.layout?.backgroundColor || ""}
                  onChange={(e) => updateStructure({
                    layout: emailStructure.layout ? {
                      ...emailStructure.layout,
                      backgroundColor: e.target.value
                    } : undefined
                  })}
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Background Image URL (optional)</Label>
              <Input
                type="text"
                value={emailStructure.layout?.backgroundImage || ""}
                onChange={(e) => updateStructure({
                  layout: emailStructure.layout ? {
                    ...emailStructure.layout,
                    backgroundImage: e.target.value
                  } : undefined
                })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
                placeholder="https://example.com/background.jpg"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">Padding (px)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Top</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={emailStructure.layout?.padding?.top || 20}
                    onChange={() => updateStructure({
                      layout: emailStructure.layout ? {
                        ...emailStructure.layout,
                        padding: {
                          top: emailStructure.layout.padding?.top || 20,
                          bottom: emailStructure.layout.padding?.bottom || 20,
                          left: emailStructure.layout.padding?.left || 20,
                          right: emailStructure.layout.padding?.right || 20,
                          ...emailStructure.layout.padding
                        }
                      } : undefined
                    })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Bottom</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={emailStructure.layout?.padding?.bottom || 20}
                    onChange={() => updateStructure({
                      layout: emailStructure.layout ? {
                        ...emailStructure.layout,
                        padding: {
                          top: emailStructure.layout.padding?.top || 20,
                          bottom: emailStructure.layout.padding?.bottom || 20,
                          left: emailStructure.layout.padding?.left || 20,
                          right: emailStructure.layout.padding?.right || 20,
                          ...emailStructure.layout.padding
                        }
                      } : undefined
                    })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Left</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={emailStructure.layout?.padding?.left || 20}
                    onChange={() => updateStructure({
                      layout: emailStructure.layout ? {
                        ...emailStructure.layout,
                        padding: {
                          top: emailStructure.layout.padding?.top || 20,
                          bottom: emailStructure.layout.padding?.bottom || 20,
                          left: emailStructure.layout.padding?.left || 20,
                          right: emailStructure.layout.padding?.right || 20,
                          ...emailStructure.layout.padding
                        }
                      } : undefined
                    })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Right</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={emailStructure.layout?.padding?.right || 20}
                    onChange={() => updateStructure({
                      layout: emailStructure.layout ? {
                        ...emailStructure.layout,
                        padding: {
                          top: emailStructure.layout.padding?.top || 20,
                          bottom: emailStructure.layout.padding?.bottom || 20,
                          left: emailStructure.layout.padding?.left || 20,
                          right: emailStructure.layout.padding?.right || 20,
                          ...emailStructure.layout.padding
                        }
                      } : undefined
                    })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setLayoutStyleDialogOpen(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot Width Configuration Dialog */}
      <Dialog open={!!editingSlotWidth} onOpenChange={(open) => !open && setEditingSlotWidth(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Slot Width
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure the width of this slot as a percentage
            </DialogDescription>
          </DialogHeader>

          {editingSlotWidth && selectedLayoutDef && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">
                  Width: {emailStructure.layout?.slotWidths?.[editingSlotWidth] || 'Auto'}%
                </Label>
                <Input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={emailStructure.layout?.slotWidths?.[editingSlotWidth] || 50}
                  onChange={(e) => {
                    const width = parseInt(e.target.value);
                    updateStructure({
                      layout: emailStructure.layout ? {
                        ...emailStructure.layout,
                        slotWidths: {
                          ...emailStructure.layout.slotWidths,
                          [editingSlotWidth]: width,
                        },
                      } : undefined
                    });
                  }}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>10%</span>
                  <span>50%</span>
                  <span>90%</span>
                </div>
              </div>

              <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                <p className="text-xs text-slate-400">
                  💡 <strong>Tip:</strong> Adjust the slider to control how much space this slot takes up. Other slots in the same row will adjust automatically.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setEditingSlotWidth(null)}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Text Formatting Dialog */}
      <Dialog open={!!formattingBlockId} onOpenChange={(open) => !open && setFormattingBlockId(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Type className="h-5 w-5" />
              Text Formatting
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Adjust text alignment for title, subtitle, and body
            </DialogDescription>
          </DialogHeader>

          {formattingBlockId && (() => {
            const block = emailStructure.contentBlocks.find(b => b.id === formattingBlockId);
            if (!block || block.blockType !== "text") return null;

            const handleAlignmentChange = (field: 'titleAlign' | 'subtitleAlign' | 'descriptionAlign', value: string) => {
              updateContentBlock({
                ...block,
                [field]: value,
              });
            };

            return (
              <div className="space-y-4">
                {/* Title Alignment */}
                {block.title && (
                  <div>
                    <Label className="text-slate-300 mb-2 block">Title Alignment</Label>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAlignmentChange('titleAlign', 'left')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "flex-1 h-9",
                          block.titleAlign === 'left' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignLeft className="h-4 w-4 mr-2" />
                        Left
                      </Button>
                      <Button
                        onClick={() => handleAlignmentChange('titleAlign', 'center')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "flex-1 h-9",
                          block.titleAlign === 'center' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignCenter className="h-4 w-4 mr-2" />
                        Center
                      </Button>
                      <Button
                        onClick={() => handleAlignmentChange('titleAlign', 'right')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "flex-1 h-9",
                          block.titleAlign === 'right' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignRight className="h-4 w-4 mr-2" />
                        Right
                      </Button>
                    </div>
                  </div>
                )}

                {/* Subtitle Alignment */}
                {block.subtitle && (
                  <div>
                    <Label className="text-slate-300 mb-2 block">Subtitle Alignment</Label>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAlignmentChange('subtitleAlign', 'left')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "flex-1 h-9",
                          block.subtitleAlign === 'left' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignLeft className="h-4 w-4 mr-2" />
                        Left
                      </Button>
                      <Button
                        onClick={() => handleAlignmentChange('subtitleAlign', 'center')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "flex-1 h-9",
                          block.subtitleAlign === 'center' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignCenter className="h-4 w-4 mr-2" />
                        Center
                      </Button>
                      <Button
                        onClick={() => handleAlignmentChange('subtitleAlign', 'right')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "flex-1 h-9",
                          block.subtitleAlign === 'right' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignRight className="h-4 w-4 mr-2" />
                        Right
                      </Button>
                    </div>
                  </div>
                )}

                {/* Description Alignment */}
                {block.description && (
                  <div>
                    <Label className="text-slate-300 mb-2 block">Body Alignment</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleAlignmentChange('descriptionAlign', 'left')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-9",
                          block.descriptionAlign === 'left' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignLeft className="h-4 w-4 mr-2" />
                        Left
                      </Button>
                      <Button
                        onClick={() => handleAlignmentChange('descriptionAlign', 'center')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-9",
                          block.descriptionAlign === 'center' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignCenter className="h-4 w-4 mr-2" />
                        Center
                      </Button>
                      <Button
                        onClick={() => handleAlignmentChange('descriptionAlign', 'right')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-9",
                          block.descriptionAlign === 'right' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignRight className="h-4 w-4 mr-2" />
                        Right
                      </Button>
                      <Button
                        onClick={() => handleAlignmentChange('descriptionAlign', 'justify')}
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-9",
                          block.descriptionAlign === 'justify' ? "bg-purple-600 text-white border-purple-600" : "border-slate-600 text-slate-300"
                        )}
                      >
                        <AlignJustify className="h-4 w-4 mr-2" />
                        Justify
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button
              onClick={() => setFormattingBlockId(null)}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Divider Configuration Dialog */}
      <Dialog open={dividerDialogOpen} onOpenChange={setDividerDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingDivider ? 'Edit Divider' : 'Add Divider'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure a {pendingDivider?.orientation} divider line to separate content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Width (cells to cover)</Label>
              <Input
                type="number"
                min={1}
                max={pendingDivider?.maxSpan || 1}
                value={dividerSpan}
                onChange={(e) => setDividerSpan(parseInt(e.target.value) || 1)}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                Maximum: {pendingDivider?.maxSpan} cell{(pendingDivider?.maxSpan || 0) > 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <Label className="text-slate-300">Thickness (px)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={dividerThickness}
                onChange={(e) => setDividerThickness(parseInt(e.target.value) || 1)}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-slate-300">Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={dividerColor}
                  onChange={(e) => setDividerColor(e.target.value)}
                  className="bg-slate-800 border-slate-700 w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={dividerColor}
                  onChange={(e) => setDividerColor(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Margin Top (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={dividerMarginTop}
                  onChange={(e) => setDividerMarginTop(parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-slate-300">Margin Bottom (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={dividerMarginBottom}
                  onChange={(e) => setDividerMarginBottom(parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white mt-2"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800">
              <p className="text-xs text-slate-400 mb-2">Preview:</p>
              <div
                style={{
                  backgroundColor: dividerColor,
                  height: `${dividerThickness}px`,
                  marginTop: `${dividerMarginTop}px`,
                  marginBottom: `${dividerMarginBottom}px`,
                  width: `${(dividerSpan / (pendingDivider?.maxSpan || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setDividerDialogOpen(false)}
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDivider}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {editingDivider ? 'Save Changes' : 'Add Divider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Color Palette Dialog */}
      <Dialog open={paletteDialogOpen} onOpenChange={setPaletteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Palette
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Define brand colors to quickly apply across your email blocks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {(emailStructure.colorPalette || []).map((swatch) => (
              <div key={swatch.id} className="flex items-center gap-2">
                <Input
                  type="color"
                  value={swatch.color}
                  onChange={(e) => updatePaletteColor(swatch.id, { color: e.target.value })}
                  className="bg-slate-800 border-slate-700 w-10 h-8 p-1 flex-shrink-0"
                />
                <Input
                  type="text"
                  value={swatch.color}
                  onChange={(e) => updatePaletteColor(swatch.id, { color: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white text-xs w-24 flex-shrink-0"
                  placeholder="#000000"
                />
                <Input
                  type="text"
                  value={swatch.label}
                  onChange={(e) => updatePaletteColor(swatch.id, { label: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                  placeholder="Label"
                />
                <Button
                  onClick={() => removePaletteColor(swatch.id)}
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {(!emailStructure.colorPalette || emailStructure.colorPalette.length === 0) && (
              <p className="text-xs text-slate-500 text-center py-4">
                No palette colors yet. Add colors to quickly apply them across blocks.
              </p>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button
              onClick={addPaletteColor}
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Color
            </Button>
            <Button
              onClick={() => setPaletteDialogOpen(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SortableBlockCard(props: {
  block: ContentBlock;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockCard
        block={props.block}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
        onDuplicate={props.onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function BlockCard({
  block,
  onEdit,
  onDelete,
  onDuplicate,
  dragHandleProps,
}: {
  block: ContentBlock;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const hasContent = () => {
    switch (block.blockType) {
      case "text":
        return block.title || block.subtitle || block.description;
      case "image":
        return block.imageUrl;
      case "button":
        return block.buttonText && block.buttonUrl;
      case "table":
        return block.tableColumns && block.tableColumns.length > 0;
      case "social":
        return block.socialFacebookUrl || block.socialXUrl || block.socialInstagramUrl || block.socialLinkedinUrl || block.socialYoutubeUrl || block.socialTiktokUrl;
      case "infoCard":
        return block.infoCardItems && block.infoCardItems.length > 0;
      case "hero":
        return block.heroTitle || block.heroSubtitle;
      case "dividerBlock":
        return true;
      case "spacer":
        return true;
      default:
        return false;
    }
  };

  const getBlockTypeLabel = () => {
    switch (block.blockType) {
      case "text": return "Text Block";
      case "image": return "Image Block";
      case "button": return "Button Block";
      case "table": return "Table Block";
      case "social": return "Social Block";
      case "infoCard": return "Info Card";
      case "hero": return "Hero / Banner";
      case "dividerBlock": return "Divider";
      case "spacer": return "Spacer";
      default: return "Block";
    }
  };

  const getBlockDisplayText = () => {
    if (block.label) return block.label;
    switch (block.blockType) {
      case "text": return block.title || block.subtitle || "Text Block";
      case "image": return block.imageAlt || "Image Block";
      case "button": return block.buttonText || "Button Block";
      case "table": return "Table Block";
      case "social": return "Social Block";
      case "infoCard": return `Info Card (${block.infoCardItems?.length || 0} items)`;
      case "hero": return block.heroTitle || "Hero / Banner";
      case "dividerBlock": return "Divider";
      case "spacer": return `Spacer (${block.spacerHeight || 20}px)`;
      default: return "Untitled Block";
    }
  };

  return (
    <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg transition-all hover:border-slate-600">
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 flex-shrink-0"
            tabIndex={-1}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {getBlockDisplayText()}
          </p>
          <p className="text-xs text-slate-400">
            {getBlockTypeLabel()}
          </p>
          {!hasContent() && (
            <p className="text-xs text-amber-400 mt-1">Empty - click edit to add content</p>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            onClick={onEdit}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          {onDuplicate && (
            <Button
              onClick={onDuplicate}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              title="Duplicate block"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
          <Button
            onClick={onDelete}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LayoutCanvas({
  layout,
  slots,
  slotWidths,
  spacerPositions,
  blocks,
  backgroundColor,
  backgroundImage,
  padding,
  onSlotClick,
  onSlotWidthEdit,
  onBlockFormat,
  onBlockUpdate,
  onMoveSpacerLeft,
  onMoveSpacerRight,
}: {
  layout: any;
  slots: Record<string, string>;
  slotWidths: Record<string, number>;
  spacerPositions: Record<number, number>;
  blocks: ContentBlock[];
  dividers: Divider[];
  backgroundColor?: string;
  backgroundImage?: string;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  onSlotClick: (slotId: string) => void;
  onSlotWidthEdit: (slotId: string) => void;
  onBlockFormat: (blockId: string) => void;
  onBlockUpdate: (block: ContentBlock) => void;
  onMoveSpacerLeft: (rowIndex: number, currentPosition: number) => void;
  onMoveSpacerRight: (rowIndex: number, currentPosition: number, maxPosition: number) => void;
  onAddDivider: (orientation: "horizontal" | "vertical", position: number, maxSpan: number) => void;
  onEditDivider: (divider: Divider, maxSpan: number) => void;
  onRemoveDivider: (dividerId: string) => void;
}) {
  const containerStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || undefined,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    paddingTop: `${padding?.top || 20}px`,
    paddingBottom: `${padding?.bottom || 20}px`,
    paddingLeft: `${padding?.left || 20}px`,
    paddingRight: `${padding?.right || 20}px`,
  };

  // Helper to determine if layout should stack vertically or use rows
  const shouldStack = () => {
    return layout.type === "two-stacked" || layout.type === "three-stacked";
  };

  // Helper to group slots into rows for hero layouts
  const getSlotRows = () => {
    const layoutSlots = layout.slots || [];

    // For hero layouts, group hero separately from columns
    if (layout.type === "hero-two-column") {
      return [
        [layoutSlots[0]], // Hero slot
        [layoutSlots[1], layoutSlots[2]] // Two columns
      ];
    } else if (layout.type === "two-top-stacked") {
      return [
        [layoutSlots[0], layoutSlots[1]], // Two columns on top
        [layoutSlots[2]] // Bottom slot
      ];
    } else if (layout.type === "hero-three-column") {
      return [
        [layoutSlots[0]], // Hero slot
        [layoutSlots[1], layoutSlots[2], layoutSlots[3]] // Three columns
      ];
    } else if (layout.type === "four-grid") {
      return [
        [layoutSlots[0], layoutSlots[1]], // First row
        [layoutSlots[2], layoutSlots[3]] // Second row
      ];
    } else if (layout.type === "three-stacked") {
      return [
        [layoutSlots[0]], // Top
        [layoutSlots[1]], // Middle
        [layoutSlots[2]]  // Bottom
      ];
    } else {
      // All other layouts: single row
      return [layoutSlots];
    }
  };

  // Helper to render slots with automatic spacer insertion
  const renderSlotsWithSpacers = (rowSlots: any[], rowIndex: number) => {
    const elements: JSX.Element[] = [];

    // Calculate total width used by slots with custom widths
    let totalCustomWidth = 0;
    let slotsWithCustomWidths = 0;

    rowSlots.forEach(slot => {
      if (slotWidths[slot.id]) {
        totalCustomWidth += slotWidths[slot.id];
        slotsWithCustomWidths++;
      }
    });

    // Only add spacer if ALL slots have custom widths and they don't fill 100%
    // If some slots don't have widths, they'll use flex: 1 and fill remaining space
    const allSlotsHaveWidths = slotsWithCustomWidths === rowSlots.length;
    const spacerWidth = 100 - totalCustomWidth;
    
    // Show spacer only if:
    // 1. All slots have custom widths (otherwise flex slots will fill space)
    // 2. Total width is less than 100% (with a 1% threshold to avoid tiny spacers from rounding)
    const needsSpacer = allSlotsHaveWidths && spacerWidth > 1;

    // Get spacer position for this row (default to end)
    const spacerPosition = spacerPositions[rowIndex] ?? rowSlots.length; // Default to after all slots

    if (!needsSpacer) {
      // No spacer needed, just render slots
      rowSlots.forEach((slot) => {
        const block = blocks.find((b) => b.id === slots[slot.id]);
        elements.push(
          <ClickableSlot
            key={slot.id}
            slotId={slot.id}
            label={slot.label}
            size={slot.size}
            block={block}
            slotWidth={slotWidths[slot.id]}
            onClick={() => onSlotClick(slot.id)}
            onWidthEdit={() => onSlotWidthEdit(slot.id)}
            onBlockFormat={block ? () => onBlockFormat(block.id) : undefined}
            onBlockUpdate={onBlockUpdate}
          />
        );
      });
      return elements;
    }

    // Render slots and spacer at the specified position
    for (let i = 0; i <= rowSlots.length; i++) {
      // Insert spacer at its position
      if (i === spacerPosition) {
        elements.push(
          <div
            key="spacer"
            className="flex-shrink-0 flex group relative"
            style={{ width: `${spacerWidth}%` }}
          >
            <div className="w-full border-2 border-dashed border-slate-700/50 rounded-lg p-4 bg-slate-900/20 flex flex-col items-center justify-center gap-2 group-hover:border-purple-500/50 transition-colors">
              <p className="text-xs text-slate-600 group-hover:text-slate-400">
                Empty space ({spacerWidth}%)
              </p>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => onMoveSpacerLeft(rowIndex, spacerPosition)}
                  disabled={spacerPosition === 0}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                >
                  ← Move Left
                </Button>
                <Button
                  onClick={() => onMoveSpacerRight(rowIndex, spacerPosition, rowSlots.length)}
                  disabled={spacerPosition === rowSlots.length}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                >
                  Move Right →
                </Button>
              </div>
            </div>
          </div>
        );
      }

      // Insert slot at this position
      if (i < rowSlots.length) {
        const slot = rowSlots[i];
        const block = blocks.find((b) => b.id === slots[slot.id]);
        elements.push(
          <ClickableSlot
            key={slot.id}
            slotId={slot.id}
            label={slot.label}
            size={slot.size}
            block={block}
            slotWidth={slotWidths[slot.id]}
            onClick={() => onSlotClick(slot.id)}
            onWidthEdit={() => onSlotWidthEdit(slot.id)}
            onBlockFormat={block ? () => onBlockFormat(block.id) : undefined}
            onBlockUpdate={onBlockUpdate}
          />
        );
      }
    }

    return elements;
  };

  const slotRows = getSlotRows();

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900" style={containerStyle}>
      <div className="space-y-4">
        {slotRows.map((rowSlots, rowIndex) => {
          // Check if this row has any slots with custom widths
          const hasCustomWidths = rowSlots.some(slot => slotWidths[slot.id]);

          // If row has custom widths, always use flex-row to show spacers horizontally
          // Otherwise, respect the shouldStack() setting
          const useHorizontal = hasCustomWidths || !shouldStack();

          return (
            <div
              key={rowIndex}
              className={cn(
                "flex",
                // Don't use gap when there are custom widths (percentage + gap = overflow)
                // Instead, slots will have internal margins
                hasCustomWidths ? "" : "gap-4",
                useHorizontal ? "flex-row" : "flex-col"
              )}
            >
              {renderSlotsWithSpacers(rowSlots, rowIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ClickableSlot({
  label,
  block,
  slotWidth,
  onClick,
  onWidthEdit,
  onBlockFormat
}: {
  slotId: string;
  label: string;
  size: string;
  block?: ContentBlock;
  slotWidth?: number;
  onClick: () => void;
  onWidthEdit: () => void;
  onBlockFormat?: () => void;
  onBlockUpdate: (block: ContentBlock) => void;
}) {
  // Determine width - custom width takes precedence, otherwise flex to fill space
  const style: React.CSSProperties = slotWidth
    ? { width: `${slotWidth}%`, flexShrink: 0 }
    : { flex: 1 };

  const isTextBlock = block?.blockType === "text";

  return (
    <div className="relative" style={style}>
      <button
        onClick={onClick}
        className={cn(
          "w-full min-h-[140px] border-2 rounded-lg p-4 transition-all text-left group",
          block
            ? "border-slate-600 bg-slate-800/50 hover:border-purple-500 hover:bg-purple-500/5"
            : "border-dashed border-slate-600 bg-slate-900/30 hover:border-purple-500 hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20"
        )}
      >
        {block ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
              <Edit className="h-3 w-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
            </div>
            {block.label && <p className="text-sm font-semibold text-purple-400">{block.label}</p>}
            {block.title && <p className="font-medium text-white">{block.title}</p>}
            {block.subtitle && <p className="text-sm text-slate-300">{block.subtitle}</p>}
            {block.description && <p className="text-xs text-slate-400 line-clamp-2">{block.description}</p>}
            {block.imageUrl && (
              <div className="relative">
                <img src={block.imageUrl} alt="" className="w-full h-auto object-contain rounded max-h-32" />
                {block.imageLink && (
                  <div className="absolute top-1 right-1 bg-blue-600 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Link
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 text-sm h-full flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600 group-hover:border-purple-500 flex items-center justify-center group-hover:scale-110 transition-all">
              <Plus className="h-5 w-5 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="font-medium mb-1 group-hover:text-white transition-colors">{label}</p>
            <p className="text-xs group-hover:text-slate-300 transition-colors">Click to assign block or leave empty</p>
          </div>
        )}
      </button>

      {/* Slot Controls */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {/* Format button - Only for text blocks */}
        {isTextBlock && block && onBlockFormat && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onBlockFormat();
            }}
            size="sm"
            variant="outline"
            className="h-7 px-2 border-slate-600 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Format text"
          >
            <Type className="h-3 w-3 mr-1" />
            Format
          </Button>
        )}

        {/* Width button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onWidthEdit();
          }}
          size="sm"
          variant="outline"
          className="h-7 px-2 border-slate-600 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white"
          title="Adjust slot width"
        >
          <Settings2 className="h-3 w-3 mr-1" />
          {slotWidth ? `${slotWidth}%` : 'Width'}
        </Button>
      </div>
    </div>
  );
}

