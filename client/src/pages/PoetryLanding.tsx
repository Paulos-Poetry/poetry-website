import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/PoetryLanding.scss";
import { BASE_URL } from "../constants";
import BackendSwitcher from "../components/BackendSwitcher";
import { useBackend } from "../contexts/BackendContext";
import { SupabaseService } from "../services/apiService";
import { toPdfBlobFromPayload } from "../services/pdfUtils";

const URL = import.meta.env.VITE_ADDRESS;

interface Poem {
  _id: string;
  title: string;
  contentEnglish?: string;
  contentGreek?: string;
  fileUrl?: string; // Optional for PDFs
  createdAt?: Date | string; // Allow both types
}

const PoetryLanding: React.FC = () => {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentBackend } = useBackend();

  const createdUrlsRef = useRef<string[]>([]);

  // Fetch poems and PDFs from the API
  const fetchPoemsAndPdfs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (currentBackend === 'supabase') {
        // Fetch from Supabase
        const supabasePoems = await SupabaseService.getAllPoems();
        const supabaseTranslations = await SupabaseService.getAllTranslations();
        
        // Transform poems
        const transformedPoems = supabasePoems.map(poem => ({
          _id: poem._id || '',
          title: poem.title,
          contentEnglish: poem.contentEnglish,
          contentGreek: poem.contentGreek
        }));

        // Filter PDF translations with "POEM" in the title
        const poemPdfs = supabaseTranslations
          .filter(pdf => pdf.title && pdf.title.startsWith("POEM"))
          .map(pdf => {
            const id = pdf._id || '';
            const title = pdf.title.replace("POEM", "");

            // Narrow types for safety
            const payload = (pdf as unknown) as { pdf_data?: unknown; content_type?: string };

            // Try to convert the stored payload to a Blob and create an object URL
            let fileUrl: string | undefined;
            try {
              const blob = toPdfBlobFromPayload(payload.pdf_data, payload.content_type || 'application/pdf');
              if (blob) {
                const url = window.URL.createObjectURL(blob);
                // Track created URLs for cleanup
                createdUrlsRef.current.push(url);
                fileUrl = url;
              }
            } catch (e) {
              console.warn('Failed to convert pdf payload to blob for', id, e);
            }

            // Fallback: only use data URI if payload.pdf_data is likely base64
            if (!fileUrl && typeof payload.pdf_data === 'string') {
              const s = payload.pdf_data.trim();
              const normalized = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
              const isBase64 = /^[A-Za-z0-9+/=]+$/.test(normalized) && (normalized.length % 4 === 0 || normalized.endsWith('='));
              if (isBase64) {
                fileUrl = `data:application/pdf;base64,${normalized}`;
              } else {
                // Not base64: avoid creating malformed data URIs (hex-escaped payloads should have been handled earlier)
                fileUrl = undefined;
              }
            }

            return { _id: id, title, fileUrl } as Poem;
          });

        setPoems([...transformedPoems, ...poemPdfs]);
      } else {
        // Original Heroku logic
        const poemResponse = await axios.get(`${URL}/poetry`);
        const poems = poemResponse.data;

        const pdfResponse = await axios.get(`${URL}/translations/all`);
        const pdfs = pdfResponse.data;

        // Filter PDFs with "POEM" in the title:
        const poemPdfs = pdfs
          .filter((pdf: { title?: string }) => pdf.title && pdf.title.startsWith("POEM"))
          .map((pdf: { _id: string; title: string }) => ({
            _id: pdf._id,
            title: pdf.title.replace(/\bPOEM\b\s?/g, ''), // Remove "POEM" from the title
            fileUrl: `${URL}/translations/stream/${pdf._id}`, // Build file URL
          }));

        // Combine poems and filtered PDFs:
        setPoems([...poems, ...poemPdfs]);
      }
      
      console.log(`Fetched poems from ${currentBackend}`);
    } catch (error) {
      console.error(`Error fetching poems from ${currentBackend}:`, error);
      setError(`Failed to fetch poems from ${currentBackend}.`);
    } finally {
      setLoading(false);
    }
  }, [currentBackend]);

  useEffect(() => {
    fetchPoemsAndPdfs();
  }, [fetchPoemsAndPdfs]);

  // Cleanup any object URLs we created
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach(url => {
        try { window.URL.revokeObjectURL(url); } catch { /* ignore */ }
      });
      createdUrlsRef.current = [];
    };
  }, []);

  return (
    <div className="poetry-landing">
      <BackendSwitcher />
      
      <h2>Poetry Landing</h2>
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">Loading poems...</p>}
      
      <ul className="poetry-list">
        {poems.map((poem) => (
          <li key={poem._id} className="poetry-card">
            {poem.fileUrl ? (
              // For PDFs
              <a
                href={poem.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="poetry-card-link"
              >
                <h1 className="poem-title">{poem.title}</h1>
                <p className="read-more">View PDF</p>
              </a>
            ) : (
              // For regular poems
              <Link
                to={`${BASE_URL}/poetry/${poem._id}`}
                className="poetry-card-link"
              >
                <h1 className="poem-title">{poem.title}</h1>
                <div
                  className="poem-snippet"
                  dangerouslySetInnerHTML={{
                    __html:
                      poem.contentEnglish?.trim() === "This work has no translation yet..."
                        ? poem.contentGreek?.slice(0, 60) || "<i>(No content available)</i>"
                        : poem.contentEnglish?.slice(0, 200) || "<i>(No content available)</i>",
                  }}
                />

                <p className="read-more">Read More</p>
              </Link>

            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PoetryLanding;
