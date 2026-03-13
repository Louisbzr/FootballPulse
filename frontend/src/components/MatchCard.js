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
      <Card className={`bg-[#121212] border overflow-hidden transition-all duration-300 group hover:border-[#39FF14]/30 hover:shadow-[0_0_20px_rgba(57,255,20,0.05)] ${
        isLive ? 'border-[#FF0055]/30' : 'border-white/5'
      }`} data-testid={`match-card-${match.id}`}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px] rounded-sm">{match.league}</Badge>
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
              <div className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                {match.home_team?.logo ? <img src={match.home_team.logo} alt="" className="w-5 h-5" /> : <span className="text-xs text-gray-500">{match.home_team?.short}</span>}
              </div>
              <p className="text-sm font-medium text-white truncate">{match.home_team?.name}</p>
            </div>
            <div className="px-3 text-center shrink-0">
              {isFinished || isLive ? (
                <span className="font-mono-data text-lg font-black text-white">{match.score?.home} - {match.score?.away}</span>
              ) : (
                <span className="text-xs text-gray-500 font-mono-data">{matchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
              <p className="text-sm font-medium text-white truncate text-right">{match.away_team?.name}</p>
              <div className="w-8 h-8 rounded-lg bg-[#1E1E1E] border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                {match.away_team?.logo ? <img src={match.away_team.logo} alt="" className="w-5 h-5" /> : <span className="text-xs text-gray-500">{match.away_team?.short}</span>}
              </div>
            </div>
          </div>

          {/* Stadium */}
          <p className="text-[10px] text-gray-600 truncate text-center">{match.stadium}</p>
        </div>
        <div className={`h-0.5 transition-all duration-500 ${
          isLive ? 'bg-[#FF0055]' : 'bg-gradient-to-r from-transparent via-[#39FF14]/30 to-transparent opacity-0 group-hover:opacity-100'
        }`} />
      </Card>
    </Link>
  );
}
