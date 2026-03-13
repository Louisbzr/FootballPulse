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
import { Calendar, MapPin, ArrowLeft, Loader2 } from 'lucide-react';

const EVENT_ICONS = {
  goal: { icon: '\u26BD', color: '#39FF14', label: 'Goal' },
  shot_on_target: { icon: '\u25CE', color: '#00F0FF', label: 'Shot on Target' },
  yellow_card: { icon: '\u25A0', color: '#FFD700', label: 'Yellow Card' },
  red_card: { icon: '\u25A0', color: '#FF0055', label: 'Red Card' },
  substitution: { icon: '\u21C4', color: '#FF8C00', label: 'Substitution' },
  corner: { icon: '\u25B7', color: '#A78BFA', label: 'Corner' },
  foul: { icon: '\u2716', color: '#888', label: 'Foul' },
};

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

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6" data-testid="match-detail-page">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors" data-testid="back-button">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Score Header */}
      <Card className="bg-[#121212] border-white/5 p-6 md:p-8 mb-6" data-testid="match-score-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Badge variant="outline" className="border-white/10 text-gray-400 rounded-sm text-xs">{match.league}</Badge>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{matchDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <Badge className={`text-xs font-bold uppercase tracking-wider rounded-sm ${
            match.status === 'finished' ? 'bg-white/10 text-gray-300' : match.status === 'live' ? 'bg-[#FF0055]/10 text-[#FF0055]' : 'bg-[#00F0FF]/10 text-[#00F0FF]'
          }`}>
            {STATUS_LABEL[match.status]}
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
                {matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
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
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={match.status === 'finished' ? 'timeline' : 'predictions'} className="space-y-4">
        <TabsList className="bg-[#121212] border border-white/5 p-1 rounded-lg w-full justify-start overflow-x-auto" data-testid="match-tabs">
          {match.status === 'finished' && <TabsTrigger value="timeline" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-timeline">Timeline</TabsTrigger>}
          {match.stats && <TabsTrigger value="stats" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-stats">Statistics</TabsTrigger>}
          {events.length > 0 && <TabsTrigger value="pitch" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-pitch">Pitch</TabsTrigger>}
          <TabsTrigger value="predictions" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-predictions">Predictions</TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-[#39FF14]/10 data-[state=active]:text-[#39FF14] text-gray-400 text-xs rounded-md" data-testid="tab-comments">Comments ({comments.length})</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card className="bg-[#121212] border-white/5 p-5" data-testid="timeline-panel">
            <div className="space-y-0">
              {events.map((event, i) => {
                const info = EVENT_ICONS[event.type] || { icon: '\u25CF', color: '#888', label: event.type };
                const isHome = event.team === 'home';
                return (
                  <div key={i} className={`flex items-start gap-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''} animate-slideIn`} style={{ animationDelay: `${i * 50}ms` }} data-testid={`event-${i}`}>
                    <span className="font-mono-data text-xs text-gray-500 w-8 text-right shrink-0 pt-0.5">{event.minute}'</span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${info.color}15` }}>
                      <span style={{ color: info.color, fontSize: '12px' }}>{info.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{event.player}</span>
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
            {/* Detail stats */}
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
