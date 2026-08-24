const CryptoJS = require("crypto-js");

const getKey = () => {
  const key =
    process.env.HEALTH_DATA_ENCRYPTION_KEY ||
    process.env.HEALTH_DATA_SECRET ||
    process.env.JWT_SECRET ||
    "yatramitra_default_health_encryption_secret_key_32_chars";
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
