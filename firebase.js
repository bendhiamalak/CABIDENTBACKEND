/*const admin = require('firebase-admin');
const path = require('path');

// Option 1: Utiliser le chemin absolu direct
const serviceAccount = require('D:/MPI/MPI/Cabident/back/sms-reminder/secrets/serviceAccountKey.json');

// Option 2 (alternative): Utiliser le chemin relatif avec __dirname
// const serviceAccount = require(path.join(__dirname, './secrets/serviceAccountKey.json'));

// Initialiser avec les informations d'identification explicites
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = db;*/