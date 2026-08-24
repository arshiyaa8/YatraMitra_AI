/**
 * translateController.js — Multilingual Translation, ASR & Speech Synthesis Controller
 *
 * Integrates Bhashini pipeline services for text translation, speech-to-text,
 * and text-to-speech across 25 supported global and Indian languages.
 */

const bhashini = require("../services/bhashiniService");
const { LANGUAGE_SUPPORT_TIERS } = require("../config/constants");
const { asyncHandler } = require("../utils/apiError");

/**
 * Returns supported language tiers and metadata.
 * GET /api/translate/languages
 */
exports.listLanguages = asyncHandler(async (req, res) => {
  res.json({ success: true, data: LANGUAGE_SUPPORT_TIERS });
});

/**
 * Translates text between source and target languages.
 * POST /api/translate/text
 */
exports.translate = asyncHandler(async (req, res) => {
  const { text, sourceLanguage = "en", targetLanguage } = req.body;
  const result = await bhashini.translateText({ text, sourceLanguage, targetLanguage });
  res.json({ success: true, ...result });
});

/**
 * Converts audio speech input to text.
 * POST /api/translate/speech-to-text
 */
exports.speechToText = asyncHandler(async (req, res) => {
  const { audioBase64, language, audioFormat } = req.body;
  const text = await bhashini.speechToText({ audioBase64, language, audioFormat });
  res.json({ success: true, text });
});

/**
 * Converts text into spoken audio.
 * POST /api/translate/text-to-speech
 */
exports.textToSpeech = asyncHandler(async (req, res) => {
  const { text, language, speaker, gender } = req.body;
  const result = await bhashini.textToSpeech({ text, language, speaker, gender });
  res.json({ success: true, ...result });
});

/**
 * Generates expressive character voice narration for guided audio tours.
 * POST /api/translate/character-voice
 */
exports.characterVoice = asyncHandler(async (req, res) => {
  const { text, voiceName } = req.body;
  const result = await bhashini.characterVoiceTTS({ text, voiceName });
  res.json({ success: true, ...result });
});

/**
 * Collects user feedback on machine translation accuracy.
 * POST /api/translate/feedback
 */
exports.reportBadTranslation = asyncHandler(async (req, res) => {
  const { text, language, context } = req.body;
  console.log("Translation feedback logged:", { text, language, context, reportedBy: req.user?._id });
  res.status(201).json({ success: true, message: "Thank you — feedback flagged for review." });
});
