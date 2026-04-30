const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const { handleWebhookGet, handleWebhookPost } = require('./whatsappBot');

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Express middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

app.get('/webhook*', handleWebhookGet);
app.post('/webhook*', handleWebhookPost);

// Expose Express API as a single Cloud Function (Gen 2):
// minInstances=1 evita cold start (resposta quase instantânea)
exports.whatsapp = onRequest({
    timeoutSeconds: 120,
    memory: '256MiB',
    minInstances: 1,
}, app);
