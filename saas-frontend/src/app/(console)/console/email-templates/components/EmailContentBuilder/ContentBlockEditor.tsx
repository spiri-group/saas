"use client";

import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Type, FileText, Settings2, FolderOpen, AlignLeft, AlignCenter, AlignRight, Table2, Share2, List, Minus, Space, Megaphone, Plus, Trash2 } from "lucide-react";
import MediaPickerDialog from "../MediaPickerDialog";
import VariablePicker from "./VariablePicker";
import TableBlockEditor from "./TableBlockEditor";
import { Button } from "@/components/ui/button";
import { iconsMapping } from "@/icons/social";
import { Input } from "@/components/ui/input";
import RichTextInput from "@/components/ux/RichTextInput";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ContentBlock, BlockType, ColorSwatch } from "./types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconStyle } from "@/icons/shared/types";

function PaletteSwatches({ palette, onSelect }: { palette?: ColorSwatch[]; onSelect: (color: string) => void }) {
  if (!palette || palette.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mb-1">
      {palette.map((swatch) => (
        <button
          key={swatch.id}
          type="button"
          onClick={() => onSelect(swatch.color)}
          className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
          style={{ backgroundColor: swatch.color }}
          title={swatch.label}
        />
      ))}
    </div>
  );
}

interface ContentBlockEditorProps {
  block: ContentBlock;
  onUpdate: (block: ContentBlock) => void;
  onClose: () => void;
  colorPalette?: ColorSwatch[];
}

export default function ContentBlockEditor({
  block,
  onUpdate,
  onClose,
  colorPalette,
}: ContentBlockEditorProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerType, setMediaPickerType] = useState<"image">("image");
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string>("");

  const form = useForm<ContentBlock>({
    defaultValues: block,
  });

  // Handle Escape key to close editor
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Don't close if media picker is open
        if (!mediaPickerOpen) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mediaPickerOpen, onClose]);

  // Watch for changes and update parent in real-time
  const watchedValues = form.watch();

  useState(() => {
    const subscription = form.watch((value) => {
      onUpdate(value as ContentBlock);
    });
    return () => subscription.unsubscribe();
  });

  const blockType = form.watch("blockType");

  const handleMediaSelect = (url: string) => {
    form.setValue(mediaPickerTarget as any, url);
  };

  // Helper to insert variable into text field at cursor position
  const handleInsertVariable = (fieldName: keyof ContentBlock, variable: string) => {
    const currentValue = form.getValues(fieldName as any) as string || "";

    // Get the input element
    const inputElement = document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement;

    if (inputElement && typeof inputElement.selectionStart === 'number') {
      // Insert at cursor position
      const cursorPos = inputElement.selectionStart;
      const newValue =
        currentValue.substring(0, cursorPos) +
        variable +
        currentValue.substring(cursorPos);

      form.setValue(fieldName as any, newValue);

      // Set cursor position after the inserted variable
      setTimeout(() => {
        inputElement.focus();
        inputElement.setSelectionRange(cursorPos + variable.length, cursorPos + variable.length);
      }, 0);
    } else {
      // Fallback: append to end
      form.setValue(fieldName as any, currentValue + variable);
    }
  };

  const getBlockTypeIcon = (type: BlockType) => {
    switch (type) {
      case "text": return <Type className="h-4 w-4" />;
      case "image": return <ImageIcon className="h-4 w-4" />;
      case "button": return <FileText className="h-4 w-4" />;
      case "table": return <Table2 className="h-4 w-4" />;
      case "social": return <Share2 className="h-4 w-4" />;
      case "infoCard": return <List className="h-4 w-4" />;
      case "dividerBlock": return <Minus className="h-4 w-4" />;
      case "spacer": return <Space className="h-4 w-4" />;
      case "hero": return <Megaphone className="h-4 w-4" />;
    }
  };

  const getBlockTypeLabel = (type: BlockType) => {
    switch (type) {
      case "text": return "Text Block";
      case "image": return "Image Block";
      case "button": return "Button Block";
      case "table": return "Table Block";
      case "social": return "Social Block";
      case "infoCard": return "Info Card";
      case "dividerBlock": return "Divider";
      case "spacer": return "Spacer";
      case "hero": return "Hero / Banner";
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] border-l border-slate-800 bg-slate-950 shadow-2xl z-50 flex flex-col">
      <div className="p-6 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">Edit Content Block</h3>
            <div className="flex items-center gap-2 mt-1">
              {getBlockTypeIcon(blockType || "text")}
              <p className="text-xs text-slate-400">
                {getBlockTypeLabel(blockType || "text")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      <Form {...form}>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Block Type */}
            <FormField
              control={form.control}
              name="blockType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Block Type</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "text", icon: Type, label: "Text" },
                        { value: "image", icon: ImageIcon, label: "Image" },
                        { value: "button", icon: FileText, label: "Button" },
                        { value: "infoCard", icon: List, label: "Info Card" },
                        { value: "hero", icon: Megaphone, label: "Hero" },
                        { value: "table", icon: Table2, label: "Table" },
                        { value: "social", icon: Share2, label: "Social" },
                        { value: "dividerBlock", icon: Minus, label: "Divider" },
                        { value: "spacer", icon: Space, label: "Spacer" },
                      ].map((type) => {
                        const Icon = type.icon;
                        const isSelected = field.value === type.value;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            className={`
                              flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                              ${isSelected
                                ? 'border-purple-500 bg-purple-500/10 text-white'
                                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                              }
                            `}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-[10px] font-medium">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Block Label */}
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Block Label (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Hero Section, Product Image"
                      {...field}
                      value={field.value || ""}
                      className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </FormControl>
                  <FormDescription>
                    Help identify this block when arranging layout
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Text Block Fields */}
            {blockType === "text" && (
              <>
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Type className="h-4 w-4" />
                    <span className="text-sm font-medium">Text Content</span>
                  </div>

                  {/* Quote Style Toggle */}
                  <FormField
                    control={form.control}
                    name="isQuote"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormLabel className="text-xs text-slate-400 mb-0">Quote</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Title</FormLabel>
                        <div className="flex items-center gap-1">
                          <VariablePicker
                            onInsert={(variable) => handleInsertVariable('title', variable)}
                            size="sm"
                          />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-400 hover:text-white">
                                <Settings2 className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 bg-slate-900 border-slate-700" align="end">
                              <div className="space-y-3">
                                <FormField
                                  control={form.control}
                                  name="titleAlign"
                                  render={({ field: alignField }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Alignment</FormLabel>
                                      <FormControl>
                                        <div className="flex gap-1">
                                          {[
                                            { value: "left", icon: AlignLeft },
                                            { value: "center", icon: AlignCenter },
                                            { value: "right", icon: AlignRight },
                                          ].map((align) => {
                                            const Icon = align.icon;
                                            const isSelected = alignField.value === align.value;
                                            return (
                                              <button
                                                key={align.value}
                                                type="button"
                                                onClick={() => alignField.onChange(align.value)}
                                                className={`
                                                  flex-1 p-2 rounded border transition-all
                                                  ${isSelected
                                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                                  }
                                                `}
                                              >
                                                <Icon className="h-3 w-3 mx-auto" />
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="titleSize"
                                  render={({ field: sizeField }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Size</FormLabel>
                                      <FormControl>
                                        <div className="grid grid-cols-4 gap-1">
                                          {[
                                            { value: "small", label: "S" },
                                            { value: "medium", label: "M" },
                                            { value: "large", label: "L" },
                                            { value: "xlarge", label: "XL" },
                                          ].map((size) => {
                                            const isSelected = sizeField.value === size.value;
                                            return (
                                              <button
                                                key={size.value}
                                                type="button"
                                                onClick={() => sizeField.onChange(size.value)}
                                                className={`
                                                  p-2 rounded border transition-all text-xs
                                                  ${isSelected
                                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                                  }
                                                `}
                                              >
                                                {size.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Enter title"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-slate-500">
                        Use variables like {'{{ order.code }}'} to insert dynamic data
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Subtitle */}
                <FormField
                  control={form.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Subtitle</FormLabel>
                        <div className="flex items-center gap-1">
                          <VariablePicker
                            onInsert={(variable) => handleInsertVariable('subtitle', variable)}
                            size="sm"
                          />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-400 hover:text-white">
                                <Settings2 className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 bg-slate-900 border-slate-700" align="end">
                              <div className="space-y-3">
                                <FormField
                                  control={form.control}
                                  name="subtitleAlign"
                                  render={({ field: alignField }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Alignment</FormLabel>
                                      <FormControl>
                                        <div className="flex gap-1">
                                          {[
                                            { value: "left", icon: AlignLeft },
                                            { value: "center", icon: AlignCenter },
                                            { value: "right", icon: AlignRight },
                                          ].map((align) => {
                                            const Icon = align.icon;
                                            const isSelected = alignField.value === align.value;
                                            return (
                                              <button
                                                key={align.value}
                                                type="button"
                                                onClick={() => alignField.onChange(align.value)}
                                                className={`
                                                  flex-1 p-2 rounded border transition-all
                                                  ${isSelected
                                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                                  }
                                                `}
                                              >
                                                <Icon className="h-3 w-3 mx-auto" />
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="subtitleSize"
                                  render={({ field: sizeField }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Size</FormLabel>
                                      <FormControl>
                                        <div className="grid grid-cols-3 gap-1">
                                          {[
                                            { value: "small", label: "S" },
                                            { value: "medium", label: "M" },
                                            { value: "large", label: "L" },
                                          ].map((size) => {
                                            const isSelected = sizeField.value === size.value;
                                            return (
                                              <button
                                                key={size.value}
                                                type="button"
                                                onClick={() => sizeField.onChange(size.value)}
                                                className={`
                                                  p-2 rounded border transition-all text-xs
                                                  ${isSelected
                                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                                  }
                                                `}
                                              >
                                                {size.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Enter subtitle"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Description</FormLabel>
                        <VariablePicker
                          onInsert={(variable) => handleInsertVariable('description', variable)}
                          size="sm"
                        />
                      </div>
                      <FormControl>
                        <RichTextInput
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Enter description with rich text formatting..."
                          className="w-full h-[300px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Use the toolbar to format text with bold, italic, headings, lists, and links. Insert variables for dynamic content.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Text Styling */}
                <div className="border-t border-slate-700 pt-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                        <Settings2 className="h-3 w-3 mr-2" />
                        Styling
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 bg-slate-900 border-slate-700" align="start">
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-slate-300">Text Block Styling</p>
                        <FormField
                          control={form.control}
                          name="textBgColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Background Color</FormLabel>
                              <PaletteSwatches palette={colorPalette} onSelect={(c) => field.onChange(c)} />
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input
                                    type="color"
                                    value={field.value || "#ffffff"}
                                    onChange={field.onChange}
                                    className="bg-slate-800 border-slate-700 w-10 h-8 p-1"
                                  />
                                  <Input
                                    type="text"
                                    placeholder="None"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="textBorderColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Border Color</FormLabel>
                              <PaletteSwatches palette={colorPalette} onSelect={(c) => field.onChange(c)} />
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input
                                    type="color"
                                    value={field.value || "#e2e8f0"}
                                    onChange={field.onChange}
                                    className="bg-slate-800 border-slate-700 w-10 h-8 p-1"
                                  />
                                  <Input
                                    type="text"
                                    placeholder="None"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="textBorderRadius"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Border Radius: {field.value || 0}px</FormLabel>
                              <FormControl>
                                <Input
                                  type="range"
                                  min={0}
                                  max={20}
                                  value={field.value || 0}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  className="w-full"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="textPadding"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Padding: {field.value || 0}px</FormLabel>
                              <FormControl>
                                <Input
                                  type="range"
                                  min={0}
                                  max={40}
                                  value={field.value || 0}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  className="w-full"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="border-t border-slate-700 pt-3">
                          <p className="text-xs font-medium text-slate-300 mb-2">Typography</p>
                          <FormField
                            control={form.control}
                            name="textFontFamily"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Font Family</FormLabel>
                                <FormControl>
                                  <select
                                    value={field.value || "default"}
                                    onChange={(e) => field.onChange(e.target.value === "default" ? undefined : e.target.value)}
                                    className="w-full h-8 rounded border border-slate-700 bg-slate-800 text-white text-xs px-2"
                                  >
                                    <option value="default">Default</option>
                                    <option value="serif">Serif</option>
                                    <option value="sans-serif">Sans-serif</option>
                                    <option value="monospace">Monospace</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Courier New">Courier New</option>
                                  </select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="textFontSize"
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <FormLabel className="text-xs">Font Size: {field.value || 16}px</FormLabel>
                                <FormControl>
                                  <Input
                                    type="range"
                                    min={12}
                                    max={48}
                                    value={field.value || 16}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    className="w-full"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Image Block Fields */}
            {blockType === "image" && (
              <>
                <div className="flex items-center space-x-2 text-slate-300">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Image</span>
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            value={field.value || ""}
                            className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMediaPickerType("image");
                            setMediaPickerTarget("imageUrl");
                            setMediaPickerOpen(true);
                          }}
                          className="px-3 border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                      {field.value && (
                        <div className="mt-2 border border-slate-700 rounded-lg overflow-hidden">
                          <img
                            src={field.value}
                            alt="Preview"
                            className="w-full h-auto"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).alt = 'Invalid image URL';
                            }}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageAlt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alt Text (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Description of the image"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                      <FormDescription>
                        For accessibility and when images don&apos;t load
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/page"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                      <FormDescription>
                        Make the image clickable - opens this URL when clicked
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
                  <p className="text-xs text-slate-400">
                    💡 <strong>Tip:</strong> Image layout settings (width, alignment, float) can be configured in <strong>Step 3: Arrange Blocks</strong> after you assign the image to a slot.
                  </p>
                </div>
              </>
            )}

            {/* Button Block Fields */}
            {blockType === "button" && (
              <>
                <div className="flex items-center space-x-2 text-slate-300">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Button</span>
                </div>

                <FormField
                  control={form.control}
                  name="buttonText"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Button Text</FormLabel>
                        <VariablePicker
                          onInsert={(variable) => handleInsertVariable('buttonText', variable)}
                          size="sm"
                        />
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Shop Now"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buttonUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/product"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buttonStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Style</FormLabel>
                      <FormControl>
                        <Tabs
                          value={field.value || "primary"}
                          onValueChange={field.onChange}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="primary">Primary</TabsTrigger>
                            <TabsTrigger value="secondary">Secondary</TabsTrigger>
                            <TabsTrigger value="outline">Outline</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buttonAlign"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Alignment</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { value: "left", icon: AlignLeft, label: "Left" },
                            { value: "center", icon: AlignCenter, label: "Center" },
                            { value: "right", icon: AlignRight, label: "Right" },
                            { value: "full", label: "Full" },
                          ].map((align) => {
                            const isSelected = (field.value || "full") === align.value;
                            return (
                              <button
                                key={align.value}
                                type="button"
                                onClick={() => field.onChange(align.value)}
                                className={`
                                  flex items-center justify-center gap-1 p-2 rounded border transition-all text-xs
                                  ${isSelected
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                  }
                                `}
                              >
                                {align.icon && <align.icon className="h-3 w-3" />}
                                {align.label}
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Table Block Fields */}
            {blockType === "table" && (
              <TableBlockEditor form={form} />
            )}

            {/* Social Block Fields */}
            {blockType === "social" && (
              <>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Social Networks</span>
                </div>

                <FormField
                  control={form.control}
                  name="socialAlign"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alignment</FormLabel>
                      <FormControl>
                        <div className="flex gap-1">
                          {[
                            { value: "left", icon: AlignLeft },
                            { value: "center", icon: AlignCenter },
                            { value: "right", icon: AlignRight },
                          ].map((align) => {
                            const Icon = align.icon;
                            const isSelected = field.value === align.value;
                            return (
                              <button
                                key={align.value}
                                type="button"
                                onClick={() => field.onChange(align.value)}
                                className={`
                                  flex-1 p-2 rounded border transition-all
                                  ${isSelected
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                  }
                                `}
                              >
                                <Icon className="h-4 w-4 mx-auto" />
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Horizontal alignment of social icons
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialIconSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Size</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="32"
                          {...field}
                          value={field.value || 32}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 32)}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                      <FormDescription>
                        Icon size in pixels (e.g., 32)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="border-t border-slate-700 pt-4 space-y-3">
                  <p className="text-sm text-slate-400">
                    Enter the URL for each social network you want to display. Only networks with URLs will appear.
                  </p>

                  <FormField
                    control={form.control}
                    name="socialFacebookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://facebook.com/yourpage"
                            {...field}
                            value={field.value || ""}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialXUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X (Twitter) URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://x.com/yourhandle"
                            {...field}
                            value={field.value || ""}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialInstagramUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://instagram.com/yourhandle"
                            {...field}
                            value={field.value || ""}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://linkedin.com/company/yourcompany"
                            {...field}
                            value={field.value || ""}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialYoutubeUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://youtube.com/@yourchannel"
                            {...field}
                            value={field.value || ""}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialTiktokUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://tiktok.com/@yourhandle"
                            {...field}
                            value={field.value || ""}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Info Card Block Fields */}
            {blockType === "infoCard" && (
              <>
                <div className="flex items-center space-x-2 text-slate-300">
                  <List className="h-4 w-4" />
                  <span className="text-sm font-medium">Info Card</span>
                </div>

                <FormField
                  control={form.control}
                  name="infoCardStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Style</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { value: "default", label: "Default" },
                            { value: "outlined", label: "Outlined" },
                            { value: "filled", label: "Filled" },
                            { value: "accent", label: "Accent" },
                          ].map((style) => {
                            const isSelected = (field.value || "default") === style.value;
                            return (
                              <button
                                key={style.value}
                                type="button"
                                onClick={() => field.onChange(style.value)}
                                className={`
                                  p-2 rounded border transition-all text-xs
                                  ${isSelected
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                  }
                                `}
                              >
                                {style.label}
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="infoCardBgColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Background Color</FormLabel>
                        <PaletteSwatches palette={colorPalette} onSelect={(c) => field.onChange(c)} />
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={field.value || "#f8fafc"}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 w-10 h-8 p-1"
                            />
                            <Input
                              type="text"
                              placeholder="#f8fafc"
                              value={field.value || ""}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="infoCardBorderColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Border Color</FormLabel>
                        <PaletteSwatches palette={colorPalette} onSelect={(c) => field.onChange(c)} />
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={field.value || "#e2e8f0"}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 w-10 h-8 p-1"
                            />
                            <Input
                              type="text"
                              placeholder="#e2e8f0"
                              value={field.value || ""}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <FormLabel>Items</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const items = form.getValues("infoCardItems") || [];
                        form.setValue("infoCardItems", [
                          ...items,
                          { id: crypto.randomUUID(), label: "", value: "" },
                        ]);
                      }}
                      className="h-7 px-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(watchedValues.infoCardItems || []).map((item, index) => (
                      <div key={item.id} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-1">
                          <Input
                            placeholder="Label"
                            value={item.label}
                            onChange={(e) => {
                              const items = [...(form.getValues("infoCardItems") || [])];
                              items[index] = { ...items[index], label: e.target.value };
                              form.setValue("infoCardItems", items);
                            }}
                            className="bg-slate-900 border-slate-700 text-white text-xs placeholder:text-slate-500"
                          />
                          <div className="flex gap-1">
                            <Input
                              placeholder="Value or {{ variable }}"
                              value={item.value}
                              onChange={(e) => {
                                const items = [...(form.getValues("infoCardItems") || [])];
                                items[index] = { ...items[index], value: e.target.value };
                                form.setValue("infoCardItems", items);
                              }}
                              className="bg-slate-900 border-slate-700 text-white text-xs placeholder:text-slate-500 flex-1"
                            />
                            <VariablePicker
                              onInsert={(variable) => {
                                const items = [...(form.getValues("infoCardItems") || [])];
                                items[index] = { ...items[index], value: items[index].value + variable };
                                form.setValue("infoCardItems", items);
                              }}
                              size="sm"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const items = (form.getValues("infoCardItems") || []).filter((_, i) => i !== index);
                            form.setValue("infoCardItems", items);
                          }}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300 mt-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {(!watchedValues.infoCardItems || watchedValues.infoCardItems.length === 0) && (
                      <p className="text-xs text-slate-500 text-center py-2">No items yet. Click &quot;Add Item&quot; to add label/value pairs.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Hero/Banner Block Fields */}
            {blockType === "hero" && (
              <>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Megaphone className="h-4 w-4" />
                  <span className="text-sm font-medium">Hero / Banner</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="heroBgColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Background Color</FormLabel>
                        <PaletteSwatches palette={colorPalette} onSelect={(c) => field.onChange(c)} />
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={field.value || "#6b21a8"}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 w-10 h-8 p-1"
                            />
                            <Input
                              type="text"
                              value={field.value || ""}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                              placeholder="#6b21a8"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heroTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Text Color</FormLabel>
                        <PaletteSwatches palette={colorPalette} onSelect={(c) => field.onChange(c)} />
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={field.value || "#ffffff"}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 w-10 h-8 p-1"
                            />
                            <Input
                              type="text"
                              value={field.value || ""}
                              onChange={field.onChange}
                              className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                              placeholder="#ffffff"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="heroBgImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Image (optional)</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input
                            placeholder="https://example.com/banner.jpg"
                            {...field}
                            value={field.value || ""}
                            className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMediaPickerTarget("heroBgImage");
                            setMediaPickerOpen(true);
                          }}
                          className="px-3 border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heroTitle"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Title</FormLabel>
                        <VariablePicker
                          onInsert={(variable) => handleInsertVariable('heroTitle', variable)}
                          size="sm"
                        />
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Banner headline"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heroSubtitle"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Subtitle</FormLabel>
                        <VariablePicker
                          onInsert={(variable) => handleInsertVariable('heroSubtitle', variable)}
                          size="sm"
                        />
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Supporting text"
                          {...field}
                          value={field.value || ""}
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="heroMinHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Min Height: {field.value || 200}px</FormLabel>
                        <FormControl>
                          <Input
                            type="range"
                            min={100}
                            max={500}
                            step={10}
                            value={field.value || 200}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heroTextAlign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Text Alignment</FormLabel>
                        <FormControl>
                          <div className="flex gap-1">
                            {[
                              { value: "left", icon: AlignLeft },
                              { value: "center", icon: AlignCenter },
                              { value: "right", icon: AlignRight },
                            ].map((align) => {
                              const Icon = align.icon;
                              const isSelected = (field.value || "center") === align.value;
                              return (
                                <button
                                  key={align.value}
                                  type="button"
                                  onClick={() => field.onChange(align.value)}
                                  className={`
                                    flex-1 p-2 rounded border transition-all
                                    ${isSelected
                                      ? 'border-purple-500 bg-purple-500/10 text-white'
                                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                    }
                                  `}
                                >
                                  <Icon className="h-3 w-3 mx-auto" />
                                </button>
                              );
                            })}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Hero CTA Button */}
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs font-medium text-slate-300 mb-3">Call-to-Action Button (optional)</p>

                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="heroButtonText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Button Text</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Shop Now"
                              {...field}
                              value={field.value || ""}
                              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="heroButtonUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Button URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com"
                              {...field}
                              value={field.value || ""}
                              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="heroButtonStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Button Style</FormLabel>
                          <FormControl>
                            <Tabs
                              value={field.value || "primary"}
                              onValueChange={field.onChange}
                              className="w-full"
                            >
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="primary">Primary</TabsTrigger>
                                <TabsTrigger value="secondary">Secondary</TabsTrigger>
                                <TabsTrigger value="outline">Outline</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Divider Block Fields */}
            {blockType === "dividerBlock" && (
              <>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Minus className="h-4 w-4" />
                  <span className="text-sm font-medium">Divider</span>
                </div>

                <FormField
                  control={form.control}
                  name="dividerBlockStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line Style</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { value: "solid", label: "Solid" },
                            { value: "dashed", label: "Dashed" },
                            { value: "dotted", label: "Dotted" },
                            { value: "gradient", label: "Gradient" },
                          ].map((style) => {
                            const isSelected = (field.value || "solid") === style.value;
                            return (
                              <button
                                key={style.value}
                                type="button"
                                onClick={() => field.onChange(style.value)}
                                className={`
                                  p-2 rounded border transition-all text-xs
                                  ${isSelected
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                                  }
                                `}
                              >
                                {style.label}
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dividerBlockColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <PaletteSwatches palette={colorPalette} onSelect={(c) => field.onChange(c)} />
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={field.value || "#e2e8f0"}
                            onChange={field.onChange}
                            className="bg-slate-800 border-slate-700 w-12 h-8 p-1"
                          />
                          <Input
                            type="text"
                            value={field.value || ""}
                            onChange={field.onChange}
                            className="bg-slate-800 border-slate-700 text-white flex-1"
                            placeholder="#e2e8f0"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="dividerBlockHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Height: {field.value || 1}px</FormLabel>
                        <FormControl>
                          <Input
                            type="range"
                            min={1}
                            max={10}
                            value={field.value || 1}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dividerBlockWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Width: {field.value || 100}%</FormLabel>
                        <FormControl>
                          <Input
                            type="range"
                            min={20}
                            max={100}
                            step={5}
                            value={field.value || 100}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Spacer Block Fields */}
            {blockType === "spacer" && (
              <>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Space className="h-4 w-4" />
                  <span className="text-sm font-medium">Spacer</span>
                </div>

                <FormField
                  control={form.control}
                  name="spacerHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height: {field.value || 20}px</FormLabel>
                      <FormControl>
                        <Input
                          type="range"
                          min={8}
                          max={120}
                          step={4}
                          value={field.value || 20}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Invisible vertical space between sections
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Live Preview */}
            <div className="border-t border-slate-700 pt-6 mt-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Preview</h4>
              <div className="bg-white rounded-lg p-6 min-h-[120px]">
                {blockType === "text" && (
                  <div
                    style={{
                      backgroundColor: watchedValues.textBgColor || undefined,
                      border: watchedValues.textBorderColor ? `1px solid ${watchedValues.textBorderColor}` : undefined,
                      borderRadius: watchedValues.textBorderRadius ? `${watchedValues.textBorderRadius}px` : undefined,
                      padding: watchedValues.textPadding ? `${watchedValues.textPadding}px` : undefined,
                    }}
                  >
                    <div className={`space-y-3 ${watchedValues.isQuote ? 'border-l-4 border-purple-600 pl-4 italic' : ''}`}>
                      {watchedValues.title && (
                        <h2 className={`
                          font-bold text-slate-900
                          ${watchedValues.titleAlign === "center" ? "text-center" : ""}
                          ${watchedValues.titleAlign === "right" ? "text-right" : ""}
                          ${watchedValues.titleSize === "small" ? "text-lg" : ""}
                          ${watchedValues.titleSize === "medium" ? "text-xl" : ""}
                          ${watchedValues.titleSize === "large" || !watchedValues.titleSize ? "text-2xl" : ""}
                          ${watchedValues.titleSize === "xlarge" ? "text-3xl" : ""}
                        `}>
                          {watchedValues.title}
                        </h2>
                      )}
                      {watchedValues.subtitle && (
                        <h3 className={`
                          font-medium text-slate-700
                          ${watchedValues.subtitleAlign === "center" ? "text-center" : ""}
                          ${watchedValues.subtitleAlign === "right" ? "text-right" : ""}
                          ${watchedValues.subtitleSize === "small" ? "text-sm" : ""}
                          ${watchedValues.subtitleSize === "medium" || !watchedValues.subtitleSize ? "text-base" : ""}
                          ${watchedValues.subtitleSize === "large" ? "text-lg" : ""}
                        `}>
                          {watchedValues.subtitle}
                        </h3>
                      )}
                      {watchedValues.description && (
                        <div
                          className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: watchedValues.description }}
                        />
                      )}
                      {!watchedValues.title && !watchedValues.subtitle && !watchedValues.description && (
                        <p className="text-slate-400 text-sm text-center py-4">
                          Add text content to see preview
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {blockType === "image" && (
                  <>
                    {watchedValues.imageUrl ? (
                      <div className="w-full">
                        <img
                          src={watchedValues.imageUrl}
                          alt={watchedValues.imageAlt || "Preview"}
                          className="w-full h-auto rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-4">
                        Add image URL to see preview
                      </p>
                    )}
                  </>
                )}

                {blockType === "button" && (
                  <>
                    {watchedValues.buttonText ? (
                      <div className={`
                        ${(watchedValues.buttonAlign || "full") === "left" ? "text-left" : ""}
                        ${(watchedValues.buttonAlign || "full") === "center" ? "text-center" : ""}
                        ${(watchedValues.buttonAlign || "full") === "right" ? "text-right" : ""}
                      `}>
                        <a
                          href={watchedValues.buttonUrl || "#"}
                          className={`
                            ${(watchedValues.buttonAlign || "full") === "full" ? "block w-full" : "inline-block"}
                            text-center px-6 py-3 rounded-lg font-medium transition-colors
                            ${watchedValues.buttonStyle === "primary"
                              ? "bg-purple-600 text-white hover:bg-purple-700"
                              : watchedValues.buttonStyle === "secondary"
                              ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                              : "border-2 border-slate-900 text-slate-900 hover:bg-slate-50"
                            }
                          `}
                        >
                          {watchedValues.buttonText}
                        </a>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-4">
                        Add button text to see preview
                      </p>
                    )}
                  </>
                )}

                {blockType === "table" && (
                  <>
                    {watchedValues.tableColumns && watchedValues.tableColumns.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className={`w-full text-sm ${watchedValues.tableStyle?.showBorders !== false ? 'border border-slate-300' : ''}`}>
                          <thead className={watchedValues.tableStyle?.headerBold !== false ? 'font-bold' : ''}>
                            <tr className="bg-slate-100">
                              {watchedValues.tableColumns?.map((col) => (
                                <th
                                  key={col.id}
                                  className={`p-2 ${watchedValues.tableStyle?.showBorders !== false ? 'border border-slate-300' : ''} text-${col.align || 'left'}`}
                                >
                                  {col.header || 'Header'}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[1, 2, 3].slice(0, watchedValues.tableRowLimit || 3).map((rowNum) => (
                              <tr
                                key={rowNum}
                                className={watchedValues.tableStyle?.alternatingRows !== false && rowNum % 2 === 0 ? 'bg-slate-50' : ''}
                              >
                                {watchedValues.tableColumns?.map((col) => (
                                  <td
                                    key={col.id}
                                    className={`p-2 ${watchedValues.tableStyle?.showBorders !== false ? 'border border-slate-300' : ''} text-${col.align || 'left'}`}
                                  >
                                    <span className="font-mono text-xs text-purple-600">
                                      {'{{ '}{col.field || 'field'}{' }}'}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {watchedValues.tableRowLimit && watchedValues.tableShowMoreText && (
                          <p className="text-xs text-slate-500 mt-2 text-center italic">
                            {watchedValues.tableShowMoreText.replace('{count}', 'N')}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-3">
                          Preview shows {watchedValues.tableRowLimit || 3} sample rows from <span className="font-mono text-purple-600">{watchedValues.tableDataSource || 'data source'}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-4">
                        Add columns to see table preview
                      </p>
                    )}
                  </>
                )}

                {blockType === "social" && (
                  <>
                    {(watchedValues.socialFacebookUrl || watchedValues.socialXUrl || watchedValues.socialInstagramUrl ||
                      watchedValues.socialLinkedinUrl || watchedValues.socialYoutubeUrl || watchedValues.socialTiktokUrl) ? (
                      <div className={`
                        flex flex-wrap gap-3
                        ${watchedValues.socialAlign === "center" ? "justify-center" : ""}
                        ${watchedValues.socialAlign === "right" ? "justify-end" : ""}
                      `}>
                        {watchedValues.socialFacebookUrl && (
                          <a
                            href={watchedValues.socialFacebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <div style={{ width: `${watchedValues.socialIconSize || 32}px`, height: `${watchedValues.socialIconSize || 32}px` }}>
                              {iconsMapping.facebook(IconStyle.Fill)}
                            </div>
                          </a>
                        )}
                        {watchedValues.socialXUrl && (
                          <a
                            href={watchedValues.socialXUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <div style={{ width: `${watchedValues.socialIconSize || 32}px`, height: `${watchedValues.socialIconSize || 32}px` }}>
                              {iconsMapping.x(IconStyle.Fill)}
                            </div>
                          </a>
                        )}
                        {watchedValues.socialInstagramUrl && (
                          <a
                            href={watchedValues.socialInstagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <div style={{ width: `${watchedValues.socialIconSize || 32}px`, height: `${watchedValues.socialIconSize || 32}px` }}>
                              {iconsMapping.instagram(IconStyle.Fill)}
                            </div>
                          </a>
                        )}
                        {watchedValues.socialLinkedinUrl && (
                          <a
                            href={watchedValues.socialLinkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <div style={{ width: `${watchedValues.socialIconSize || 32}px`, height: `${watchedValues.socialIconSize || 32}px` }}>
                              {iconsMapping.linkedin(IconStyle.Fill)}
                            </div>
                          </a>
                        )}
                        {watchedValues.socialYoutubeUrl && (
                          <a
                            href={watchedValues.socialYoutubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <div style={{ width: `${watchedValues.socialIconSize || 32}px`, height: `${watchedValues.socialIconSize || 32}px` }}>
                              {iconsMapping.youtube(IconStyle.Fill)}
                            </div>
                          </a>
                        )}
                        {watchedValues.socialTiktokUrl && (
                          <a
                            href={watchedValues.socialTiktokUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <div style={{ width: `${watchedValues.socialIconSize || 32}px`, height: `${watchedValues.socialIconSize || 32}px` }}>
                              {iconsMapping.tiktok(IconStyle.Fill)}
                            </div>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-4">
                        Add social network URLs to see preview
                      </p>
                    )}
                  </>
                )}

                {blockType === "infoCard" && (
                  <>
                    {watchedValues.infoCardItems && watchedValues.infoCardItems.length > 0 ? (
                      <div
                        style={{
                          backgroundColor: watchedValues.infoCardBgColor || (watchedValues.infoCardStyle === "filled" ? "#f3e8ff" : "#f8fafc"),
                          border: (watchedValues.infoCardStyle === "outlined" || watchedValues.infoCardStyle === "default")
                            ? `1px solid ${watchedValues.infoCardBorderColor || "#e2e8f0"}`
                            : watchedValues.infoCardStyle === "filled"
                            ? "none"
                            : undefined,
                          borderLeft: watchedValues.infoCardStyle === "accent"
                            ? `4px solid ${watchedValues.infoCardBorderColor || "#7c3aed"}`
                            : undefined,
                          borderRadius: "8px",
                          padding: "16px",
                        }}
                      >
                        <div className="space-y-2">
                          {watchedValues.infoCardItems.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-slate-500 font-medium">{item.label || "Label"}</span>
                              <span className="text-slate-900 font-semibold">{item.value || "Value"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-4">
                        Add items to see info card preview
                      </p>
                    )}
                  </>
                )}

                {blockType === "hero" && (
                  <div
                    style={{
                      backgroundColor: watchedValues.heroBgColor || "#6b21a8",
                      backgroundImage: watchedValues.heroBgImage ? `url(${watchedValues.heroBgImage})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      minHeight: `${watchedValues.heroMinHeight || 200}px`,
                      color: watchedValues.heroTextColor || "#ffffff",
                      textAlign: (watchedValues.heroTextAlign || "center") as React.CSSProperties["textAlign"],
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: "24px",
                    }}
                  >
                    {watchedValues.heroTitle && (
                      <h2 className="text-2xl font-bold mb-2">{watchedValues.heroTitle}</h2>
                    )}
                    {watchedValues.heroSubtitle && (
                      <p className="text-base opacity-90">{watchedValues.heroSubtitle}</p>
                    )}
                    {!watchedValues.heroTitle && !watchedValues.heroSubtitle && (
                      <p className="opacity-60">Add a title or subtitle</p>
                    )}
                  </div>
                )}

                {blockType === "dividerBlock" && (
                  <div className="py-4 flex justify-center">
                    <div
                      style={{
                        width: `${watchedValues.dividerBlockWidth || 100}%`,
                        height: `${watchedValues.dividerBlockHeight || 1}px`,
                        borderTop: (watchedValues.dividerBlockStyle || "solid") !== "gradient"
                          ? `${watchedValues.dividerBlockHeight || 1}px ${watchedValues.dividerBlockStyle || "solid"} ${watchedValues.dividerBlockColor || "#e2e8f0"}`
                          : undefined,
                        background: (watchedValues.dividerBlockStyle || "solid") === "gradient"
                          ? `linear-gradient(to right, transparent, ${watchedValues.dividerBlockColor || "#e2e8f0"}, transparent)`
                          : undefined,
                      }}
                    />
                  </div>
                )}

                {blockType === "spacer" && (
                  <div className="flex items-center justify-center">
                    <div
                      className="w-full border border-dashed border-slate-300 rounded flex items-center justify-center"
                      style={{ height: `${watchedValues.spacerHeight || 20}px` }}
                    >
                      <span className="text-xs text-slate-400">{watchedValues.spacerHeight || 20}px</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Form>

      <div className="p-6 border-t border-slate-800 flex-shrink-0">
        <Button
          onClick={onClose}
          className="w-full bg-purple-600 text-white hover:bg-purple-700"
        >
          Done
        </Button>
      </div>

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        type={mediaPickerType}
      />
    </div>
  );
}
