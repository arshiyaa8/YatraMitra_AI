/**
 * bhashiniService.js — National Language Translation Mission (NLTM) Bhashini Integration
 *
 * Integrates MeitY's ULCA Bhashini pipeline for text translation (NMT), speech recognition (ASR),
 * and audio synthesis (TTS) across 25 scheduled Indian and international languages.
 * Includes local in-memory caching for pipeline configurations.
 */

const axios = require("axios");
const NodeCache = require("node-cache");
const { LANGUAGE_SUPPORT_TIERS } = require("../config/constants");

// Cache pipeline endpoints for 1 hour to minimize discovery round-trips
const cache = new NodeCache({ stdTTL: 60 * 60 });

const ULCA_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";

/**
 * Resolves the operational support tier ("full", "best_effort", "machine_only") for a language code.
 *
 * @param {string} langCode - ISO language code
 * @returns {string} Support tier classification
 */
const getLanguageTier = (langCode) => LANGUAGE_SUPPORT_TIERS[langCode]?.tier || "machine_only";

/**
 * Fetches (and caches) the Bhashini inference pipeline config for a given task.
 * task: "translation" | "asr" | "tts"
 */
async function getPipelineConfig({ task, sourceLanguage, targetLanguage }) {
  const cacheKey = `pipeline:${task}:${sourceLanguage}:${targetLanguage || ""}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!process.env.BHASHINI_USER_ID || !process.env.BHASHINI_ULCA_API_KEY) {
    throw Object.assign(new Error("Bhashini credentials not configured (BHASHINI_USER_ID / BHASHINI_ULCA_API_KEY)"), {
      code: "BHASHINI_NOT_CONFIGURED",
    });
  }

  const taskMap = {
    translation: "translation",
    asr: "asr",
    tts: "tts",
  };

  const payload = {
    pipelineTasks: [
      {
        taskType: taskMap[task],
        config: {
          language: targetLanguage
            ? { sourceLanguage, targetLanguage }
            : { sourceLanguage },
        },
      },
    ],
    pipelineRequestConfig: { pipelineId: process.env.BHASHINI_PIPELINE_ID },
  };

  const { data } = await axios.post(ULCA_CONFIG_URL, payload, {
    headers: {
      userID: process.env.BHASHINI_USER_ID,
      ulcaApiKey: process.env.BHASHINI_ULCA_API_KEY,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  cache.set(cacheKey, data);
  return data;
}

async function callInference(pipelineConfig, inferenceBody) {
  const callbackUrl = pipelineConfig?.pipelineInferenceAPIEndPoint?.callbackUrl;
  const authKey = pipelineConfig?.pipelineInferenceAPIEndPoint?.inferenceApiKey;
  if (!callbackUrl) throw new Error("Bhashini pipeline config missing inference endpoint");

  const headerName = authKey?.name || "Authorization";
  const headerValue = authKey?.value || process.env.BHASHINI_INFERENCE_API_KEY;

  const { data } = await axios.post(callbackUrl, inferenceBody, {
    headers: { [headerName]: headerValue, "Content-Type": "application/json" },
    timeout: 15000,
  });
  return data;
}

async function translateText({ text, sourceLanguage, targetLanguage }) {
  const config = await getPipelineConfig({ task: "translation", sourceLanguage, targetLanguage });
  const serviceId =
    config.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;

  const body = {
    pipelineTasks: [
      {
        taskType: "translation",
        config: { language: { sourceLanguage, targetLanguage }, serviceId },
      },
    ],
    inputData: { input: [{ source: text }] },
  };

  const result = await callInference(config, body);
  const translated = result?.pipelineResponse?.[0]?.output?.[0]?.target || null;

  return {
    translatedText: translated,
    targetLanguageTier: getLanguageTier(targetLanguage), // "full" | "best_effort" — surfaced to UI per report §4.6
  };
}

async function speechToText({ audioBase64, language, audioFormat = "wav" }) {
  const config = await getPipelineConfig({ task: "asr", sourceLanguage: language });
  const serviceId = config.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;

  const body = {
    pipelineTasks: [
      {
        taskType: "asr",
        config: { language: { sourceLanguage: language }, serviceId, audioFormat, samplingRate: 16000 },
      },
    ],
    inputData: { audio: [{ audioContent: audioBase64 }] },
  };

  const result = await callInference(config, body);
  return result?.pipelineResponse?.[0]?.output?.[0]?.source || null;
}

async function textToSpeech({ text, language = "hi", speaker, gender = "female" }) {
  const sarvamKey = process.env.SARVAM_API_KEY || "sk_epzcovi1_ZbxCQcW6mhwuCbpRM598jncl";
  if (sarvamKey) {
    try {
      const cleanText = (text || "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/#/g, "").replace(/`/g, "").slice(0, 500);
      const langMap = {
        hi: "hi-IN",
        ta: "ta-IN",
        te: "te-IN",
        bn: "bn-IN",
        mr: "mr-IN",
        gu: "gu-IN",
        kn: "kn-IN",
        ml: "ml-IN",
        pa: "pa-IN",
        or: "od-IN",
        en: "en-IN",
      };
      const targetLang = langMap[language] || "hi-IN";
      const selectedSpeaker = speaker || (gender === "male" ? "aditya" : "anushka");

      const res = await axios.post(
        "https://api.sarvam.ai/text-to-speech",
        {
          inputs: [cleanText],
          target_language_code: targetLang,
          speaker: selectedSpeaker,
          model: "bulbul:v2",
        },
        {
          headers: {
            "api-subscription-key": sarvamKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (res.data?.audios?.[0]) {
        return {
          audioBase64: res.data.audios[0],
          engine: "sarvam_bulbul_v2",
          audioFormat: "wav",
        };
      }
    } catch (sarvamErr) {
      console.warn("Sarvam TTS error:", sarvamErr.response?.data || sarvamErr.message);
    }
  }

  // Fallback to Bhashini if configured
  if (process.env.BHASHINI_USER_ID && process.env.BHASHINI_ULCA_API_KEY) {
    try {
      const config = await getPipelineConfig({ task: "tts", sourceLanguage: language });
      const serviceId = config.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;

      const body = {
        pipelineTasks: [
          {
            taskType: "tts",
            config: { language: { sourceLanguage: language }, serviceId, gender, samplingRate: 22050 },
          },
        ],
        inputData: { input: [{ source: text }] },
      };

      const result = await callInference(config, body);
      const audioBase64 = result?.pipelineResponse?.[0]?.audio?.[0]?.audioContent || null;
      return { audioBase64, engine: "bhashini" };
    } catch (err) {
      console.warn("Bhashini TTS call failed:", err.message);
    }
  }

  return {
    audioBase64: null,
    engine: "browser_tts_fallback",
  };
}

/**
 * Fallback premium "character voice" TTS via Azure — only used when explicitly requested
 * (report §3, problem 5: reserve paid TTS for signature character voices, not default usage).
 */
async function characterVoiceTTS({ text, voiceName = "en-IN-NeerjaNeural" }) {
  if (!process.env.AZURE_TTS_KEY || !process.env.AZURE_TTS_REGION) {
    throw Object.assign(new Error("Azure TTS not configured; character voices unavailable"), {
      code: "AZURE_TTS_NOT_CONFIGURED",
    });
  }
  const ssml = `<speak version='1.0' xml:lang='en-IN'><voice name='${voiceName}'>${text}</voice></speak>`;
  const { data } = await axios.post(
    `https://${process.env.AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    ssml,
    {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_TTS_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-64kbitrate-mono-mp3",
      },
      responseType: "arraybuffer",
      timeout: 15000,
    }
  );
  return { audioBase64: Buffer.from(data).toString("base64"), engine: "azure_character_voice" };
}

module.exports = {
  translateText,
  speechToText,
  textToSpeech,
  characterVoiceTTS,
  getLanguageTier,
};
