import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';

export default function MatchCard({ match }) {
  const matchDate = new Date(match.date);
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  return (
    <Link to={`/matches/${match.id}`}>
      <Card className={`border overflow-hidden transition-all duration-300 group ${
        isLive ? 'border-[#FF0055]/30' : ''
      }`} style={{ background: 'var(--bg-card)', borderColor: isLive ? undefined : 'var(--border-default)', boxShadow: 'var(--shadow-card)' }} data-testid={`match-card-${match.id}`}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] rounded-sm" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>{match.league}</Badge>
            <Badge className={`text-[10px] rounded-sm uppercase font-bold tracking-wider ${
              isLive ? 'bg-[#FF0055]/10 text-[#FF0055] animate-pulse' : isFinished ? 'bg-white/5 text-gray-400' : 'bg-[#00F0FF]/10 text-[#00F0FF]'
            }`} data-testid={`match-status-${match.id}`}>
              {isLive ? (
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {match.elapsed ? `${match.elapsed}'` : 'LIVE'}
                </span>
              ) : isFinished ? 'FT' : matchDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Badge>
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                {match.home_team?.logo ? <img src={match.home_team.logo} alt="" className="w-5 h-5" /> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{match.home_team?.short}</span>}
              </div>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{match.home_team?.name}</p>
            </div>
            <div className="px-3 text-center shrink-0">
              {isFinished || isLive ? (
                <span className="font-mono-data text-lg font-black" style={{ color: 'var(--text-primary)' }}>{match.score?.home} - {match.score?.away}</span>
              ) : (
                <span className="text-xs font-mono-data" style={{ color: 'var(--text-muted)' }}>{matchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
              <p className="text-sm font-medium truncate text-right" style={{ color: 'var(--text-primary)' }}>{match.away_team?.name}</p>
              <div className="w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                {match.away_team?.logo ? <img src={match.away_team.logo} alt="" className="w-5 h-5" /> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{match.away_team?.short}</span>}
              </div>
            </div>
          </div>

          {/* Stadium */}
          <p className="text-[10px] truncate text-center" style={{ color: 'var(--text-muted)' }}>{match.stadium}</p>
        </div>
        <div className={`h-0.5 transition-all duration-500 ${
          isLive ? 'bg-[#FF0055]' : 'opacity-0 group-hover:opacity-100'
        }`} style={!isLive ? { background: `linear-gradient(90deg, transparent, var(--accent), transparent)` } : {}} />
      </Card>
    </Link>
  );
}
