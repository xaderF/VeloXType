import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";

// ---------------------------------------------------------------------------
// Route-level code splitting — each page is loaded on demand
// ---------------------------------------------------------------------------
const Index = lazy(() => import("./pages/Index"));
const Profile = lazy(() => import("./pages/Profile"));
const MatchHistoryList = lazy(() =>
  import("./pages/MatchHistory").then((m) => ({ default: m.MatchHistoryList }))
);
const MatchDetailView = lazy(() =>
  import("./pages/MatchHistory").then((m) => ({ default: m.MatchDetailView }))
);
const DailyChallenge = lazy(() => import("./pages/DailyChallenge"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Admin = lazy(() => import("./pages/Admin"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));
const APP_VERSION = "v1.1";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 minutes — avoid aggressive refetching
      gcTime: 1000 * 60 * 10,     // 10 minutes garbage-collection window
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}

const App = () => (
  <BrowserRouter>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/history" element={<MatchHistoryList />} />
              <Route path="/history/:matchId" element={<MatchDetailView />} />
              <Route path="/daily" element={<DailyChallenge />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieConsent />
          <div
            aria-label="app-version"
            className="pointer-events-none fixed bottom-3 left-3 z-[100] select-none text-xs font-mono text-muted-foreground/75"
          >
            {APP_VERSION}
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
