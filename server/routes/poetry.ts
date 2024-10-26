import express from 'express';
import {
    getPoems,
    getPoemById,
    createPoem,
    deletePoem,
    addComment,
    deleteComment,
    updatePoem
} from '../controllers/PoetryController';

const router = express.Router();

// Corrected route definitions
router.get('/poetry', getPoems);
router.get('/poetry/:id', getPoemById);  // Fixed route
router.post('/poetry', createPoem);
router.delete('/poetry/:id', deletePoem);  // Fixed route
// Route to add translationRoutes comment to a poem
router.post('/poetry/:id/comments', addComment);
router.delete('/poetry/:id/comments/:commentId', deleteComment);
// Route to update an existing poem
router.put('/poetry/:id', updatePoem);

export default router;
