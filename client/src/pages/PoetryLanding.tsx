import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import "../styles/PoetryLanding.scss";
import { SupabaseService } from "../services/apiService";
import {
  Language,
  getPreferredLanguage,
  setPreferredLanguage,
  hasValidContent,
} from "../services/languagePref";

interface PoemCard {
  _id: string;
  title: string;
  contentEnglish?: string;
  contentGreek?: string;
  pdfUrl?: string | null; // For PDF poems stored in Supabase Storage
  isPdf?: boolean;
  likes?: number;
  createdAt?: Date | string;
}

type SortOption =
  | "newest"
  | "oldest"
  | "title-az"
  | "title-za"
  | "language-en"
  | "language-gr";
type LanguageFilter = "all" | "english" | "greek";
type TypeFilter = "all" | "written" | "pdf";

const PoetryLanding: React.FC = () => {
  const [poems, setPoems] = useState<PoemCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [preferredLang, setPreferredLang] = useState<Language>(
    getPreferredLanguage()
  );

  const handlePreferredLang = (lang: Language) => {
    setPreferredLang(lang);
    setPreferredLanguage(lang); // persisted locally in the browser
  };

  // Fetch poems and PDF poems from Supabase
  const fetchPoemsAndPdfs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [supabasePoems, supabaseTranslations] = await Promise.all([
        SupabaseService.getAllPoems(),
        SupabaseService.getAllTranslations(),
      ]);

      // Regular poems
      const transformedPoems: PoemCard[] = supabasePoems.map((poem) => ({
        _id: poem._id || "",
        title: poem.title.trim(),
        contentEnglish: poem.contentEnglish,
        contentGreek: poem.contentGreek,
        likes: poem.likes,
        createdAt: poem.createdAt,
      }));

      // PDF poems live in translations with a "POEM" title prefix
      const poemPdfs: PoemCard[] = supabaseTranslations
        .filter((pdf) => pdf.title && pdf.title.startsWith("POEM"))
        .map((pdf) => ({
          _id: pdf._id || "",
          title: pdf.title.replace("POEM", "").trim(),
          pdfUrl: pdf.pdfUrl,
          isPdf: true,
          createdAt: pdf.createdAt,
        }));

      setPoems([...transformedPoems, ...poemPdfs]);
    } catch (error) {
      console.error("Error fetching poems from Supabase:", error);
      setError("Failed to fetch poems.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoemsAndPdfs();
  }, [fetchPoemsAndPdfs]);

  // Language availability rank used for the "sort by language" options:
  // poems in the chosen language first, then the other language.
  // (PDFs never reach this — their language can't be determined, so they're
  // set aside into their own section instead. See isLanguageFocused below.)
  const languageRank = (poem: PoemCard, lang: Language): number => {
    const has =
      lang === "english"
        ? hasValidContent(poem.contentEnglish)
        : hasValidContent(poem.contentGreek);
    return has ? 0 : 1;
  };

  const sortByTitleOrDate = (list: PoemCard[], by: SortOption): PoemCard[] => {
    const byNewest = (a: PoemCard, b: PoemCard) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    const sorted = [...list];
    switch (by) {
      case "oldest":
        sorted.sort((a, b) => byNewest(b, a));
        break;
      case "title-az":
        sorted.sort((a, b) => a.title.localeCompare(b.title, ["en", "el"]));
        break;
      case "title-za":
        sorted.sort((a, b) => b.title.localeCompare(a.title, ["en", "el"]));
        break;
      default:
        sorted.sort(byNewest);
    }
    return sorted;
  };

  // A PDF's text can't be read, so its language can't be determined. Any
  // time a language filter or a language-based sort is active, PDFs are
  // pulled out of the normal results and listed separately at the bottom
  // instead of being silently included or excluded.
  const isLanguageFocused =
    languageFilter !== "all" || sortBy === "language-en" || sortBy === "language-gr";

  // Apply search + filters + sorting
  const { visiblePoems, undeterminedPdfs } = useMemo(() => {
    const query = search.trim().toLowerCase();
    let base = poems;

    if (query) {
      base = base.filter((p) => p.title.toLowerCase().includes(query));
    }
    if (typeFilter === "written") base = base.filter((p) => !p.isPdf);
    if (typeFilter === "pdf") base = base.filter((p) => p.isPdf);

    const pdfsSetAside = isLanguageFocused ? base.filter((p) => p.isPdf) : [];
    let filtered = isLanguageFocused ? base.filter((p) => !p.isPdf) : base;

    if (languageFilter === "english") {
      filtered = filtered.filter((p) => hasValidContent(p.contentEnglish));
    } else if (languageFilter === "greek") {
      filtered = filtered.filter((p) => hasValidContent(p.contentGreek));
    }

    let sorted = [...filtered];
    switch (sortBy) {
      case "language-en":
        sorted.sort(
          (a, b) =>
            languageRank(a, "english") - languageRank(b, "english") ||
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        break;
      case "language-gr":
        sorted.sort(
          (a, b) =>
            languageRank(a, "greek") - languageRank(b, "greek") ||
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        break;
      default:
        sorted = sortByTitleOrDate(sorted, sortBy);
    }

    return {
      visiblePoems: sorted,
      undeterminedPdfs: sortByTitleOrDate(pdfsSetAside, sortBy),
    };
  }, [poems, search, sortBy, languageFilter, typeFilter, isLanguageFocused]);

  // Choose which language to show on a card: the preferred one, falling
  // back to the other with a small "no translation" note.
  const renderSnippet = (poem: PoemCard) => {
    const preferredContent =
      preferredLang === "english" ? poem.contentEnglish : poem.contentGreek;
    const otherContent =
      preferredLang === "english" ? poem.contentGreek : poem.contentEnglish;

    if (hasValidContent(preferredContent)) {
      return (
        <div
          className="poem-snippet"
          dangerouslySetInnerHTML={{ __html: preferredContent!.slice(0, 200) }}
        />
      );
    }
    if (hasValidContent(otherContent)) {
      return (
        <>
          <p className="no-translation-note">
            {preferredLang === "english"
              ? "No English translation yet — showing Greek"
              : "Δεν υπάρχει ελληνική έκδοση — showing English"}
          </p>
          <div
            className="poem-snippet"
            dangerouslySetInnerHTML={{ __html: otherContent!.slice(0, 200) }}
          />
        </>
      );
    }
    return <div className="poem-snippet"><i>(No content available)</i></div>;
  };

  const renderPdfCard = (poem: PoemCard) =>
    poem.pdfUrl ? (
      // PDF stored in Supabase Storage — open directly
      <a
        href={poem.pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="poetry-card-link"
      >
        <h1 className="poem-title">{poem.title}</h1>
        <p className="read-more">View PDF</p>
      </a>
    ) : (
      // Legacy PDF stored in the database — view through detail page
      <Link to={`/translations/${poem._id}`} className="poetry-card-link">
        <h1 className="poem-title">{poem.title}</h1>
        <p className="read-more">View PDF</p>
      </Link>
    );

  return (
    <div className="poetry-landing">
      <h2>Poetry</h2>
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">Loading poems...</p>}

      {/* Search + filter + sort controls */}
      <div className="list-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Search poems by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="sort-label">
          Language:
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as LanguageFilter)}
          >
            <option value="all">All</option>
            <option value="english">Has English</option>
            <option value="greek">Has Greek</option>
          </select>
        </label>
        <label className="sort-label">
          Type:
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="all">All</option>
            <option value="written">Written poems</option>
            <option value="pdf">PDF poems</option>
          </select>
        </label>
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
            <option value="language-en">Language: English first</option>
            <option value="language-gr">Language: Greek first</option>
          </select>
        </label>
        <div className="lang-pref" title="Preferred reading language (saved on this device)">
          <span>Show poems in:</span>
          <button
            className={preferredLang === "english" ? "active" : ""}
            onClick={() => handlePreferredLang("english")}
          >
            English
          </button>
          <button
            className={preferredLang === "greek" ? "active" : ""}
            onClick={() => handlePreferredLang("greek")}
          >
            Greek
          </button>
        </div>
      </div>

      {!loading &&
        visiblePoems.length === 0 &&
        undeterminedPdfs.length === 0 &&
        !error && <p className="empty-message">No poems found.</p>}

      <ul className="poetry-list">
        {visiblePoems.map((poem) => (
          <li key={poem._id} className="poetry-card">
            {/* When no language filter/sort is active, PDFs stay mixed in
                here (isLanguageFocused false). Otherwise this list only
                ever contains regular poems — PDFs move to the section
                below instead. */}
            {poem.isPdf ? (
              renderPdfCard(poem)
            ) : (
              <Link to={`/poetry/${poem._id}`} className="poetry-card-link">
                <h1 className="poem-title">{poem.title}</h1>
                {renderSnippet(poem)}
                <p className="read-more">Read More</p>
              </Link>
            )}
          </li>
        ))}
      </ul>

      {/* PDF poems can't be read to tell whether they're English or Greek,
          so when a language filter/sort is in effect they're listed here
          instead of being silently hidden or mixed in. */}
      {isLanguageFocused && undeterminedPdfs.length > 0 && (
        <div className="pdf-language-section">
          <p className="pdf-language-note">
            PDF poems cannot be determined as Greek or English, so they're
            listed separately below:
          </p>
          <ul className="poetry-list">
            {undeterminedPdfs.map((poem) => (
              <li key={poem._id} className="poetry-card">
                {renderPdfCard(poem)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PoetryLanding;
