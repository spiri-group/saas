"use client";

import { cn } from "@/lib/utils";
import { GridCell as GridCellType } from "./types";
import { SplitSquareHorizontal, SplitSquareVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextWithFormat } from "@/components/ux/TextFormatterInput";

interface GridCellProps {
  cell: GridCellType;
  onEdit: (cellId: string) => void;
  onSplit: (cellId: string, direction: "horizontal" | "vertical") => void;
  onDelete: (cellId: string) => void;
  isSelected: boolean;
  onSelect: (cellId: string) => void;
}

export default function GridCell({
  cell,
  onEdit,
  onSplit,
  onDelete,
  isSelected,
  onSelect
}: GridCellProps) {
  const hasChildren = cell.children && cell.children.length > 0;
  const hasContent = cell.content.title || cell.content.subtitle || cell.content.description;

  return (
    <div
      className={cn(
        "relative group border border-slate-700 transition-all",
        hasChildren ? "flex" : "min-h-[100px]",
        cell.direction === "horizontal" && "flex-row",
        cell.direction === "vertical" && "flex-col",
        isSelected && "ring-2 ring-purple-500 border-purple-500"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cell.id);
      }}
      style={{
        backgroundColor: cell.content.backgroundColor || "transparent",
        backgroundImage: cell.content.backgroundImage
          ? `url(${cell.content.backgroundImage})`
          : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: cell.content.padding
          ? `${cell.content.padding.top}px ${cell.content.padding.right}px ${cell.content.padding.bottom}px ${cell.content.padding.left}px`
          : undefined
      }}
    >
      {/* Cell Controls - Show on hover or when selected */}
      <div
        className={cn(
          "absolute top-2 right-2 z-10 flex space-x-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Button
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0 bg-slate-800 hover:bg-slate-700"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(cell.id);
          }}
          title="Edit content"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0 bg-slate-800 hover:bg-slate-700"
          onClick={(e) => {
            e.stopPropagation();
            onSplit(cell.id, "horizontal");
          }}
          title="Split horizontally"
        >
          <SplitSquareHorizontal className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0 bg-slate-800 hover:bg-slate-700"
          onClick={(e) => {
            e.stopPropagation();
            onSplit(cell.id, "vertical");
          }}
          title="Split vertically"
        >
          <SplitSquareVertical className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0 bg-red-900 hover:bg-red-800 text-red-300"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(cell.id);
          }}
          title="Delete cell"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Render children if this cell is divided */}
      {hasChildren ? (
        cell.children!.map((childCell) => (
          <div key={childCell.id} className="flex-1">
            <GridCell
              cell={childCell}
              onEdit={onEdit}
              onSplit={onSplit}
              onDelete={onDelete}
              isSelected={isSelected}
              onSelect={onSelect}
            />
          </div>
        ))
      ) : (
        /* Render content if no children */
        <div className="space-y-2">
          {cell.content.title && (
            <TextWithFormat
              content={cell.content.title.content}
              format={cell.content.title.format}
              className="w-full"
            />
          )}
          {cell.content.subtitle && (
            <TextWithFormat
              content={cell.content.subtitle.content}
              format={cell.content.subtitle.format}
              className="w-full"
            />
          )}
          {cell.content.description && (
            <TextWithFormat
              content={cell.content.description.content}
              format={cell.content.description.format}
              className="w-full"
            />
          )}
          {!hasContent && (
            <div className="flex items-center justify-center h-full min-h-[100px]">
              <p className="text-xs text-slate-500">Empty cell - click Edit to add content</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
