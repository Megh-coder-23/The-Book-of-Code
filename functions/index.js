const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
setGlobalOptions({ maxInstances: 10 });

// -------------------- Register a School --------------------
exports.registerSchool = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(400).send({ error: "POST request expected" });
    }

    const { schoolName, adminEmail, domain, sharedPassword } = req.body;

    if (!schoolName || !adminEmail || !domain || !sharedPassword) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    // Check if school already exists
    const schoolDoc = db.collection("schoolRegistrations").doc(schoolName);
    const docSnapshot = await schoolDoc.get();

    if (docSnapshot.exists) {
      return res.status(400).send({ error: "School already registered" });
    }

    await schoolDoc.set({
      schoolName,
      adminEmail,
      domain,
      sharedPassword,
      timeStamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).send({ message: "School registered successfully" });
  } catch (err) {
    logger.error(err);
    return res.status(500).send({ error: "Internal Server Error" });
  }
});

// -------------------- Create Student Account --------------------
exports.createStudentAccount = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(400).send({ error: "POST request expected" });
    }

    const { studentEmail } = req.body;

    if (!studentEmail) {
      return res.status(400).send({ error: "Student email required" });
    }

    const emailDomain = studentEmail.split("@")[1];

    // Look for school with this domain
    const schoolsSnap = await db
      .collection("schoolRegistrations")
      .where("domain", "==", emailDomain)
      .get();

    if (schoolsSnap.empty) {
      return res.status(400).send({ error: "No school found for this domain" });
    }

    const schoolData = schoolsSnap.docs[0].data();
    const password = schoolData.sharedPassword;

    // Create student user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: studentEmail,
      password: password,
      emailVerified: true,
    });

    return res.status(200).send({
      message: "Student account created successfully",
      uid: userRecord.uid,
      passwordAssigned: password,
    });
  } catch (err) {
    logger.error(err);
    if (err.code === "auth/email-already-exists") {
      return res.status(400).send({ error: "Email already registered" });
    }
    return res.status(500).send({ error: "Internal Server Error" });
  }
});
