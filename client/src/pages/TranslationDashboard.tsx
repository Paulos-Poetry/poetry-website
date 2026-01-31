import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "../styles/TranslationDashboard.scss";
import { useBackend } from "../contexts/BackendContext";
import { SupabaseService, HerokuService } from "../services/apiService";
import BackendSwitcher from "../components/BackendSwitcher";

interface Translation {
  _id: string;
  title: string;
  contentType?: string;
  date?: string;
}

const TranslationDashboard: React.FC = () => {
  const location = useLocation();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedTranslation, setSelectedTranslation] =
    useState<Translation | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentBackend } = useBackend();

  useEffect(() => {
    if (location.state && location.state.prefillTitle) {
      setTitle(location.state.prefillTitle);
    }
  }, [location.state]);

  const fetchTranslations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (currentBackend === 'supabase') {
        data = await SupabaseService.getAllTranslations();
      } else {
        data = await HerokuService.getAllTranslations();
      }
      setTranslations(data.map(t => ({
        _id: t._id || '',
        title: t.title,
        contentType: t.contentType || t.content_type,
        date: t.createdAt ? String(t.createdAt) : undefined
      })));
    } catch (error) {
      console.error(`Error fetching translations from ${currentBackend}:`, error);
      setError(`Failed to fetch translations from ${currentBackend}.`);
    } finally {
      setLoading(false);
    }
  }, [currentBackend]);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmitTranslation = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title", title);
    formData.append("date", date);

    if (file) {
      formData.append("pdf", file);
    }

    try {
      if (editMode && selectedTranslation) {
        if (currentBackend === 'supabase') {
          await SupabaseService.updateTranslation(selectedTranslation._id, formData);
        } else {
          await HerokuService.updateTranslation(selectedTranslation._id, formData);
        }
        setTranslations(
          translations.map((trans) =>
            trans._id === selectedTranslation._id
              ? { ...trans, title, date }
              : trans
          )
        );
      } else {
        let response;
        if (currentBackend === 'supabase') {
          response = await SupabaseService.createTranslation(formData);
        } else {
          response = await HerokuService.createTranslation(formData);
        }
        setTranslations([...translations, { _id: response._id || '', title: response.title, date: response.createdAt ? String(response.createdAt) : undefined }]);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving translation:", error);
      setError("Failed to save translation.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDate("");
    setFile(null);
    setEditMode(false);
    setSelectedTranslation(null);
  };

  const handleEditTranslation = (translationId: string) => {
    const translation = translations.find((t) => t._id === translationId);
    if (translation) {
      setTitle(translation.title);
      setDate(translation.date || "");
      setSelectedTranslation(translation);
      setEditMode(true);
    }
  };

  const handleDeleteTranslation = async () => {
    if (selectedTranslation) {
      try {
        if (currentBackend === 'supabase') {
          await SupabaseService.deleteTranslation(selectedTranslation._id);
        } else {
          await HerokuService.deleteTranslation(selectedTranslation._id);
        }
        setTranslations(
          translations.filter((trans) => trans._id !== selectedTranslation._id)
        );
        resetForm();
      } catch (error) {
        console.error("Error deleting translation:", error);
        setError("Failed to delete translation.");
      }
    }
  };

  return (
    <div className="translations-dashboard">
      <BackendSwitcher />
      <h2>{editMode ? "Edit Translation" : "Add New Translation"}</h2>
      
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">Loading translations...</p>}

      <form onSubmit={handleSubmitTranslation}>
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="date"
          name="date"
          placeholder="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          required={!editMode}
        />
        <div className="button-container">
          <button type="submit">
            {editMode ? "Update Translation" : "Add Translation"}
          </button>
          <button
            type="button"
            className="reset-button"
            onClick={() => resetForm()}
          >
            Reset
          </button>
        </div>
      </form>

      <div className="translation-management">
        <h3>Manage Translations</h3>
        <select
          value={selectedTranslation?._id || ""}
          onChange={(e) => handleEditTranslation(e.target.value)}
        >
          <option value="">Select a translation</option>
          {translations.map((translation) => (
            <option key={translation._id} value={translation._id}>
              {translation.title}
            </option>
          ))}
        </select>

        {selectedTranslation && (
          <div className="translation-actions">
            <button onClick={resetForm}>Cancel Edit</button>
            <button onClick={handleDeleteTranslation}>
              Delete Translation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationDashboard;
