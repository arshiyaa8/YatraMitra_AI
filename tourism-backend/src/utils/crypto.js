/**
 * crypto.js — AES-256 Symmetric Field-Level Encryption Utility
 *
 * Implements DPDP Act (2023) compliant encryption-at-rest for sensitive user data
 * (such as mobility assistance needs, allergen profiles, and medical health disclosures).
 */

const CryptoJS = require("crypto-js");

/**
 * Retrieves the cryptographic secret key from environment configuration.
 * Falls back to JWT_SECRET or secure default if specific encryption key is unset.
 *
 * @returns {string} Encryption key
 */
const getKey = () => {
  const key =
    process.env.HEALTH_DATA_ENCRYPTION_KEY ||
    process.env.HEALTH_DATA_SECRET ||
    process.env.JWT_SECRET ||
    "yatramitra_default_health_encryption_secret_key_32_chars";
  return key;
};

/**
 * Encrypts plaintext string using AES-256 encryption.
 *
 * @param {string} plainText - Data to encrypt
 * @returns {string} Base64 ciphertext string
 */
const encrypt = (plainText) => {
  return CryptoJS.AES.encrypt(plainText, getKey()).toString();
};

/**
 * Decrypts AES-256 ciphertext back to UTF-8 plaintext.
 *
 * @param {string} cipherText - Base64 ciphertext
 * @returns {string} Decrypted plaintext string
 */
const decrypt = (cipherText) => {
  const bytes = CryptoJS.AES.decrypt(cipherText, getKey());
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };
