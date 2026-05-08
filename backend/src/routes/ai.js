// src/routes/ai.js
// Step 5 + Step 8: AI route handlers
//
// Step 5:
//   GET  /api/ai/match/:projectId   → ranked candidates + optional Gemini explanation
//
// Step 8:
//   POST /api/ai/roadmap            → AI-generated project roadmap
//   POST /api/ai/debug              → AI debugging assistant

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { rankCandidates, getAISummary } = require('../ai/matchmaking');
const { generateRoadmap, debugHelp } = require('../ai/advisor');

const router = express.Router();

// All AI routes require authentication
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/ai/match/:projectId
// Step 5: Returns SQL-ranked candidates for a project.
// If Gemini is configured, also returns a natural-language explanation.
// ─────────────────────────────────────────────
router.get('/match/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'projectId must be a number' });
    }

    const { project, candidates } = await rankCandidates(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fire Gemini summary in parallel with response prep (non-blocking)
    const aiSummary = await getAISummary(project, candidates);

    return res.status(200).json({
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
      },
      candidates,
      ai_summary: aiSummary,
      ai_enabled: aiSummary !== null,
      total_candidates: candidates.length,
    });
  } catch (err) {
    console.error('GET /ai/match/:projectId error:', err.message);
    return res.status(500).json({ error: 'Matchmaking failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/roadmap
// Step 8: Generates a structured project roadmap.
// Body: { title, description, skills?, teamSize?, duration? }
// ─────────────────────────────────────────────
router.post('/roadmap', async (req, res) => {
  try {
    const { title, description, skills, teamSize, duration } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }

    const result = await generateRoadmap({
      title: title.trim(),
      description: description.trim(),
      skills: Array.isArray(skills) ? skills : [],
      teamSize: teamSize || 3,
      duration: duration || '3 months',
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('POST /ai/roadmap error:', err.message);
    return res.status(500).json({ error: 'Roadmap generation failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/ai/debug
// Step 8: Technical debugging assistant.
// Body: { problem, code?, language?, error? }
// ─────────────────────────────────────────────
router.post('/debug', async (req, res) => {
  try {
    const { problem, code, language, error } = req.body;

    if (!problem || !problem.trim()) {
      return res.status(400).json({ error: 'problem description is required' });
    }

    const result = await debugHelp({
      problem: problem.trim(),
      code: code || '',
      language: language || 'JavaScript',
      error: error || '',
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('POST /ai/debug error:', err.message);
    return res.status(500).json({ error: 'Debug assistant failed: ' + err.message });
  }
});

module.exports = router;
