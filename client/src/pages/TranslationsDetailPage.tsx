import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/TranslationsDetailPage.scss";

const URL = import.meta.env.VITE_ADDRESS;

const TranslationsDetailPage: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("PDF");

  useEffect(() => {
    let blobUrl: string | null = null;

    const fetchPdf = async () => {
      try {
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
        }
      } catch (error) {
        console.error("Error fetching PDF:", error);
      }
    };

    fetchPdf();

    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [id, location.state]);

  return (
      <div className="translations-detail">
        <h2>{pdfTitle}</h2>
        {pdfUrl ? (
            <iframe
                src={pdfUrl}
                width="100%"
                height="800px"
                title="Translation PDF"
            ></iframe>
        ) : (
            <p>Loading PDF...</p>
        )}
      </div>
  );
};

export default TranslationsDetailPage;
