import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { matchesAPI } from '@/lib/api';
import MatchCard from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'finished', label: 'Finished' },
];

const LEAGUES = ['All', 'La Liga', 'Premier League', 'Champions League', 'Serie A'];

export default function Matches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [leagueFilter, setLeagueFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (leagueFilter !== 'All') params.league = leagueFilter;
    matchesAPI.list(params).then(r => {
      setMatches(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter, leagueFilter]);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8" data-testid="matches-page">
      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        Matches
      </h1>
      <p className="text-gray-500 text-sm mb-8">Browse and analyze football matches</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8" data-testid="match-filters">
        <div className="flex gap-1 p-1 rounded-lg bg-[#121212] border border-white/5">
          {FILTERS.map(f => (
            <Button
              key={f.value}
              size="sm"
              variant="ghost"
              onClick={() => { setStatusFilter(f.value); setSearchParams(f.value ? { status: f.value } : {}); }}
              className={`text-xs rounded-md ${statusFilter === f.value ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'text-gray-400 hover:text-white'}`}
              data-testid={`filter-${f.value || 'all'}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-[#121212] border border-white/5">
          {LEAGUES.map(l => (
            <Button
              key={l}
              size="sm"
              variant="ghost"
              onClick={() => setLeagueFilter(l)}
              className={`text-xs rounded-md ${leagueFilter === l ? 'bg-[#00F0FF]/10 text-[#00F0FF]' : 'text-gray-400 hover:text-white'}`}
              data-testid={`league-${l.replace(/\s/g, '-').toLowerCase()}`}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#39FF14] animate-spin" />
        </div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {matches.map(m => <MatchCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500">No matches found</p>
        </div>
      )}
    </div>
  );
}
