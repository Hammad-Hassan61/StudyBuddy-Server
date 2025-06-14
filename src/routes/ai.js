const express = require('express');
const { uploadPdf, generateStudyPlan, generateFlashcards, generateQA, generateRoadmap, generateSlides, createProject, getProjectById, updateStudyPlanItemStatus, getStudyPlanByProjectId, getFlashcardsByProjectId, getQAByProjectId, getRoadmapByProjectId, getSlidesByProjectId, updateProject, getAllProjects, deleteProject, updateProjectProgress, generateSummary , getSummary } = require('../controllers/aiController');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads'); // Corrected path joining
    fs.mkdirSync(uploadDir, { recursive: true }); // Create directory if it doesn't exist
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Protect all AI routes with JWT authentication
router.use(passport.authenticate('jwt', { session: false }));

// @route   POST /api/ai/projects
// @desc    Create a new project
router.post('/projects', createProject);

// @route   GET /api/ai/projects
// @desc    Get all projects for the authenticated user
router.get('/projects', getAllProjects);

// @route   GET /api/ai/projects/:projectId
// @desc    Get a single project by ID
router.get('/projects/:projectId', getProjectById);

// @route   PUT /api/ai/projects/:projectId
// @desc    Update a project
router.put('/projects/:projectId', updateProject);

// @route   GET /api/ai/projects/:projectId/study-plan
// @desc    Get Study Plan for a project
router.get('/projects/:projectId/study-plan', getStudyPlanByProjectId);

// @route   GET /api/ai/projects/:projectId/flashcards
// @desc    Get Flashcards for a project
router.get('/projects/:projectId/flashcards', getFlashcardsByProjectId);

// @route   GET /api/ai/projects/:projectId/qa
// @desc    Get Q&A for a project
router.get('/projects/:projectId/qa', getQAByProjectId);

// @route   GET /api/ai/projects/:projectId/roadmap
// @desc    Get Roadmap for a project
router.get('/projects/:projectId/roadmap', getRoadmapByProjectId);

// @route   GET /api/ai/projects/:projectId/slides
// @desc    Get Slides for a project
router.get('/projects/:projectId/slides', getSlidesByProjectId);

// @route   POST /api/ai/upload/:projectId
// @desc    Upload PDF for a project
router.post('/upload/:projectId', upload.single('pdfFile'), uploadPdf);

// @route   POST /api/ai/generate/study-plan
// @desc    Generate Study Plan for a project
router.post('/generate/study-plan', generateStudyPlan);

// @route   POST /api/ai/generate/flashcards
// @desc    Generate Flashcards for a project
router.post('/generate/flashcards', generateFlashcards);

// @route   POST /api/ai/generate/qa
// @desc    Generate Q&A for a project
router.post('/generate/qa', generateQA);

// @route   POST /api/ai/generate/roadmap
// @desc    Generate Roadmap for a project
router.post('/generate/roadmap', generateRoadmap);

// @route   POST /api/ai/generate/slides
// @desc    Generate Slides for a project
router.post('/generate/slides', generateSlides);

// @route   POST /api/ai/generate/summary
// @desc    Generate Summary for a project
router.post('/generate/summary', generateSummary);

// @route   GET /api/ai/summary/:projectId
// @desc    Get Summary for a project
router.get('/summary/:projectId', getSummary);

// @route   PUT /api/ai/study-plans/:studyPlanId/items/:itemIndex/status
// @desc    Update status of a study plan item
router.put('/study-plans/:studyPlanId/items/:itemIndex/status', updateStudyPlanItemStatus);

// @route   DELETE /api/ai/projects/:projectId
// @desc    Delete a project
router.delete('/projects/:projectId', deleteProject);

// @route   PUT /api/ai/projects/:projectId/progress
// @desc    Update project progress
router.put('/projects/:projectId/progress', updateProjectProgress);

module.exports = router; 