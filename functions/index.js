const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const https = require("https");

// API Key (in production, use Firebase Secret Manager or environment variables)
// For this demo, we keep it here server-side, so it's never exposed to the client.
const GEMINI_API_KEY = "AIzaSyDw43ikjdi-5KmcDLKWXYcoPcWXW_CfUTQ";
const GEMINI_MODEL = "gemini-2.0-flash";

exports.geminiProxy = onRequest({ cors: true }, (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const payload = JSON.stringify(req.body);

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const geminiReq = https.request(options, (geminiRes) => {
    let data = '';

    geminiRes.on('data', (chunk) => {
      data += chunk;
    });

    geminiRes.on('end', () => {
      res.status(geminiRes.statusCode).send(data);
    });
  });

  geminiReq.on('error', (e) => {
    logger.error("Gemini API Error", e);
    res.status(500).json({ error: "Internal Server Error" });
  });

  geminiReq.write(payload);
  geminiReq.end();
});
