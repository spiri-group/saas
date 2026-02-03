"use client";
import { useState } from "react";
import { Plus, Edit, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddOptionPanel from "./AddOptionPanel";
import UseUpsertFlatChoiceOption from "../hooks/UseUpsertFlatChoice";
import UseDeleteFlatChoiceOption from "../hooks/UseDeleteFlatChoiceOption";
import UseFlatChoice from "../hooks/UseFlatChoice";
import { choice_option_type, RecordStatus } from "@/utils/spiriverse";

interface FlatChoiceManagerProps {
  configLabel: string;
  configId: string;
  onBack: () => void;
}

export default function FlatChoiceManager({
  configLabel,
  configId,
  onBack
}: FlatChoiceManagerProps) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingOption, setEditingOption] = useState<choice_option_type | null>(null);

  const { data: flatChoice, refetch } = UseFlatChoice(configId);
  const upsertOptionMutation = UseUpsertFlatChoiceOption();
  const deleteOptionMutation = UseDeleteFlatChoiceOption();

  const options = flatChoice?.options || [];

  const handleAddOption = (option: choice_option_type) => {
    // Save to backend immediately
    upsertOptionMutation.mutate({
      choiceId: configId,
      option: option
    }, {
      onSuccess: () => {
        // Refetch to get updated data
        refetch();
      }
    });

    setEditingOption(null);
    setShowAddPanel(false);
  };

  const handleEditOption = (option: choice_option_type) => {
    setEditingOption(option);
    setShowAddPanel(true);
  };

  const handleDeleteOption = (optionId: string) => {
    // Delete from backend immediately
    deleteOptionMutation.mutate({
      choiceId: configId,
      optionId: optionId
    }, {
      onSuccess: () => {
        // Refetch to get updated data
        refetch();
      }
    });
  };

  const handleClosePanel = () => {
    setShowAddPanel(false);
    setEditingOption(null);
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">Manage Options</h1>
              <p className="text-sm text-slate-400">{configLabel} • {options.length} options</p>
            </div>
          </div>

          <Button
            onClick={() => setShowAddPanel(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Option</span>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {options.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="h-16 w-16 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No options defined</h3>
                <p className="text-slate-400 mb-6 max-w-sm">
                  Add options to create your choice list. Each option will have an ID and localized labels.
                </p>
                <Button
                  onClick={() => setShowAddPanel(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Option
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {options.map((option) => (
                <div key={option.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-white font-medium">{option.defaultLabel}</h3>
                        <code className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                          {option.id}
                        </code>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          option.status === RecordStatus.ACTIVE
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {option.status}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {option.localizations?.map((loc) => (
                          <div key={loc.locale} className="text-sm text-slate-400">
                            <span className="font-mono text-xs text-slate-500">{loc.locale}:</span> {loc.value}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditOption(option)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOption(option.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <AddOptionPanel
        open={showAddPanel}
        onOpenChange={handleClosePanel}
        configId={configId}
        editingOption={editingOption}
        isEditing={!!editingOption}
        onSave={handleAddOption}
      />
    </div>
  );
}