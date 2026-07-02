import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import "../styles/TranslationsLanding.scss";
import { SupabaseService } from "../services/apiService";

interface TranslationCard {
  _id: string;
  title: string;
  createdAt: Date | string;
}

type SortOption = "newest" | "oldest" | "title-az" | "title-za";

const TranslationsLanding: React.FC = () => {
  const [translations, setTranslations] = useState<TranslationCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");

  const fetchTranslations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabaseData = await SupabaseService.getAllTranslations();
      // "POEM"-prefixed entries are PDF poems shown on the Poetry page
      const nonPoemTranslations = supabaseData
        .filter((item) => !item.title.startsWith("POEM"))
        .map((item) => ({
          _id: item._id || "",
          title: item.title.trim(),
          createdAt: item.createdAt,
        }));
      setTranslations(nonPoemTranslations);
    } catch (error) {
      console.error("Error fetching translations from Supabase:", error);
      setError("Failed to fetch translations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  const visibleTranslations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? translations.filter((t) => t.title.toLowerCase().includes(query))
      : translations;

    const sorted = [...filtered];
    switch (sortBy) {
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        break;
      case "oldest":
        sorted.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );
        break;
      case "title-az":
        sorted.sort((a, b) => a.title.localeCompare(b.title, ["en", "el"]));
        break;
      case "title-za":
        sorted.sort((a, b) => b.title.localeCompare(a.title, ["en", "el"]));
        break;
    }
    return sorted;
  }, [translations, search, sortBy]);

  return (
    <div className="translations-landing">
      <h2>Translations</h2>
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">Loading translations...</p>}

      {/* Search + sort controls */}
      <div className="list-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Search translations by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="sort-label">
          Sort by:
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title-az">Title A–Z</option>
            <option value="title-za">Title Z–A</option>
          </select>
        </label>
      </div>

      {!loading && visibleTranslations.length === 0 && !error && (
        <p className="empty-message">No translations found.</p>
      )}

      <ul className="translations-list">
        {visibleTranslations.map((translation) => (
          <li key={translation._id} className="translation-card">
            <Link
              to={`/translations/${translation._id}`}
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
