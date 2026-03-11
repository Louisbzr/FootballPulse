import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock } from 'lucide-react';

const STATUS_STYLES = {
  finished: { label: 'FT', class: 'bg-white/10 text-gray-300' },
  upcoming: { label: 'Upcoming', class: 'bg-[#00F0FF]/10 text-[#00F0FF]' },
  live: { label: 'LIVE', class: 'bg-[#FF0055]/10 text-[#FF0055] animate-pulse' },
};

export default function MatchCard({ match }) {
  const status = STATUS_STYLES[match.status] || STATUS_STYLES.upcoming;
  const matchDate = new Date(match.date);

  return (
    <Link to={`/matches/${match.id}`} data-testid={`match-card-${match.id}`}>
      <Card className="bg-[#121212] border-white/5 hover:border-[#39FF14]/20 transition-all duration-300 group overflow-hidden cursor-pointer">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${status.class} text-xs font-bold uppercase tracking-wider rounded-sm`} data-testid={`match-status-${match.id}`}>
              {status.label}
            </Badge>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {matchDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-3">
            {/* Home */}
            <div className="flex-1 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#1E1E1E] border border-white/10 flex items-center justify-center overflow-hidden">
                <img src={match.home_team?.logo} alt={match.home_team?.short} className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white truncate">{match.home_team?.short}</p>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2" data-testid={`match-score-${match.id}`}>
              {match.status === 'finished' || match.status === 'live' ? (
                <>
                  <span className="text-2xl font-black text-white font-mono-data">{match.score?.home}</span>
                  <span className="text-gray-600 text-sm">-</span>
                  <span className="text-2xl font-black text-white font-mono-data">{match.score?.away}</span>
                </>
              ) : (
                <div className="text-center">
                  <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                  <span className="text-xs text-gray-500 font-mono-data">
                    {matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Away */}
            <div className="flex-1 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#1E1E1E] border border-white/10 flex items-center justify-center overflow-hidden">
                <img src={match.away_team?.logo} alt={match.away_team?.short} className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white truncate">{match.away_team?.short}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {match.stadium}
            </span>
            <Badge variant="outline" className="text-[10px] border-white/10 text-gray-500 rounded-sm">
              {match.league}
            </Badge>
          </div>
        </div>
        {/* Hover accent */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#39FF14]/0 to-transparent group-hover:via-[#39FF14]/50 transition-all duration-500" />
      </Card>
    </Link>
  );
}
