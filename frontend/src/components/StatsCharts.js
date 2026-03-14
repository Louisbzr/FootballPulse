import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-2 text-xs border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
      <p className="mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono-data">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export function StatsRadar({ stats, homeTeam, awayTeam }) {
  if (!stats) return null;
  const data = [
    { stat: 'Possession', home: stats.possession?.home, away: stats.possession?.away },
    { stat: 'Shots', home: stats.shots?.home, away: stats.shots?.away },
    { stat: 'On Target', home: stats.shots_on_target?.home, away: stats.shots_on_target?.away },
    { stat: 'Passes', home: Math.round((stats.passes?.home || 0) / 10), away: Math.round((stats.passes?.away || 0) / 10) },
    { stat: 'Corners', home: stats.corners?.home, away: stats.corners?.away },
    { stat: 'Fouls', home: stats.fouls?.home, away: stats.fouls?.away },
  ];

  return (
    <div data-testid="stats-radar-chart">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border-default)" />
          <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Radar name={homeTeam} dataKey="home" stroke="var(--neon-green)" fill="var(--neon-green)" fillOpacity={0.15} strokeWidth={2} />
          <Radar name={awayTeam} dataKey="away" stroke="var(--neon-cyan)" fill="var(--neon-cyan)" fillOpacity={0.15} strokeWidth={2} />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatsBar({ stats, homeTeam, awayTeam }) {
  if (!stats) return null;
  const data = [
    { name: 'Shots', home: stats.shots?.home || 0, away: stats.shots?.away || 0 },
    { name: 'On Target', home: stats.shots_on_target?.home || 0, away: stats.shots_on_target?.away || 0 },
    { name: 'Passes', home: Math.round((stats.passes?.home || 0) / 10), away: Math.round((stats.passes?.away || 0) / 10) },
    { name: 'Fouls', home: stats.fouls?.home || 0, away: stats.fouls?.away || 0 },
    { name: 'Corners', home: stats.corners?.home || 0, away: stats.corners?.away || 0 },
  ];

  return (
    <div data-testid="stats-bar-chart">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="home" name={homeTeam} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill="var(--neon-green)" fillOpacity={0.8} />)}
          </Bar>
          <Bar dataKey="away" name={awayTeam} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill="var(--neon-cyan)" fillOpacity={0.8} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PossessionBar({ home, away }) {
  return (
    <div data-testid="possession-bar" className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-mono-data" style={{ color: 'var(--neon-green)' }}>{home}%</span>
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Possession</span>
        <span className="font-mono-data" style={{ color: 'var(--neon-cyan)' }}>{away}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full transition-all duration-700" style={{ width: `${home}%`, background: 'var(--neon-green)', opacity: 0.8 }} />
        <div className="h-full transition-all duration-700" style={{ width: `${away}%`, background: 'var(--neon-cyan)', opacity: 0.8 }} />
      </div>
    </div>
  );
}
