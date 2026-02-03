"use client";
import { useState, useMemo } from "react";
import { List, TreePine, Plus, Loader2, Search } from "lucide-react";
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel";
import { choice_config_type } from "@/utils/spiriverse";
import UseChoiceConfigs from "./hooks/UseChoiceConfigs";

interface ChoiceConfigListProps {
  onSelectConfig: (config: choice_config_type) => void;
  selectedConfig: choice_config_type | null;
  onNewConfig: () => void;
}

export default function ChoiceConfigList({ onSelectConfig, selectedConfig, onNewConfig }: ChoiceConfigListProps) {
  const { data: configs, isLoading, error } = UseChoiceConfigs();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter configs based on search query
  const filteredConfigs = useMemo(() => {
    if (!configs || !searchQuery.trim()) return configs;

    const query = searchQuery.toLowerCase().trim();
    return configs.filter(config =>
      config.label.toLowerCase().includes(query) ||
      config.id.toLowerCase().includes(query) ||
      config.kind.toLowerCase().includes(query)
    );
  }, [configs, searchQuery]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading configurations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">Failed to load choice configurations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow min-h-0">
      {/* Add New Button */}
      <div className="p-4 border-b border-slate-800 flex-shrink-0">
        <button
          onClick={onNewConfig}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">New Configuration</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-slate-800 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Search Results Summary */}
      {searchQuery.trim() && configs && configs.length > 0 && (
        <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-800 flex-shrink-0">
          <p className="text-xs text-slate-400">
            {filteredConfigs?.length || 0} of {configs.length} configurations
          </p>
        </div>
      )}

      {/* Config List with Carousel */}
      <div className="flex-grow min-h-0">
        {!configs || configs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-400 text-sm">No configurations yet</p>
          </div>
        ) : filteredConfigs?.length === 0 ? (
          <div className="p-6 text-center">
            <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No configurations match your search</p>
            <p className="text-slate-500 text-xs mt-1">Try searching by name, ID, or type (FLAT/HIERARCHICAL)</p>
          </div>
        ) : (
          <Carousel
            orientation="vertical"
            opts={{
              dragFree: true,
              containScroll: 'trimSnaps'
            }}
            plugins={[WheelGesturesPlugin()]}
            className="h-full min-h-0"
          >
            <CarouselContent className="">
              {filteredConfigs?.map((config) => (
                <CarouselItem key={config.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConfig(config)}
                    className={`w-full p-3 rounded-lg text-left transition-all hover:bg-slate-800 ${
                      selectedConfig?.id === config.id
                        ? 'bg-slate-800 border-l-2 border-blue-500'
                        : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        config.kind === 'FLAT'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-purple-500/10 text-purple-400'
                      }`}>
                        {config.kind === 'FLAT' ? (
                          <List className="h-4 w-4" />
                        ) : (
                          <TreePine className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm truncate">{config.label}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            config.kind === 'FLAT'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {config.kind}
                          </span>
                          <span className="text-xs text-slate-500 truncate">{config.id}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>

            <div className="grid grid-cols-2 gap-3 mt-4 mb-2 mx-2">
              {/* Navigation Buttons */}
              <CarouselPrevious style={"RECTANGLE"} className="w-full"
              />
              <CarouselNext style="RECTANGLE" className="w-full"
              />
            </div>
          </Carousel>
        )}
      </div>
    </div>
  );
}