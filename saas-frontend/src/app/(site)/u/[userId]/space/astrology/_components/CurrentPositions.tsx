'use client';

import { TransitPosition, PERSONAL_PLANETS, SOCIAL_PLANETS, OUTER_PLANETS, POINTS } from '../_hooks/useTransits';
import { getSignInfo, getBodyInfo, formatDegree, CelestialBody } from '../_hooks/useBirthChart';

interface Props {
  planets: TransitPosition[];
}

export const CurrentPositions: React.FC<Props> = ({ planets }) => {
  const renderPlanetRow = (body: CelestialBody) => {
    const planet = planets.find(p => p.body === body);
    if (!planet) return null;

    const bodyInfo = getBodyInfo(planet.body);
    const signInfo = getSignInfo(planet.sign);

    return (
      <tr key={planet.body} className="border-b border-white/5 last:border-b-0">
        <td className="py-2.5 pr-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{bodyInfo?.symbol}</span>
            <span className="text-white">{bodyInfo?.name}</span>
            {planet.retrograde && (
              <span className="text-orange-400 text-sm" title="Retrograde">&#8478;</span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{signInfo?.symbol}</span>
            <span className="text-slate-300">{signInfo?.name}</span>
          </div>
        </td>
        <td className="py-2.5 pl-4 text-slate-400 font-mono text-sm">
          {formatDegree(planet.degree)}
        </td>
      </tr>
    );
  };

  const renderSection = (title: string, bodies: CelestialBody[]) => {
    const hasPlanets = bodies.some(b => planets.find(p => p.body === b));
    if (!hasPlanets) return null;

    return (
      <div className="mb-4 last:mb-0">
        <h4 className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">{title}</h4>
        <table className="w-full">
          <tbody>
            {bodies.map(renderPlanetRow)}
          </tbody>
        </table>
      </div>
    );
  };

  // Count retrograde planets
  const retrogradeCount = planets.filter(p => p.retrograde).length;

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Current Sky</h3>
        {retrogradeCount > 0 && (
          <div className="text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded">
            {retrogradeCount} planet{retrogradeCount !== 1 ? 's' : ''} &#8478;
          </div>
        )}
      </div>

      <div className="bg-slate-800/30 rounded-lg p-4">
        <div className="grid grid-cols-3 text-xs text-slate-500 uppercase tracking-wide pb-2 border-b border-white/10 mb-2">
          <div>Planet</div>
          <div>Sign</div>
          <div>Degree</div>
        </div>

        {renderSection('Personal Planets', PERSONAL_PLANETS)}
        {renderSection('Social Planets', SOCIAL_PLANETS)}
        {renderSection('Outer Planets', OUTER_PLANETS)}
        {renderSection('Points', POINTS)}
      </div>

      <p className="text-xs text-slate-500 mt-3">
        <span className="text-orange-400">&#8478;</span> indicates retrograde motion
      </p>
    </div>
  );
};

export default CurrentPositions;
