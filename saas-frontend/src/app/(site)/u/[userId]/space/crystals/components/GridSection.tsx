'use client';

import { Grid3X3, Play, Pause, Trash2, Edit, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CrystalGrid, GRID_SHAPES } from '../types';

interface GridSectionProps {
  grids: CrystalGrid[];
  isLoading: boolean;
  onEdit: (grid: CrystalGrid) => void;
  onDelete: (grid: CrystalGrid) => void;
  onActivate: (grid: CrystalGrid) => void;
  onDeactivate: (grid: CrystalGrid) => void;
}

const GridSection: React.FC<GridSectionProps> = ({
  grids,
  isLoading,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
        <p className="text-slate-400 text-sm">Loading grids...</p>
      </div>
    );
  }

  // Separate active and inactive grids
  const activeGrids = grids.filter(g => g.isActive);
  const inactiveGrids = grids.filter(g => !g.isActive);

  if (grids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
          <Grid3X3 className="w-6 h-6 text-purple-400/50" />
        </div>
        <h3 className="text-white font-medium mb-1">No Crystal Grids</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          Create your first crystal grid to harness the power of sacred geometry.
        </p>
      </div>
    );
  }

  const getShapeLabel = (shape?: string) => {
    if (!shape) return null;
    return GRID_SHAPES.find(s => s.key === shape)?.label || shape;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const GridCard = ({ grid }: { grid: CrystalGrid }) => (
    <div
      className={`p-4 border rounded-xl transition-all group ${
        grid.isActive
          ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
      data-testid={`grid-card-${grid.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${grid.isActive ? 'bg-purple-500/30' : 'bg-white/10'}`}>
            <Grid3X3 className={`w-5 h-5 ${grid.isActive ? 'text-purple-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <h4 className="text-white font-medium">{grid.name}</h4>
            <p className="text-slate-400 text-xs">
              {grid.crystals.length} {grid.crystals.length === 1 ? 'crystal' : 'crystals'}
              {grid.gridShape && ` • ${getShapeLabel(grid.gridShape)}`}
            </p>
          </div>
        </div>

        {grid.isActive && (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Active
          </span>
        )}
      </div>

      {/* Purpose */}
      <p className="text-slate-300 text-sm mb-3 line-clamp-2">{grid.purpose}</p>

      {/* Crystals Preview */}
      <div className="flex flex-wrap gap-1 mb-3">
        {grid.crystals.slice(0, 5).map((placement, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 bg-white/10 rounded text-xs text-slate-400"
          >
            {placement.crystalName}
          </span>
        ))}
        {grid.crystals.length > 5 && (
          <span className="px-2 py-0.5 text-xs text-slate-500">
            +{grid.crystals.length - 5} more
          </span>
        )}
      </div>

      {/* Dates */}
      <div className="text-xs text-slate-500 mb-3">
        Created {formatDate(grid.createdDate)}
        {grid.activatedDate && (
          <span className="ml-2">• Activated {formatDate(grid.activatedDate)}</span>
        )}
      </div>

      {/* Outcome (if deactivated) */}
      {!grid.isActive && grid.outcome && (
        <div className="p-2 bg-white/5 rounded mb-3">
          <p className="text-xs text-slate-400 mb-1">Outcome</p>
          <p className="text-slate-300 text-sm">{grid.outcome}</p>
          {grid.effectivenessScore && (
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">{grid.effectivenessScore}/10 effective</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
        {grid.isActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeactivate(grid)}
            className="flex-1 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
          >
            <Pause className="w-4 h-4 mr-1" />
            Deactivate
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onActivate(grid)}
            className="flex-1 text-green-400 hover:text-green-300 hover:bg-green-500/10"
          >
            <Play className="w-4 h-4 mr-1" />
            Activate
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(grid)}
          className="text-slate-400 hover:text-white"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(grid)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Active Grids */}
      {activeGrids.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Active Grids ({activeGrids.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {activeGrids.map((grid) => (
              <GridCard key={grid.id} grid={grid} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Grids */}
      {inactiveGrids.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Inactive Grids ({inactiveGrids.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {inactiveGrids.map((grid) => (
              <GridCard key={grid.id} grid={grid} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GridSection;
