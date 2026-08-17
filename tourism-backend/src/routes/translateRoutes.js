const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/translateController");

const router = express.Router();

router.get("/languages", ctrl.listLanguages);

router.post(
  "/text",
  [body("text").notEmpty(), body("targetLanguage").notEmpty()],
  validate,
  ctrl.translate
);

router.post("/speech-to-text", [body("audioBase64").notEmpty(), body("language").notEmpty()], validate, ctrl.speechToText);
router.post("/text-to-speech", [body("text").notEmpty(), body("language").notEmpty()], validate, ctrl.textToSpeech);
router.post("/character-voice", protect, [body("text").notEmpty()], validate, ctrl.characterVoice);
router.post("/feedback", protect, [body("text").notEmpty(), body("language").notEmpty()], validate, ctrl.reportBadTranslation);

module.exports = router;
