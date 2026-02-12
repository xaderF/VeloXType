// HomeScreen — persistent lobby layout
// Left: vertical nav · Center: hero identity · Right: player context

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getRankFromRating, getRankTier } from '@/utils/scoring';
import { LetterParticles } from '@/components/game-ui/LetterParticles';

// ---------------------------------------------------------------------------
// Lock icon for auth-gated items
// ---------------------------------------------------------------------------

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3 h-3 inline-block', className)}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11 7V5a3 3 0 0 0-6 0v2H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1Zm-4-2a1 1 0 1 1 2 0v2H7V5Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HomeScreenProps {
  // Identity
  username: string;
  rating: number | null;
  isAuthenticated: boolean;

  // Last match stats (optional)
  lastMatch?: {
    wpm: number;
    accuracy: number;
    result: 'win' | 'loss' | 'draw';
  } | null;

  // Nav actions
  onPlay: () => void;        // opens mode-select sub-screen
  onCareer: () => void;
  onLeaderboard: () => void;
  onStore?: () => void;
  onArmory?: () => void;
  onSettings?: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

type NavId = 'play' | 'career' | 'leaderboard' | 'store' | 'armory' | 'settings';

interface NavItem {
  id: NavId;
  label: string;
  accent?: boolean;
  authRequired?: boolean;    // locks item behind login
}

const NAV_ITEMS: NavItem[] = [
  { id: 'play', label: 'PLAY', accent: true },
  { id: 'career', label: 'CAREER', authRequired: true },
  { id: 'leaderboard', label: 'LEADERBOARD', authRequired: true },
  { id: 'store', label: 'STORE' },
  { id: 'armory', label: 'PROFILE', authRequired: true },
  { id: 'settings', label: 'SETTINGS' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeScreen({
  username,
  rating,
  isAuthenticated,
  lastMatch,
  onPlay,
  onCareer,
  onLeaderboard,
  onStore,
  onArmory,
  onSettings,
  onLogin,
  onLogout,
}: HomeScreenProps) {
  const isGuest = !isAuthenticated || !username || username === 'Player';

  const rankInfo = rating != null ? getRankFromRating(rating) : null;
  const tier = rating != null ? getRankTier(rating) : 0;
  const rankDisplay = rankInfo
    ? `${rankInfo.name} ${tier > 0 ? tier : ''}`
    : null;

  const handleNav = (id: NavId) => {
    // Auth-gated items prompt login if not authenticated
    const item = NAV_ITEMS.find((n) => n.id === id);
    if (item?.authRequired && !isAuthenticated) {
      onLogin();
      return;
    }

    switch (id) {
      case 'play': onPlay(); break;
      case 'career': onCareer(); break;
      case 'leaderboard': onLeaderboard(); break;
      case 'store': onStore?.(); break;
      case 'armory': onArmory?.(); break;
      case 'settings': onSettings?.(); break;
    }
  };

  return (
    <div className="fixed inset-0 flex bg-lobby-bg overflow-hidden select-none">
      {/* Animated background */}
      <LetterParticles />

      {/* ─────── LEFT: Navigation ─────── */}
      <nav className="relative z-10 flex flex-col justify-center w-56 pl-10 pr-6 flex-shrink-0">
        <motion.ul
          className="space-y-1"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {NAV_ITEMS.map((item) => (
            <motion.li
              key={item.id}
              variants={{
                hidden: { opacity: 0, x: -12 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              <button
                onClick={() => handleNav(item.id)}
                className={cn(
                  'group relative flex items-center w-full py-2.5 text-left text-sm font-semibold tracking-widest uppercase transition-all duration-200',
                  item.accent
                    ? 'text-accent'
                    : item.authRequired && !isAuthenticated
                      ? 'text-lobby-text-muted/40 hover:text-lobby-text-muted/70'
                      : 'text-lobby-text-muted hover:text-lobby-text',
                )}
              >
                {/* Hover indicator bar */}
                <span
                  className={cn(
                    'absolute left-0 w-0.5 h-4 rounded-full transition-all duration-200 -translate-x-3',
                    item.accent
                      ? 'bg-accent opacity-100'
                      : 'bg-lobby-text opacity-0 group-hover:opacity-100',
                  )}
                />
                {/* Slide on hover */}
                <span className="transition-transform duration-200 group-hover:translate-x-1 flex items-center gap-2">
                  {item.label}
                  {item.authRequired && !isAuthenticated && (
                    <LockIcon className="opacity-50" />
                  )}
                </span>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      </nav>

      {/* ─────── CENTER: Hero / Identity ─────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-w-0">
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          {/* Logo */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-[0.25em] uppercase text-lobby-text">
            <span className="text-accent">VELOX</span>TYPE
          </h1>

          {/* Tagline */}
          <p className="text-xs md:text-sm tracking-[0.35em] uppercase text-lobby-text-muted font-medium">
            Precision&ensp;·&ensp;Speed&ensp;·&ensp;Consistency
          </p>

          {/* Primary CTA */}
          <motion.button
            onClick={onPlay}
            className={cn(
              'mt-6 px-14 py-4 rounded-lg font-bold text-base tracking-widest uppercase',
              'bg-accent text-lobby-bg',
              'transition-all duration-300',
              'hover:shadow-[0_0_30px_hsl(var(--accent)/0.35)]',
              'active:scale-[0.97]',
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            PLAY NOW
          </motion.button>
        </motion.div>
      </div>

      {/* ─────── RIGHT: Player Context ─────── */}
      <aside className="relative z-10 flex flex-col justify-between w-60 pr-10 pl-6 py-10 flex-shrink-0">
        {/* Top-right: Identity */}
        <motion.div
          className="space-y-1 text-right"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          {isGuest ? (
            <>
              <div className="text-sm font-semibold text-lobby-text-muted">Guest</div>
              <button
                onClick={onLogin}
                className="text-xs text-accent hover:underline underline-offset-2 transition-colors"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-lobby-text">{username}</div>
              {rankDisplay && (
                <div className="text-xs text-lobby-text-muted">
                  Rank: <span className="text-accent">{rankDisplay}</span>
                </div>
              )}
              {!rankDisplay && (
                <div className="text-xs text-lobby-text-muted">
                  Rank: <span className="text-accent">UNRANKED</span>
                </div>
              )}
              {rating != null && (
                <div className="text-xs text-lobby-text-muted font-mono">
                  Rating: {rating}
                </div>
              )}
              <button
                onClick={onLogout}
                className="text-[10px] text-lobby-text-muted/50 hover:text-lobby-text-muted transition-colors mt-1"
              >
                Sign out
              </button>
            </>
          )}
        </motion.div>

        {/* Mid-right: Last match */}
        {lastMatch && (lastMatch.wpm > 0 || lastMatch.accuracy > 0 || lastMatch.result !== 'draw') && (
          <motion.div
            className="text-right space-y-0.5"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-[10px] tracking-widest uppercase text-lobby-text-muted mb-1">
              Last Match
            </div>
            <div className="text-xs text-lobby-text-muted font-mono">
              WPM: <span className="text-lobby-text">{Math.round(lastMatch.wpm)}</span>
            </div>
            <div className="text-xs text-lobby-text-muted font-mono">
              Accuracy: <span className="text-lobby-text">{Math.round(lastMatch.accuracy * 100)}%</span>
            </div>
            <div className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              lastMatch.result === 'win' ? 'text-green-400' :
              lastMatch.result === 'loss' ? 'text-red-400' : 'text-lobby-text-muted',
            )}>
              {lastMatch.result}
            </div>
          </motion.div>
        )}

        {/* Bottom-right: Online status placeholder */}
        <motion.div
          className="text-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <div className="flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-lobby-text-muted">Online</span>
          </div>
        </motion.div>
      </aside>
    </div>
  );
}
