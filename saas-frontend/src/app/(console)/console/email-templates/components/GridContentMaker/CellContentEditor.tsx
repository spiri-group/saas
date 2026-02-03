"use client";

import { useState } from "react";
import { X, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import TextFormatterInput, { TextFormatSchema, defaultTextFormat } from "@/components/ux/TextFormatterInput";
import ColorPickerDropDown from "@/components/ux/ColorPickerDropDown";
import { CellContent, ContentElement, createDefaultContentElement } from "./types";

interface CellContentEditorProps {
  cellId: string;
  content: CellContent;
  onSave: (cellId: string, content: CellContent) => void;
  onClose: () => void;
}

export default function CellContentEditor({
  cellId,
  content,
  onSave,
  onClose
}: CellContentEditorProps) {
  const [editedContent, setEditedContent] = useState<CellContent>({
    ...content,
    padding: content.padding || { top: 16, right: 16, bottom: 16, left: 16 }
  });

  // Auto-save changes in real-time
  const handleContentChange = (updates: Partial<CellContent>) => {
    const newContent = { ...editedContent, ...updates };
    setEditedContent(newContent);
    onSave(cellId, newContent);
  };

  const updateContentElement = (
    field: "title" | "subtitle" | "description",
    value: Partial<ContentElement> | null
  ) => {
    const newContent = {
      ...editedContent,
      [field]: value
        ? { ...createDefaultContentElement(), ...editedContent[field], ...value }
        : undefined
    };
    setEditedContent(newContent);
    onSave(cellId, newContent);
  };

  const updatePadding = (side: keyof NonNullable<CellContent["padding"]>, value: number) => {
    const newContent = {
      ...editedContent,
      padding: {
        ...editedContent.padding!,
        [side]: value
      }
    };
    setEditedContent(newContent);
    onSave(cellId, newContent);
  };

  return (
    <div className="w-[500px] border-l border-slate-800 bg-slate-950 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Edit Cell Content</h3>
          <p className="text-xs text-slate-400 font-mono">ID: {cellId.slice(0, 8)}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Background Settings */}
        <div className="space-y-3">
          <Label className="text-slate-300">Background</Label>
          <RadioGroup
            value={
              editedContent.backgroundImage
                ? "image"
                : editedContent.backgroundColor
                ? "color"
                : "none"
            }
            onValueChange={(value) => {
              let updates: Partial<CellContent> = {};
              if (value === "none") {
                updates = { backgroundColor: undefined, backgroundImage: undefined };
              } else if (value === "color") {
                updates = { backgroundColor: "#ffffff", backgroundImage: undefined };
              } else if (value === "image") {
                updates = { backgroundColor: undefined, backgroundImage: "" };
              }
              handleContentChange(updates);
            }}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="bg-none" />
              <Label htmlFor="bg-none" className="text-slate-300">None</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="color" id="bg-color" />
              <Label htmlFor="bg-color" className="text-slate-300">Color</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="image" id="bg-image" />
              <Label htmlFor="bg-image" className="text-slate-300">Image URL</Label>
            </div>
          </RadioGroup>

          {editedContent.backgroundColor && (
            <ColorPickerDropDown
              className="w-full h-10"
              placeholder="Select background color"
              value={editedContent.backgroundColor}
              onChange={(color) => handleContentChange({ backgroundColor: color })}
            />
          )}

          {editedContent.backgroundImage !== undefined && (
            <Input
              placeholder="Enter image URL"
              value={editedContent.backgroundImage}
              onChange={(e) => handleContentChange({ backgroundImage: e.target.value })}
            />
          )}
        </div>

        {/* Padding Settings */}
        <div className="space-y-3">
          <Label className="text-slate-300">Padding (px)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-400">Top</Label>
              <Input
                type="number"
                min="0"
                value={editedContent.padding?.top || 0}
                onChange={(e) => updatePadding("top", parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Right</Label>
              <Input
                type="number"
                min="0"
                value={editedContent.padding?.right || 0}
                onChange={(e) => updatePadding("right", parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Bottom</Label>
              <Input
                type="number"
                min="0"
                value={editedContent.padding?.bottom || 0}
                onChange={(e) => updatePadding("bottom", parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Left</Label>
              <Input
                type="number"
                min="0"
                value={editedContent.padding?.left || 0}
                onChange={(e) => updatePadding("left", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Title</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Paintbrush className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px]">
                <TextFormatterInput
                  defaultValue={editedContent.title?.format || defaultTextFormat}
                  onChange={(format: TextFormatSchema) =>
                    updateContentElement("title", { format })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
          <Input
            placeholder="Enter title text"
            value={editedContent.title?.content || ""}
            onChange={(e) => updateContentElement("title", { content: e.target.value })}
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Subtitle</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Paintbrush className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px]">
                <TextFormatterInput
                  defaultValue={editedContent.subtitle?.format || defaultTextFormat}
                  onChange={(format: TextFormatSchema) =>
                    updateContentElement("subtitle", { format })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
          <Input
            placeholder="Enter subtitle text"
            value={editedContent.subtitle?.content || ""}
            onChange={(e) => updateContentElement("subtitle", { content: e.target.value })}
          />
        </div>

        {/* Description */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Description</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Paintbrush className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px]">
                <TextFormatterInput
                  defaultValue={editedContent.description?.format || defaultTextFormat}
                  onChange={(format: TextFormatSchema) =>
                    updateContentElement("description", { format })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
          <Textarea
            placeholder="Enter description text"
            className="min-h-[100px]"
            value={editedContent.description?.content || ""}
            onChange={(e) => updateContentElement("description", { content: e.target.value })}
          />
        </div>
      </div>

      {/* Close Button */}
      <div className="pt-4 border-t border-slate-800">
        <Button
          onClick={onClose}
          className="w-full bg-slate-800 text-slate-300 hover:bg-slate-700"
        >
          Close
        </Button>
      </div>
    </div>
  );
}
