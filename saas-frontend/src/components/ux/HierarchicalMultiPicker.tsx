'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface HierarchicalNode {
  id: string;
  label: string;
  children?: HierarchicalNode[];
}

interface HierarchicalMultiPickerProps {
  nodes: HierarchicalNode[] | null;
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[], selectedLabels: { id: string; label: string }[]) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  isLoading?: boolean;
  error?: boolean;
}

const HierarchicalMultiPicker: React.FC<HierarchicalMultiPickerProps> = ({
  nodes,
  selectedIds,
  onSelectionChange,
  placeholder = "Select options",
  className,
  label = "Select",
  isLoading = false,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ id: string; label: string }[]>([]);

  // Find node label by ID
  const findNodeLabel = (nodes: HierarchicalNode[] | null, targetId: string): string | null => {
    if (!nodes) return null;

    for (const node of nodes) {
      if (node.id === targetId) {
        return node.label;
      }
      if (node.children) {
        const found = findNodeLabel(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Update selected items when selectedIds changes
  useEffect(() => {
    if (selectedIds && nodes) {
      const items = selectedIds.map(id => ({
        id,
        label: findNodeLabel(nodes, id) || id
      })); // Keep all items, use id as fallback label
      setSelectedItems(items);
    } else {
      setSelectedItems([]);
    }
  }, [selectedIds, nodes]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNodeClick = (node: HierarchicalNode) => {
    const isSelected = selectedIds.includes(node.id);
    let newSelectedIds: string[];
    let newSelectedItems: { id: string; label: string }[];

    if (isSelected) {
      // Remove from selection
      newSelectedIds = selectedIds.filter(id => id !== node.id);
      newSelectedItems = selectedItems.filter(item => item.id !== node.id);
    } else {
      // Add to selection
      newSelectedIds = [...selectedIds, node.id];
      newSelectedItems = [...selectedItems, { id: node.id, label: node.label }];
    }

    setSelectedItems(newSelectedItems);
    onSelectionChange(newSelectedIds, newSelectedItems);
  };

  const removeItem = (idToRemove: string) => {
    const newSelectedIds = selectedIds.filter(id => id !== idToRemove);
    const newSelectedItems = selectedItems.filter(item => item.id !== idToRemove);
    setSelectedItems(newSelectedItems);
    onSelectionChange(newSelectedIds, newSelectedItems);
  };

  const clearAll = () => {
    setSelectedItems([]);
    onSelectionChange([], []);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Filter nodes based on search
  const filterNodes = (nodes: HierarchicalNode[]): HierarchicalNode[] => {
    if (!searchQuery.trim()) return nodes;

    const query = searchQuery.toLowerCase();
    return nodes.reduce<HierarchicalNode[]>((acc, node) => {
      const matches = node.label.toLowerCase().includes(query);
      const childMatches = node.children ? filterNodes(node.children) : [];

      if (matches || childMatches.length > 0) {
        acc.push({
          ...node,
          children: childMatches.length > 0 ? childMatches : node.children
        });
      }

      return acc;
    }, []);
  };

  // Render tree node
  const renderNode = (node: HierarchicalNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedIds.includes(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-md transition-colors",
            isSelected && "bg-slate-100 dark:bg-slate-800",
            level > 0 && "ml-6"
          )}
          onClick={() => handleNodeClick(node)}
          role="treeitem"
          aria-label={`merchant-type-option-${node.label}`}
          data-testid={`merchant-type-option-${node.id}`}
          aria-selected={isSelected}
          aria-expanded={hasChildren ? isExpanded : undefined}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <span className="flex-1 text-sm">{node.label}</span>

          {isSelected && <Check className="h-4 w-4 text-green-600" />}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredNodes = nodes ? filterNodes(nodes) : [];

  return (
    <div className="w-full">
      {/* Selected items badges */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedItems.map(item => (
            <Badge key={item.id} variant="secondary" className="flex items-center gap-1">
              <span>{item.label}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="ml-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5"
                aria-label={`Remove ${item.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-label="merchant-type-picker"
            data-testid="merchant-type-picker"
            className={cn(
              "w-full justify-between",
              selectedItems.length === 0 && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">
              {selectedItems.length === 0
                ? placeholder
                : `${selectedItems.length} selected`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-2xl max-h-[80vh] flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading options...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-red-600">Error loading options</div>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  aria-label="search-merchant-types"
                  data-testid="merchant-type-search"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="flex items-center gap-1"
                  aria-label="collapse-all"
                >
                  <Minimize2 className="h-4 w-4" />
                  Collapse
                </Button>
                {selectedItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    aria-label="clear-all"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div
                className="flex-1 overflow-y-auto border rounded-md p-2 min-h-[300px]"
                role="tree"
                aria-label="merchant-type-tree"
                data-testid="merchant-type-tree"
              >
                {filteredNodes.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      {searchQuery ? "No options found" : "No options available"}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredNodes.map(node => renderNode(node))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/20">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  aria-label="close-dialog"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HierarchicalMultiPicker;
