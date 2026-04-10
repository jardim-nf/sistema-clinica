const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { handleWebhookGet, handleWebhookPost } = require('./whatsappBot');

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Express middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/webhook', handleWebhookGet);
app.post('/webhook', handleWebhookPost);

// Expose Express API as a single Cloud Function:
exports.whatsapp = functions.https.onRequest(app);
