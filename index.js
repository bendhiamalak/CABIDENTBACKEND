
const cors = require('cors');
const express = require("express");
const app = express();
app.use(express.json());
const schedule = require('node-schedule');
const twilio = require('twilio');

// Configuration Firebase
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, Timestamp } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCYTJszIAyZQLDeTdvZC8Oq1J5nJvwka1I",
  authDomain: "cabident-ef1fc.firebaseapp.com",
  projectId: "cabident-ef1fc",
  storageBucket: "cabident-ef1fc.firebasestorage.app",
  messagingSenderId: "598968919761",
  appId: "1:598968919761:web:4d6630665371ad51b887f0",
  measurementId: "G-T9WLDM60X6"
};


const accountSid = 'AC7101c958784fe5e169292b40fe27ccd8';
const authToken = 'd1c5dd93292eb3d12a3b0255ffbeaf95';
const twilioPhoneNumber = '+13613264997';

const twilioClient = twilio(accountSid, authToken);

// Initialiser Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
app.use(cors());
// Fonction pour envoyer un SMS de rappel
async function sendReminderSMS(phoneNumber, patientName, appointmentDate, appointmentTime) {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const message = await twilioClient.messages.create({
      body: `Bonjour ${patientName}, nous vous rappelons votre rendez-vous demain à ${appointmentTime}. Merci de confirmer votre présence.`,
      from: twilioPhoneNumber,
      to: formattedPhone
    });
    console.log(`SMS envoyé à ${phoneNumber}, SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`Erreur lors de l'envoi du SMS à ${phoneNumber}:`, error);
    throw error;
  }
}

function formatPhoneNumber(phoneNumber) {
    // Par exemple pour la Tunisie (à adapter selon ton besoin)
    if (!phoneNumber.startsWith("+")) {
      return "+216" + phoneNumber.replace(/^0/, ""); // supprime 0 si présent
    }
    return phoneNumber;
  }
  

// Fonction pour obtenir les rendez-vous du lendemain
async function getTomorrowAppointments() {
  try {
    // Calculer la date de demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    
    // Convertir en timestamp Firestore
    const tomorrowTimestamp = Timestamp.fromDate(tomorrow);
    const tomorrowEndTimestamp = Timestamp.fromDate(tomorrowEnd);
    
    // Créer la requête
    const rendezVousCollection = collection(db, 'rendezVous');
    const q = query(
      rendezVousCollection, 
      where("date", ">=", tomorrowTimestamp),
      where("date", "<=", tomorrowEndTimestamp)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des rendez-vous:", error);
    throw error;
  }
}

// Fonction principale pour le rappel quotidien des rendez-vous
async function sendDailyReminders() {
  try {
    console.log("Début de l'envoi des rappels quotidiens...");
    const tomorrowAppointments = await getTomorrowAppointments();
    console.log(`${tomorrowAppointments.length} rendez-vous trouvés pour demain.`);
    
    for (const appointment of tomorrowAppointments) {
      if (appointment.patient && appointment.patient.telephone) {
        const appointmentTime = appointment.date.toDate().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const appointmentDate = appointment.date.toDate().toLocaleDateString('fr-FR');
        
        await sendReminderSMS(
          appointment.patient.telephone,
          appointment.patient.nom,
          appointmentDate,
          appointmentTime
        );

        const appointmentRef = doc(db, 'rendezVous', appointment.id);
        await updateDoc(appointmentRef, { rappelEnvoye: true });
      } else {
        console.log(`Rendez-vous ${appointment.id} sans informations de contact valides.`);
      }
    }
    
    console.log("Envoi des rappels terminé.");
  } catch (error) {
    console.error("Erreur lors de l'envoi des rappels quotidiens:", error);
  }
}

// Planifier l'envoi des rappels tous les jours à 8h00
const dailyReminderJob = schedule.scheduleJob('0 8 * * *', sendDailyReminders);
console.log("Planificateur de rappels configuré pour 8h00 tous les jours.");

// Route pour déclencher manuellement l'envoi des rappels (pour les tests)
app.get("/sendReminders", async (req, res) => {
  try {
    await sendDailyReminders();
    res.json({ message: "Rappels envoyés avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'envoi manuel des rappels:", error);
    res.status(500).json({ 
      error: "Erreur lors de l'envoi des rappels", 
      message: error.message 
    });
  }
});

// Votre route de test existante
app.get("/test", async (req, res) => {
  try {
    const rendezVousCollection = collection(db, 'rendezVous');
    const snapshot = await getDocs(rendezVousCollection);
    const rendezVousList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(rendezVousList);
  } catch (error) {
    console.error("Erreur lors de l'accès à Firestore:", error);
    res.status(500).json({ 
      error: "Erreur lors de l'accès à Firestore", 
      message: error.message 
    });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

async function sendReminderForSpecificAppointment(appointmentId) {
    const { doc, getDoc, updateDoc } = require("firebase/firestore");
  
    try {
      const docRef = doc(db, 'rendezVous', appointmentId);
      const docSnap = await getDoc(docRef);
  
      if (!docSnap.exists()) {
        throw new Error("Rendez-vous introuvable");
      }
  
      const appointment = docSnap.data();
  
      if (!appointment.telephone || !appointment.nom || !appointment.date) {
        throw new Error("Données incomplètes pour ce rendez-vous");
      }
  
      const appointmentTime = appointment.date.toDate().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
  
      const appointmentDate = appointment.date.toDate().toLocaleDateString('fr-FR');
  
      await sendReminderSMS(
        appointment.telephone,
        appointment.nom,
        appointmentDate,
        appointmentTime
      );
  
      // Mise à jour rappelEnvoye
      await updateDoc(docRef, { rappelEnvoye: true });
  
      return { success: true, message: "Rappel envoyé avec succès" };
    } catch (error) {
      console.error("Erreur dans sendReminderForSpecificAppointment:", error);
      throw error;
    }
  }
  
  app.post("/sendReminder/:id", async (req, res) => {
    const appointmentId = req.params.id;
  
    try {
      const result = await sendReminderForSpecificAppointment(appointmentId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Erreur lors de l'envoi du rappel spécifique",
        message: error.message
      });
    }
  });
  