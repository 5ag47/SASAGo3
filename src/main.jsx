import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './features/year-game/ErrorBoundary.jsx';
import { installErrorLogging } from './platform/diagnostics.js';
import { installGameInputPolicy } from './platform/game-input.js';
import './features/year-game/game.css';
import './features/year-game/immersive.css';
import './features/year-game/hud.css';
import './features/year-game/tutorial.css';

installErrorLogging();
installGameInputPolicy();
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
