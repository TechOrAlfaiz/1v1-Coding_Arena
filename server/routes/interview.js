const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const interviewController = require('../controllers/interviewController');

// Multipart memory storage for PDF parsing
const multer = require('multer');
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  storage: multer.memoryStorage(),
});

// All interview endpoints require authentication
router.use(authMiddleware);

// POST /api/interviews/parse-pdf - Parse uploaded JD or Resume PDF
router.post('/parse-pdf', upload.single('file'), interviewController.parsePdf);

// POST /api/interviews/live-avatar/start - Start live avatar interview
router.post('/live-avatar/start', interviewController.startLiveAvatarInterview);

// POST /api/interviews/start - Start new standard interview
router.post('/start', interviewController.startInterview);

// GET /api/interviews/history - Get candidate's past interview sessions and reports
router.get('/history', interviewController.getUserInterviews);

// GET /api/interviews/session/:id - Get session state
router.get('/session/:id', interviewController.getSession);

// POST /api/interviews/session/:id/message - Send message to AI interviewer
router.post('/session/:id/message', interviewController.sendMessage);

// POST /api/interviews/session/:id/hint - Request hint
router.post('/session/:id/hint', interviewController.requestHint);

// POST /api/interviews/session/:id/next-question - Advance to next structured question
router.post('/session/:id/next-question', interviewController.nextQuestion);

// PUT /api/interviews/session/:id/code - Update code buffer
router.put('/session/:id/code', interviewController.updateCode);

// PUT /api/interviews/session/:id/diagram - Update whiteboard diagram elements
router.put('/session/:id/diagram', interviewController.updateDiagram);

// POST /api/interviews/session/:id/finish - Conclude interview & generate rubric evaluation report
router.post('/session/:id/finish', interviewController.finishAndEvaluate);

// GET /api/interviews/report/:id - Get evaluation report (by reportId or sessionId)
router.get('/report/:id', interviewController.getReport);

module.exports = router;
