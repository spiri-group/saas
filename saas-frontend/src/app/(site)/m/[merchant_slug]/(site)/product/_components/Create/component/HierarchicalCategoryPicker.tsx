'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Check, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import UseProductCategories, { ProductCategory } from '../hooks/UseProductCategories';

interface HierarchicalCategoryPickerProps {
  merchantId: string;
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string | undefined, categoryPath: string) => void;
  placeholder?: string;
  className?: string;
}

const HierarchicalCategoryPicker: React.FC<HierarchicalCategoryPickerProps> = ({
  merchantId,
  selectedCategoryId,
  onCategorySelect,
  placeholder = "Select a category",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<{id: string, path: string} | null>(null);

  // Get product categories for this merchant
  const { data: rootNodes, isLoading, error } = UseProductCategories(merchantId);

  // Find category path by ID
  const findCategoryPath = (nodes: ProductCategory[] | null, targetId: string, currentPath: string[] = []): string[] | null => {
    if (!nodes) return null;

    for (const node of nodes) {
      const newPath = [...currentPath, node.label];
      if (node.id === targetId) {
        return newPath;
      }
      if (node.children) {
        const found = findCategoryPath(node.children, targetId, newPath);
        if (found) return found;
      }
    }
    return null;
  };

  // Update selected category when selectedCategoryId changes
  useEffect(() => {
    if (selectedCategoryId && rootNodes) {
      const path = findCategoryPath(rootNodes, selectedCategoryId);
      if (path) {
        setSelectedCategory({
          id: selectedCategoryId,
          path: path.join(' > ')
        });
      }
    } else {
      setSelectedCategory(null);
    }
  }, [selectedCategoryId, rootNodes]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleCategoryClick = (node: ProductCategory) => {
    const path = findCategoryPath(rootNodes || [], node.id);
    const pathString = path ? path.join(' > ') : node.label;

    setSelectedCategory({
      id: node.id,
      path: pathString
    });
    onCategorySelect(node.id, pathString);
    setIsOpen(false);
  };

  const clearSelection = () => {
    setSelectedCategory(null);
    onCategorySelect(undefined, '');
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Filter nodes based on search
  const filterNodes = (nodes: ProductCategory[]): ProductCategory[] => {
    if (!searchQuery.trim()) return nodes;

    const filtered: ProductCategory[] = [];
    const query = searchQuery.toLowerCase();

    for (const node of nodes) {
      const matchesSearch = node.label.toLowerCase().includes(query);
      const filteredChildren = node.children ? filterNodes(node.children) : [];

      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        });

        // Auto-expand nodes that match search or have matching children
        if (matchesSearch || filteredChildren.length > 0) {
          expandedNodes.add(node.id);
        }
      }
    }

    return filtered;
  };

  const renderNode = (node: ProductCategory, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedCategory?.id === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "group flex items-center space-x-2 p-2 rounded-lg transition-colors cursor-pointer hover:bg-slate-100",
            isSelected && "bg-blue-50 border-l-2 border-blue-500"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleCategoryClick(node)}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <div
              className="p-1 h-6 w-6 flex items-center justify-center hover:bg-slate-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </div>
          ) : (
            <div className="w-6" />
          )}

          {/* Category Icon */}
          <div className="flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500" />
              )
            ) : (
              <div className="h-4 w-4 rounded bg-slate-400" />
            )}
          </div>

          {/* Category Label */}
          <div className="flex-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">{node.label}</span>
            {isSelected && <Check className="h-4 w-4 text-blue-500" />}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
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
          aria-expanded={isOpen}
          className={cn("w-full justify-between", className)}
        >
          {selectedCategory ? (
            <span className="truncate">{selectedCategory.path}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[500px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Category</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4 flex-grow min-h-0">
          {/* Search and Controls */}
          <div className="flex gap-2">
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="px-3"
              title="Collapse all categories"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Category Display */}
          {selectedCategory && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded border">
              <span className="text-sm font-medium text-blue-900 truncate">
                Selected: {selectedCategory.path}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                ×
              </Button>
            </div>
          )}

          {/* Category Tree */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-slate-500">Loading categories...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-red-500">Failed to load categories</span>
              </div>
            ) : filteredNodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-slate-500">
                  {searchQuery ? 'No categories match your search' : 'No categories available'}
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNodes.map((node) => renderNode(node))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              disabled={!selectedCategory}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HierarchicalCategoryPicker;