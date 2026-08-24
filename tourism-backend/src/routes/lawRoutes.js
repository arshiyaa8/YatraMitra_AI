const express = require("express");
const ctrl = require("../controllers/lawController");

const router = express.Router();

router.get("/", ctrl.getLaws);

module.exports = router;
