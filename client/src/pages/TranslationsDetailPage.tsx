import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/TranslationsDetailPage.scss";
import { useBackend } from "../contexts/BackendContext";
import { SupabaseService } from "../services/apiService";
import { toPdfBlobFromPayload } from "../services/pdfUtils";

const URL = import.meta.env.VITE_ADDRESS;

const TranslationsDetailPage: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("PDF");
  const [error, setError] = useState<string | null>(null);
  const { currentBackend } = useBackend();

  useEffect(() => {
    let blobUrl: string | null = null;

    const fetchPdf = async () => {
      if (!id) return;
      
      try {
        setError(null);
        
        if (currentBackend === 'supabase') {
          // Handle Supabase translations
          const translation = await SupabaseService.getTranslationById(id);
          setPdfTitle(translation.title);
          
          if (translation.pdf_data) {
              // If the database already contains a URL just use it
              if (typeof translation.pdf_data === 'string' && (translation.pdf_data.startsWith('http://') || translation.pdf_data.startsWith('https://') || translation.pdf_data.startsWith('/'))) {
                setPdfUrl(translation.pdf_data);
                setError(null);
                return;
              }

              // Otherwise try to turn whatever we have into a Blob the browser can render
            try {
              const blob = toPdfBlobFromPayload(translation.pdf_data, translation.content_type || 'application/pdf');
              if (!blob) {
                setError('Error loading PDF: Unrecognized PDF format');
                return;
              }
              blobUrl = window.URL.createObjectURL(blob);
              setPdfUrl(blobUrl);
            } catch (error) {
              console.error('Error processing PDF data:', error);
              setError('Error loading PDF: Unable to process PDF data');
              return;
            }
          } else if (translation.content) {
            // Show text content in a nice format
            setError(null);
            // Create a simple HTML display for text content
            const textBlob = new Blob([
              `
              <!DOCTYPE html>
              <html>
              <head>
                <title>${translation.title}</title>
                <style>
                  body { 
                    font-family: 'Georgia', serif; 
                    line-height: 1.6; 
                    padding: 40px; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: #f9f9f9;
                  }
                  .content { 
                    background: white; 
                    padding: 40px; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  h1 { 
                    color: #333; 
                    border-bottom: 2px solid #667eea; 
                    padding-bottom: 10px; 
                  }
                  .meta {
                    color: #666;
                    font-style: italic;
                    margin-bottom: 30px;
                  }
                  .text {
                    font-size: 16px;
                    line-height: 1.8;
                    color: #444;
                  }
                </style>
              </head>
              <body>
                <div class="content">
                  <h1>${translation.title}</h1>
                  <div class="meta">Translation Content (Text Format)</div>
                  <div class="text">${translation.content}</div>
                </div>
              </body>
              </html>
              `
            ], { type: "text/html" });
            blobUrl = window.URL.createObjectURL(textBlob);
            setPdfUrl(blobUrl);
          } else {
            setError("No content available for this translation");
          }
        } else {
          // Handle Heroku translations (original logic)
          const response = await axios.get(`${URL}/translations/stream/${id}`, {
            responseType: "blob",
          });

          const response2 = await axios.get(`${URL}/translations/info/${id}`)
          if (response2.status === 200) {
            if (response2.data.title) setPdfTitle(response2.data.title);
          }

          if (response.status === 200) {
            const blob = new Blob([response.data], { type: "application/pdf" });
            blobUrl = window.URL.createObjectURL(blob);
            setPdfUrl(blobUrl);
          } else {
            console.error("Failed to fetch PDF, status:", response.status);
            setError("Failed to fetch PDF");
          }
        }
      } catch (error) {
        console.error(`Error fetching PDF from ${currentBackend}:`, error);
        setError(`Error fetching PDF from ${currentBackend}`);
      }
    };

    fetchPdf();

    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [id, location.state, currentBackend]);

  return (
      <div className="translations-detail">
        <h2>{pdfTitle}</h2>
        {error && (
          <div style={{ 
            color: '#d32f2f', 
            background: '#ffebee', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #ffcdd2'
          }}>
            {error}
          </div>
        )}
        {pdfUrl ? (
            <iframe
                src={pdfUrl}
                width="100%"
                height="800px"
                title="Translation PDF"
            ></iframe>
        ) : !error ? (
            <p>Loading PDF...</p>
        ) : null}
      </div>
  );
};

export default TranslationsDetailPage;
