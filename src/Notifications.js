/**
 * Notifications.js — Consolidated review notification emails (NEW in V2.0)
 * 
 * Creates summary rows in the Notifications sheet for Autocrat Job #3.
 * Each row represents ONE email to a player, containing all
 * per-program decisions from a single form submission.
 * 
 * This implements the "Configuration over Codification" principle:
 * the email template is a Google Docs document, not code.
 * 
 * Autocrat Job #3 condition:
 *   Notification envoyée = "Non" → sends email → sets to "Oui"
 */

// ============================================================
// CREATE NOTIFICATION FROM FINALIZED SUBMISSION
// ============================================================

/**
 * Creates a consolidated notification row from a finalized submission.
 * All inscriptions for the submission must have a decision (no "En révision").
 * 
 * Called by the "Finaliser la révision" menu action.
 * 
 * @param {string} submissionId - e.g., SUB-001
 * @returns {Object|null} { notificationId, rowIndex } or null if validation fails
 */
function createNotificationFromSubmission(submissionId) {
  // Get all inscriptions for this submission
  var inscriptions = getInscriptionsBySubmission(submissionId);
  
  if (inscriptions.length === 0) {
    logAction('ERREUR: Aucune inscription trouvée pour ' + submissionId);
    return null;
  }
  
  // Validate all have a decision
  if (!allInscriptionsDecided(submissionId)) {
    logAction('ERREUR: Toutes les inscriptions doivent avoir une décision avant de finaliser ' + submissionId);
    return null;
  }
  
  // Check if notification already sent for this submission
  if (isNotificationAlreadySent(submissionId)) {
    logAction('ATTENTION: Notification déjà envoyée pour ' + submissionId);
    return null;
  }
  
  // Extract common data from first inscription
  var firstIns = inscriptions[0].data;
  var playerName = String(firstIns[INSCRIPTION_COLS.NOM_COMPLET - 1]);
  var playerEmail = String(firstIns[INSCRIPTION_COLS.EMAIL - 1]);
  var session = String(firstIns[INSCRIPTION_COLS.SESSION - 1]);
  
  // Build flattened program+decision data (3 slots)
  var flatData = buildNotificationSlots(inscriptions);
  
  // Create notification row
  var sheet = getSheet(SHEET_NAMES.NOTIFICATIONS);
  var notifId = generateNotificationId();
  
  var row = [
    notifId,                              // A: ID Notification
    submissionId,                         // B: ID Soumission
    playerName,                           // C: Nom complet
    playerEmail,                          // D: Email
    session                               // E: Session
  ];
  
  // Add flattened program slots (3 × 3 = 9 values)
  row = row.concat(flatData);
  
  row.push('Révision initiale');          // O: Type
  row.push(new Date());                   // P: Date
  row.push('Non');                        // Q: Notification envoyée
  
  sheet.appendRow(row);
  var rowIndex = sheet.getLastRow();
  
  // Mark inscriptions as notified
  markInscriptionsNotified(submissionId);
  
  logAction('Notification créée: ' + notifId + ' pour ' + playerName + ' (' + submissionId + ')');
  
  return { notificationId: notifId, rowIndex: rowIndex };
}

// ============================================================
// CREATE UPDATE NOTIFICATION (POST-FINALIZATION)
// ============================================================

/**
 * Creates an update notification when a decision is changed after
 * the initial notification was already sent.
 * 
 * Used by "Modifier la décision" menu action.
 * 
 * @param {number} inscriptionRowIndex - The inscription that was changed
 * @param {string} newDecision - The new decision (Accepté / Refusé / etc.)
 * @param {string} detail - Reason or note
 * @returns {Object|null} { notificationId, rowIndex }
 */
function createUpdateNotification(inscriptionRowIndex, newDecision, detail) {
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var insData = sheet.getRange(inscriptionRowIndex, 1, 1, INSCRIPTION_TOTAL_COLS).getValues()[0];
  
  var playerName = String(insData[INSCRIPTION_COLS.NOM_COMPLET - 1]);
  var playerEmail = String(insData[INSCRIPTION_COLS.EMAIL - 1]);
  var session = String(insData[INSCRIPTION_COLS.SESSION - 1]);
  var programme = String(insData[INSCRIPTION_COLS.PROGRAMME - 1]);
  
  var notifSheet = getSheet(SHEET_NAMES.NOTIFICATIONS);
  var notifId = generateNotificationId();
  
  // Build row with only 1 program slot filled
  var row = [
    notifId,                              // A: ID Notification
    String(insData[INSCRIPTION_COLS.ID_SOUMISSION - 1]),  // B: ID Soumission
    playerName,                           // C: Nom complet
    playerEmail,                          // D: Email
    session,                              // E: Session
    programme,                            // F: Programme 1
    newDecision,                          // G: Décision 1
    detail || '',                         // H: Détail 1
    '', '', '',                           // I-K: Programme 2 (empty)
    '', '', '',                           // L-N: Programme 3 (empty)
    'Mise à jour',                        // O: Type
    new Date(),                           // P: Date
    'Non'                                 // Q: Notification envoyée
  ];
  
  notifSheet.appendRow(row);
  var rowIndex = notifSheet.getLastRow();
  
  logAction('Notification de mise à jour créée: ' + notifId + ' pour ' + playerName + ' — ' + programme + ' → ' + newDecision);
  
  return { notificationId: notifId, rowIndex: rowIndex };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Generates the next notification ID.
 * Format: NOTIF-NNN
 * 
 * @returns {string}
 */
function generateNotificationId() {
  // Reuses the subscription counter offset — simple approach
  var sheet = getSheet(SHEET_NAMES.NOTIFICATIONS);
  var lastRow = sheet.getLastRow();
  return 'NOTIF-' + padNumber(lastRow, 3);
}

/**
 * Builds the flattened program+decision slots for the notification row.
 * Up to MAX_NOTIFICATION_PROGRAMS (3) slots.
 * 
 * @param {Array<Object>} inscriptions - Array of { rowIndex, data }
 * @returns {Array} Flat array of 9 values (3 programs × 3 fields)
 */
function buildNotificationSlots(inscriptions) {
  var flat = [];
  
  for (var slot = 0; slot < MAX_NOTIFICATION_PROGRAMS; slot++) {
    if (slot < inscriptions.length) {
      var ins = inscriptions[slot].data;
      var status = String(ins[INSCRIPTION_COLS.STATUT - 1]);
      var programme = String(ins[INSCRIPTION_COLS.PROGRAMME - 1]);
      var detail = '';
      
      // Build the detail text based on decision
      if (status === INSCRIPTION_STATUS.ACCEPTED) {
        detail = 'Facture à suivre';
      } else if (status === INSCRIPTION_STATUS.WAITLISTED) {
        detail = 'Nous vous contacterons si une place se libère';
      } else if (status === INSCRIPTION_STATUS.REFUSED) {
        // Use the Notes field for rejection reason
        detail = String(ins[INSCRIPTION_COLS.NOTES - 1]) || 'Voir motif';
      }
      
      flat.push(programme);  // Programme N
      flat.push(status);     // Décision N
      flat.push(detail);     // Détail N
    } else {
      flat.push('');  // empty programme
      flat.push('');  // empty decision
      flat.push('');  // empty detail
    }
  }
  
  return flat;
}

/**
 * Checks if a notification has already been sent for a submission.
 * 
 * @param {string} submissionId
 * @returns {boolean}
 */
function isNotificationAlreadySent(submissionId) {
  var sheet = getSheet(SHEET_NAMES.NOTIFICATIONS);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return false;
  
  var data = sheet.getRange(2, 1, lastRow - 1, NOTIFICATION_TOTAL_COLS).getValues();
  
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][NOTIFICATION_COLS.ID_SOUMISSION - 1]) === submissionId &&
        String(data[i][NOTIFICATION_COLS.TYPE - 1]) === 'Révision initiale') {
      return true;
    }
  }
  
  return false;
}
