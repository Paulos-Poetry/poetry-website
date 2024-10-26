// routes/translationRoutes.ts
import express from 'express';
import multer from 'multer';
import {
    uploadPDF,
    streamPDF,
    getAllTranslations,
    deleteTranslation,
    getPDFInfo, updatePDF
} from '../controllers/TranslationController';

const router = express.Router();
const upload = multer(); // Set multer to handle file upload

router.post('/translations/upload', upload.single('pdf'), uploadPDF);
router.put('/translations/update/:id', upload.single('pdf'), updatePDF);
router.get('/translations/stream/:id', streamPDF);
router.get('/translations/all', getAllTranslations);
router.get('/translations/info/:id', getPDFInfo);
router.delete('/translations/delete/:id', deleteTranslation);

export default router;
