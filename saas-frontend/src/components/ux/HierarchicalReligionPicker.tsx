'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import UseReligionTree, { ReligionNode } from '@/shared/hooks/UseReligionTree';

interface HierarchicalReligionPickerProps {
  selectedReligionId?: string;
  onReligionSelect: (religionId: string | undefined, religionLabel: string) => void;
  placeholder?: string;
  className?: string;
}

const HierarchicalReligionPicker: React.FC<HierarchicalReligionPickerProps> = ({
  selectedReligionId,
  onReligionSelect,
  placeholder = "Select religion",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReligion, setSelectedReligion] = useState<{id: string, label: string} | null>(null);

  // Get religion tree
  const { data: rootNodes, isLoading, error } = UseReligionTree();

  // Find religion label by ID
  const findReligionLabel = (nodes: ReligionNode[] | null, targetId: string): string | null => {
    if (!nodes) return null;

    for (const node of nodes) {
      if (node.id === targetId) {
        return node.label;
      }
      if (node.children) {
        const found = findReligionLabel(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Update selected religion when selectedReligionId changes
  useEffect(() => {
    if (selectedReligionId && rootNodes) {
      const label = findReligionLabel(rootNodes, selectedReligionId);
      if (label) {
        setSelectedReligion({
          id: selectedReligionId,
          label: label
        });
      }
    } else {
      setSelectedReligion(null);
    }
  }, [selectedReligionId, rootNodes]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleReligionClick = (node: ReligionNode) => {
    setSelectedReligion({
      id: node.id,
      label: node.label
    });
    onReligionSelect(node.id, node.label);
    setIsOpen(false);
  };

  const clearSelection = () => {
    setSelectedReligion(null);
    onReligionSelect(undefined, '');
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Filter nodes based on search
  const filterNodes = (nodes: ReligionNode[]): ReligionNode[] => {
    if (!searchQuery.trim()) return nodes;

    const query = searchQuery.toLowerCase();
    return nodes.reduce<ReligionNode[]>((acc, node) => {
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
  const renderNode = (node: ReligionNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedReligion?.id === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-md transition-colors",
            isSelected && "bg-slate-100 dark:bg-slate-800",
            level > 0 && "ml-6"
          )}
          onClick={() => handleReligionClick(node)}
          role="treeitem"
          aria-label={`religion-option-${node.label}`}
          data-testid={`religion-option-${node.id}`}
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

  const filteredNodes = rootNodes ? filterNodes(rootNodes) : [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="religion-picker"
          data-testid="religion-picker"
          className={cn(
            "w-full justify-between",
            !selectedReligion && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedReligion ? selectedReligion.label : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Religion</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading religions...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-red-600">Error loading religions</div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Search religions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                aria-label="search-religions"
                data-testid="religion-search"
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
              {selectedReligion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  aria-label="clear-selection"
                >
                  Clear
                </Button>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto border rounded-md p-2 min-h-[300px]"
              role="tree"
              aria-label="religion-tree"
              data-testid="religion-tree"
            >
              {filteredNodes.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? "No religions found" : "No religions available"}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNodes.map(node => renderNode(node))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HierarchicalReligionPicker;
