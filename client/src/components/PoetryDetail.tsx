import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/PoetryDetail.scss';
import { SupabaseService, Poem } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import {
    Language,
    getPreferredLanguage,
    setPreferredLanguage,
    hasValidContent,
} from '../services/languagePref';

const PoetryDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [poem, setPoem] = useState<Poem | null>(null);
    const [newComment, setNewComment] = useState('');  // New comment input
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<Language>(getPreferredLanguage()); // Language toggle
    const [liked, setLiked] = useState(false);

    const { isLoggedIn, isAdmin, profile, session } = useAuth();

    // Selecting a language also saves it as the preference on this device
    const chooseLanguage = (lang: Language) => {
        setLanguage(lang);
        setPreferredLanguage(lang);
    };

    // Fetch the selected poem by ID
    useEffect(() => {
        const fetchPoem = async () => {
            try {
                const response = await SupabaseService.getPoemById(id!);
                setPoem(response);

                // Start from the saved preference (default English) and fall
                // back to the other language when that version doesn't exist.
                const hasEnglish = hasValidContent(response.contentEnglish);
                const hasGreek = hasValidContent(response.contentGreek);
                const preferred = getPreferredLanguage();

                if (preferred === 'english') {
                    setLanguage(hasEnglish || !hasGreek ? 'english' : 'greek');
                } else {
                    setLanguage(hasGreek || !hasEnglish ? 'greek' : 'english');
                }
            } catch (error) {
                console.error('Error fetching poem:', error);
                setError('Failed to fetch poem. Please try again or go back to the poetry listings.');
            }
        };
        if (id) {
            fetchPoem();
        }
    }, [id]);

    // Like the poem (atomic server-side counter)
    const handleLike = async () => {
        if (!poem || liked) return;
        try {
            const newLikes = await SupabaseService.likePoem(id!);
            setPoem({ ...poem, likes: newLikes });
            setLiked(true);
        } catch (error) {
            console.error('Error liking poem:', error);
        }
    };

    // Submit a new comment (author name comes from the logged-in profile)
    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const author = profile?.username || session?.user?.email || 'Anonymous';
            const newCommentData = await SupabaseService.addComment(id!, author, newComment);

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

    // Handle comment deletion (own comment or admin)
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

            {/* Toggle between English and Greek - only show buttons for available languages */}
            <div className="language-toggle">
                {hasValidContent(poem.contentEnglish) && (
                    <button onClick={() => chooseLanguage('english')} className={language === 'english' ? 'active' : ''}>English</button>
                )}
                {hasValidContent(poem.contentGreek) && (
                    <button onClick={() => chooseLanguage('greek')} className={language === 'greek' ? 'active' : ''}>Greek</button>
                )}
            </div>

            {/* Small note when one language version doesn't exist */}
            {!hasValidContent(poem.contentEnglish) && hasValidContent(poem.contentGreek) && (
                <p className="no-translation-note">This poem has no English translation yet.</p>
            )}
            {!hasValidContent(poem.contentGreek) && hasValidContent(poem.contentEnglish) && (
                <p className="no-translation-note">Αυτό το ποίημα δεν έχει ελληνική έκδοση. (No Greek version.)</p>
            )}

            {/* Render poem content based on the selected language */}
            <div
                className="poem-content"
                dangerouslySetInnerHTML={{ __html: language === 'english' ? poem.contentEnglish : poem.contentGreek }}
            />

            {/* Like button */}
            <div className="like-section">
                <button className="like-button" onClick={handleLike} disabled={liked}>
                    ♥ {liked ? 'Liked' : 'Like'}
                </button>
                <span className="like-count">
                    {poem.likes} {poem.likes === 1 ? 'like' : 'likes'}
                </span>
            </div>

            <h3>Comments</h3>
            {poem.comments.length === 0 ? (
                <p>No comments yet.</p>  // Show if there are no comments
            ) : (
                <ul>
                    {poem.comments.map((comment, index) => (
                        <li key={comment._id || index}>
                            <strong>{comment.author}</strong> - {new Date(comment.createdAt).toLocaleString()}:
                            <p>{comment.text}</p>

                            {/* Show delete button for admins or the comment's author */}
                            {comment._id && (isAdmin || (comment.userId && comment.userId === session?.user?.id)) && (
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
                    <p className="commenting-as">
                        Commenting as <strong>{profile?.username || session?.user?.email}</strong>
                    </p>
                    <textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        maxLength={2000}
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
