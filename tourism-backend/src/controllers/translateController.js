const bhashini = require("../services/bhashiniService");
const { LANGUAGE_SUPPORT_TIERS } = require("../config/constants");
const { asyncHandler } = require("../utils/apiError");

exports.listLanguages = asyncHandler(async (req, res) => {
  res.json({ success: true, data: LANGUAGE_SUPPORT_TIERS });
});

exports.translate = asyncHandler(async (req, res) => {
  const { text, sourceLanguage = "en", targetLanguage } = req.body;
  const result = await bhashini.translateText({ text, sourceLanguage, targetLanguage });
  res.json({ success: true, ...result });
});

exports.speechToText = asyncHandler(async (req, res) => {
  const { audioBase64, language, audioFormat } = req.body;
  const text = await bhashini.speechToText({ audioBase64, language, audioFormat });
  res.json({ success: true, text });
});

exports.textToSpeech = asyncHandler(async (req, res) => {
  const { text, language, gender } = req.body;
  const result = await bhashini.textToSpeech({ text, language, gender });
  res.json({ success: true, ...result });
});

// Premium "character voice" narration — explicit opt-in endpoint, not the default TTS path (report §3, problem 5)
exports.characterVoice = asyncHandler(async (req, res) => {
  const { text, voiceName } = req.body;
  const result = await bhashini.characterVoiceTTS({ text, voiceName });
  res.json({ success: true, ...result });
});

// Lets users flag a bad machine translation — feeds the "transparent language-support tiering" trust feature
exports.reportBadTranslation = asyncHandler(async (req, res) => {
  const { text, language, context } = req.body;
  // In production: persist to a TranslationFeedback collection for the data-curator team to review.
  console.log("Translation feedback received:", { text, language, context, reportedBy: req.user?._id });
  res.status(201).json({ success: true, message: "Thanks — this has been flagged for review." });
});
