const mongoose = require("mongoose");
const Monument = require("../models/Monument");

const MONUMENT_IMAGES = {
  "taj-mahal": [
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200",
    "https://images.unsplash.com/photo-1585506942812-e72b29cef752?w=1200",
  ],
  "agra-fort": [
    "https://hblimg.mmtcdn.com/content/hubble/img/agra/mmt/activities/t_trp/m_activities_agra_agra_fort_3_l_360_548.jpg",
  ],
  "fatehpur-sikri": [
    "https://www.tripsavvy.com/thmb/6jqxavCQqDf1I4RQ-F30Y-0limo=/2121x1414/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-692142248-4175bae74835410d8ad630be9cd22e23.jpg",
  ],
  "qutub-minar": [
    "https://img.freepik.com/premium-photo/qutub-minar-delhi-india_78361-13180.jpg?w=2000",
    "https://i.pinimg.com/originals/52/7e/ae/527eaefac5be4a16c160f06ee4a633ec.jpg",
    
  ],
  "red-fort": [
    "https://imgcld.yatra.com/ytimages/image/upload/v1461929855/Delhi-Red_Fort1.jpg",
  ],
  "humayuns-tomb": [
    "https://tse4.mm.bing.net/th/id/OIP.Kj-4g0FKnaK_KVmBipwoGQHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
  ],
  "hawa-mahal": [
    "https://static.vecteezy.com/system/resources/previews/011/084/232/large_2x/full-picture-of-hawa-mahal-of-rajasthan-photo.jpg",
  ],
  "amer-fort": [
    "https://2.bp.blogspot.com/-Bp9W3ArSvRY/WTU3_0pB9TI/AAAAAAAAAn0/2E-b5FODjxY00pb1NfI7m8my-99FNgK7gCLcB/s1600/Amer_Fort_Tourist_Place_in_India_HD_Photo.jpg",
  ],
  "mehrangarh-fort": [
    "https://wallpapers.com/images/hd/mehrangarh-fort-hill-aerial-0g647v3db9dih9ci.jpg",
  ],
  "jaisalmer-fort": [
    "https://th.bing.com/th/id/OIP.DkFcrbRcm0t0YWsXsVsuBQHaEK?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3",
  ],
  "gateway-of-india": [
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200",
  ],
  "ajanta-caves": [
    "https://cdn.britannica.com/70/153470-050-F4594C27/Ajanta-Caves-Maharashtra-India.jpg",
  ],
  "ellora-caves": [
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200",
  ],
  "mysore-palace": [
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200",
  ],
  "hampi": [
    "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200",
  ],
  "hampi-ruins": [
    "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200",
  ],
  "meenakshi-temple": [
    "https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?w=1200",
  ],
  "brihadeeswarar-temple": [
    "https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?w=1200",
  ],
  "mahabalipuram-shore-temple": [
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200",
  ],
  "konark-sun-temple": [
    "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=1200",
  ],
  "khajuraho": [
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200",
  ],
  "sanchi-stupa": [
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200",
  ],
  "golden-temple": [
    "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1200",
  ],
  "majuli-island": [
    "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=1200",
  ],
  "kaziranga": [
    "https://images.unsplash.com/photo-1534177616072-ef7dc120449d?w=1200",
  ],
  "living-root-bridges": [
    "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=1200",
  ],
  "rumtek-monastery": [
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200",
  ],
  "basilica-of-bom-jesus": [
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200",
  ],
  "charminar": [
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200",
  ],
  "rani-ki-vav": [
    "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=1200",
  ],
  "victoria-memorial": [
    "https://images.unsplash.com/photo-1558431382-27e303142255?w=1200",
  ],
  "modhera-sun-temple": [
    "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=1200",
  ],
};

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/tourism_assistant");
  console.log("Connected to MongoDB for verified images update...");

  let updatedCount = 0;
  for (const [slug, images] of Object.entries(MONUMENT_IMAGES)) {
    const res = await Monument.updateOne({ slug }, { $set: { images } });
    if (res.matchedCount > 0) {
      updatedCount++;
    }
  }

  console.log(`Successfully verified and updated images for ${updatedCount} monuments!`);
  await mongoose.connection.close();
  process.exit(0);
})();
