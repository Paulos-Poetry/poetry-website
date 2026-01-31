import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/PoetryDetail.scss';
import { SupabaseService, Poem } from '../services/apiService';

const PoetryDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [poem, setPoem] = useState<Poem | null>(null);
    const [newComment, setNewComment] = useState('');  // New comment input
    const [username, setUsername] = useState('');  // User's name for comment
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<'english' | 'greek'>('english'); // Language toggle

    // Check if the user is logged in and if the user is an admin
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const isLoggedIn = !!token;
    const isAdmin = localStorage.getItem('isAdmin') === 'true' || sessionStorage.getItem('isAdmin') === 'true';

    // Fetch the selected poem by ID
    useEffect(() => {
        const fetchPoem = async () => {
            try {
                const response = await SupabaseService.getPoemById(id!);
                setPoem(response);
            } catch (error) {
                console.error('Error fetching poem:', error);
                setError('Failed to fetch poem. Please try again or go back to the poetry listings.');
            }
        };
        if (id) {
            fetchPoem();
        }
    }, [id]);

    // Submit a new comment
    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newCommentData = await SupabaseService.addComment(id!, username, newComment);
            
            // Add the new comment to the list of comments
            if (poem) {
                setPoem({ ...poem, comments: [...(poem.comments || []), newCommentData] });
            }
            setNewComment('');  // Clear the comment input
        } catch (error) {
            console.error('Error submitting comment:', error);
            setError('Failed to submit comment.');
        }
    };

    // Handle comment deletion by admin
    const handleDeleteComment = async (commentId: string) => {
        try {
            await SupabaseService.deleteComment(commentId);
            
            // Remove the deleted comment from the state
            if (poem) {
                setPoem({ ...poem, comments: (poem.comments || []).filter(comment => comment._id !== commentId) });
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            setError('Failed to delete comment.');
        }
    };

    if (error) {
        return (
            <div className="error-message">
                <p>{error}</p>
                <button onClick={() => navigate('/poetry')} className="back-button">
                    ← Back to Poetry Listings
                </button>
            </div>
        );
    }

    if (!poem) {
        return <p>Loading poem...</p>;
    }

    return (
        <div className="poetry-detail">
            {/* Title with increased font size */}
            <h1 className="poem-title">{poem.title}</h1>

            {/* Toggle between English and Greek */}
            <button onClick={() => setLanguage('english')} className={language === 'english' ? 'active' : ''}>English</button>
            <button onClick={() => setLanguage('greek')} className={language === 'greek' ? 'active' : ''}>Greek</button>

            {/* Render poem content based on the selected language */}
            <div
                className="poem-content"
                dangerouslySetInnerHTML={{ __html: language === 'english' ? poem.contentEnglish : poem.contentGreek }}
            />

            <h3>Comments</h3>
            {poem.comments.length === 0 ? (
                <p>No comments yet.</p>  // Show if there are no comments
            ) : (
                <ul>
                    {poem.comments.map((comment, index) => (
                        <li key={index}>
                            <strong>{comment.author}</strong> - {new Date(comment.createdAt).toLocaleString()}:
                            <p>{comment.text}</p>

                            {/* Show delete button if the user is an admin */}
                            {isAdmin && comment._id && (
                                <button onClick={() => handleDeleteComment(comment._id!)}>
                                    Delete
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Show comment box only if the user is logged in */}
            {isLoggedIn ? (
                <form onSubmit={handleSubmitComment}>
                    <input
                        type="text"
                        placeholder="Your name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        required
                    />
                    <button type="submit">Add Comment</button>
                </form>
            ) : (
                <p>You must be logged in to comment.</p>  // Message if not logged in
            )}
        </div>
    );
};

export default PoetryDetail;
