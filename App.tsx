import React from 'react';
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig } from 'wagmi';
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/web3";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Treasury from "@/pages/Treasury";
import Admin from "@/pages/Admin";
import Map from "@/pages/Map";
import Landing from "@/pages/Landing";
import { useAccount } from 'wagmi';
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { MusicSyncProvider } from "@/contexts/MusicSyncContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useEffect } from "react";
import { DimensionalProvider } from "./contexts/LocaleContext";
import { DimensionalMusicProvider } from "./contexts/DimensionalMusicContext";
import Whitepaper from "./pages/Whitepaper";
import LumiraData from "@/pages/LumiraData";

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">Please try refreshing the page</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!address) {
      setLocation('/');
    }
  }, [address, setLocation]);

  if (!address) {
    return null;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { address } = useAccount();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (address && window.location.pathname === '/') {
      setLocation('/home');
    }
  }, [address, setLocation]);

  if (address && window.location.pathname === '/') return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicRoute component={Landing} />
      </Route>
      <Route path="/home">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/treasury">
        <ProtectedRoute component={Treasury} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route path="/map">
        <ProtectedRoute component={Map} />
      </Route>
      <Route path="/lumira">
        <ProtectedRoute component={LumiraData} />
      </Route>
      <Route path="/whitepaper">
        <ProtectedRoute component={Whitepaper} />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WagmiConfig config={config}>
        <QueryClientProvider client={queryClient}>
          <DimensionalProvider>
            <DimensionalMusicProvider>
              <WebSocketProvider>
                <MusicPlayerProvider>
                  <MusicSyncProvider>
                    <Router />
                    <Toaster />
                  </MusicSyncProvider>
                </MusicPlayerProvider>
              </WebSocketProvider>
            </DimensionalMusicProvider>
          </DimensionalProvider>
        </QueryClientProvider>
      </WagmiConfig>
    </ErrorBoundary>
  );
}

export default App;