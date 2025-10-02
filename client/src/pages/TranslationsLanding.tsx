import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/TranslationsLanding.scss";
import BackendSwitcher from "../components/BackendSwitcher";
import DataInspector from "../components/DataInspector";
import { useBackend } from "../contexts/BackendContext";
import { SupabaseService } from "../services/apiService";

const URL = import.meta.env.VITE_ADDRESS;

interface Translation {
  _id: string;
  title: string;
  createdAt: Date | string; // Allow both Date and string
}

const TranslationsLanding: React.FC = () => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const { currentBackend, getApiUrl } = useBackend();

  const fetchTranslations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: Translation[];
      
      if (currentBackend === 'supabase') {
        const supabaseData = await SupabaseService.getAllTranslations();
        // Transform to match local interface
        data = supabaseData.map(item => ({
          _id: item._id || '',
          title: item.title,
          createdAt: item.createdAt // Keep as-is, our interface now accepts both
        }));
      } else {
        // Original Heroku logic
        const response = await axios.get(`${URL}/translations/all`);
        data = response.data;
      }
      
      console.log(`Fetched from ${currentBackend}:`, data);
      
      const nonPoemTranslations = data.filter(
        (item: Translation) => !item.title.startsWith("POEM")
      );
      setTranslations(nonPoemTranslations);
    } catch (error) {
      console.error(`Error fetching translations from ${currentBackend}:`, error);
      setError(`Failed to fetch translations from ${currentBackend}.`);
    } finally {
      setLoading(false);
    }
  }, [currentBackend]);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]); // Re-fetch when backend changes

  return (
    <div className="translations-landing">
      <BackendSwitcher />
      
      {/* Data Inspector Toggle */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => setShowInspector(!showInspector)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showInspector ? 'Hide' : 'Show'} Data Inspector
        </button>
      </div>

      {/* Data Inspector */}
      {showInspector && (
        <DataInspector 
          apiUrl={getApiUrl()} 
          backendType={currentBackend}
        />
      )}
      
      <h2>Translations Landing</h2>
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">Loading translations...</p>}
      
      <ul className="translations-list">
        {translations.map((translation) => (
          <li key={translation._id} className="translation-card">
            <Link
              to={{
                pathname: `/translations/${translation._id}`,
              }}
              className="translation-card-link"
            >
              <h1 className="translation-title">{translation.title}</h1>
              <p>
                {new Date(translation.createdAt).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="read-more">Read More</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TranslationsLanding;
