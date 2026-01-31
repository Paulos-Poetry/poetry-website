import React, { createContext, useContext, useState, ReactNode } from 'react';

type BackendType = 'heroku' | 'supabase';

interface BackendContextType {
  currentBackend: BackendType;
  setBackend: (backend: BackendType) => void;
  getApiUrl: () => string;
  isSupabaseReady: boolean;
}

const BackendContext = createContext<BackendContextType | undefined>(undefined);

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
};

interface BackendProviderProps {
  children: ReactNode;
}

export const BackendProvider: React.FC<BackendProviderProps> = ({ children }) => {
  // Default to 'supabase' for full migration
  const [currentBackend, setCurrentBackend] = useState<BackendType>('supabase');
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);

  const setBackend = (backend: BackendType) => {
    setCurrentBackend(backend);
    // Store preference in localStorage
    localStorage.setItem('preferred-backend', backend);
  };

  const getApiUrl = () => {
    const herokuUrl = import.meta.env.VITE_ADDRESS || 'https://paulospoetry.com';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
    
    return currentBackend === 'heroku' ? herokuUrl : supabaseUrl;
  };

  // Initialize from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('preferred-backend') as BackendType;
    if (stored && (stored === 'heroku' || stored === 'supabase')) {
      setCurrentBackend(stored);
    }

    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    setIsSupabaseReady(!!(supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL'));
  }, []);

  return (
    <BackendContext.Provider
      value={{
        currentBackend,
        setBackend,
        getApiUrl,
        isSupabaseReady,
      }}
    >
      {children}
    </BackendContext.Provider>
  );
};