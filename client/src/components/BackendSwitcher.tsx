import React from 'react';
import { useBackend } from '../contexts/BackendContext';
import '../styles/BackendSwitcher.scss';

const BackendSwitcher: React.FC = () => {
  const { currentBackend, setBackend, isSupabaseReady } = useBackend();

  return (
    <div className="backend-switcher">
      <div className="switcher-header">
        <span className="switcher-label">Backend:</span>
        <div className="switcher-buttons">
          <button
            className={`switcher-btn ${currentBackend === 'heroku' ? 'active' : ''}`}
            onClick={() => setBackend('heroku')}
          >
            Heroku (Current)
          </button>
          <button
            className={`switcher-btn ${currentBackend === 'supabase' ? 'active' : ''} ${
              !isSupabaseReady ? 'disabled' : ''
            }`}
            onClick={() => setBackend('supabase')}
            disabled={!isSupabaseReady}
            title={!isSupabaseReady ? 'Supabase not configured yet' : 'Switch to Supabase'}
          >
            Supabase (New)
          </button>
        </div>
      </div>
      <div className="switcher-status">
        <span className={`status-indicator ${currentBackend}`}>
          {currentBackend === 'heroku' ? '🟢' : '🟡'} Using {currentBackend.charAt(0).toUpperCase() + currentBackend.slice(1)}
        </span>
        {!isSupabaseReady && (
          <span className="setup-hint">
            💡 Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Supabase
          </span>
        )}
      </div>
    </div>
  );
};

export default BackendSwitcher;