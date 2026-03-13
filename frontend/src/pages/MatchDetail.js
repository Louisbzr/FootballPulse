import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchesAPI, commentsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import FootballPitch from '@/components/FootballPitch';
import { StatsRadar, StatsBar, PossessionBar } from '@/components/StatsCharts';
import CommentSection from '@/components/CommentSection';
import BetSlip from '@/components/BetSlip';
import { Calendar, MapPin, ArrowLeft, Loader2, Users, Timer } from 'lucide-react';

const EVENT_ICONS = {
  goal: { icon: '\u26BD', color: '#39FF14', label: 'Goal' },
  penalty: { icon: '\u26BD', color: '#39FF14', label: 'Penalty' },
  own_goal: { icon: '\u26BD', color: '#FF0055', label: 'Own Goal' },
  yellow_card: { icon: '\u25A0', color: '#FFD700', label: 'Yellow Card' },
  red_card: { icon: '\u25A0', color: '#FF0055', label: 'Red Card' },
  substitution: { icon: '\u21C4', color: '#FF8C00', label: 'Substitution' },
  var: { icon: 'V', color: '#00F0FF', label: 'VAR' },
  corner: { icon: '\u25B7', color: '#A78BFA', label: 'Corner' },
  other: { icon: '\u25CF', color: '#888', label: '' },
};

function GoalSummary({ events, match }) {
  const goals = events.filter(e => ['goal', 'penalty', 'own_goal'].includes(e.type));
  if (goals.length === 0) return null;
  const homeGoals = goals.filter(e => (e.type === 'own_goal' ? e.team === 'away' : e.team === 'home'));
  const awayGoals = goals.filter(e => (e.type === 'own_goal' ? e.team === 'home' : e.team === 'away'));
  return (
    <div className="flex items-start justify-between px-4 py-3 rounded-lg border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }} data-testid="goal-summary">
      <div className="flex-1 space-y-1">
        {homeGoals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-[#39FF14]">{g.type === 'penalty' ? '\u26BD(P)' : g.type === 'own_goal' ? '\u26BD(OG)' : '\u26BD'}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{g.player}</span>
            <span className="font-mono-data" style={{ color: 'var(--text-muted)' }}>{g.minute}'{g.extra ? `+${g.extra}` : ''}</span>
            {g.assist && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({g.assist})</span>}
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-1 text-right">
        {awayGoals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-xs justify-end">
            {g.assist && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({g.assist})</span>}
            <span className="font-mono-data" style={{ color: 'var(--text-muted)' }}>{g.minute}'{g.extra ? `+${g.extra}` : ''}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{g.player}</span>
            <span className="text-[#39FF14]">{g.type === 'penalty' ? '\u26BD(P)' : g.type === 'own_goal' ? '\u26BD(OG)' : '\u26BD'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardSummary({ events, match }) {
  const cards = events.filter(e => ['yellow_card', 'red_card'].includes(e.type));
  if (cards.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2" data-testid="card-summary">
      {cards.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}>
          <span className="w-2.5 h-3.5 rounded-[1px]" style={{ backgroundColor: c.type === 'red_card' ? '#FF0055' : '#FFD700' }} />
          <span style={{ color: 'var(--text-primary)' }}>{c.player}</span>
          <span className="font-mono-data" style={{ color: 'var(--text-muted)' }}>{c.minute}'</span>
          <Badge variant="outline" className={`text-[8px] px-1 py-0 border-white/10 ${c.team === 'home' ? 'text-[#39FF14]' : 'text-[#00F0FF]'}`}>
            {c.team === 'home' ? match.home_team?.short : match.away_team?.short}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function LineupsPanel({ lineups, match }) {
  if (!lineups) return <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Lineups not available</p>;
  const TeamLineup = ({ lineup, team, side }) => (
    <div className={side === 'home' ? '' : ''}>
      <div className="flex items-center gap-2 mb-3">
        {team?.logo && <img src={team.logo} alt="" className="w-6 h-6 rounded" />}
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{team?.name}</span>
        <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>{lineup.formation}</Badge>
      </div>
      {lineup.coach && <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>Coach: {lineup.coach}</p>}
      <div className="space-y-1">
        {lineup.startXI?.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1 border-b" style={{ borderColor: 'color-mix(in srgb, var(--border-default) 30%, transparent)' }}>
            <span className="font-mono-data w-6 text-right" style={{ color: 'var(--text-muted)' }}>{p.number || '-'}</span>
            <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
            {p.pos && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.pos}</span>}
          </div>
        ))}
      </div>
      {lineup.substitutes?.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-wider mt-3 mb-1" style={{ color: 'var(--text-muted)' }}>Substitutes</p>
          <div className="space-y-1">
            {lineup.substitutes.slice(0, 9).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-0.5 opacity-60">
                <span className="font-mono-data w-6 text-right" style={{ color: 'var(--text-muted)' }}>{p.number || '-'}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="lineups-panel">
      <Card className="border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <TeamLineup lineup={lineups.home} team={match.home_team} side="home" />
      </Card>
      <Card className="border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <TeamLineup lineup={lineups.away} team={match.away_team} side="away" />
      </Card>
    </div>
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [matchRes, commentsRes] = await Promise.all([
        matchesAPI.get(id),
        commentsAPI.list(id),
      ]);
      setMatch(matchRes.data);
      setComments(commentsRes.data);
    } catch {
      navigate('/matches');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadData(); }, [loadData]);
  // Auto-refresh for live matches
  useEffect(() => {
    if (match?.status !== 'live') return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [match?.status, loadData]);

  const refreshComments = async () => {
    const res = await commentsAPI.list(id);
    setComments(res.data);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
    </div>
  );

  if (!match) return null;

  const events = match.events || [];
  const matchDate = new Date(match.date);
  const STATUS_LABEL = { finished: 'Full Time', upcoming: 'Upcoming', live: 'LIVE' };
  const hasLineups = !!match.lineups;
  const hasGoals = events.some(e => ['goal', 'penalty', 'own_goal'].includes(e.type));
  const hasCards = events.some(e => ['yellow_card', 'red_card'].includes(e.type));

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6" data-testid="match-detail-page">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm mb-6 transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }} data-testid="back-button">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Score Header */}
      <Card className="border p-6 md:p-8 mb-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="match-score-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Badge variant="outline" className="rounded-sm text-xs" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>{match.league}</Badge>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <Badge className={`text-xs font-bold uppercase tracking-wider rounded-sm ${
            match.status === 'finished' ? 'bg-white/10 text-gray-300' : match.status === 'live' ? 'bg-[#FF0055]/10 text-[#FF0055] animate-pulse' : 'bg-[#00F0FF]/10 text-[#00F0FF]'
          }`} data-testid="match-status-badge">
            {match.status === 'live' && match.elapsed && (
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />{match.elapsed}'
              </span>
            )}
            {match.status !== 'live' && STATUS_LABEL[match.status]}
            {match.status === 'live' && !match.elapsed && 'LIVE'}
          </Badge>
        </div>
        <div className="flex items-center justify-center gap-6 md:gap-12">
          <div className="flex-1 text-center md:text-right">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border flex items-center justify-center mx-auto md:ml-auto md:mr-0 overflow-hidden mb-2" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <img src={match.home_team?.logo} alt="" className="w-8 h-8" />
            </div>
            <p className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{match.home_team?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{match.home_team?.short}</p>
          </div>
          <div className="text-center px-4" data-testid="detail-score">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl md:text-5xl font-black font-mono-data" style={{ color: 'var(--text-primary)' }}>{match.score?.home}</span>
                <span className="text-xl" style={{ color: 'var(--text-muted)' }}>-</span>
                <span className="text-4xl md:text-5xl font-black font-mono-data" style={{ color: 'var(--text-primary)' }}>{match.score?.away}</span>
              </div>
            ) : (
              <span className="text-lg font-mono-data" style={{ color: 'var(--text-secondary)' }}>
                {matchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border flex items-center justify-center mx-auto md:mr-auto md:ml-0 overflow-hidden mb-2" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <img src={match.away_team?.logo} alt="" className="w-8 h-8" />
            </div>
            <p className="text-lg md:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{match.away_team?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{match.away_team?.short}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <MapPin className="w-3 h-3" /> {match.stadium}
        </div>
        {/* Goal + Card summaries right under the score */}
        {(hasGoals || hasCards) && (
          <div className="mt-4">
            {hasGoals && <GoalSummary events={events} match={match} />}
            {hasCards && <CardSummary events={events} match={match} />}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={match.status === 'upcoming' ? 'predictions' : events.length > 0 ? 'timeline' : (match.stats ? 'stats' : 'predictions')} className="space-y-4">
        <TabsList className="border p-1 rounded-lg w-full justify-start overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="match-tabs">
          {events.length > 0 && <TabsTrigger value="timeline" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-xs rounded-md" style={{ color: 'var(--text-secondary)' }} data-testid="tab-timeline">Timeline</TabsTrigger>}
          {match.stats && <TabsTrigger value="stats" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-xs rounded-md" style={{ color: 'var(--text-secondary)' }} data-testid="tab-stats">Statistics</TabsTrigger>}
          {hasLineups && <TabsTrigger value="lineups" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-xs rounded-md" style={{ color: 'var(--text-secondary)' }} data-testid="tab-lineups"><Users className="w-3 h-3 mr-1 inline" />Lineups</TabsTrigger>}
          {events.length > 0 && <TabsTrigger value="pitch" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-xs rounded-md" style={{ color: 'var(--text-secondary)' }} data-testid="tab-pitch">Pitch</TabsTrigger>}
          <TabsTrigger value="predictions" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-xs rounded-md" style={{ color: 'var(--text-secondary)' }} data-testid="tab-predictions">Predictions</TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-xs rounded-md" style={{ color: 'var(--text-secondary)' }} data-testid="tab-comments">Comments ({comments.length})</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card className="border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="timeline-panel">
            <div className="space-y-0">
              {events.map((event, i) => {
                const info = EVENT_ICONS[event.type] || EVENT_ICONS.other;
                const isHome = event.team === 'home';
                return (
                  <div key={i} className={`flex items-start gap-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={i > 0 ? { borderColor: 'var(--border-default)' } : {}} data-testid={`event-${i}`}>
                    <span className="font-mono-data text-xs w-10 text-right shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {event.minute}'{event.extra ? <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{event.extra}</span> : ''}
                    </span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${info.color}15` }}>
                      <span style={{ color: info.color, fontSize: '12px' }}>{info.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{event.player}</span>
                        {event.assist && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({event.assist})</span>}
                        <Badge variant="outline" className={`text-[10px] border-white/10 rounded-sm ${isHome ? 'text-[#39FF14]' : 'text-[#00F0FF]'}`}>
                          {isHome ? match.home_team?.short : match.away_team?.short}
                        </Badge>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{event.description}</p>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No events recorded</p>}
            </div>
          </Card>
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="stats-panel">
            {match.stats?.possession && (
              <Card className="border p-5 md:col-span-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <PossessionBar home={match.stats.possession.home} away={match.stats.possession.away} />
              </Card>
            )}
            <Card className="border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>Radar Comparison</h3>
              <StatsRadar stats={match.stats} homeTeam={match.home_team?.short} awayTeam={match.away_team?.short} />
            </Card>
            <Card className="border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>Stats Breakdown</h3>
              <StatsBar stats={match.stats} homeTeam={match.home_team?.short} awayTeam={match.away_team?.short} />
            </Card>
            <Card className="border p-5 md:col-span-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>Match Stats</h3>
              <div className="space-y-3">
                {match.stats && Object.entries(match.stats).filter(([k]) => k !== 'possession').map(([key, val]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="font-mono-data text-sm text-right w-10" style={{ color: 'var(--text-primary)' }}>{val.home}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>{Math.round(val.home / (val.home + val.away + 0.001) * 100)}%</span>
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        <span>{Math.round(val.away / (val.home + val.away + 0.001) * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full bg-[#39FF14]/60" style={{ width: `${val.home / (val.home + val.away + 0.001) * 100}%` }} />
                        <div className="h-full bg-[#00F0FF]/60" style={{ width: `${val.away / (val.home + val.away + 0.001) * 100}%` }} />
                      </div>
                    </div>
                    <span className="font-mono-data text-sm w-10" style={{ color: 'var(--text-primary)' }}>{val.away}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Lineups */}
        <TabsContent value="lineups">
          <LineupsPanel lineups={match.lineups} match={match} />
        </TabsContent>

        {/* Pitch */}
        <TabsContent value="pitch">
          <Card className="border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="pitch-panel">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>Event Map</h3>
            <FootballPitch events={events} showHeatmap={true} />
          </Card>
        </TabsContent>

        {/* Predictions */}
        <TabsContent value="predictions">
          <BetSlip match={match} />
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card className="border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }} data-testid="comments-panel">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text-primary)' }}>Discussion ({comments.length})</h3>
            <CommentSection matchId={id} comments={comments} onRefresh={refreshComments} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
