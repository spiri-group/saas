"use client";
import { useState } from "react";
import { FileText, Plus, Edit, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import UseEmailHeadersFooters from "../hooks/UseEmailHeadersFooters";
import UseDeleteEmailHeaderFooter from "../hooks/UseDeleteEmailHeaderFooter";
import UseUpsertEmailHeaderFooter from "../hooks/UseUpsertEmailHeaderFooter";
import HeaderFooterEditor from "./HeaderFooterEditor";
import { EmailHeaderFooter } from "../types";
import useKeyboardShortcuts from "../hooks/UseKeyboardShortcuts";

interface HeaderFooterManagerProps {
  type: "header" | "footer";
}

export default function HeaderFooterManager({ type }: HeaderFooterManagerProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<EmailHeaderFooter | null>(null);

  const { data: allItems, isLoading, error } = UseEmailHeadersFooters(type);
  const deleteMutation = UseDeleteEmailHeaderFooter();
  const upsertMutation = UseUpsertEmailHeaderFooter();

  const items = allItems || [];

  const handleCreate = () => {
    setEditingItem(null);
    setShowEditor(true);
  };

  const handleEdit = (item: EmailHeaderFooter) => {
    setEditingItem(item);
    setShowEditor(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success(`"${name}" deleted successfully`);
        },
        onError: (error: any) => {
          // Extract the error message from the GraphQL error
          const errorMessage = error?.message || 'Failed to delete header/footer';
          toast.error(errorMessage);
        }
      });
    }
  };

  const handleSetDefault = (item: EmailHeaderFooter) => {
    upsertMutation.mutate({
      id: item.id,
      name: item.name,
      type: item.type,
      content: item.content,
      isDefault: true,
      isActive: item.isActive,
    }, {
      onSuccess: () => {
        toast.success(`"${item.name}" set as default ${type}`);
      },
      onError: () => {
        toast.error(`Failed to set default ${type}`);
      }
    });
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingItem(null);
  };

  // Keyboard shortcuts for header/footer management
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'n', action: handleCreate, description: `Create new ${type}` },
      { key: 'Escape', action: handleCloseEditor, description: 'Close editor' },
    ],
    enabled: !showEditor
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-slate-400">
          <FileText className="h-5 w-5 animate-pulse" />
          <span>Loading headers & footers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">Failed to load headers & footers</p>
        </div>
      </div>
    );
  }

  const renderItemCard = (item: EmailHeaderFooter) => (
    <Card
      key={item.id}
      className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <CardTitle className="text-white text-base font-medium">
                {item.name}
              </CardTitle>
              {item.isActive ? (
                <span title="Active">
                  <Eye className="h-3 w-3 text-green-400" />
                </span>
              ) : (
                <span title="Inactive">
                  <EyeOff className="h-3 w-3 text-slate-500" />
                </span>
              )}
              {item.isDefault && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-600/20 text-blue-400 border-blue-600"
                >
                  Default
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {!item.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetDefault(item)}
                disabled={upsertMutation.isPending}
                className="h-8 w-8 p-0 text-slate-400 hover:text-yellow-400 hover:bg-slate-700"
                title="Set as default"
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
            {item.isDefault && (
              <span className="h-8 w-8 flex items-center justify-center" title="Default">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-purple-400 hover:bg-slate-700"
              title="Edit"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item.id, item.name)}
              disabled={deleteMutation.isPending}
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-700"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {item.description && (
        <CardContent>
          <p className="text-xs text-slate-400 line-clamp-2">
            {item.description}
          </p>
        </CardContent>
      )}
    </Card>
  );

  const typeDescription = type === "header" ? "Email headers (logos, navigation)" : "Email footers (unsubscribe, social links)";

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex flex-col transition-all ${showEditor ? 'w-80' : 'flex-1'}`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{typeDescription} • {items.length} {type}s</p>
            <Button
              onClick={handleCreate}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create {type === "header" ? "Header" : "Footer"}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(renderItemCard)}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-lg">
              <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No {type}s yet</h3>
              <p className="text-slate-400 mb-4">
                Create a {type} to use across your email templates.
              </p>
              <Button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First {type === "header" ? "Header" : "Footer"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      {showEditor && (
        <HeaderFooterEditor
          open={showEditor}
          onClose={handleCloseEditor}
          editingItem={editingItem}
          type={type}
        />
      )}
    </div>
  );
}
