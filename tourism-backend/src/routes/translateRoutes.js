/**
 * translateRoutes.js — Multilingual Speech & Text Processing REST Router
 *
 * Exposes endpoints for language tier queries, text translation, ASR speech-to-text,
 * audio speech synthesis (TTS), character persona voices, and user translation feedback.
 */

const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/translateController");

const router = express.Router();

// GET /api/translate/languages — Lists supported global and Indian language tiers
router.get("/languages", ctrl.listLanguages);

// POST /api/translate/text — Translates text into target language
router.post(
  "/text",
  [body("text").notEmpty(), body("targetLanguage").notEmpty()],
  validate,
  ctrl.translate
);

// POST /api/translate/speech-to-text — Transcribes base64 audio into localized text
router.post("/speech-to-text", [body("audioBase64").notEmpty(), body("language").notEmpty()], validate, ctrl.speechToText);

// POST /api/translate/text-to-speech — Synthesizes natural audio speech from text
router.post("/text-to-speech", [body("text").notEmpty(), body("language").notEmpty()], validate, ctrl.textToSpeech);

// POST /api/translate/character-voice — Expressive persona audio narration (Auth required)
router.post("/character-voice", protect, [body("text").notEmpty()], validate, ctrl.characterVoice);

// POST /api/translate/feedback — Flags inaccurate translations for review (Auth required)
router.post("/feedback", protect, [body("text").notEmpty(), body("language").notEmpty()], validate, ctrl.reportBadTranslation);

module.exports = router;
