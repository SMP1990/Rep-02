import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Demo only: ?dark previews dark mode (the site toggles .dark on <html>).
if (new URLSearchParams(location.search).has('dark')) document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
