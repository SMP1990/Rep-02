import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ModelTest from './ModelTest';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModelTest />
  </StrictMode>,
);
