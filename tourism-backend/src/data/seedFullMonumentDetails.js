const mongoose = require("mongoose");
const Monument = require("../models/Monument");

const MONUMENT_DETAILS = {
  "taj-mahal": {
    timings: {
      openTime: "06:00",
      closeTime: "18:30",
      closedOn: ["Friday"],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Sunrise (06:00 - 08:30) or Sunset",
    },
    entryFee: { indian: 50, foreigner: 1100, currency: "INR" },
    history: "Commissioned in 1631 by Mughal Emperor Shah Jahan to house the tomb of his favorite wife, Mumtaz Mahal. Constructed using pure white Makrana marble by over 20,000 artisans under chief architect Ustad Ahmad Lahori, it took over two decades to complete and is regarded as the jewel of Muslim art in India.",
    culturalSignificance: "A UNESCO World Heritage Site and one of the New Seven Wonders of the World, representing the pinnacle of Mughal architectural symmetry and pietra dura gemstone inlay work.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available", "audio_guide_available"],
      wcagNotes: "Wheelchairs and ramps are available at the East and West gates. Electric golf carts transport visitors from parking areas.",
    },
    lawsAndEtiquette: [
      "Book e-tickets in advance online via ASI portal.",
      "Wear complimentary shoe covers or remove footwear before ascending the marble plinth.",
      "Drone photography, tripods, and eating food inside are strictly prohibited.",
      "Closed on Fridays for congregational prayers.",
    ],
    foodNearby: ["Petha (Bansiwala)", "Bedmi Puri & Jalebi", "Mughlai Kebab (Pinch of Spice)", "Agra Chaat"],
  },
  "agra-fort": {
    timings: {
      openTime: "06:00",
      closeTime: "18:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Morning (08:00 - 11:00)",
    },
    entryFee: { indian: 50, foreigner: 650, currency: "INR" },
    history: "A massive red sandstone fortress built primarily by Emperor Akbar starting in 1565, serving as the main seat of the Mughal government until 1638. Shah Jahan added white marble palaces and was later confined here by his son Aurangzeb in Musamman Burj, with a view of the Taj Mahal.",
    culturalSignificance: "UNESCO World Heritage Site showcasing the architectural transition from Akbar's robust red sandstone fortifications to Shah Jahan's ornate marble palaces.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available"],
      wcagNotes: "Ramps are provided through the Amar Singh gate, though some palace courtyards have cobblestone incline paths.",
    },
    lawsAndEtiquette: [
      "Keep to tourist pathways; active Indian Army sections inside the fort are strictly restricted.",
      "Hire certified ASI guides with valid identification badges.",
      "Carry water, especially during sunny afternoons.",
    ],
    foodNearby: ["Agra Petha", "Bedmi Poori", "Dalmoth", "Tandoori Chicken"],
  },
  "fatehpur-sikri": {
    timings: {
      openTime: "06:00",
      closeTime: "18:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February"],
      bestVisitTimeOfDay: "Morning (07:00 - 10:30)",
    },
    entryFee: { indian: 50, foreigner: 610, currency: "INR" },
    history: "Founded in 1571 by Emperor Akbar as the capital of the Mughal Empire after Sufi saint Sheikh Salim Chishti prophesied the birth of his heir, Jahangir. It was abandoned in 1585 due to acute water scarcity.",
    culturalSignificance: "UNESCO World Heritage Site housing the towering 54-meter Buland Darwaza ('Gate of Magnificence'), the white marble Tomb of Salim Chishti, and the innovative Panch Mahal.",
    accessibility: {
      tags: ["step_free_access", "rest_areas_available"],
      wcagNotes: "Electric shuttles connect the lower parking lot to the upper citadel entrance.",
    },
    lawsAndEtiquette: [
      "Remove shoes and cover your head before entering the Dargah of Salim Chishti.",
      "Avoid unofficial touts offering unauthorized parking or guidance.",
    ],
    foodNearby: ["Fatehpur Khurchan", "Kachori & Jalebi", "Rabri"],
  },
  "qutub-minar": {
    timings: {
      openTime: "07:00",
      closeTime: "19:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Late Afternoon (15:30 - 18:00)",
    },
    entryFee: { indian: 40, foreigner: 600, currency: "INR" },
    history: "Initiated by Qutb-ud-din Aibak in 1192 and completed by his successors Iltutmish and Firoz Shah Tughlaq. Rising 72.5 meters, it is the world's tallest brick minaret and commemorates the establishment of the Delhi Sultanate.",
    culturalSignificance: "UNESCO World Heritage complex containing the famous rust-resistant 4th-century Iron Pillar of Chandragupta II and the Quwwat-ul-Islam Mosque.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available", "audio_guide_available"],
      wcagNotes: "Wide paved pathways and ramps throughout the landscaped archaeological park.",
    },
    lawsAndEtiquette: [
      "Climbing the interior tower staircase is closed to the public for safety.",
      "Stay behind protective barriers surrounding the ancient Iron Pillar.",
    ],
    foodNearby: ["Chole Bhature", "Kathi Rolls", "Hauz Khas Social", "Chaat Corner"],
  },
  "red-fort": {
    timings: {
      openTime: "09:30",
      closeTime: "16:30",
      closedOn: ["Monday"],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Morning (09:30 - 12:00)",
    },
    entryFee: { indian: 50, foreigner: 650, currency: "INR" },
    history: "Constructed between 1638 and 1648 when Shah Jahan shifted his capital from Agra to Shahjahanabad (Old Delhi). Served as the imperial residence and ceremonial center of the Mughal Empire for nearly two centuries.",
    culturalSignificance: "UNESCO World Heritage Site where the Prime Minister of India unfurls the National Flag each Independence Day (15th August).",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "audio_guide_available"],
      wcagNotes: "Ramps are installed at Lahori Gate and main museum halls inside the complex.",
    },
    lawsAndEtiquette: [
      "Strict airport-grade security screening at Lahori Gate.",
      "Audio guides available at the entrance kiosk in multiple languages.",
    ],
    foodNearby: ["Paranthe Wali Gali", "Karim's Mutton Korma", "Daulat ki Chaat", "Jalebi Wala (Chandni Chowk)"],
  },
  "humayuns-tomb": {
    timings: {
      openTime: "06:00",
      closeTime: "18:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Early Morning (06:30 - 09:00) or Sunset",
    },
    entryFee: { indian: 40, foreigner: 600, currency: "INR" },
    history: "Commissioned in 1569 by Humayun's chief consort Empress Bega Begum and designed by Persian architect Mirak Mirza Ghiyas. It was the first garden-tomb on the Indian subcontinent and introduced the monumental double-dome architecture.",
    culturalSignificance: "UNESCO World Heritage Site that served as the primary architectural inspiration and design prototype for the Taj Mahal.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available", "audio_guide_available"],
      wcagNotes: "Accessible paved garden walkways and ramps leading to the lower terrace.",
    },
    lawsAndEtiquette: [
      "Stay on marked paved pathways and avoid stepping into preserved garden charbagh channels.",
      "Commercial tripod photography requires special ASI permission.",
    ],
    foodNearby: ["Nizamuddin Galouti Kebabs", "Nalli Nihari", "Khan Market Cafes", "Biryani"],
  },
  "hawa-mahal": {
    timings: {
      openTime: "09:00",
      closeTime: "17:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Morning (09:00 - 11:00)",
    },
    entryFee: { indian: 50, foreigner: 200, currency: "INR" },
    history: "Built in 1799 by Maharaja Sawai Pratap Singh and designed by Lal Chand Ustad. Its unique five-story pyramidal exterior features 953 intricately carved honeycomb jharokha windows allowing royal women to observe street life without being seen.",
    culturalSignificance: "The defining architectural icon of Jaipur ('The Pink City'), constructed with red and pink sandstone mimicking the crown of Lord Krishna.",
    accessibility: {
      tags: ["audio_guide_available", "rest_areas_available"],
      wcagNotes: "Ramps exist between levels inside the palace; top terraces feature narrow spiral ramps.",
    },
    lawsAndEtiquette: [
      "Morning light offers the best photograph angles from the street opposite Wind View Cafe.",
      "Hold handrails when ascending the sloping internal ramp corridors.",
    ],
    foodNearby: ["Pyaaz Kachori (Rawat)", "LMB Ghewar", "Lassi (Lassiwala)", "Dal Baati Churma"],
  },
  "amer-fort": {
    timings: {
      openTime: "08:00",
      closeTime: "17:30",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Morning (08:30 - 11:30) or Evening Light Show (19:00)",
    },
    entryFee: { indian: 100, foreigner: 550, currency: "INR" },
    history: "Principal residence of the Rajput Kachwaha rulers, founded by Raja Man Singh I in 1592 overlooking Maota Lake. Known for its artistic Hindu elements, massive ramparts, and the breathtaking Sheesh Mahal (Mirror Palace).",
    culturalSignificance: "UNESCO World Heritage Hill Fort of Rajasthan, celebrated for fusion architecture of Rajput and Mughal design.",
    accessibility: {
      tags: ["rest_areas_available", "audio_guide_available"],
      wcagNotes: "Jeep shuttle service available from parking up to the main Sun Gate entrance.",
    },
    lawsAndEtiquette: [
      "Avoid touching delicate concave mirror mosaics inside the Sheesh Mahal.",
      "Attend the evening Light and Sound Show in Hindi and English.",
    ],
    foodNearby: ["Laal Maas", "Gatte ki Sabzi", "Ker Sangri", "Kulfi Falooda"],
  },
  "mehrangarh-fort": {
    timings: {
      openTime: "09:00",
      closeTime: "17:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Morning (09:00 - 12:00)",
    },
    entryFee: { indian: 100, foreigner: 600, currency: "INR" },
    history: "Built around 1459 by Rao Jodha, founder of Jodhpur, perched 122 meters on a perpendicular cliff above the blue city. It preserves cannonball scars from battles with Jaipur forces and houses one of India's best-curated royal museums.",
    culturalSignificance: "One of the largest and most formidable forts in India, described by Rudyard Kipling as 'the work of giants'.",
    accessibility: {
      tags: ["wheelchair_accessible", "elevators", "audio_guide_available", "rest_areas_available"],
      wcagNotes: "Elevator access is available from the base courtyard to upper palace museum galleries.",
    },
    lawsAndEtiquette: [
      "Audio guides provided with high-fidelity historical narration in multiple languages.",
      "Watch traditional folk musicians performing at the palace gates.",
    ],
    foodNearby: ["Mirchi Vada", "Mawa Kachori", "Ghevar", "Makhania Lassi"],
  },
  "gateway-of-india": {
    timings: {
      openTime: "00:00",
      closeTime: "23:59",
      closedOn: [],
      bestVisitMonths: ["November", "December", "January", "February"],
      bestVisitTimeOfDay: "Early Morning or Evening (17:00 - 20:00)",
    },
    entryFee: { indian: 0, foreigner: 0, currency: "INR" },
    history: "Erected in 1924 to commemorate the 1911 landing of King George V and Queen Mary in Bombay. Built in the Indo-Saracenic style using yellow basalt, it served as the ceremonial exit point for the last British troops in 1948.",
    culturalSignificance: "The defining waterfront landmark of Mumbai, overlooking the Arabian Sea adjacent to the historic Taj Mahal Palace Hotel.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available"],
      wcagNotes: "Entire waterfront promenade plaza is flat and wheelchair accessible.",
    },
    lawsAndEtiquette: [
      "Open 24 hours with free public access; security baggage scans at entry checkpoints.",
      "Ferries to Elephanta Caves depart directly from the rear jetty.",
    ],
    foodNearby: ["Vada Pav", "Pav Bhaji (Cannon)", "Bun Maska & Irani Chai (Cafe Leopold)", "Bombay Bhel Puri"],
  },
  "ajanta-caves": {
    timings: {
      openTime: "09:00",
      closeTime: "17:00",
      closedOn: ["Monday"],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Morning (09:00 - 12:30)",
    },
    entryFee: { indian: 40, foreigner: 600, currency: "INR" },
    history: "A complex of 30 rock-cut Buddhist cave monuments dating from the 2nd century BCE to about 480 CE, carved into the cliff of a horseshoe-shaped gorge along the Waghur River.",
    culturalSignificance: "UNESCO World Heritage Site containing the finest surviving masterpieces of ancient Indian classical painting, murals, and Buddhist devotional sculpture.",
    accessibility: {
      tags: ["rest_areas_available"],
      wcagNotes: "Eco-friendly AC shuttle buses ferry tourists from T-Point parking to the cave foothill.",
    },
    lawsAndEtiquette: [
      "Flash photography is strictly banned to preserve ancient organic pigments.",
      "Closed on Mondays; carry comfortable walking shoes for cliff stairways.",
    ],
    foodNearby: ["Khandeshi Dal Baati", "Shev Bhaji", "Jowar Bhakri", "Pithla Bhakri"],
  },
  "ellora-caves": {
    timings: {
      openTime: "06:00",
      closeTime: "18:00",
      closedOn: ["Tuesday"],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Morning (07:00 - 11:00)",
    },
    entryFee: { indian: 40, foreigner: 600, currency: "INR" },
    history: "Featuring 34 monasteries and temples carved side-by-side into the Charanandri hills between the 6th and 10th centuries CE, celebrating Hindu, Buddhist, and Jain traditions.",
    culturalSignificance: "Home to Cave 16: the magnificent monolithic Kailasa Temple, carved top-down from a single basalt rock cliff face.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available"],
      wcagNotes: "Central Kailasa Temple courtyard and lower Buddhist caves have flat access paths.",
    },
    lawsAndEtiquette: [
      "Closed on Tuesdays for maintenance.",
      "Electric buggies operate across the 2-kilometer cave perimeter.",
    ],
    foodNearby: ["Naan Qalia (Aurangabad)", "Misal Pav", "Mango Rabri"],
  },
  "mysore-palace": {
    timings: {
      openTime: "10:00",
      closeTime: "17:30",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February"],
      bestVisitTimeOfDay: "Afternoon (14:30 - 17:30) & Sunday Illumination (19:00 - 19:45)",
    },
    entryFee: { indian: 100, foreigner: 300, currency: "INR" },
    history: "The official seat of the Wadiyar dynasty who ruled the Kingdom of Mysore. The current Indo-Saracenic palace was designed by British architect Henry Irwin and completed in 1912 after the old wooden palace burned down.",
    culturalSignificance: "Renowned worldwide for its magnificent Dasara festival celebrations and breathtaking night illumination using 97,000 electric bulbs.",
    accessibility: {
      tags: ["wheelchair_accessible", "braille_signage", "audio_guide_available", "rest_areas_available"],
      wcagNotes: "Free wheelchairs available at the North and South gates; flat corridors on the ground floor.",
    },
    lawsAndEtiquette: [
      "Remove footwear at the free shoe deposit counters before entering the palace interior.",
      "Photography inside the royal residential wing is regulated.",
    ],
    foodNearby: ["Mysore Pak (Guru Sweet Mart)", "Mysore Masala Dosa", "Mylari Dosa", "Filter Coffee"],
  },
  "hampi": {
    timings: {
      openTime: "06:00",
      closeTime: "18:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February"],
      bestVisitTimeOfDay: "Sunrise at Matanga Hill & Sunset at Hemakuta Hill",
    },
    entryFee: { indian: 40, foreigner: 600, currency: "INR" },
    history: "Capital of the prosperous Vijayanagara Empire from 1336 to 1565. At its peak, it was the second-largest medieval-era city in the world before being sacked in the Battle of Talikota.",
    culturalSignificance: "UNESCO World Heritage Site with over 1,600 surviving ruins, famous for the iconic Stone Chariot, musical pillars of Vittala Temple, and active Virupaksha Temple.",
    accessibility: {
      tags: ["rest_areas_available", "step_free_access"],
      wcagNotes: "Battery-operated electric golf carts shuttle visitors from Vittala Temple parking to the chariot.",
    },
    lawsAndEtiquette: [
      "Hire bicycles or authorized battery carts to cover the 25 sq km heritage landscape.",
      "Dress modestly when visiting active sanctums in Virupaksha Temple.",
    ],
    foodNearby: ["Karnataka Thali", "Bisi Bele Bath", "Mangalore Buns", "Filter Kaapi"],
  },
  "golden-temple": {
    timings: {
      openTime: "03:00",
      closeTime: "23:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Early Morning Palki Sahib (04:30) or Evening Illumination (19:00)",
    },
    entryFee: { indian: 0, foreigner: 0, currency: "INR" },
    history: "Founded in 1577 by Guru Ram Das, the fourth Sikh Guru, and completed by Guru Arjan in 1604. Maharaja Ranjit Singh overlaid the upper sanctum with 750 kg of pure gold foil in 1830.",
    culturalSignificance: "The holiest Gurdwara in Sikhism, housing the Guru Granth Sahib and running the world's largest free community kitchen (Langar), serving over 100,000 meals daily.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available"],
      wcagNotes: "Free wheelchairs and dedicated ramps allow full circumambulation of the Amrit Sarovar.",
    },
    lawsAndEtiquette: [
      "Head covering is mandatory for all visitors (free headscarves available at entrances).",
      "Wash feet in the holy water channel and deposit shoes at the complimentary jora ghar.",
      "Tobacco, alcohol, and leather items are strictly forbidden.",
    ],
    foodNearby: ["Guru ka Langar (Free)", "Amritsari Kulcha (Bhai Kulwant Singh)", "Kesar Da Dhaba", "Pinni"],
  },
  "konark-sun-temple": {
    timings: {
      openTime: "06:00",
      closeTime: "20:00",
      closedOn: [],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Sunrise (06:00 - 08:30)",
    },
    entryFee: { indian: 40, foreigner: 600, currency: "INR" },
    history: "Built in 1250 CE by King Narasimhadeva I of the Eastern Ganga Dynasty. Designed as a colossal 24-wheeled chariot of Surya (the Sun God) pulled by seven horses.",
    culturalSignificance: "UNESCO World Heritage Site celebrated as the 'Black Pagoda' for its precision sun-dial sundial wheels and Kalinga architectural genius.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "rest_areas_available"],
      wcagNotes: "Paved pathways around the main Natya Mandap and sundial wheels.",
    },
    lawsAndEtiquette: [
      "Attend the world-famous Konark Dance Festival held every December.",
      "Do not climb on the stone chariot wheels or temple base carvings.",
    ],
    foodNearby: ["Chhena Poda", "Chhena Gaja", "Pakhala Bhata", "Machha Besara"],
  },
  "victoria-memorial": {
    timings: {
      openTime: "10:00",
      closeTime: "18:00",
      closedOn: ["Monday"],
      bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
      bestVisitTimeOfDay: "Afternoon (14:00 - 17:30)",
    },
    entryFee: { indian: 50, foreigner: 500, currency: "INR" },
    history: "Constructed between 1906 and 1921 to commemorate Queen Victoria. Designed by William Emerson using white Makrana marble, blending British, Mughal, and Venetian architectural styles.",
    culturalSignificance: "Kolkata's most celebrated colonial-era museum, housing 25 galleries of royal paintings, manuscripts, and Indian Independence archives.",
    accessibility: {
      tags: ["wheelchair_accessible", "step_free_access", "elevators", "rest_areas_available"],
      wcagNotes: "Full ramp and elevator access into the main royal galleries and 64-acre garden lawns.",
    },
    lawsAndEtiquette: [
      "Closed on Mondays and designated national holidays.",
      "Separate garden-only tickets available for morning walkers.",
    ],
    foodNearby: ["Kolkata Kathi Roll (Kusum)", "Phuchka & Jhalmuri", "Mishti Doi & Rasgulla (K.C. Das)", "Biryani"],
  },
};

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/tourism_assistant");
  console.log("Connected to MongoDB for Full Monument Details update...");

  let updated = 0;
  for (const [slug, data] of Object.entries(MONUMENT_DETAILS)) {
    const res = await Monument.updateOne({ slug }, { $set: data });
    if (res.matchedCount > 0) {
      updated++;
      console.log(`✅ Updated visit details for: ${slug}`);
    }
  }

  // Also provide sensible defaults for any other remaining monuments without timings
  await Monument.updateMany(
    { $or: [{ "timings.openTime": { $exists: false } }, { "timings.openTime": "" }] },
    {
      $set: {
        timings: {
          openTime: "06:00",
          closeTime: "18:00",
          closedOn: [],
          bestVisitMonths: ["October", "November", "December", "January", "February", "March"],
          bestVisitTimeOfDay: "Morning (08:00 - 11:00) or Sunset",
        },
        entryFee: { indian: 40, foreigner: 500, currency: "INR" },
        accessibility: {
          tags: ["step_free_access", "rest_areas_available"],
          wcagNotes: "Paved tourist pathways with seating rest benches available.",
        },
      },
    }
  );

  console.log(`Successfully populated visit details for ${updated} monuments!`);
  await mongoose.connection.close();
  process.exit(0);
})();
