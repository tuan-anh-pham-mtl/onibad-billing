/**
 * Inscriptions.js — Per-program registration management (Layer 1)
 * 
 * NEW in V2.0 — replaces the direct form→billing pipeline.
 * 
 * Each form submission creates N rows here (one per program selected).
 * The admin reviews and makes per-program decisions:
 *   - Accepté: ready for invoice generation
 *   - En attente: waitlisted (spot full)
 *   - Refusé: rejected
 *   - Abandonné: player or admin cancels
 * 
 * Once all programs for a submission are decided, the admin clicks
 * "Finaliser la révision" to send a consolidated notification email.
 * 
 * Accepted inscriptions are then grouped into invoices via
 * "Générer la facture" in BillingTracker.js.
 */

// ============================================================
// ID GENERATORS
// ============================================================

/**
 * Generates the next inscription ID.
 * Format: INS-NNN (e.g., INS-001)
 * 
 * @returns {string}
 */
function generateInscriptionId() {
  var counter = parseInt(getConfig(CONFIG_KEYS.PROCHAIN_ID_INSCRIPTION)) || 1;
  var id = 'INS-' + padNumber(counter, 3);
  setConfig(CONFIG_KEYS.PROCHAIN_ID_INSCRIPTION, counter + 1);
  return id;
}

/**
 * Generates the next submission ID.
 * Format: SUB-NNN (e.g., SUB-001)
 * Groups all inscription rows from the same form submission.
 * 
 * @returns {string}
 */
function generateSubmissionId() {
  var counter = parseInt(getConfig(CONFIG_KEYS.PROCHAIN_ID_SOUMISSION)) || 1;
  var id = 'SUB-' + padNumber(counter, 3);
  setConfig(CONFIG_KEYS.PROCHAIN_ID_SOUMISSION, counter + 1);
  return id;
}

// ============================================================
// CREATE INSCRIPTIONS FROM FORM SUBMISSION
// ============================================================

/**
 * Creates inscription rows for each program selected in a form submission.
 * 
 * @param {string} playerId - Player ID from roster
 * @param {string} playerName - Full name (Prénom Nom)
 * @param {string} playerEmail - Player email
 * @param {string} session - Current session (e.g., H2026)
 * @param {Array<Object>} programs - Matched programs from matchPrograms()
 *   Each: { codeArticle, cle, description, session, prix }
 * @param {Date} timestamp - Form submission timestamp
 * @returns {Object} { submissionId, inscriptionIds: [...], isDuplicate: boolean }
 */
function createInscriptions(playerId, playerName, playerEmail, session, programs, timestamp) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var submissionId = generateSubmissionId();
  var inscriptionIds = [];
  
  // Check for duplicate submissions (same player, same session, same programs)
  var isDuplicate = checkDuplicateSubmission(playerId, session, programs);
  
  for (var i = 0; i < programs.length; i++) {
    var insId = generateInscriptionId();
    
    var row = [
      insId,                                // A: ID Inscription
      submissionId,                         // B: ID Soumission
      playerId,                             // C: ID Joueur
      playerName,                           // D: Nom complet
      playerEmail,                          // E: Email
      session,                              // F: Session
      programs[i].description,              // G: Programme
      programs[i].codeArticle || '',        // H: Code article
      programs[i].prix,                     // I: Prix
      INSCRIPTION_STATUS.EN_REVISION,       // J: Statut
      '',                                   // K: No. Facture (filled later)
      timestamp || new Date(),              // L: Date soumission
      '',                                   // M: Date décision (filled by admin)
      'Non',                                // N: Notification envoyée
      isDuplicate ? '⚠️ Soumission en double' : ''  // O: Notes
    ];
    
    sheet.appendRow(row);
    
    // Format price column
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, INSCRIPTION_COLS.PRIX).setNumberFormat('$#,##0.00');
    
    inscriptionIds.push(insId);
  }
  
  var msg = 'Inscriptions créées: ' + submissionId + ' — ' + programs.length + 
            ' programme(s) pour ' + playerName;
  if (isDuplicate) {
    msg += ' [⚠️ DOUBLON DÉTECTÉ]';
  }
  logAction(msg);
  
  return {
    submissionId: submissionId,
    inscriptionIds: inscriptionIds,
    isDuplicate: isDuplicate
  };
}

// ============================================================
// DUPLICATE DETECTION
// ============================================================

/**
 * Checks if a player already has inscriptions for the same programs
 * in the same session. Returns true if duplicates found.
 * 
 * @param {string} playerId
 * @param {string} session
 * @param {Array<Object>} programs - Programs to check
 * @returns {boolean} true if duplicates exist
 */
function checkDuplicateSubmission(playerId, session, programs) {
  var existing = getInscriptionsByPlayer(playerId, session);
  
  if (existing.length === 0) return false;
  
  // Check if any of the new programs match existing ones
  var existingCodes = {};
  for (var i = 0; i < existing.length; i++) {
    var code = String(existing[i].data[INSCRIPTION_COLS.CODE_ARTICLE - 1]);
    existingCodes[code] = true;
  }
  
  for (var j = 0; j < programs.length; j++) {
    if (existingCodes[programs[j].codeArticle]) {
      return true;
    }
  }
  
  return false;
}

// ============================================================
// QUERY INSCRIPTIONS
// ============================================================

/**
 * Returns all inscription rows for a given submission ID.
 * 
 * @param {string} submissionId - e.g., SUB-001
 * @returns {Array<Object>} Array of { rowIndex, data }
 */
function getInscriptionsBySubmission(submissionId) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  var results = [];
  
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][INSCRIPTION_COLS.ID_SOUMISSION - 1]) === submissionId) {
      results.push({ rowIndex: i + 2, data: data[i] });
    }
  }
  
  return results;
}

/**
 * Returns all inscription rows with a given status.
 * 
 * @param {string} status - One of INSCRIPTION_STATUS values
 * @returns {Array<Object>} Array of { rowIndex, data }
 */
function getInscriptionsByStatus(status) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  var results = [];
  
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][INSCRIPTION_COLS.STATUT - 1]) === status) {
      results.push({ rowIndex: i + 2, data: data[i] });
    }
  }
  
  return results;
}

/**
 * Returns all inscriptions for a player in a given session.
 * 
 * @param {string} playerId
 * @param {string} session
 * @returns {Array<Object>} Array of { rowIndex, data }
 */
function getInscriptionsByPlayer(playerId, session) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  var results = [];
  
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][INSCRIPTION_COLS.ID_JOUEUR - 1]) === playerId &&
        String(data[i][INSCRIPTION_COLS.SESSION - 1]) === session) {
      results.push({ rowIndex: i + 2, data: data[i] });
    }
  }
  
  return results;
}

/**
 * Returns all inscriptions in "En révision" status for the current session.
 * 
 * @returns {Array<Object>} Array of { rowIndex, data }
 */
function getInscriptionsEnRevision() {
  return getInscriptionsByStatus(INSCRIPTION_STATUS.EN_REVISION);
}

/**
 * Returns all waitlisted inscriptions for a specific program (by code article)
 * in a given session. Used for the smart waitlist flag.
 * 
 * @param {string} codeArticle - e.g., "AB-ADT-ADV"
 * @param {string} session - e.g., "H2026"
 * @returns {Array<Object>} Array of { rowIndex, data }, sorted by date
 */
function getWaitlistedByProgram(codeArticle, session) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  var results = [];
  
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][INSCRIPTION_COLS.STATUT - 1]) === INSCRIPTION_STATUS.WAITLISTED &&
        String(data[i][INSCRIPTION_COLS.CODE_ARTICLE - 1]) === codeArticle &&
        String(data[i][INSCRIPTION_COLS.SESSION - 1]) === session) {
      results.push({ rowIndex: i + 2, data: data[i] });
    }
  }
  
  // Sort by decision date (earliest first = FIFO)
  results.sort(function(a, b) {
    var dateA = new Date(a.data[INSCRIPTION_COLS.DATE_DECISION - 1]);
    var dateB = new Date(b.data[INSCRIPTION_COLS.DATE_DECISION - 1]);
    return dateA - dateB;
  });
  
  return results;
}

// ============================================================
// UPDATE INSCRIPTION STATUS
// ============================================================

/**
 * Updates the status of an inscription row.
 * 
 * @param {number} rowIndex - 1-based sheet row number
 * @param {string} newStatus - One of INSCRIPTION_STATUS values
 * @returns {boolean} true if successful
 */
function updateInscriptionStatus(rowIndex, newStatus) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  
  sheet.getRange(rowIndex, INSCRIPTION_COLS.STATUT).setValue(newStatus);
  sheet.getRange(rowIndex, INSCRIPTION_COLS.DATE_DECISION).setValue(new Date());
  
  var playerName = sheet.getRange(rowIndex, INSCRIPTION_COLS.NOM_COMPLET).getValue();
  var programme = sheet.getRange(rowIndex, INSCRIPTION_COLS.PROGRAMME).getValue();
  logAction('Inscription ' + newStatus + ': ' + playerName + ' — ' + programme + ' (ligne ' + rowIndex + ')');
  
  return true;
}

/**
 * Links an inscription to an invoice by setting the No. Facture.
 * 
 * @param {number} rowIndex - 1-based sheet row number
 * @param {string} invoiceNumber - e.g., "FACT-H2026-001"
 */
function linkInscriptionToInvoice(rowIndex, invoiceNumber) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  sheet.getRange(rowIndex, INSCRIPTION_COLS.NO_FACTURE).setValue(invoiceNumber);
}

/**
 * Marks inscription rows as notification sent.
 * 
 * @param {string} submissionId - all inscriptions for this submission
 */
function markInscriptionsNotified(submissionId) {
  var inscriptions = getInscriptionsBySubmission(submissionId);
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  
  for (var i = 0; i < inscriptions.length; i++) {
    sheet.getRange(inscriptions[i].rowIndex, INSCRIPTION_COLS.NOTIFICATION_ENVOYEE).setValue('Oui');
  }
}

/**
 * Checks if all inscriptions for a submission have been decided
 * (no "En révision" remaining).
 * 
 * @param {string} submissionId
 * @returns {boolean} true if all decided
 */
function allInscriptionsDecided(submissionId) {
  var inscriptions = getInscriptionsBySubmission(submissionId);
  
  for (var i = 0; i < inscriptions.length; i++) {
    if (String(inscriptions[i].data[INSCRIPTION_COLS.STATUT - 1]) === INSCRIPTION_STATUS.EN_REVISION) {
      return false;
    }
  }
  
  return true;
}

/**
 * Gets the accepted inscriptions for a submission that don't yet have an invoice.
 * These are ready for invoice generation.
 * 
 * @param {string} submissionId
 * @returns {Array<Object>} Array of { rowIndex, data }
 */
function getAcceptedInscriptionsForInvoice(submissionId) {
  var inscriptions = getInscriptionsBySubmission(submissionId);
  var results = [];
  
  for (var i = 0; i < inscriptions.length; i++) {
    var status = String(inscriptions[i].data[INSCRIPTION_COLS.STATUT - 1]);
    var invoiceNum = String(inscriptions[i].data[INSCRIPTION_COLS.NO_FACTURE - 1]).trim();
    
    if (status === INSCRIPTION_STATUS.ACCEPTED && !invoiceNum) {
      results.push(inscriptions[i]);
    }
  }
  
  return results;
}

/**
 * Gets all accepted inscriptions without an invoice (across all submissions).
 * Used for the "Générer la facture" menu action.
 * 
 * @returns {Array<Object>} Array of { rowIndex, data }
 */
function getAllAcceptedWithoutInvoice() {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  var results = [];
  
  for (var i = 0; i < data.length; i++) {
    var status = String(data[i][INSCRIPTION_COLS.STATUT - 1]);
    var invoiceNum = String(data[i][INSCRIPTION_COLS.NO_FACTURE - 1]).trim();
    
    if (status === INSCRIPTION_STATUS.ACCEPTED && !invoiceNum) {
      results.push({ rowIndex: i + 2, data: data[i] });
    }
  }
  
  return results;
}
