import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/PoetryDetailPage.scss';
import { SupabaseService, Poem } from '../services/apiService';

const PoetryDetailPage: React.FC = () => {
    const { id } = useParams();
    const [poem, setPoem] = useState<Poem | null>(null);
    const [language, setLanguage] = useState<'english' | 'greek'>('english');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPoem = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const response = await SupabaseService.getPoemById(id);
                setPoem(response);
            } catch (error) {
                console.error('Error fetching poem from Supabase:', error);
                setError('Failed to fetch poem.');
            } finally {
                setLoading(false);
            }
        };
        fetchPoem();
    }, [id]);

    if (loading) {
        return (
            <div className="poetry-detail">
                <p>Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="poetry-detail">
                <p className="error-message">{error}</p>
            </div>
        );
    }

    return (
        <div className="poetry-detail">
            {poem ? (
                <>
                    <h2>{poem.title}</h2>
                    <button onClick={() => setLanguage('english')}>English</button>
                    <button onClick={() => setLanguage('greek')}>Greek</button>
                    <div 
                        className="poem-content"
                        dangerouslySetInnerHTML={{ 
                            __html: language === 'english' ? poem.contentEnglish : poem.contentGreek 
                        }} 
                    />
                </>
            ) : (
                <p>Poem not found.</p>
            )}
        </div>
    );
};

export default PoetryDetailPage;