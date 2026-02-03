"use client";
import { useState } from "react";
import { Settings } from "lucide-react";
import ChoiceConfigList from "./ChoiceConfigList";
import HierarchicalChoiceEditor from "./HierarchicalChoiceEditor";
import NewConfigurationModal from "./components/NewConfigurationModal";
import FlatChoiceManager from "./components/FlatChoiceManager";
import { choice_config_type } from "@/utils/spiriverse";

export default function ChoiceManager() {
  const [selectedConfig, setSelectedConfig] = useState<choice_config_type | null>(null);
  const [showNewConfigModal, setShowNewConfigModal] = useState(false);
  const handleSelectConfig = (config: choice_config_type) => {
    setSelectedConfig(config);
  };

  const handleBackToList = () => {
    setSelectedConfig(null);
  };

  const handleNewConfig = () => {
    setShowNewConfigModal(true);
  };

  return (
    <div className="flex flex-row h-full">
      {/* Left Sidebar - Choice Config List */}
      <div className="flex flex-col w-80 border-r border-slate-800 bg-slate-950">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Choice Manager</h1>
              <p className="text-sm text-slate-400">Configure flat lists and hierarchical categories</p>
            </div>
          </div>
        </div>
        
        <ChoiceConfigList 
          onSelectConfig={handleSelectConfig}
          selectedConfig={selectedConfig}
          onNewConfig={handleNewConfig}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-grow min-h-0 bg-slate-900">
        {!selectedConfig ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-slate-500" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Select a Choice Configuration</h2>
              <p className="text-slate-400 max-w-sm">
                Choose a flat list or hierarchical category set from the sidebar to start editing.
              </p>
            </div>
          </div>
        ) : selectedConfig.kind === 'FLAT' ? (
          <FlatChoiceManager
            configLabel={selectedConfig.label}
            configId={selectedConfig.id}
            onBack={handleBackToList}
          />
        ) : (
          <HierarchicalChoiceEditor 
            config={selectedConfig}
            onBack={handleBackToList}
          />
        )}
      </div>

      <NewConfigurationModal 
        open={showNewConfigModal} 
        onOpenChange={setShowNewConfigModal} 
      />
    </div>
  );
}