const express = require("express");
const router = express.Router();
const aiAssistantController = require("../controllers/aiAssistantController");

router.post("/chat", aiAssistantController.chat);

module.exports = router;
