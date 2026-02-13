// MatchHistory.tsx — Full match history list with match detail view (WPM graph, stats)

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RankBadge } from '@/components/game-ui/RankBadge';
import { LobbyPageShell } from '@/components/layout/LobbyPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchListEntry {
  matchId: string;
  id?: string | null;
  createdAt: string;
  mode: string;
  limit: number;
  seed: string;
  you: {
    wpm: number | null;
    accuracy: number | null;
    consistency: number | null;
    score: number | null;
    result: string | null;
    damageDealt: number | null;
    damageTaken: number | null;
    rawWpm: number | null;
    errors: number | null;
    ratingBefore: number | null;
    ratingAfter: number | null;
    ratingDelta: number | null;
  };
  opponent: {
    username: string;
    rating: number | null;
    wpm: number | null;
    accuracy: number | null;
    result: string | null;
  } | null;
}

interface MatchDetailPlayer {
  userId: string;
  username: string;
  rating: number | null;
  wpm: number | null;
  accuracy: number | null;
  consistency: number | null;
  score: number | null;
  result: string | null;
  damageDealt: number | null;
  damageTaken: number | null;
  rawWpm: number | null;
  errors: number | null;
  correctChars: number | null;
  totalTyped: number | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
  ratingDelta: number | null;
  progressSamples: number[] | null;
}

interface MatchDetail {
  id: string;
  seed: string;
  mode: string;
  limit: number;
  status: string;
  createdAt: string;
  players: MatchDetailPlayer[];
}

interface RoundBreakdown {
  round: number;
  youChars: number;
  opponentChars: number;
  youWpm: number;
  opponentWpm: number;
  winner: 'you' | 'opponent' | 'draw';
}

type MatchListWireEntry = Omit<MatchListEntry, 'matchId'> & {
  matchId?: string | null;
};

type MatchDetailWire = Omit<MatchDetail, 'players'> & {
  players: Array<Omit<MatchDetailPlayer, 'progressSamples'> & { progressSamples: unknown }>;
};

function resolveMatchId(match: { matchId?: string | null; id?: string | null }) {
  return (match.matchId ?? match.id ?? '').trim();
}

function normalizeMatchListEntry(match: MatchListWireEntry): MatchListEntry {
  return {
    ...match,
    matchId: resolveMatchId(match),
  };
}

function normalizeProgressSamples(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const next = value
    .map((sample) => (typeof sample === 'number' ? sample : Number(sample)))
    .filter((sample) => Number.isFinite(sample));
  return next.length > 0 ? next : [];
}

function normalizeMatchDetail(match: MatchDetailWire): MatchDetail {
  const players = Array.isArray(match.players) ? match.players : [];
  return {
    ...match,
    players: players.map((player) => ({
      ...player,
      progressSamples: normalizeProgressSamples(player.progressSamples),
    })),
  };
}

// ---------------------------------------------------------------------------
// Match History List
// ---------------------------------------------------------------------------

export function MatchHistoryList() {
  const { token, isAuthenticated } = useAuth();
  const [matches, setMatches] = useState<MatchListEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/matches?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const nextMatches = Array.isArray(data.matches)
            ? (data.matches as MatchListWireEntry[]).map(normalizeMatchListEntry)
            : [];
          setMatches(nextMatches);
          setTotal(data.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [token, offset]);

  if (!isAuthenticated) {
    return (
      <LobbyPageShell contentClassName="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Log in to view your match history.</p>
          <Link to="/" className="text-primary underline">
            Go Home
          </Link>
        </div>
      </LobbyPageShell>
    );
  }

  return (
    <LobbyPageShell contentClassName="p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Profile
          </Link>
          <h1 className="text-lg font-bold">Match History</h1>
          <span className="text-sm text-muted-foreground">{total} total</span>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground animate-pulse py-12">Loading...</div>
        ) : matches.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">No matches yet.</div>
        ) : (
            <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {matches.map((match) => (
                <MatchRow key={match.matchId || `${match.createdAt}-${match.seed}`} match={match} />
              ))}
            </motion.div>
          )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-30 hover:bg-secondary transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted-foreground">
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-30 hover:bg-secondary transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </LobbyPageShell>
  );
}

// ---------------------------------------------------------------------------
// Match Detail View
// ---------------------------------------------------------------------------

export function MatchDetailView() {
  const { matchId } = useParams<{ matchId: string }>();
  const { token, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !matchId) return;
    fetch(`${API_BASE}/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMatch(normalizeMatchDetail(data as MatchDetailWire));
      })
      .finally(() => setLoading(false));
  }, [token, matchId]);

  if (!isAuthenticated) {
    return (
      <LobbyPageShell contentClassName="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Log in to view match details.</p>
      </LobbyPageShell>
    );
  }

  if (loading) {
    return (
      <LobbyPageShell contentClassName="min-h-screen flex items-center justify-center p-4">
        <div className="text-muted-foreground animate-pulse">Loading match...</div>
      </LobbyPageShell>
    );
  }

  if (!match) {
    return (
      <LobbyPageShell contentClassName="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Match not found.</p>
          <button onClick={() => navigate('/history')} className="text-primary underline">
            Back to History
          </button>
        </div>
      </LobbyPageShell>
    );
  }

  const you = match.players.find((p) => p.userId === user?.id) ?? match.players[0] ?? null;
  const opponent = you
    ? (match.players.find((p) => p.userId !== you.userId) ?? null)
    : (match.players[1] ?? null);
  const date = new Date(match.createdAt);
  const rounds = buildRoundBreakdown(you?.progressSamples ?? [], opponent?.progressSamples ?? [], match.limit);
  const isPlacementGame = you?.ratingBefore == null;
  const youDelta = you
    ? resolveDisplayRatingDelta(you.ratingDelta, you.ratingBefore, you.ratingAfter, you.result)
    : 0;

  return (
    <LobbyPageShell contentClassName="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            {match.id.slice(0, 8)}
          </span>
        </div>

        {/* Match header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wide">
                    {you?.result === 'win' ? 'Win' : you?.result === 'loss' ? 'Loss' : 'Draw'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {match.mode} {match.limit}s
                  </p>
                </div>
                {you && (
                  <div className="text-right">
                    {isPlacementGame ? (
                      <div className="text-2xl font-bold text-primary">PLACEMENT +1</div>
                    ) : (
                      <div
                        className={cn(
                          'text-2xl font-bold',
                          youDelta > 0 && 'text-green-400',
                          youDelta < 0 && 'text-red-400',
                          youDelta === 0 && 'text-muted-foreground',
                        )}
                      >
                        ELO {youDelta > 0 ? '+' : ''}{youDelta}
                      </div>
                    )}
                    {(you.ratingBefore != null && you.ratingAfter != null) && (
                      <div className="text-xs text-muted-foreground">
                        {you.ratingBefore} → {you.ratingAfter}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Player comparison */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {you && <PlayerStatsCard player={you} label="You" isWinner={you.result === 'win'} />}
          {opponent && <PlayerStatsCard player={opponent} label={opponent.username} isWinner={opponent.result === 'win'} />}
        </motion.div>

        {/* WPM Graph */}
        {(you?.progressSamples?.length || opponent?.progressSamples?.length) ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border bg-card/80">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Performance Over Time (WPM pace)
                </h3>
                <WpmGraph
                  youSamples={you?.progressSamples ?? []}
                  opponentSamples={opponent?.progressSamples ?? []}
                  opponentName={opponent?.username ?? 'Opponent'}
                />
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {rounds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-border bg-card/80">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Round Breakdown</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                  {rounds.map((round) => (
                    <div
                      key={round.round}
                      className={cn(
                        'min-w-[240px] rounded-lg border p-3 snap-start',
                        round.winner === 'you' && 'border-green-500/30 bg-green-500/[0.06]',
                        round.winner === 'opponent' && 'border-red-500/30 bg-red-500/[0.06]',
                        round.winner === 'draw' && 'border-border bg-secondary/20',
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">Round {round.round}</p>
                        <span
                          className={cn(
                            'text-xs font-semibold uppercase',
                            round.winner === 'you' && 'text-green-400',
                            round.winner === 'opponent' && 'text-red-400',
                            round.winner === 'draw' && 'text-muted-foreground',
                          )}
                        >
                          {round.winner === 'you' ? 'Win' : round.winner === 'opponent' ? 'Loss' : 'Draw'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md border border-border/70 bg-background/30 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">You WPM</div>
                          <div className="font-mono text-sm">{round.youWpm}</div>
                        </div>
                        <div className="rounded-md border border-border/70 bg-background/30 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Opp WPM</div>
                          <div className="font-mono text-sm">{round.opponentWpm}</div>
                        </div>
                        <div className="rounded-md border border-border/70 bg-background/30 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">You Chars</div>
                          <div className="font-mono text-sm">{round.youChars}</div>
                        </div>
                        <div className="rounded-md border border-border/70 bg-background/30 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Opp Chars</div>
                          <div className="font-mono text-sm">{round.opponentChars}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {you && opponent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <HeadToHeadTable you={you} opponent={opponent} />
          </motion.div>
        )}

        {/* Match meta */}
        <motion.div
          className="text-xs text-muted-foreground text-center space-x-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span>Seed: {match.seed}</span>
          <span>Mode: {match.mode}</span>
          <span>Limit: {match.limit}s</span>
        </motion.div>
      </div>
    </LobbyPageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MatchRow({ match }: { match: MatchListEntry }) {
  const navigate = useNavigate();
  const matchId = resolveMatchId(match);
  const canOpen = matchId.length > 0;
  const result = match.you.result;
  const resultLabel = result === 'win' ? 'WIN' : result === 'loss' ? 'LOSS' : result === 'draw' ? 'DRAW' : '—';
  const isPlacementGame = match.you.ratingBefore == null;
  const delta = resolveDisplayRatingDelta(
    match.you.ratingDelta,
    match.you.ratingBefore,
    match.you.ratingAfter,
    result,
  );
  const oppName = match.opponent?.username ?? 'Unknown';
  const date = new Date(match.createdAt);

  return (
    <button
      type="button"
      onClick={() => canOpen && navigate(`/history/${encodeURIComponent(matchId)}`)}
      disabled={!canOpen}
      className={cn(
        'w-full text-left',
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        canOpen ? 'hover:bg-secondary/50 cursor-pointer' : 'opacity-60 cursor-not-allowed',
        result === 'win' && 'border-green-500/20 bg-green-500/5',
        result === 'loss' && 'border-red-500/20 bg-red-500/5',
        result === 'draw' && 'border-border bg-card/50',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'text-xs font-bold uppercase px-2 py-0.5 rounded min-w-[3.5rem] text-center',
            result === 'win' && 'bg-green-500/20 text-green-400',
            result === 'loss' && 'bg-red-500/20 text-red-400',
            result === 'draw' && 'bg-muted text-muted-foreground',
          )}
        >
          {resultLabel}
        </span>
        <div>
          <span className="text-sm font-medium">vs {oppName}</span>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {match.limit}s {match.mode}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {isPlacementGame ? (
          <span className="font-semibold min-w-[6.5rem] text-right text-primary">PLACEMENT +1</span>
        ) : (
          <span
            className={cn(
              'font-semibold min-w-[4.5rem] text-right',
              delta > 0 && 'text-green-400',
              delta < 0 && 'text-red-400',
              delta === 0 && 'text-muted-foreground',
            )}
          >
            ELO {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{canOpen ? 'Details →' : 'Unavailable'}</span>
      </div>
    </button>
  );
}

function PlayerStatsCard({
  player,
  label,
  isWinner,
}: {
  player: MatchDetailPlayer;
  label: string;
  isWinner: boolean;
}) {
  const isPlacementGame = player.ratingBefore == null;
  const delta = resolveDisplayRatingDelta(
    player.ratingDelta,
    player.ratingBefore,
    player.ratingAfter,
    player.result,
  );

  return (
    <Card
      className={cn(
        'border-border bg-card/60',
        isWinner && 'border-green-500/30',
      )}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{label}</span>
            {player.rating != null && <RankBadge rating={player.rating} size="sm" />}
          </div>
          <span
            className={cn(
              'text-xs font-bold uppercase px-2 py-0.5 rounded',
              player.result === 'win' && 'bg-green-500/20 text-green-400',
              player.result === 'loss' && 'bg-red-500/20 text-red-400',
              player.result === 'draw' && 'bg-muted text-muted-foreground',
            )}
          >
            {player.result}
          </span>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <StatRow label="WPM" value={player.wpm != null ? Math.round(player.wpm) : '—'} />
          <StatRow label="Raw WPM" value={player.rawWpm != null ? Math.round(player.rawWpm) : '—'} />
          <StatRow label="Accuracy" value={player.accuracy != null ? `${Math.round(player.accuracy * 100)}%` : '—'} />
          <StatRow label="Consistency" value={player.consistency != null ? `${Math.round(player.consistency * 100)}%` : '—'} />
          <StatRow label="Score" value={player.score != null ? Math.round(player.score) : '—'} />
          <StatRow label="Errors" value={player.errors ?? '—'} />
          <StatRow label="Damage Dealt" value={player.damageDealt != null ? Math.round(player.damageDealt) : '—'} />
          <StatRow label="Damage Taken" value={player.damageTaken != null ? Math.round(player.damageTaken) : '—'} />
          <StatRow label={isPlacementGame ? 'Placement' : 'ELO'} value={isPlacementGame ? '+1' : `${delta > 0 ? '+' : ''}${delta}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function HeadToHeadTable({
  you,
  opponent,
}: {
  you: MatchDetailPlayer;
  opponent: MatchDetailPlayer;
}) {
  const rows = [
    { label: 'WPM', you: formatStatValue(you.wpm), opponent: formatStatValue(opponent.wpm) },
    { label: 'Raw WPM', you: formatStatValue(you.rawWpm), opponent: formatStatValue(opponent.rawWpm) },
    { label: 'Accuracy', you: formatPercentValue(you.accuracy), opponent: formatPercentValue(opponent.accuracy) },
    { label: 'Consistency', you: formatPercentValue(you.consistency), opponent: formatPercentValue(opponent.consistency) },
    { label: 'Score', you: formatStatValue(you.score), opponent: formatStatValue(opponent.score) },
    { label: 'Errors', you: formatStatValue(you.errors), opponent: formatStatValue(opponent.errors) },
    { label: 'Correct Chars', you: formatStatValue(you.correctChars), opponent: formatStatValue(opponent.correctChars) },
    { label: 'Total Typed', you: formatStatValue(you.totalTyped), opponent: formatStatValue(opponent.totalTyped) },
    { label: 'Damage Dealt', you: formatStatValue(you.damageDealt), opponent: formatStatValue(opponent.damageDealt) },
    { label: 'Damage Taken', you: formatStatValue(you.damageTaken), opponent: formatStatValue(opponent.damageTaken) },
  ];

  return (
    <Card className="border-border bg-card/80">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Full Match Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">Metric</th>
                <th className="py-2 font-medium">You</th>
                <th className="py-2 font-medium">{opponent.username}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/50 last:border-b-0">
                  <td className="py-2 text-muted-foreground">{row.label}</td>
                  <td className="py-2 font-mono">{row.you}</td>
                  <td className="py-2 font-mono">{row.opponent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

function splitProgressIntoRounds(samples: number[], roundLimitSeconds: number): number[][] {
  if (!samples.length) return [];

  const rounds: number[][] = [];
  let current: number[] = [];

  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(0, samples[i] ?? 0);
    const prev = i > 0 ? Math.max(0, samples[i - 1] ?? 0) : 0;
    const resetDetected = i > 0 && value + 2 < prev;

    if (resetDetected && current.length) {
      rounds.push(current);
      current = [value];
    } else {
      current.push(value);
    }
  }

  if (current.length) rounds.push(current);

  if (rounds.length <= 1 && samples.length > roundLimitSeconds + 4) {
    const chunked: number[][] = [];
    for (let i = 0; i < samples.length; i += roundLimitSeconds) {
      const slice = samples.slice(i, i + roundLimitSeconds).map((n) => Math.max(0, n ?? 0));
      if (slice.length) chunked.push(slice);
    }
    if (chunked.length > 1) return chunked;
  }

  return rounds;
}

function buildRoundBreakdown(
  youSamples: number[],
  opponentSamples: number[],
  roundLimitSeconds: number,
): RoundBreakdown[] {
  const youRounds = splitProgressIntoRounds(youSamples, roundLimitSeconds);
  const opponentRounds = splitProgressIntoRounds(opponentSamples, roundLimitSeconds);
  const total = Math.max(youRounds.length, opponentRounds.length);
  const seconds = Math.max(1, roundLimitSeconds);

  return Array.from({ length: total }, (_, idx) => {
    const y = youRounds[idx] ?? [];
    const o = opponentRounds[idx] ?? [];
    const youChars = y.length ? Math.max(...y) : 0;
    const opponentChars = o.length ? Math.max(...o) : 0;
    const youWpm = Math.round((youChars / 5) / (seconds / 60));
    const opponentWpm = Math.round((opponentChars / 5) / (seconds / 60));

    return {
      round: idx + 1,
      youChars,
      opponentChars,
      youWpm,
      opponentWpm,
      winner: youChars > opponentChars ? 'you' : opponentChars > youChars ? 'opponent' : 'draw',
    };
  });
}

function resolveDisplayRatingDelta(
  explicitDelta: number | null,
  ratingBefore: number | null,
  ratingAfter: number | null,
  result: string | null,
) {
  if (explicitDelta != null) return explicitDelta;
  if (ratingBefore != null && ratingAfter != null) return ratingAfter - ratingBefore;
  if (result === 'win') return 12;
  if (result === 'loss') return -12;
  return 0;
}

function formatStatValue(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return Math.round(value);
}

function formatPercentValue(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function WpmGraph({
  youSamples,
  opponentSamples,
  opponentName,
}: {
  youSamples: number[];
  opponentSamples: number[];
  opponentName: string;
}) {
  const maxLen = Math.max(youSamples.length, opponentSamples.length);

  const toWpm = (samples: number[], index: number): number | null => {
    const curr = samples[index];
    if (curr == null) return null;
    const prev = index > 0 ? (samples[index - 1] ?? 0) : 0;
    const delta = curr >= prev ? curr - prev : curr;
    return Math.max(0, delta * 12);
  };

  const data = Array.from({ length: maxLen }, (_, i) => ({
    second: i + 1,
    you: toWpm(youSamples, i),
    opponent: toWpm(opponentSamples, i),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="second"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          label={{ value: 'Second', position: 'bottom', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          label={{ value: 'WPM', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Line
          type="monotone"
          dataKey="you"
          name="You"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="opponent"
          name={opponentName}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          dot={false}
          connectNulls
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
