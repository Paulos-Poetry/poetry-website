import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import "../styles/TranslationsLanding.scss";
import { SupabaseService } from "../services/apiService";

interface Translation {
  _id: string;
  title: string;
  createdAt: Date | string; // Allow both Date and string
}

const TranslationsLanding: React.FC = () => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTranslations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabaseData = await SupabaseService.getAllTranslations();
      // Transform to match local interface
      const data = supabaseData.map(item => ({
        _id: item._id || '',
        title: item.title,
        createdAt: item.createdAt
      }));
      
      console.log('Fetched from Supabase:', data);
      
      const nonPoemTranslations = data.filter(
        (item: Translation) => !item.title.startsWith("POEM")
      );
      setTranslations(nonPoemTranslations);
    } catch (error) {
      console.error('Error fetching translations from Supabase:', error);
      setError('Failed to fetch translations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  return (
    <div className="translations-landing">
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
