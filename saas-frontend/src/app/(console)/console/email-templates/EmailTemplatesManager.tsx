"use client";
import { useState, useMemo } from "react";
import { Mail, Plus, Code, Eye, EyeOff, Settings, FileText, Keyboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import UseEmailTemplates from "./hooks/UseEmailTemplates";
import TemplateMetadataEditor from "./components/TemplateMetadataEditor";
import TemplateContentEditor from "./components/TemplateContentEditor";
import HeaderFooterManager from "./components/HeaderFooterManager";
import { EmailTemplate } from "./types";
import useKeyboardShortcuts from "./hooks/UseKeyboardShortcuts";
import UnsavedChangesDialog from "./components/UnsavedChangesDialog";
import { EmailPreview } from "./components/EmailContentBuilder";

export default function EmailTemplatesManager() {
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showTabSwitchDialog, setShowTabSwitchDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);

  const { data: allTemplates, isLoading, error } = UseEmailTemplates(selectedCategory);

  // Filter templates by search query
  const templates = useMemo(() => {
    if (!allTemplates || !searchQuery.trim()) return allTemplates;

    const query = searchQuery.toLowerCase();
    return allTemplates.filter(template =>
      template.name.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.id.toLowerCase().includes(query)
    );
  }, [allTemplates, searchQuery]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowMetadataEditor(true);
  };

  const handleEditMetadata = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowMetadataEditor(true);
  };

  const handleConfigureContent = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowContentEditor(true);
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setPreviewingTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleCloseMetadataEditor = () => {
    setShowMetadataEditor(false);
    setEditingTemplate(null);
  };

  const handleCloseContentEditor = () => {
    setShowContentEditor(false);
    setEditingTemplate(null);
    setHasUnsavedChanges(false);
  };

  const handleCloseEditors = () => {
    if (showMetadataEditor) {
      handleCloseMetadataEditor();
    } else if (showContentEditor) {
      handleCloseContentEditor();
    }
  };

  const handleTabChange = (newTab: string) => {
    // If there are unsaved changes and an editor is open, show confirmation
    if (hasUnsavedChanges && (showContentEditor || showMetadataEditor)) {
      setPendingTab(newTab);
      setShowTabSwitchDialog(true);
    } else {
      setCurrentTab(newTab);
    }
  };

  const handleConfirmTabSwitch = () => {
    if (pendingTab) {
      // Close any open editors
      handleCloseEditors();
      setCurrentTab(pendingTab);
      setPendingTab(null);
      setShowTabSwitchDialog(false);
      setHasUnsavedChanges(false);
    }
  };

  // Context-aware create action based on current tab
  const handleContextualCreate = () => {
    if (currentTab === 'templates') {
      handleCreateTemplate();
    }
    // Headers and footers tabs handle their own create buttons
    // The HeaderFooterManager component will handle 'n' key internally
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'n', action: handleContextualCreate, description: 'Create new item (context-aware)' },
      { key: 'c', action: () => setSelectedCategory(undefined), description: 'Clear category filter' },
      { key: 't', action: () => handleTabChange('templates'), description: 'Switch to Templates tab' },
      { key: 'h', action: () => handleTabChange('headers'), description: 'Switch to Headers tab' },
      { key: 'f', action: () => handleTabChange('footers'), description: 'Switch to Footers tab' },
      { key: '/', action: () => setShowShortcutsDialog(true), description: 'Show keyboard shortcuts' },
      { key: 'Escape', action: handleCloseEditors, description: 'Close editors' },
    ],
    enabled: !showShortcutsDialog && currentTab === 'templates' && !showContentEditor && !showMetadataEditor
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-slate-400">
          <Mail className="h-5 w-5 animate-pulse" />
          <span>Loading email templates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">Failed to load email templates</p>
        </div>
      </div>
    );
  }

  // Get unique categories
  const categories = Array.from(
    new Set(
      (templates || [])
        .map(t => t.category)
        .filter((c): c is string => !!c)
    )
  ).sort();

  const hasContent = (template: EmailTemplate) => {
    return template.subject && template.html;
  };

  return (
    <div className="flex h-full">
      {/* Main Content - Collapse when content editor is open */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className={`flex flex-col transition-all ${showContentEditor ? 'w-80 flex-shrink-0 overflow-hidden' : 'flex-1'}`}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-400" />
                <h1 className="text-lg font-semibold text-white">Email Templates</h1>
              </div>

              <div className="flex items-center gap-3">
                {/* Tabs Navigation - Responsive based on editor state */}
                {showContentEditor ? (
                  <TabsList className="h-auto p-1">
                    <TabsTrigger value="templates" className="px-2 py-1.5 text-xs">
                      <Mail className="h-3 w-3 mr-1.5" />
                      <span>Templates</span>
                    </TabsTrigger>
                    <TabsTrigger value="headers" className="px-2 py-1.5 text-xs">
                      <FileText className="h-3 w-3 mr-1.5" />
                      <span>Headers</span>
                    </TabsTrigger>
                    <TabsTrigger value="footers" className="px-2 py-1.5 text-xs">
                      <FileText className="h-3 w-3 mr-1.5" />
                      <span>Footers</span>
                    </TabsTrigger>
                  </TabsList>
                ) : (
                  <TabsList>
                    <TabsTrigger value="templates" className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      <span>Templates</span>
                    </TabsTrigger>
                    <TabsTrigger value="headers" className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      <span>Headers</span>
                    </TabsTrigger>
                    <TabsTrigger value="footers" className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      <span>Footers</span>
                    </TabsTrigger>
                  </TabsList>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShortcutsDialog(true)}
                  className="h-8 w-8 text-slate-400 hover:text-purple-400"
                  title="Keyboard shortcuts (/)"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Templates Tab */}
          <TabsContent value="templates" className="flex-1 flex flex-col mt-0">
            <div className="p-6 border-b border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {templates?.length || 0} {searchQuery ? 'matching ' : ''}templates
                </p>
                <Button
                  onClick={handleCreateTemplate}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Template</span>
                </Button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search templates by name, description, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500"
                />
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 flex-shrink-0">Category:</span>
                  <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="flex items-center gap-2 pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCategory(undefined)}
                        className={`h-7 flex-shrink-0 ${!selectedCategory ? 'bg-purple-600/20 text-purple-400 border-purple-600' : ''}`}
                      >
                        All
                      </Button>
                      {categories.map((category) => (
                        <Button
                          key={category}
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCategory(category)}
                          className={`h-7 flex-shrink-0 capitalize whitespace-nowrap ${selectedCategory === category ? 'bg-purple-600/20 text-purple-400 border-purple-600' : ''}`}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {templates && templates.length > 0 ? (
                <div className={showContentEditor ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                  {templates.map((template) => {
                    const contentConfigured = hasContent(template);

                    return showContentEditor ? (
                      // Compact list view when editor is open
                      <div
                        key={template.id}
                        className={`w-full p-3 rounded-lg border transition-colors ${
                          editingTemplate?.id === template.id
                            ? 'bg-purple-600/20 border-purple-600'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleConfigureContent(template)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-white truncate">
                                {template.name}
                              </p>
                              {!contentConfigured && (
                                <Badge variant="outline" className="text-xs bg-amber-600/20 text-amber-400 border-amber-600">
                                  Setup
                                </Badge>
                              )}
                            </div>
                            {template.category && (
                              <p className="text-xs text-slate-400 capitalize">{template.category}</p>
                            )}
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {contentConfigured && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewTemplate(template);
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-purple-400"
                                title="Preview"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            {template.isActive ? (
                              <Eye className="h-3 w-3 text-green-400" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-slate-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Full card view when editor is closed
                      <Card
                        key={template.id}
                        className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <CardTitle className="text-white text-base font-medium">
                                  {template.name}
                                </CardTitle>
                                {template.isActive ? (
                                  <Eye className="h-3 w-3 text-green-400" />
                                ) : (
                                  <EyeOff className="h-3 w-3 text-slate-500" />
                                )}
                                {!contentConfigured && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-amber-600/20 text-amber-400 border-amber-600"
                                  >
                                    Setup Required
                                  </Badge>
                                )}
                              </div>
                              {template.category && (
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize bg-purple-600/20 text-purple-400 border-purple-600"
                                >
                                  {template.category}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMetadata(template)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-purple-400 hover:bg-slate-700"
                              title="Edit metadata"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {template.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {template.description}
                            </p>
                          )}

                          <div className="flex gap-2">
                            {contentConfigured && (
                              <Button
                                onClick={() => handlePreviewTemplate(template)}
                                variant="outline"
                                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-sm h-8"
                              >
                                <Eye className="h-3 w-3 mr-2" />
                                Preview
                              </Button>
                            )}
                            <Button
                              onClick={() => handleConfigureContent(template)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm h-8"
                            >
                              <Code className="h-3 w-3 mr-2" />
                              {contentConfigured ? 'Edit Content' : 'Configure Content'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  {searchQuery ? (
                    <>
                      <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        No templates found
                      </h3>
                      <p className="text-slate-400 mb-4">
                        No templates match &quot;{searchQuery}&quot;. Try a different search term.
                      </p>
                      <Button
                        onClick={() => setSearchQuery("")}
                        variant="outline"
                        className="mx-auto"
                      >
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <Mail className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        {selectedCategory ? 'No templates in this category' : 'No email templates'}
                      </h3>
                      <p className="text-slate-400 mb-4">
                        {selectedCategory
                          ? 'Try selecting a different category or create a new template.'
                          : 'Get started by creating your first email template.'}
                      </p>
                      <Button
                        onClick={handleCreateTemplate}
                        className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create First Template</span>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Headers Tab */}
          <TabsContent value="headers" className="flex-1 flex flex-col mt-0">
            <HeaderFooterManager type="header" />
          </TabsContent>

          {/* Footers Tab */}
          <TabsContent value="footers" className="flex-1 flex flex-col mt-0">
            <HeaderFooterManager type="footer" />
          </TabsContent>
      </Tabs>

      {/* Metadata Editor Panel - Only show on templates tab */}
      {showMetadataEditor && (
        <TemplateMetadataEditor
          open={showMetadataEditor}
          onClose={handleCloseMetadataEditor}
          editingTemplate={editingTemplate}
        />
      )}

      {/* Content Editor Panel - Only show on templates tab */}
      {showContentEditor && editingTemplate && (
        <TemplateContentEditor
          open={showContentEditor}
          onClose={handleCloseContentEditor}
          template={editingTemplate}
          onHasChanges={setHasUnsavedChanges}
        />
      )}

      {/* Tab Switch Confirmation Dialog */}
      <UnsavedChangesDialog
        open={showTabSwitchDialog}
        onOpenChange={(open) => {
          setShowTabSwitchDialog(open);
          if (!open) setPendingTab(null);
        }}
        onConfirm={handleConfirmTabSwitch}
        title="Switch tabs with unsaved changes?"
        description="You have unsaved changes in the editor. If you switch tabs now, your changes will be lost."
      />

      {/* Template Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-purple-400" />
              <span>{previewingTemplate?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Preview of email template
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {previewingTemplate && (() => {
              try {
                // Parse the HTML content which contains the JSON structure
                const htmlContent = previewingTemplate.html || "";
                const jsonMatch = htmlContent.match(/<!-- Email Structure -->\s*(\{[\s\S]*\})/);
                if (jsonMatch) {
                  const structure = JSON.parse(jsonMatch[1]);
                  return (
                    <EmailPreview
                      structure={structure}
                      subject={previewingTemplate.subject}
                      headerId={previewingTemplate.headerId}
                      footerId={previewingTemplate.footerId}
                    />
                  );
                }
              } catch (e) {
                console.error("Failed to parse template structure", e);
              }
              return (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Unable to preview template</p>
                    <p className="text-sm mt-2">Template structure could not be loaded</p>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="pt-4 border-t border-slate-700">
            <Button
              onClick={() => setShowPreviewDialog(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Keyboard className="h-5 w-5 text-purple-400" />
              <span>Keyboard Shortcuts</span>
            </DialogTitle>
            <DialogDescription>
              Use these keyboard shortcuts to navigate quickly. Shortcuts don&apos;t work when typing in text fields.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white mb-3">Navigation</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded bg-slate-800/50">
                  <span className="text-slate-300">Templates tab</span>
                  <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-purple-300 font-mono text-sm min-w-[2rem] text-center">T</kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded bg-slate-800/50">
                  <span className="text-slate-300">Headers tab</span>
                  <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-purple-300 font-mono text-sm min-w-[2rem] text-center">H</kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded bg-slate-800/50">
                  <span className="text-slate-300">Footers tab</span>
                  <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-purple-300 font-mono text-sm min-w-[2rem] text-center">F</kbd>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white mb-3">Actions</h4>
              <div className="space-y-2">
                <div className="flex items-start justify-between py-2 px-3 rounded bg-slate-800/50">
                  <div className="flex-1">
                    <span className="text-slate-300">Create new item</span>
                    <p className="text-xs text-slate-500 mt-0.5">Context-aware: Template / Header / Footer</p>
                  </div>
                  <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-purple-300 font-mono text-sm min-w-[2rem] text-center">N</kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded bg-slate-800/50">
                  <span className="text-slate-300">Clear category filter</span>
                  <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-purple-300 font-mono text-sm min-w-[2rem] text-center">C</kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded bg-slate-800/50">
                  <span className="text-slate-300">Close editors</span>
                  <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-purple-300 font-mono text-sm min-w-[2rem] text-center">Esc</kbd>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white mb-3">Help</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded bg-slate-800/50">
                  <span className="text-slate-300">Show this dialog</span>
                  <kbd className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-purple-300 font-mono text-sm min-w-[2rem] text-center">/</kbd>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
