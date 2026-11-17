import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { clearAllData } from './db'

// Force a clean reset on launch so all demo data is 100% wiped
if (!localStorage.getItem('force_wiped_clean_v3')) {
  clearAllData().then(() => {
    localStorage.setItem('force_wiped_clean_v3', 'true');
    renderApp();
  }).catch(() => {
    renderApp();
  });
} else {
  renderApp();
}

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
