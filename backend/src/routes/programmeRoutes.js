import express from 'express';
import { getProgrammesAdmin, createProgramme, updateProgramme, deleteProgramme } from '../controllers/programmeController.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getProgrammesAdmin);
router.post('/', authorize('admin', 'manager'), createProgramme);
router.put('/:id', authorize('admin', 'manager'), updateProgramme);
router.delete('/:id', authorize('admin'), deleteProgramme);

export default router;
