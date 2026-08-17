require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const { importCuratedSeed } = require("../importers/importMonuments");
const { importFestivals } = require("../importers/importFestivals");

// This script now delegates to the real importers rather than inlining data:
//  - Monuments: src/importers/importMonuments.js -> src/data/monuments-seed.json (30 real, verified sites)
//  - Festivals: src/importers/importFestivals.js -> src/data/festivals-2026.json (real 2026 dates)
// Run them standalone via `npm run import:monuments` / `npm run import:festivals` any time after initial seed.

const run = async () => {
  await connectDB();
  console.log("Seeding database...");

  const monumentResult = await importCuratedSeed();
  console.log(`Monuments: ${monumentResult.upserted}/${monumentResult.total} upserted.`);

  const festivalResult = await importFestivals(2026);
  console.log(`Festivals: ${festivalResult.upserted}/${festivalResult.total} upserted for ${festivalResult.year}.`);

  const adminEmail = "admin@tourismassistant.gov.in";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: "Project Admin",
      email: adminEmail,
      password: "ChangeMe123!",
      role: "admin",
    });
    console.log(`Created admin user: ${adminEmail} / ChangeMe123! (change immediately)`);
  }

  console.log("Seed complete.");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
