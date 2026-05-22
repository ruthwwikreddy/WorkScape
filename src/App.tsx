import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DotLoader } from './components/ui/dot-loader';

// Lazy load components
const LandingPage = lazy(() => import('./components/LandingPage'));
const Workspace = lazy(() => import('./components/Workspace'));

const LoadingScreen = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <DotLoader
      frames={[
        [14, 7, 0, 8, 6, 13, 20],
        [14, 7, 13, 20, 16, 27, 21],
        [14, 20, 27, 21, 34, 24, 28],
        [27, 21, 34, 28, 41, 32, 35],
        [34, 28, 41, 35, 48, 40, 42],
        [34, 28, 41, 35, 48, 42, 46],
        [34, 28, 41, 35, 48, 42, 38],
        [34, 28, 41, 35, 48, 30, 21],
        [34, 28, 41, 48, 21, 22, 14],
        [34, 28, 41, 21, 14, 16, 27],
        [34, 28, 21, 14, 10, 20, 27],
        [28, 21, 14, 4, 13, 20, 27],
        [28, 21, 14, 12, 6, 13, 20],
        [28, 21, 14, 6, 13, 20, 11],
        [28, 21, 14, 6, 13, 20, 10],
        [14, 6, 13, 20, 9, 7, 21],
      ]}
      className="gap-0.5"
      dotClassName="bg-black/15 [&.active]:bg-black size-1.5"
    />
  </div>
);

export default function App() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/workspace" 
          element={isLocal ? <Workspace /> : <Navigate to="/" replace />} 
        />
        {/* Handle room routes locally */}
        <Route 
          path="/room/:roomId" 
          element={isLocal ? <Workspace /> : <Navigate to="/" replace />} 
        />
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
