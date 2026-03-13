export default function FootballPitch({ events = [], showHeatmap = false }) {
  const getEventColor = (type) => {
    switch (type) {
      case 'goal': return '#39FF14';
      case 'shot_on_target': return '#00F0FF';
      case 'shot_missed': return '#666';
      case 'yellow_card': return '#FFD700';
      case 'red_card': return '#FF0055';
      case 'corner': return '#A78BFA';
      case 'substitution': return '#FF8C00';
      default: return '#888';
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'goal': return '\u26BD';
      case 'shot_on_target': return '\u25CE';
      case 'yellow_card': return '\u25A0';
      case 'red_card': return '\u25A0';
      case 'corner': return '\u25B7';
      case 'substitution': return '\u21C4';
      default: return '\u25CF';
    }
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: '2/1.3' }} data-testid="football-pitch">
      <svg viewBox="0 0 120 80" className="w-full h-full" style={{ background: 'radial-gradient(ellipse at center, #1a2a1a 0%, #0a150a 100%)' }}>
        {/* Pitch outline */}
        <rect x="5" y="5" width="110" height="70" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        {/* Center line */}
        <line x1="60" y1="5" x2="60" y2="75" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Center circle */}
        <circle cx="60" cy="40" r="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        <circle cx="60" cy="40" r="0.8" fill="rgba(255,255,255,0.2)" />
        {/* Penalty areas */}
        <rect x="5" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        <rect x="97" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Goal areas */}
        <rect x="5" y="28" width="8" height="24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        <rect x="107" y="28" width="8" height="24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Penalty spots */}
        <circle cx="17" cy="40" r="0.5" fill="rgba(255,255,255,0.15)" />
        <circle cx="103" cy="40" r="0.5" fill="rgba(255,255,255,0.15)" />
        {/* Goals */}
        <rect x="3" y="33" width="2" height="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.3" />
        <rect x="115" y="33" width="2" height="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.3" />
        {/* Corner arcs */}
        <path d="M 5 8 A 3 3 0 0 1 8 5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
        <path d="M 112 5 A 3 3 0 0 1 115 8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
        <path d="M 5 72 A 3 3 0 0 0 8 75" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
        <path d="M 112 75 A 3 3 0 0 0 115 72" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />

        {/* Heatmap zones */}
        {showHeatmap && events.filter(e => e.type === 'goal' || e.type === 'shot_on_target').map((e, i) => (
          <circle
            key={`heat-${i}`}
            cx={(e.position?.x || 50) * 1.1 + 5}
            cy={(e.position?.y || 40) * 0.7 + 5}
            r="8"
            fill={e.type === 'goal' ? 'rgba(57,255,20,0.08)' : 'rgba(0,240,255,0.06)'}
          />
        ))}

        {/* Event markers */}
        {events.filter(e => e.position).map((event, i) => {
          const cx = (event.position.x / 100) * 110 + 5;
          const cy = (event.position.y / 100) * 70 + 5;
          const color = getEventColor(event.type);
          return (
            <g key={i} className="cursor-pointer">
              <circle cx={cx} cy={cy} r="2.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.3" />
              <text x={cx} y={cy + 1} textAnchor="middle" fontSize="3" fill={color}>
                {getEventIcon(event.type)}
              </text>
              <title>{`${event.minute}' - ${event.player}: ${event.description}`}</title>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2">
        {[
          { type: 'goal', label: 'Goal' },
          { type: 'shot_on_target', label: 'Shot on target' },
          { type: 'yellow_card', label: 'Yellow' },
          { type: 'red_card', label: 'Red' },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1 text-[10px] text-gray-500">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getEventColor(type) }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
