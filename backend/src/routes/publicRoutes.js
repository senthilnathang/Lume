import express from 'express';
import { getHomeData, getAboutData, getProgrammes, getProgrammeBySlug, getActivities, getActivityById, getDocuments, submitContact } from '../controllers/publicController.js';

const router = express.Router();

router.get('/home', getHomeData);
router.get('/about', getAboutData);
router.get('/programmes', getProgrammes);
router.get('/programmes/:slug', getProgrammeBySlug);
router.get('/activities', getActivities);
router.get('/activities/:id', getActivityById);
router.get('/documents', getDocuments);
router.post('/contact', submitContact);

export default router;
