"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import GridCell from "./GridCell";
import CellContentEditor from "./CellContentEditor";
import {
  GridCell as GridCellType,
  GridStructure,
  CellContent,
  createEmptyCell
} from "./types";

interface GridContentMakerProps {
  value?: GridStructure;
  onChange: (structure: GridStructure) => void;
}

export default function GridContentMaker({ value, onChange }: GridContentMakerProps) {
  const [gridStructure, setGridStructure] = useState<GridStructure>(
    value || { rootCell: createEmptyCell("root") }
  );
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);

  // Helper function to find a cell by ID in the tree
  const findCell = (cell: GridCellType, targetId: string): GridCellType | null => {
    if (cell.id === targetId) return cell;
    if (cell.children) {
      for (const child of cell.children) {
        const found = findCell(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to update a cell in the tree
  const updateCell = (
    cell: GridCellType,
    targetId: string,
    updater: (cell: GridCellType) => GridCellType
  ): GridCellType => {
    if (cell.id === targetId) {
      return updater(cell);
    }
    if (cell.children) {
      return {
        ...cell,
        children: cell.children.map((child) => updateCell(child, targetId, updater))
      };
    }
    return cell;
  };

  // Helper function to delete a cell (can't delete root)
  const deleteCell = (cell: GridCellType, targetId: string): GridCellType => {
    if (cell.children) {
      const filteredChildren = cell.children.filter((child) => child.id !== targetId);
      if (filteredChildren.length !== cell.children.length) {
        // Cell was deleted at this level
        if (filteredChildren.length === 0) {
          // If no children left, remove the division
          return { ...cell, children: undefined, direction: undefined };
        }
        return { ...cell, children: filteredChildren };
      }
      // Recursively delete from children
      return {
        ...cell,
        children: cell.children.map((child) => deleteCell(child, targetId))
      };
    }
    return cell;
  };

  const handleSplit = (cellId: string, direction: "horizontal" | "vertical") => {
    const newStructure = {
      rootCell: updateCell(gridStructure.rootCell, cellId, (cell) => ({
        ...cell,
        direction,
        children: [
          createEmptyCell(),
          createEmptyCell()
        ]
      }))
    };
    setGridStructure(newStructure);
    onChange(newStructure);
  };

  const handleDelete = (cellId: string) => {
    if (cellId === "root") {
      // Reset root cell instead of deleting
      const newStructure = { rootCell: createEmptyCell("root") };
      setGridStructure(newStructure);
      onChange(newStructure);
      setSelectedCellId(null);
      return;
    }

    const newStructure = {
      rootCell: deleteCell(gridStructure.rootCell, cellId)
    };
    setGridStructure(newStructure);
    onChange(newStructure);
    setSelectedCellId(null);
  };

  const handleSaveContent = (cellId: string, content: CellContent) => {
    const newStructure = {
      rootCell: updateCell(gridStructure.rootCell, cellId, (cell) => ({
        ...cell,
        content
      }))
    };
    setGridStructure(newStructure);
    onChange(newStructure);
  };

  const handleReset = () => {
    const newStructure = { rootCell: createEmptyCell("root") };
    setGridStructure(newStructure);
    onChange(newStructure);
    setSelectedCellId(null);
    setEditingCellId(null);
  };

  const editingCell = editingCellId ? findCell(gridStructure.rootCell, editingCellId) : null;

  return (
    <div className="flex h-full">
      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h3 className="text-white font-medium">Grid Content Builder</h3>
            <p className="text-xs text-slate-400">
              Click a cell to select, then use controls to split or edit
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-red-400 border-red-400/30 hover:bg-red-400/10"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Grid Canvas */}
        <div className="flex-1 p-4 bg-slate-900 overflow-auto">
          <div className="max-w-4xl mx-auto lg:max-w-none">
            <GridCell
              cell={gridStructure.rootCell}
              onEdit={setEditingCellId}
              onSplit={handleSplit}
              onDelete={handleDelete}
              isSelected={selectedCellId === gridStructure.rootCell.id}
              onSelect={setSelectedCellId}
            />
          </div>
        </div>
      </div>

      {/* Content Editor Panel */}
      {editingCell && (
        <CellContentEditor
          cellId={editingCell.id}
          content={editingCell.content}
          onSave={handleSaveContent}
          onClose={() => setEditingCellId(null)}
        />
      )}
    </div>
  );
}
