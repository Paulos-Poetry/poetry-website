import React, { useEffect, useState, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../styles/AdminDashboard.scss";
import { SupabaseService } from "../services/apiService";

interface Poem {
  _id: string;
  title: string;
  contentEnglish: string;
  contentGreek: string;
}

const PoemDashboard: React.FC = () => {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [newPoem, setNewPoem] = useState({
    title: "",
    contentEnglish: "",
    contentGreek: "",
  });
  const [editMode, setEditMode] = useState<boolean>(false);
  const [quillKey, setQuillKey] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [poemPdfs, setPoemPdfs] = useState<Poem[]>([]);

  const fetchPoemPdfs = useCallback(async () => {
    try {
      const translations = await SupabaseService.getAllTranslations();
      const filtered = translations
        .filter((item) => item.title && item.title.startsWith("POEM"))
        .map((item) => ({
          _id: item._id || '',
          title: item.title,
          contentEnglish: "",
          contentGreek: "",
        }));
      setPoemPdfs(filtered);
    } catch (err) {
      console.error("Error fetching poem PDFs:", err);
    }
  }, []);

  const fetchPoems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const poemData = await SupabaseService.getAllPoems();
      setPoems(poemData.map(p => ({
        _id: p._id || '',
        title: p.title,
        contentEnglish: p.contentEnglish,
        contentGreek: p.contentGreek
      })));
    } catch (error) {
      console.error('Error fetching poems from Supabase:', error);
      setError('Failed to fetch poems.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoemPdfs();
  }, [fetchPoemPdfs]);

  useEffect(() => {
    fetchPoems();
  }, [fetchPoems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPoem({ ...newPoem, [e.target.name]: e.target.value });
  };

  const handleContentEnglishChange = (content: string) => {
    setNewPoem({ ...newPoem, contentEnglish: content });
  };

  const handleContentGreekChange = (content: string) => {
    setNewPoem({ ...newPoem, contentGreek: content });
  };

  const handleSubmitPoem = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedPoem = {
      ...newPoem,
      contentEnglish:
        newPoem.contentEnglish.trim() === ""
          ? "This work has no translation yet..."
          : newPoem.contentEnglish,
      contentGreek:
        newPoem.contentGreek.trim() === ""
          ? "This work has no translation yet..."
          : newPoem.contentGreek,
    };

    if (editMode && selectedPoem) {
      try {
        const response = await SupabaseService.updatePoem(selectedPoem._id, updatedPoem);
        setPoems(
          poems.map((poem) =>
            poem._id === selectedPoem._id ? { ...response, _id: response._id || selectedPoem._id } : poem
          )
        );
        resetForm();
      } catch (error) {
        console.error("Error updating poem:", error);
        setError("Failed to update poem.");
      }
    } else {
      try {
        const response = await SupabaseService.createPoem(updatedPoem);
        setPoems([...poems, { ...response, _id: response._id || '' }]);
        resetForm();
      } catch (error) {
        console.error("Error adding poem:", error);
        setError("Failed to add poem.");
      }
    }
  };

  const resetForm = () => {
    setNewPoem({ title: "", contentEnglish: "", contentGreek: "" });
    setEditMode(false);
    setSelectedPoem(null);
    setQuillKey((prevKey) => prevKey + 1);
    setFile(null);
  };

  const handleEditPoem = (poemId: string) => {
    const allPoems = [...poems, ...poemPdfs];
    const poem = allPoems.find((p) => p._id === poemId);
    if (!poem) return;
  
    // If it's a PDF poem (starts with "POEM"), show a prompt instead of enabling edit
    if (poem.title.startsWith("POEM")) {
      setSelectedPoem(poem); // still mark as selected so it shows in dropdown
      const confirmDelete = window.confirm(
        `"${poem.title}" is a PDF poem. You cannot edit it, but you can delete it.\n\nDo you want to delete it?`
      );
  
      if (confirmDelete) {
        handleDeletePoem();
      } else {
        resetForm();
      }
  
      return;
    }
  
    // Otherwise, it's a regular editable poem
    setNewPoem({
      title: poem.title,
      contentEnglish: poem.contentEnglish || "This work has no translation yet...",
      contentGreek: poem.contentGreek || "This work has no translation yet...",
    });
    setSelectedPoem(poem);
    setEditMode(true);
    setQuillKey((prevKey) => prevKey + 1);
  };

  const handleDeletePoem = async () => {
    if (!selectedPoem) return;

    const confirm = window.confirm(
      `Are you sure you want to delete "${selectedPoem.title}"? This cannot be undone.`
    );
    if (!confirm) return;

    try {
      if (selectedPoem.title.startsWith("POEM")) {
        // Delete from translations collection
        await SupabaseService.deleteTranslation(selectedPoem._id);
        setPoemPdfs((prev) =>
          prev.filter((poem) => poem._id !== selectedPoem._id)
        );
      } else {
        // Delete from poetry collection
        await SupabaseService.deletePoem(selectedPoem._id);
        setPoems((prev) =>
          prev.filter((poem) => poem._id !== selectedPoem._id)
        );
      }

      resetForm();
    } catch (error) {
      console.error("Error deleting poem:", error);
      setError("Failed to delete poem.");
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmitPdfPoem = async () => {
    if (!file || newPoem.title.trim() === "") return alert("Title and PDF required");

    const formData = new FormData();
    formData.append("title", `POEM${newPoem.title}`);
    formData.append("date", new Date().toISOString());
    formData.append("pdf", file);

    try {
      await SupabaseService.createTranslation(formData);
      alert("PDF poem uploaded successfully");
      resetForm();
      // Refresh the list
      fetchPoemPdfs();
    } catch (error) {
      console.error("Error uploading PDF poem:", error);
      setError("Failed to upload PDF poem.");
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>{editMode ? "Edit Poem" : "Add New Poem"}</h2>
      
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">Loading poems...</p>}

      <form onSubmit={handleSubmitPoem}>
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={newPoem.title}
          onChange={handleInputChange}
          required
        />
        <h3>Poem in English</h3>
        <ReactQuill
          key={quillKey + "-en"}
          theme="snow"
          value={newPoem.contentEnglish}
          onChange={handleContentEnglishChange}
        />
        <h3>Poem in Greek</h3>
        <ReactQuill
          key={quillKey + "-gr"}
          theme="snow"
          value={newPoem.contentGreek}
          onChange={handleContentGreekChange}
        />
        <div className="button-container">
          <button type="submit">{editMode ? "Update Poem" : "Add Poem"}</button>
          <button
            type="button"
            className="reset-button"
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to reset the poem? This action will clear all fields."
                )
              ) {
                resetForm();
              }
            }}
          >
            Reset Poem
          </button>
        </div>
      </form>

      <div className="centered-button">
        <h3>Upload Poem as PDF</h3>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <button onClick={handleSubmitPdfPoem}>Add PDF Poem</button>
      </div>

      <div className="poem-management">
        <h3>Manage Poems</h3>
        <select
          value={selectedPoem?._id || ""}
          onChange={(e) => handleEditPoem(e.target.value)}
        >
          <option value="">Select a poem</option>
          {[...poems, ...poemPdfs].map((poem) => (
            <option key={poem._id} value={poem._id}>
              {poem.title}
            </option>
          ))}
        </select>

        {selectedPoem && (
          <div className="poem-actions">
            <button onClick={resetForm}>Cancel Edit</button>
            <button onClick={handleDeletePoem}>Delete Poem</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoemDashboard;
