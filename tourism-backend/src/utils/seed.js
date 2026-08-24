/**
 * seed.js — Unified Database Seeder & Environment Initializer
 *
 * Populates MongoDB with:
 * 1. 31 curated heritage monuments with verified local photography and GPS data.
 * 2. 2026 national and regional cultural festival calendar.
 * 3. Verified Indic translations across Hindi, Tamil, Telugu, Bengali, Marathi, etc.
 * 4. Superadmin default administrative credentials.
 *
 * Usage: npm run seed
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const { importCuratedSeed } = require("../importers/importMonuments");
const { importFestivals } = require("../importers/importFestivals");
const { importTranslations } = require("../data/seedTranslations");

const run = async () => {
  await connectDB();
  console.log("Seeding database...");

  const monumentResult = await importCuratedSeed();
  console.log(`Monuments: ${monumentResult.upserted}/${monumentResult.total} upserted.`);

  const festivalResult = await importFestivals(2026);
  console.log(`Festivals: ${festivalResult.upserted}/${festivalResult.total} upserted for ${festivalResult.year}.`);

  const transResult = await importTranslations();
  console.log(`Translations: ${transResult.updated}/${transResult.total} seeded.`);


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
