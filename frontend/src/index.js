// frontend/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/style.css';

const container = document.getElementById('root');
const root = createRoot(container);

// StrictMode double-invokes effects in dev to help catch side-effect bugs. Keep enabled by default.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
