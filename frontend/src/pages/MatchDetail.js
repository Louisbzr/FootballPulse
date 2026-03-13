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
    <div className="flex items-start justify-between px-4 py-3 bg-[#0A0A0A] rounded-lg border border-white/5" data-testid="goal-summary">
      <div className="flex-1 space-y-1">
        {homeGoals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-[#39FF14]">{g.type === 'penalty' ? '\u26BD(P)' : g.type === 'own_goal' ? '\u26BD(OG)' : '\u26BD'}</span>
            <span className="text-white font-medium">{g.player}</span>
            <span className="font-mono-data text-gray-500">{g.minute}'{g.extra ? `+${g.extra}` : ''}</span>
            {g.assist && <span className="text-gray-600 text-[10px]">({g.assist})</span>}
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-1 text-right">
        {awayGoals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-xs justify-end">
            {g.assist && <span className="text-gray-600 text-[10px]">({g.assist})</span>}
            <span className="font-mono-data text-gray-500">{g.minute}'{g.extra ? `+${g.extra}` : ''}</span>
            <span className="text-white font-medium">{g.player}</span>
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
        <div key={i} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-[#0A0A0A] border border-white/5">
          <span className="w-2.5 h-3.5 rounded-[1px]" style={{ backgroundColor: c.type === 'red_card' ? '#FF0055' : '#FFD700' }} />
          <span className="text-white">{c.player}</span>
          <span className="font-mono-data text-gray-500">{c.minute}'</span>
          <Badge variant="outline" className={`text-[8px] px-1 py-0 border-white/10 ${c.team === 'home' ? 'text-[#39FF14]' : 'text-[#00F0FF]'}`}>
            {c.team === 'home' ? match.home_team?.short : match.away_team?.short}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function LineupsPanel({ lineups, match }) {
  if (!lineups) return <p className="text-center text-gray-600 py-8">Lineups not available</p>;
  const TeamLineup = ({ lineup, team, side }) => (
    <div className={side === 'home' ? '' : ''}>
      <div className="flex items-center gap-2 mb-3">
        {team?.logo && <img src={team.logo} alt="" className="w-6 h-6 rounded" />}
        <span className="text-sm font-bold text-white">{team?.name}</span>
        <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{lineup.formation}</Badge>
      </div>
      {lineup.coach && <p className="text-[10px] text-gray-500 mb-3">Coach: {lineup.coach}</p>}
      <div className="space-y-1">
        {lineup.startXI?.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-white/[0.03]">
            <span className="font-mono-data text-gray-500 w-6 text-right">{p.number || '-'}</span>
            <span className="text-white">{p.name}</span>
            {p.pos && <span className="text-[10px] text-gray-600">{p.pos}</span>}
          </div>
        ))}
      </div>
      {lineup.substitutes?.length > 0 && (
        <>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-3 mb-1">Substitutes</p>
          <div className="space-y-1">
            {lineup.substitutes.slice(0, 9).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-0.5 opacity-60">
                <span className="font-mono-data text-gray-600 w-6 text-right">{p.number || '-'}</span>
                <span className="text-gray-400">{p.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="lineups-panel">
      <Card className="bg-[#121212] border-white/5 p-4">
        <TeamLineup lineup={lineups.home} team={match.home_team} side="home" />
      </Card>
      <Card className="bg-[#121212] border-white/5 p-4">
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
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors" data-testid="back-button">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Score Header */}
      <Card className="bg-[#121212] border-white/5 p-6 md:p-8 mb-6" data-testid="match-score-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Badge variant="outline" className="border-white/10 text-gray-400 rounded-sm text-xs">{match.league}</Badge>
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
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#1E1E1E] border border-white/10 flex items-center justify-center mx-auto md:ml-auto md:mr-0 overflow-hidden mb-2">
              <img src={match.home_team?.logo} alt="" className="w-8 h-8" />
            </div>
            <p className="text-lg md:text-xl font-bold text-white">{match.home_team?.name}</p>
            <p className="text-xs text-gray-500">{match.home_team?.short}</p>
          </div>
          <div className="text-center px-4" data-testid="detail-score">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl md:text-5xl font-black text-white font-mono-data">{match.score?.home}</span>
                <span className="text-xl text-gray-600">-</span>
                <span className="text-4xl md:text-5xl font-black text-white font-mono-data">{match.score?.away}</span>
              </div>
            ) : (
              <span className="text-lg text-gray-400 font-mono-data">
                {matchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#1E1E1E] border border-white/10 flex items-center justify-center mx-auto md:mr-auto md:ml-0 overflow-hidden mb-2">
              <img src={match.away_team?.logo} alt="" className="w-8 h-8" />
            </div>
            <p className="text-lg md:text-xl font-bold text-white">{match.away_team?.name}</p>
            <p className="text-xs text-gray-500">{match.away_team?.short}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 mt-4 text-xs text-gray-500">
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
        <TabsList className="bg-[#121212] border border-white/5 p-1 rounded-lg w-full justify-start overflow-x-auto" data-testid="match-tabs">
          {events.length > 0 && <TabsTrigger value="timeline" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-timeline">Timeline</TabsTrigger>}
          {match.stats && <TabsTrigger value="stats" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-stats">Statistics</TabsTrigger>}
          {hasLineups && <TabsTrigger value="lineups" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-lineups"><Users className="w-3 h-3 mr-1 inline" />Lineups</TabsTrigger>}
          {events.length > 0 && <TabsTrigger value="pitch" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-pitch">Pitch</TabsTrigger>}
          <TabsTrigger value="predictions" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-predictions">Predictions</TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-comments">Comments ({comments.length})</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card className="bg-[#121212] border-white/5 p-5" data-testid="timeline-panel">
            <div className="space-y-0">
              {events.map((event, i) => {
                const info = EVENT_ICONS[event.type] || EVENT_ICONS.other;
                const isHome = event.team === 'home';
                return (
                  <div key={i} className={`flex items-start gap-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`} data-testid={`event-${i}`}>
                    <span className="font-mono-data text-xs text-gray-500 w-10 text-right shrink-0 pt-0.5">
                      {event.minute}'{event.extra ? <span className="text-[10px] text-gray-600">+{event.extra}</span> : ''}
                    </span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${info.color}15` }}>
                      <span style={{ color: info.color, fontSize: '12px' }}>{info.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{event.player}</span>
                        {event.assist && <span className="text-[10px] text-gray-500">({event.assist})</span>}
                        <Badge variant="outline" className={`text-[10px] border-white/10 rounded-sm ${isHome ? 'text-[#39FF14]' : 'text-[#00F0FF]'}`}>
                          {isHome ? match.home_team?.short : match.away_team?.short}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && <p className="text-center text-gray-600 py-8">No events recorded</p>}
            </div>
          </Card>
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="stats-panel">
            {match.stats?.possession && (
              <Card className="bg-[#121212] border-white/5 p-5 md:col-span-2">
                <PossessionBar home={match.stats.possession.home} away={match.stats.possession.away} />
              </Card>
            )}
            <Card className="bg-[#121212] border-white/5 p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Radar Comparison</h3>
              <StatsRadar stats={match.stats} homeTeam={match.home_team?.short} awayTeam={match.away_team?.short} />
            </Card>
            <Card className="bg-[#121212] border-white/5 p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Stats Breakdown</h3>
              <StatsBar stats={match.stats} homeTeam={match.home_team?.short} awayTeam={match.away_team?.short} />
            </Card>
            <Card className="bg-[#121212] border-white/5 p-5 md:col-span-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Match Stats</h3>
              <div className="space-y-3">
                {match.stats && Object.entries(match.stats).filter(([k]) => k !== 'possession').map(([key, val]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="font-mono-data text-sm text-white text-right w-10">{val.home}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{Math.round(val.home / (val.home + val.away + 0.001) * 100)}%</span>
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        <span>{Math.round(val.away / (val.home + val.away + 0.001) * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1E1E1E] overflow-hidden flex">
                        <div className="h-full bg-[#39FF14]/60" style={{ width: `${val.home / (val.home + val.away + 0.001) * 100}%` }} />
                        <div className="h-full bg-[#00F0FF]/60" style={{ width: `${val.away / (val.home + val.away + 0.001) * 100}%` }} />
                      </div>
                    </div>
                    <span className="font-mono-data text-sm text-white w-10">{val.away}</span>
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
          <Card className="bg-[#121212] border-white/5 p-5" data-testid="pitch-panel">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Event Map</h3>
            <FootballPitch events={events} showHeatmap={true} />
          </Card>
        </TabsContent>

        {/* Predictions */}
        <TabsContent value="predictions">
          <BetSlip match={match} />
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card className="bg-[#121212] border-white/5 p-5" data-testid="comments-panel">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Discussion ({comments.length})</h3>
            <CommentSection matchId={id} comments={comments} onRefresh={refreshComments} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
