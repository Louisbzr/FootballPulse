import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Target, Eye, EyeOff } from 'lucide-react';

const EVENT_COLORS = {
  goal: '#39FF14',
  shot_on_target: '#00F0FF',
  shot_missed: '#666',
  yellow_card: '#FFD700',
  red_card: '#FF0055',
  corner: '#A78BFA',
  substitution: '#FF8C00',
};

const EVENT_ICONS = {
  goal: '\u26BD',
  shot_on_target: '\u25CE',
  yellow_card: '\u25A0',
  red_card: '\u25A0',
  corner: '\u25B7',
  substitution: '\u21C4',
};

function generateHeatmapData(events) {
  // Create a grid of zones across the pitch
  const zones = [];
  const gridX = 8;
  const gridY = 6;
  const counts = {};

  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      counts[`${x}-${y}`] = 0;
    }
  }

  events.forEach(e => {
    if (!e.position) return;
    const gx = Math.min(Math.floor((e.position.x / 100) * gridX), gridX - 1);
    const gy = Math.min(Math.floor((e.position.y / 100) * gridY), gridY - 1);
    const weight = e.type === 'goal' ? 5 : e.type === 'shot_on_target' ? 3 : e.type === 'shot_missed' ? 2 : 1;
    counts[`${gx}-${gy}`] += weight;
  });

  const maxCount = Math.max(...Object.values(counts), 1);

  for (let x = 0; x < gridX; x++) {
    for (let y = 0; y < gridY; y++) {
      const intensity = counts[`${x}-${y}`] / maxCount;
      if (intensity > 0) {
        zones.push({
          cx: (x + 0.5) / gridX * 110 + 5,
          cy: (y + 0.5) / gridY * 70 + 5,
          rx: 110 / gridX / 1.4,
          ry: 70 / gridY / 1.4,
          intensity,
        });
      }
    }
  }
  return zones;
}

export default function FootballPitch({ events = [], showHeatmap: initialHeatmap = false }) {
  const [heatmapOn, setHeatmapOn] = useState(initialHeatmap);
  const [filter, setFilter] = useState('all');
  const [hoveredEvent, setHoveredEvent] = useState(null);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter(e => e.type === filter);
  }, [events, filter]);

  const heatmapZones = useMemo(() => generateHeatmapData(events), [events]);

  const getColor = (type) => EVENT_COLORS[type] || '#888';

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'goal', label: 'Goals' },
    { value: 'shot_on_target', label: 'Shots' },
    { value: 'yellow_card', label: 'Cards' },
    { value: 'corner', label: 'Corners' },
  ];

  return (
    <div className="space-y-3" data-testid="football-pitch">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <Button key={f.value} size="sm" variant="ghost"
              onClick={() => setFilter(f.value)}
              className="text-[10px] h-7 px-2 rounded-md"
              style={{
                color: filter === f.value ? 'var(--accent)' : 'var(--text-muted)',
                background: filter === f.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              }}
              data-testid={`pitch-filter-${f.value}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setHeatmapOn(!heatmapOn)}
          className="text-[10px] h-7 px-2 rounded-md gap-1"
          style={{ color: heatmapOn ? 'var(--accent-danger)' : 'var(--text-muted)' }}
          data-testid="heatmap-toggle"
        >
          <Flame className="w-3 h-3" /> {heatmapOn ? 'Hide' : 'Show'} Heatmap
        </Button>
      </div>

      {/* Pitch SVG */}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '2/1.3' }}>
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <defs>
            {/* Pitch gradient */}
            <radialGradient id="pitchBg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1a2a1a" />
              <stop offset="100%" stopColor="#0a150a" />
            </radialGradient>
            {/* Heatmap gradient */}
            <radialGradient id="heatGrad">
              <stop offset="0%" stopColor="#FF0055" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#FF8C00" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </radialGradient>
            <filter id="heatBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <filter id="glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="120" height="80" fill="url(#pitchBg)" />

          {/* Grass stripes */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <rect key={i} x={5 + i * 13.75} y="5" width="13.75" height="70"
              fill={i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'} />
          ))}

          {/* Pitch markings */}
          <rect x="5" y="5" width="110" height="70" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
          <line x1="60" y1="5" x2="60" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <circle cx="60" cy="40" r="10" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <circle cx="60" cy="40" r="0.8" fill="rgba(255,255,255,0.25)" />
          <rect x="5" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <rect x="97" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <rect x="5" y="28" width="8" height="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <rect x="107" y="28" width="8" height="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <circle cx="17" cy="40" r="0.5" fill="rgba(255,255,255,0.2)" />
          <circle cx="103" cy="40" r="0.5" fill="rgba(255,255,255,0.2)" />
          <rect x="3" y="33" width="2" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <rect x="115" y="33" width="2" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          <path d="M 5 8 A 3 3 0 0 1 8 5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
          <path d="M 112 5 A 3 3 0 0 1 115 8" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
          <path d="M 5 72 A 3 3 0 0 0 8 75" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
          <path d="M 112 75 A 3 3 0 0 0 115 72" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />

          {/* Heatmap zones */}
          {heatmapOn && (
            <g filter="url(#heatBlur)" opacity="0.8">
              {heatmapZones.map((z, i) => (
                <ellipse key={i} cx={z.cx} cy={z.cy} rx={z.rx * (0.5 + z.intensity)} ry={z.ry * (0.5 + z.intensity)}
                  fill={z.intensity > 0.5 ? `rgba(255,0,85,${z.intensity * 0.5})` : `rgba(255,140,0,${z.intensity * 0.4})`}
                />
              ))}
            </g>
          )}

          {/* Event markers */}
          {filteredEvents.filter(e => e.position).map((event, i) => {
            const cx = (event.position.x / 100) * 110 + 5;
            const cy = (event.position.y / 100) * 70 + 5;
            const color = getColor(event.type);
            const isHovered = hoveredEvent === i;
            const isGoal = event.type === 'goal';
            return (
              <g key={i} className="cursor-pointer"
                onMouseEnter={() => setHoveredEvent(i)}
                onMouseLeave={() => setHoveredEvent(null)}>
                {/* Pulse ring for goals */}
                {isGoal && (
                  <circle cx={cx} cy={cy} r="4" fill="none" stroke={color} strokeWidth="0.2" opacity="0.3">
                    <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Glow */}
                <circle cx={cx} cy={cy} r={isHovered ? 4 : 2.5} fill={color} fillOpacity={isHovered ? 0.3 : 0.15}
                  filter="url(#glow)" />
                {/* Main circle */}
                <circle cx={cx} cy={cy} r={isHovered ? 3 : 2} fill={color} fillOpacity="0.3"
                  stroke={color} strokeWidth={isHovered ? 0.6 : 0.3} />
                {/* Icon */}
                <text x={cx} y={cy + 1} textAnchor="middle" fontSize={isHovered ? 3.5 : 2.8} fill={color}>
                  {EVENT_ICONS[event.type] || '\u25CF'}
                </text>
                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect x={cx - 20} y={cy - 10} width="40" height="7" rx="1"
                      fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth="0.2" />
                    <text x={cx} y={cy - 5.5} textAnchor="middle" fontSize="2.3" fill="white">
                      {event.minute}' {event.player} - {event.description?.slice(0, 25)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Team labels */}
          <text x="15" y="79" textAnchor="middle" fontSize="2.5" fill="rgba(255,255,255,0.3)" fontWeight="bold">HOME</text>
          <text x="105" y="79" textAnchor="middle" fontSize="2.5" fill="rgba(255,255,255,0.3)" fontWeight="bold">AWAY</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { type: 'goal', label: 'Goal' },
          { type: 'shot_on_target', label: 'Shot on target' },
          { type: 'yellow_card', label: 'Yellow card' },
          { type: 'red_card', label: 'Red card' },
          { type: 'corner', label: 'Corner' },
          { type: 'substitution', label: 'Sub' },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[type] }} />
            {label}
          </div>
        ))}
        <Badge className="text-[10px] ml-auto" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          {filteredEvents.filter(e => e.position).length} events
        </Badge>
      </div>
    </div>
  );
}
