const CryptoJS = require("crypto-js");

const getKey = () => {
  const key = process.env.HEALTH_DATA_ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    throw new Error(
      "HEALTH_DATA_ENCRYPTION_KEY must be set to a strong secret (>=16 chars) in .env before storing health data."
    );
  }
  return key;
};

const encrypt = (plainText) => {
  return CryptoJS.AES.encrypt(plainText, getKey()).toString();
};

const decrypt = (cipherText) => {
  const bytes = CryptoJS.AES.decrypt(cipherText, getKey());
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };
