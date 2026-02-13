import { Link } from 'react-router-dom';
import { LobbyPageShell } from '@/components/layout/LobbyPageShell';
import { useAuth } from '@/hooks/useAuth';

export default function Admin() {
  const { isAuthenticated, user } = useAuth();

  return (
    <LobbyPageShell contentClassName="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-border/70 bg-card/70 p-8 text-center backdrop-blur-sm space-y-4">
        <Link to="/" className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </Link>

        {!isAuthenticated && (
          <p className="text-sm text-muted-foreground">Log in to access admin.</p>
        )}

        {isAuthenticated && user?.role !== 'ADMIN' && (
          <p className="text-sm text-muted-foreground">Admin access required.</p>
        )}

        {isAuthenticated && user?.role === 'ADMIN' && (
          <h1 className="text-4xl font-bold tracking-wide uppercase">admin</h1>
        )}
      </div>
    </LobbyPageShell>
  );
}
