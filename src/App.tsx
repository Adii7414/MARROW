import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import { TransitionProvider } from './lib/transition';
import { Header, IndexOverlay } from './components/Chrome';
import { NotFound } from './components/NextRoom';

const Arrival = lazy(() => import('./pages/Arrival'));
const Objects = lazy(() => import('./pages/Objects'));
const AircraftDetail = lazy(() => import('./pages/AircraftDetail'));
const Foundry = lazy(() => import('./pages/Foundry'));
const Form = lazy(() => import('./pages/Form'));
const Systems = lazy(() => import('./pages/Systems'));
const WindTunnel = lazy(() => import('./pages/WindTunnel'));
const Material = lazy(() => import('./pages/Material'));
const Flight = lazy(() => import('./pages/Flight'));
const Cabin = lazy(() => import('./pages/Cabin'));
const Journal = lazy(() => import('./pages/Journal'));
const Studio = lazy(() => import('./pages/Studio'));
const Configure = lazy(() => import('./pages/Configure'));

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <span className="meta text-muted-foreground animate-pulse">MORROW® — preparing room</span>
    </div>
  );
}

export default function App() {
  const [index, setIndex] = useState(false);
  return (
    <BrowserRouter>
      <TransitionProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-16 focus:z-[100] bg-primary text-primary-foreground px-3 py-2 meta">Skip to content</a>
        <Header onIndex={() => setIndex(true)} />
        <IndexOverlay open={index} onClose={() => setIndex(false)} />
        <main id="main">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Arrival />} />
              <Route path="/objects" element={<Objects />} />
              <Route path="/objects/:id" element={<AircraftDetail />} />
              <Route path="/foundry" element={<Foundry />} />
              <Route path="/form" element={<Form />} />
              <Route path="/systems" element={<Systems />} />
              <Route path="/wind-tunnel" element={<WindTunnel />} />
              <Route path="/material" element={<Material />} />
              <Route path="/flight" element={<Flight />} />
              <Route path="/cabin" element={<Cabin />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/:slug" element={<Journal />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/configure" element={<Configure />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Toaster />
      </TransitionProvider>
    </BrowserRouter>
  );
}
