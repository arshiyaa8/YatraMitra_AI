const express = require("express");
const ctrl = require("../controllers/festivalController");

const router = express.Router();

router.get("/active", ctrl.getActive);
router.get("/upcoming", ctrl.getUpcoming);

module.exports = router;
