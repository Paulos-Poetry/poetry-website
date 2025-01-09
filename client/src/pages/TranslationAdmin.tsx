import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom"; // Import useLocation
import "../styles/TranslationAdmin.scss";
const URL = import.meta.env.VITE_ADDRESS;

interface Translation {
  _id: string;
  title: string;
  contentType: string;
  date?: string; // Add date field to interface
}

const axiosInstance = axios.create({
  baseURL: URL,
});

const TranslationsDashboard: React.FC = () => {
  const location = useLocation(); // Get location to detect state
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedTranslation, setSelectedTranslation] =
    useState<Translation | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect prefilled title on redirection
  useEffect(() => {
    if (location.state && location.state.prefillTitle) {
      setTitle(location.state.prefillTitle);
    }
  }, [location.state]);

  // Fetch existing translations
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await axiosInstance.get("/translations/all");
        setTranslations(response.data);
      } catch (error) {
        console.error("Error fetching translations:", error);
        setError("Failed to fetch translations.");
      } finally {
        setLoading(false);
      }
    };
    fetchTranslations();
  }, []);

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
        await axiosInstance.put(
          `/translations/update/${selectedTranslation._id}`,
          formData
        );
        setTranslations(
          translations.map((trans) =>
            trans._id === selectedTranslation._id
              ? { ...trans, title, date }
              : trans
          )
        );
      } else {
        const response = await axiosInstance.post(
          "/translations/upload",
          formData
        );
        setTranslations([...translations, response.data]);
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
        await axiosInstance.delete(
          `/translations/delete/${selectedTranslation._id}`
        );
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
      <h2>{editMode ? "Edit Translation" : "Add New Translation"}</h2>

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

export default TranslationsDashboard;
