import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/TranslationsDetailPage.scss";
import { SupabaseService } from "../services/apiService";
import { toPdfBlobFromPayload } from "../services/pdfUtils";

const TranslationsDetailPage: React.FC = () => {
  const { id } = useParams();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("PDF");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let blobUrl: string | null = null;

    const fetchPdf = async () => {
      if (!id) return;

      try {
        setError(null);

        const translation = await SupabaseService.getTranslationById(id);
        setPdfTitle(translation.title.replace(/^POEM/, "").trim());

        // Preferred: PDF stored in Supabase Storage — just use the URL
        if (translation.pdfUrl) {
          setPdfUrl(translation.pdfUrl);
          return;
        }

        // Legacy: PDF bytes stored in the database
        if (translation.pdf_data) {
          try {
            const blob = toPdfBlobFromPayload(
              translation.pdf_data,
              translation.contentType || "application/pdf"
            );
            if (!blob) {
              setError("Error loading PDF: Unrecognized PDF format");
              return;
            }
            blobUrl = window.URL.createObjectURL(blob);
            setPdfUrl(blobUrl);
          } catch (error) {
            console.error("Error processing PDF data:", error);
            setError("Error loading PDF: Unable to process PDF data");
          }
          return;
        }

        // Text-only translations
        if (translation.content) {
          const textBlob = new Blob(
            [
              `<!DOCTYPE html>
              <html>
              <head>
                <title>${translation.title}</title>
                <style>
                  body { font-family: 'Georgia', serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; background: #f9f9f9; }
                  .content { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  h1 { color: #00203f; border-bottom: 2px solid #adefd1; padding-bottom: 10px; }
                  .text { font-size: 16px; line-height: 1.8; color: #444; white-space: pre-wrap; }
                </style>
              </head>
              <body>
                <div class="content">
                  <h1>${translation.title}</h1>
                  <div class="text">${translation.content}</div>
                </div>
              </body>
              </html>`,
            ],
            { type: "text/html" }
          );
          blobUrl = window.URL.createObjectURL(textBlob);
          setPdfUrl(blobUrl);
          return;
        }

        setError("No content available for this translation");
      } catch (error) {
        console.error("Error fetching PDF from Supabase:", error);
        setError("Error fetching PDF");
      }
    };

    fetchPdf();

    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [id]);

  return (
    <div className="translations-detail">
      <h2>{pdfTitle}</h2>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {pdfUrl ? (
        <>
          <div className="pdf-actions">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="open-pdf-link"
            >
              Open in new tab ↗
            </a>
          </div>
          <iframe
            src={pdfUrl}
            width="100%"
            height="800px"
            title="Translation PDF"
          ></iframe>
        </>
      ) : !error ? (
        <p>Loading PDF...</p>
      ) : null}
    </div>
  );
};

export default TranslationsDetailPage;
