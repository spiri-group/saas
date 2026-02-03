'use client';

import { BirthChart, getSignInfo, getBodyInfo, formatDegree, CelestialBody } from '../_hooks/useBirthChart';

interface Props {
  chart: BirthChart;
}

// Group planets by category
const PERSONAL_PLANETS: CelestialBody[] = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const SOCIAL_PLANETS: CelestialBody[] = ['jupiter', 'saturn'];
const OUTER_PLANETS: CelestialBody[] = ['uranus', 'neptune', 'pluto'];
const POINTS: CelestialBody[] = ['chiron', 'northnode', 'ascendant', 'midheaven'];

export const PlanetPlacements: React.FC<Props> = ({ chart }) => {
  const renderPlanetRow = (body: CelestialBody) => {
    const planet = chart.planets.find(p => p.body === body);
    if (!planet) return null;

    const bodyInfo = getBodyInfo(planet.body);
    const signInfo = getSignInfo(planet.sign);

    return (
      <tr key={planet.body} className="border-b border-white/5 last:border-b-0">
        <td className="py-3 pr-4 w-1/4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{bodyInfo?.symbol}</span>
            <span className="text-white">{bodyInfo?.name}</span>
            {planet.retrograde && (
              <span className="text-orange-400 text-sm" title="Retrograde">℞</span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 w-1/4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{signInfo?.symbol}</span>
            <span className="text-slate-300">{signInfo?.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-slate-400 font-mono text-sm w-1/4">
          {formatDegree(planet.degree)}
        </td>
        <td className="py-3 pl-4 text-slate-400 w-1/4">
          {planet.house ? (
            <span className="bg-slate-700/50 px-2 py-0.5 rounded text-sm">
              {planet.house}
              {chart.housesAreApproximate && <span className="text-amber-400 ml-1">~</span>}
            </span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
      </tr>
    );
  };

  const renderSection = (title: string, bodies: CelestialBody[]) => {
    const hasPlanets = bodies.some(b => chart.planets.find(p => p.body === b));
    if (!hasPlanets) return null;

    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wide">{title}</h4>
        <table className="w-full table-fixed">
          <tbody>
            {bodies.map(renderPlanetRow)}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Planet Placements</h3>
        <div className="text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="text-orange-400">℞</span> = Retrograde
          </span>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-lg p-4">
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-white/10">
              <th className="text-left pb-2 pr-4 font-medium w-1/4">Planet</th>
              <th className="text-left pb-2 px-4 font-medium w-1/4">Sign</th>
              <th className="text-left pb-2 px-4 font-medium w-1/4">Degree</th>
              <th className="text-left pb-2 pl-4 font-medium w-1/4">House</th>
            </tr>
          </thead>
        </table>

        {renderSection('Personal Planets', PERSONAL_PLANETS)}
        {renderSection('Social Planets', SOCIAL_PLANETS)}
        {renderSection('Outer Planets', OUTER_PLANETS)}
        {renderSection('Points', POINTS)}
      </div>

      {chart.housesAreApproximate && (
        <p className="text-xs text-amber-400/70 flex items-center gap-1">
          <span className="text-amber-400">~</span> House placements are approximate based on estimated birth time
        </p>
      )}
    </div>
  );
};

export default PlanetPlacements;
