import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { matchesAPI, footballAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import MatchCard from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'live', label: 'En direct' },
  { value: 'finished', label: 'Terminé' },
];

const LEAGUES = ['Tous', 'Ligue 1', 'Premier League', 'La Liga', 'Champions League', 'Serie A', 'Bundesliga'];

export default function Matches() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [leagueFilter, setLeagueFilter] = useState('Tous');

  const loadMatches = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (leagueFilter !== 'Tous') params.league = leagueFilter;
    matchesAPI.list(params).then(r => {
      setMatches(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadMatches(); }, [statusFilter, leagueFilter]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await footballAPI.sync();
      const d = res.data;
      toast.success(`Synchronisé ! ${d.synced_matches} matchs, ${d.synced_events} événements`);
      if (d.errors?.length > 0) {
        toast.warning(`${d.errors.length} erreur(s): ${d.errors[0]}`);
      }
      loadMatches();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de synchronisation');
    }
    setSyncing(false);
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8" data-testid="matches-page">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>
            Matchs
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Parcourez et analysez les matchs de football</p>
        </div>
        {user && (
          <Button onClick={handleSync} disabled={syncing} variant="outline"
            className="rounded-sm gap-2" style={{ borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)' }}
            data-testid="sync-matches-btn">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchro...' : 'Sync live'}
          </Button>
        )}
      </div>
      <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
        {matches.length} match{matches.length > 1 ? 's' : ''} trouvé{matches.length > 1 ? 's' : ''}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8" data-testid="match-filters">
        <div className="flex gap-1 p-1 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          {FILTERS.map(f => (
            <Button key={f.value} size="sm" variant="ghost"
              onClick={() => { setStatusFilter(f.value); setSearchParams(f.value ? { status: f.value } : {}); }}
              className="text-xs rounded-md"
              style={{ color: statusFilter === f.value ? 'var(--accent)' : 'var(--text-secondary)', background: statusFilter === f.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent' }}
              data-testid={`filter-${f.value || 'all'}`}>
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg border overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          {LEAGUES.map(l => (
            <Button key={l} size="sm" variant="ghost"
              onClick={() => setLeagueFilter(l)}
              className="text-xs rounded-md whitespace-nowrap"
              style={{ color: leagueFilter === l ? 'var(--accent-secondary)' : 'var(--text-secondary)', background: leagueFilter === l ? 'color-mix(in srgb, var(--accent-secondary) 10%, transparent)' : 'transparent' }}
              data-testid={`league-${l.replace(/\s/g, '-').toLowerCase()}`}>
              {l}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {matches.map(m => <MatchCard key={m.id} match={m} />)}
        </div>
      ) : (
        <div className="text-center py-20">
          <p style={{ color: 'var(--text-secondary)' }}>Aucun match trouvé</p>
          {user && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Essayez de synchroniser les matchs en direct</p>}
        </div>
      )}
    </div>
  );
}
