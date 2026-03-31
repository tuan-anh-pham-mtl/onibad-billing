/**
 * FormHandler.js — Form submission trigger
 * 
 * V2.0 — Creates inscription rows (Layer 1) instead of billing rows directly.
 * 
 * Flow:
 * 1. Extract form data from the submission
 * 2. Find or create the player in the roster (dedup by email)
 * 3. Match selected programs to pricing
 * 4. Create N inscription rows (one per program) in the Inscriptions sheet
 * 5. Admin reviews inscriptions → generates invoice later
 * 
 * NOTE: Cotisation is NOT added at this stage.
 * It is determined at invoice generation time (BillingTracker.js)
 * based on whether the player has already been billed for the
 * current cotisation year.
 * 
 * TRIGGER SETUP:
 * In Apps Script editor → Triggers → Add trigger:
 *   - Function: onFormSubmit
 *   - Event source: From spreadsheet
 *   - Event type: On form submit
 */

// ============================================================
// FORM FIELD COLUMN INDICES
// (in the "Form Responses" sheet — order matches Google Form)
// ============================================================

/**
 * Column indices for the Form Responses sheet.
 * Google Forms auto-creates columns in this order:
 *   A: Timestamp
 *   B: Email (collected by Google Forms "Collect email" setting)
 *   C-onwards: Form questions in order
 * 
 * IMPORTANT: If the form questions are reordered, these indices
 * must be updated to match.
 */
var FORM_COLS = {
  TIMESTAMP:          1,  // A — auto by Google Forms
  EMAIL:              2,  // B — "Collect email addresses" feature
  PRENOM:             3,  // C — Prénom / First Name
  NOM:                4,  // D — Nom de famille / Last Name
  SEXE:               5,  // E — Sexe / Sex
  ANNEE_NAISSANCE:    6,  // F — Année de naissance / Year of birth
  TELEPHONE:          7,  // G — Numéro de téléphone
  NO_ASSURANCE:       8,  // H — Numéro d'assurance maladie
  EXP_ASSURANCE:      9,  // I — Date d'expiration
  CONTACT_URGENCE:    10, // J — Nom contact urgence
  TEL_URGENCE:        11, // K — Tél contact urgence
  ADRESSE:            12, // L — Adresse Civile
  VILLE:              13, // M — Ville
  CODE_POSTAL:        14, // N — Code Postal
  ALLERGIE:           15, // O — Allergie
  CONDITION_MEDICALE: 16, // P — Condition médicale
  MEMBRE:             17, // Q — Êtes-vous déjà membre?
  CHOIX_ACTIVITE:     18, // R — Choix d'activité (checkbox)
  CONSENT_PHOTO:      19, // S — Consentement photo/vidéo
  CONSENT_PRIVE:      20, // T — Consentement vie privée
  COMMENTAIRES:       21  // U — Comments
};

// ============================================================
// MAIN TRIGGER FUNCTION
// ============================================================

/**
 * Called automatically when a Google Form response is submitted.
 * 
 * V2.0 changes:
 * - Creates inscription rows (one per program) instead of a billing row
 * - Does NOT include cotisation at this stage
 * - Does NOT create an invoice number (JIT at invoice generation)
 * 
 * @param {Object} e - The form submit event object
 */
function onFormSubmit(e) {
  try {
    // Get the response values from the event
    var values = e.values;
    
    if (!values || values.length === 0) {
      logAction('ERREUR: Événement de formulaire sans données.');
      return;
    }
    
    // Extract form data (values array is 0-based)
    var formData = extractFormData(values);
    
    logAction('Nouvelle soumission reçue de: ' + formData.email + ' (' + formData.prenom + ' ' + formData.nom + ')');
    
    // ---- STEP 1: Dedup check + roster update ----
    var existing = findPlayerByEmail(formData.email);
    var playerId;
    var playerAddress = formData.adresse;
    
    if (existing) {
      // Returning player — update and merge
      playerId = updatePlayer(existing.rowIndex, existing.data, formData);
      // Use existing address if the new one is empty
      if (!playerAddress && existing.data[ROSTER_COLS.ADRESSE - 1]) {
        playerAddress = String(existing.data[ROSTER_COLS.ADRESSE - 1]);
      }
      logAction('Joueur de retour détecté: ' + playerId);
    } else {
      // New player — create
      var result = createPlayer(formData);
      playerId = result.playerId;
      logAction('Nouveau joueur: ' + playerId);
    }
    
    // ---- STEP 2: Match programs to pricing ----
    var programs = matchPrograms(formData.choixActivite);
    
    if (programs.length === 0) {
      logAction('ATTENTION: Aucun programme sélectionné pour ' + playerId);
    }
    
    // ---- STEP 3: Create inscription rows (one per program) ----
    // NOTE: Cotisation is NOT included here — it's handled at invoice generation
    var playerName = formData.prenom + ' ' + formData.nom;
    var session = getConfig(CONFIG_KEYS.SESSION_COURANTE) || 'H2026';
    
    var inscriptionResult = createInscriptions(
      playerId,
      playerName,
      formData.email,
      session,
      programs,
      formData.timestamp
    );
    
    var logMsg = 'Processus terminé: ' + inscriptionResult.submissionId + 
                 ' — ' + programs.length + ' inscription(s) créée(s) pour ' + playerName;
    if (inscriptionResult.isDuplicate) {
      logMsg += ' [⚠️ DOUBLON]';
    }
    logAction(logMsg);
    
  } catch (error) {
    logAction('ERREUR dans onFormSubmit: ' + error.message + '\n' + error.stack);
    // Notify admin of the error
    try {
      var adminEmail = getConfig(CONFIG_KEYS.EMAIL_EXPEDITEUR);
      if (adminEmail) {
        MailApp.sendEmail(
          adminEmail,
          '[Accès Badminton] Erreur de traitement du formulaire',
          'Une erreur est survenue lors du traitement d\'une soumission:\n\n' +
          'Erreur: ' + error.message + '\n\n' +
          'Stack: ' + error.stack + '\n\n' +
          'Données: ' + JSON.stringify(e.values)
        );
      }
    } catch (mailError) {
      logAction('Impossible d\'envoyer l\'email d\'erreur: ' + mailError.message);
    }
  }
}

// ============================================================
// EXTRACT FORM DATA
// ============================================================

/**
 * Extracts and normalizes form data from the raw values array.
 * 
 * @param {Array} values - Raw values from e.values (0-based)
 * @returns {Object} Normalized form data
 */
function extractFormData(values) {
  // Combine address fields into one string
  var adresse = String(values[FORM_COLS.ADRESSE - 1] || '').trim();
  var ville = String(values[FORM_COLS.VILLE - 1] || '').trim();
  var codePostal = String(values[FORM_COLS.CODE_POSTAL - 1] || '').trim();
  var fullAdresse = [adresse, ville, codePostal].filter(function(s) { return s; }).join(', ');
  
  return {
    timestamp:          values[FORM_COLS.TIMESTAMP - 1] ? new Date(values[FORM_COLS.TIMESTAMP - 1]) : new Date(),
    email:              String(values[FORM_COLS.EMAIL - 1] || '').trim().toLowerCase(),
    prenom:             String(values[FORM_COLS.PRENOM - 1] || '').trim(),
    nom:                String(values[FORM_COLS.NOM - 1] || '').trim(),
    sexe:               String(values[FORM_COLS.SEXE - 1] || '').trim(),
    anneeNaissance:     String(values[FORM_COLS.ANNEE_NAISSANCE - 1] || '').trim(),
    telephone:          String(values[FORM_COLS.TELEPHONE - 1] || '').trim(),
    noAssurance:        String(values[FORM_COLS.NO_ASSURANCE - 1] || '').trim(),
    expAssurance:       String(values[FORM_COLS.EXP_ASSURANCE - 1] || '').trim(),
    contactUrgence:     String(values[FORM_COLS.CONTACT_URGENCE - 1] || '').trim(),
    telUrgence:         String(values[FORM_COLS.TEL_URGENCE - 1] || '').trim(),
    adresse:            fullAdresse,
    allergie:           String(values[FORM_COLS.ALLERGIE - 1] || '').trim(),
    conditionMedicale:  String(values[FORM_COLS.CONDITION_MEDICALE - 1] || '').trim(),
    membre:             String(values[FORM_COLS.MEMBRE - 1] || '').trim(),
    choixActivite:      String(values[FORM_COLS.CHOIX_ACTIVITE - 1] || '').trim(),
    consentementPhoto:  String(values[FORM_COLS.CONSENT_PHOTO - 1] || '').trim(),
    consentementPrive:  String(values[FORM_COLS.CONSENT_PRIVE - 1] || '').trim(),
    commentaires:       String(values[FORM_COLS.COMMENTAIRES - 1] || '').trim()
  };
}
