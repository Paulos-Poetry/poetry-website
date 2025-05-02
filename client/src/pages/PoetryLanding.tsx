import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/PoetryLanding.scss";
import { BASE_URL } from "../constants";
const URL = import.meta.env.VITE_ADDRESS;

interface Poem {
  _id: string;
  title: string;
  contentEnglish?: string;
  contentGreek?: string;
  fileUrl?: string; // Optional for PDFs
}

const PoetryLanding: React.FC = () => {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch poems and PDFs from the API
  useEffect(() => {
    const fetchPoemsAndPdfs = async () => {
      try {
        // Fetch poems:
        const poemResponse = await axios.get(`${URL}/poetry`);
        const poems = poemResponse.data;

        // Fetch PDFs:
        const pdfResponse = await axios.get(`${URL}/translations/all`);
        const pdfs = pdfResponse.data;

        // Filter PDFs with "POEM" in the title:
        const poemPdfs = pdfs
          .filter((pdf: any) => pdf.title && pdf.title.startsWith("POEM"))
          .map((pdf: any) => ({
            _id: pdf._id,
            title: pdf.title.replace(/\bPOEM\b\s?/g, ''), // Remove "POEM" from the title
            fileUrl: `${URL}/translations/stream/${pdf._id}`, // Build file URL
          }));

        // Combine poems and filtered PDFs:
        setPoems([...poems, ...poemPdfs]);
      } catch (error) {
        console.error("Error fetching poems or PDFs:", error);
        setError("Failed to fetch poems or PDFs.");
      }
    };

    fetchPoemsAndPdfs();
  }, []);

  return (
    <div className="poetry-landing">
      <h2>Poetry Landing</h2>
      {error && <p className="error-message">{error}</p>}
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
