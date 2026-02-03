"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, TreePine, Plus, ChevronRight, ChevronDown, Trash2, Folder, FolderOpen, Loader2, Edit, Move, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { toast } from "sonner";
import UseDeleteCategory from "./hooks/UseDeleteCategory";
import UseReorderCategories from "./hooks/UseReorderCategories";
import AddCategoryPanel from "./components/AddCategoryPanel";
import MoveCategoryPanel from "./components/MoveCategoryPanel";
import ManageMetadataPanel from "./components/ManageMetadataPanel";
import { choice_node_type, choice_config_type, metadata_schema_type } from "@/utils/spiriverse";
import UseChoiceRootNodes from "./hooks/UseChoiceRootNodes";
import UseUpdateMetadataSchema from "./hooks/UseUpdateMetadataSchema";

interface HierarchicalChoiceEditorProps {
  config: choice_config_type;
  onBack: () => void;
}

export default function HierarchicalChoiceEditor({ config, onBack }: HierarchicalChoiceEditorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<choice_node_type | null>(null);
  const [hoveredNode, setHoveredNode] = useState<choice_node_type | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingNode, setEditingNode] = useState<choice_node_type | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [movingNode, setMovingNode] = useState<choice_node_type | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; node: choice_node_type | null }>({ open: false, node: null });
  const [metadataPanelOpen, setMetadataPanelOpen] = useState(false);


  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNode(null);
    setSelectedNode(null);
    setIsCreating(false);
    setMovingNode(null);
  };

  // Hooks
  const { data: rootNodes, isLoading, error } = UseChoiceRootNodes(config.ref);
  const deleteMutation = UseDeleteCategory(config.ref, handleCloseForm);
  const reorderMutation = UseReorderCategories(config.ref);
  const updateMetadataSchemaMutation = UseUpdateMetadataSchema();

  // Helper function to find a node by ID in the tree
  const findNodeById = (nodes: choice_node_type[] | null, id: string): choice_node_type | null => {
    if (!nodes) return null;

    for (const node of nodes) {
      if (node.id === id) return node;

      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }

    return null;
  };

  const handleMoveNode = (node: choice_node_type) => {
    setMovingNode(node);
    setShowForm(true);
    setEditingNode(null);
    setIsCreating(false);
    setSelectedNode(null);
  };

  // Get sibling nodes for the moving node
  const getMovingSiblings = (): choice_node_type[] => {
    if (!movingNode || !rootNodes) return [];

    console.log('getMovingSiblings Debug:', {
      movingNodeLabel: movingNode.label,
      movingNodeLevel: movingNode.level,
      movingNodeParentRef: movingNode.parentRef
    });

    if (!movingNode.parentRef) {
      // This node is a direct root node - return all root nodes as siblings
      console.log('Moving node has no parentRef, returning root nodes');
      return rootNodes;
    } else {
      // Find the parent node and get its children (siblings of moving node)
      const parent = findNodeById(rootNodes, movingNode.parentRef.id);
      console.log('Found parent:', parent ? { label: parent.label, level: parent.level, childrenCount: parent.children?.length } : 'null');

      if (parent && parent.children) {
        const siblings = parent.children.filter(child => child.level === movingNode.level);
        console.log('Filtered siblings:', siblings.map(s => ({ label: s.label, level: s.level })));
        return siblings;
      }

      return [];
    }
  };

  // Global keyboard event listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && hoveredNode && !showForm) {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Enter = Add sibling
          handleAddSibling(hoveredNode);
        } else {
          // Enter = Add child
          handleAddChild(hoveredNode);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [hoveredNode, showForm]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleEditNode = (node: choice_node_type) => {
    setSelectedNode(null);
    setShowForm(true);
    setEditingNode(node);
    setIsCreating(false);
    setMovingNode(null);
  };

  const handleToggleNode = (node: choice_node_type) => {
    if (node.children && node.children.length > 0) {
      toggleExpand(node.id);
    }
    // For leaf nodes, clicking doesn't do anything (could be extended later)
  };

  const handleAddChild = (parentNode?: choice_node_type) => {
    setSelectedNode(parentNode || null);
    setShowForm(true);
    setEditingNode(null);
    setIsCreating(true);
    setMovingNode(null);
  };

  const handleAddSibling = (siblingNode: choice_node_type) => {
    // Find the parent by looking at the sibling's parentRef
    // If sibling has a parent, use that parent. If not, it's a root sibling (selectedNode = null)
    const parentNode = siblingNode.parentRef ? findNodeById(rootNodes ?? [], siblingNode.parentRef.id) : null;
    setSelectedNode(parentNode);
    setShowForm(true);
    setEditingNode(null);
    setIsCreating(true);
    setMovingNode(null);
  };

  const handleDelete = (node: choice_node_type) => {
    const hasChildren = node.children && node.children.length > 0;

    if (hasChildren) {
      // Show dialog for nodes with children
      setDeleteDialog({ open: true, node });
    } else {
      // No prompt for leaf nodes - just delete directly
      deleteMutation.mutate(node.id, {
        onSuccess: () => {
          toast.success(`Category "${node.label}" deleted successfully`);
        }
      });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.node) {
      const node = deleteDialog.node;
      deleteMutation.mutate(node.id, {
        onSuccess: () => {
          const childCount = node.children?.length || 0;
          const message = childCount > 0
            ? `Category "${node.label}" and ${childCount} child ${childCount === 1 ? 'category' : 'categories'} deleted successfully`
            : `Category "${node.label}" deleted successfully`;
          toast.success(message);
          setDeleteDialog({ open: false, node: null });
        },
        onError: () => {
          toast.error('Failed to delete category');
        }
      });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, node: null });
  };

  const handleSaveMetadataSchema = (schema: metadata_schema_type) => {
    updateMetadataSchemaMutation.mutate({
      configId: config.id,
      metadataSchema: schema
    }, {
      onSuccess: () => {
        toast.success('Metadata schema saved successfully');
      },
      onError: () => {
        toast.error('Failed to save metadata schema');
      }
    });
  };

  // Helper function to render metadata
  const renderMetadata = (node: choice_node_type) => {
    if (!node.metadata || !config.metadataSchema?.fields) return null;

    const metadataFields = config.metadataSchema.fields;
    const hasMetadata = Object.keys(node.metadata).length > 0;

    if (!hasMetadata) {
      return (
        <div className="text-xs text-slate-500">
          No metadata defined
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-200 mb-2">Metadata</h4>
        {metadataFields.map((field) => {
          const value = node.metadata?.[field.id];
          if (value === undefined || value === null || value === '') return null;

          return (
            <div key={field.id} className="flex flex-col space-y-1">
              <span className="text-xs font-medium text-slate-300">{field.name}</span>
              <span className="text-xs text-slate-400 font-mono">
                {field.type === 'BOOLEAN'
                  ? (value ? 'Yes' : 'No')
                  : field.type === 'DATE'
                  ? new Date(value as string).toLocaleDateString()
                  : String(value)
                }
              </span>
            </div>
          );
        })}
      </div>
    );
  };



  const renderNode = (node: choice_node_type, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const isReordering = reorderMutation.isPending;

    return (
      <div key={node.id} className="select-none">
        <HoverCard openDelay={500} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div
              className={`group relative flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                isReordering ? 'opacity-70' : 'hover:bg-slate-800'
              } ${
                hasChildren ? 'cursor-pointer' : 'cursor-default'
              } ${isSelected ? 'bg-slate-800 border-l-2 border-blue-500' : ''}`}
              style={{ paddingLeft: `${level * 24 + 8}px` }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleToggleNode(node)}
            >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <div className="p-1 h-6 w-6 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </div>
          ) : (
            <div className="w-6" />
          )}

          {/* Node Icon */}
          <div className="flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-400" />
              ) : (
                <Folder className="h-4 w-4 text-blue-400" />
              )
            ) : (
              <div className="h-4 w-4 rounded bg-slate-600" />
            )}
          </div>

          {/* Node Content */}
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">{node.label}</span>
              <div className="text-xs text-slate-400">
                Level {node.level}
              </div>
            </div>

            {/* Simple hover actions */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditNode(node);
                }}
                className="h-7 px-2 text-xs hover:bg-slate-700"
                title="Edit category"
              >
                <Edit className="h-3 w-3 text-slate-400 mr-1" />
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveNode(node);
                }}
                className="h-7 px-2 text-xs hover:bg-slate-700"
                title="Move category"
              >
                <Move className="h-3 w-3 text-slate-400 mr-1" />
                Move
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddChild(node);
                }}
                className="h-7 px-2 text-xs hover:bg-slate-700"
                title="Add child (Enter)"
              >
                + Child
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSibling(node);
                }}
                className="h-7 px-2 text-xs hover:bg-slate-700"
                title="Add sibling (Shift+Enter)"
              >
                + Sibling
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node);
                }}
                className="h-7 w-7 p-0 hover:bg-slate-700"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
          </div>
        </div>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            className="w-80 bg-slate-900 border-slate-700 text-slate-200"
          >
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-slate-200">{node.label}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Level {node.level} • ID: <span className="font-mono">{node.id}</span>
                </p>
              </div>
              {renderMetadata(node)}
            </div>
          </HoverCardContent>
        </HoverCard>


        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading hierarchical choices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">Failed to load hierarchical choices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Tree View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2 h-9 w-9 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <TreePine className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">{config.label}</h1>
                  <p className="text-sm text-slate-400">Hierarchical Choice Configuration</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                onClick={() => {
                  handleCloseForm(); // Reset other panel states
                  setMetadataPanelOpen(true);
                }}
                variant="outline"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm">Manage Metadata</span>
              </Button>
              <Button
                type="button"
                onClick={() => handleAddChild()}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Add Root Category</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint - Always visible */}
        <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-xs text-slate-400">
              <div className="flex items-center space-x-1">
                <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">Enter</kbd>
                <span>Add child</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">Shift</kbd>
                <span>+</span>
                <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">Enter</kbd>
                <span>Add sibling</span>
              </div>
              <span className="text-slate-500">Hover over any category first</span>
            </div>
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {rootNodes && rootNodes.length > 0 ? (
            <div className="space-y-0">
              {rootNodes.map((rootNode) => renderNode(rootNode))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TreePine className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No categories yet</h3>
              <p className="text-slate-400 mb-6">Create your first category to get started.</p>
              <Button
                type="button"
                onClick={() => handleAddChild()}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add Root Category</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Side Panels */}
      {metadataPanelOpen ? (
        <ManageMetadataPanel
          open={metadataPanelOpen}
          onOpenChange={setMetadataPanelOpen}
          currentSchema={config.metadataSchema}
          onSave={handleSaveMetadataSchema}
        />
      ) : movingNode ? (
        <MoveCategoryPanel
          open={showForm}
          onOpenChange={setShowForm}
          configRef={config.ref}
          configId={config.id}
          movingNode={movingNode}
          siblingNodes={getMovingSiblings()}
        />
      ) : (
        <AddCategoryPanel
          open={showForm}
          onOpenChange={setShowForm}
          configRef={config.ref}
          config={config}
          parentNode={selectedNode}
          editingNode={editingNode}
          isEditing={!isCreating}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              {deleteDialog.node && (
                <>
                  {deleteDialog.node.children && deleteDialog.node.children.length > 0 ? (
                    <>
                      This category has <strong>{deleteDialog.node.children.length}</strong> child{' '}
                      {deleteDialog.node.children.length === 1 ? 'category' : 'categories'}. Are you sure you want to delete{' '}
                      <strong>&quot;{deleteDialog.node.label}&quot;</strong> and all its children?
                      <br />
                      <br />
                      <span className="text-red-600 font-medium">This action cannot be undone.</span>
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete <strong>&quot;{deleteDialog.node.label}&quot;</strong>?
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}