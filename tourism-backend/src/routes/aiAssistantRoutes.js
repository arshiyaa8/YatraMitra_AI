/**
 * aiAssistantRoutes.js — Conversational AI Assistant REST Router
 *
 * Mounts endpoints for processing multimodal heritage questions and speech queries.
 */

const express = require("express");
const router = express.Router();
const aiAssistantController = require("../controllers/aiAssistantController");

// POST /api/assistant/chat — Processes conversational questions and voice input
router.post("/chat", aiAssistantController.chat);

module.exports = router;
