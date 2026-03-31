/**
 * Roster.js — Player roster operations
 * 
 * Manages the "Répertoire des joueurs" sheet.
 * Handles player creation, lookup, deduplication, and updates.
 */

// ============================================================
// FIND PLAYER BY EMAIL
// ============================================================

/**
 * Searches the roster for a player matching the given email.
 * 
 * @param {string} email - Player email to search for (case-insensitive)
 * @returns {Object|null} - { rowIndex, data } or null if not found
 *   rowIndex is 1-based (sheet row number)
 *   data is an array of cell values for that row
 */
function findPlayerByEmail(email) {
  var sheet = getSheet(SHEET_NAMES.ROSTER);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return null; // Only header or empty
  
  var data = sheet.getRange(2, 1, lastRow - 1, ROSTER_COLS.NB_INSCRIPTIONS).getValues();
  var emailLower = email.toLowerCase().trim();
  
  for (var i = 0; i < data.length; i++) {
    var rowEmail = String(data[i][ROSTER_COLS.EMAIL - 1]).toLowerCase().trim();
    if (rowEmail === emailLower) {
      return {
        rowIndex: i + 2, // +2 because data starts at row 2 and i is 0-based
        data: data[i]
      };
    }
  }
  
  return null;
}

// ============================================================
// GENERATE PLAYER ID
// ============================================================

/**
 * Generates the next player ID and increments the counter.
 * Format: AB-YYYY-NNN (e.g., AB-2026-001)
 * 
 * @returns {string} The new player ID
 */
function generatePlayerId() {
  var counter = parseInt(getConfig(CONFIG_KEYS.PROCHAIN_ID_JOUEUR)) || 1;
  var year = new Date().getFullYear();
  var id = 'AB-' + year + '-' + padNumber(counter, 3);
  
  setConfig(CONFIG_KEYS.PROCHAIN_ID_JOUEUR, counter + 1);
  
  return id;
}

// ============================================================
// CREATE NEW PLAYER
// ============================================================

/**
 * Creates a new player in the roster.
 * 
 * @param {Object} playerData - Data extracted from form submission
 * @param {string} playerData.email
 * @param {string} playerData.prenom
 * @param {string} playerData.nom
 * @param {string} playerData.sexe
 * @param {string} playerData.anneeNaissance
 * @param {string} playerData.telephone
 * @param {string} playerData.noAssurance
 * @param {string} playerData.expAssurance
 * @param {string} playerData.contactUrgence
 * @param {string} playerData.telUrgence
 * @param {string} playerData.adresse
 * @param {string} playerData.allergie
 * @param {string} playerData.conditionMedicale
 * @param {string} playerData.consentementPhoto
 * @param {string} playerData.consentementPrive
 * @param {string} playerData.commentaires
 * @param {Date}   playerData.timestamp
 * @returns {Object} - { playerId, rowIndex }
 */
function createPlayer(playerData) {
  var sheet = getSheet(SHEET_NAMES.ROSTER);
  var playerId = generatePlayerId();
  var now = playerData.timestamp || new Date();
  
  var newRow = [
    playerId,                          // A: ID Joueur
    playerData.prenom,                 // B: Prénom
    playerData.nom,                    // C: Nom
    playerData.email,                  // D: Email
    playerData.telephone,              // E: Téléphone
    playerData.sexe,                   // F: Sexe
    playerData.anneeNaissance,         // G: Année de naissance
    playerData.adresse,                // H: Adresse (combined)
    playerData.noAssurance,            // I: No. Assurance maladie
    playerData.expAssurance,           // J: Exp. Assurance maladie
    playerData.contactUrgence,         // K: Contact urgence
    playerData.telUrgence,             // L: Tél. urgence
    playerData.allergie,               // M: Allergie
    playerData.conditionMedicale,      // N: Condition médicale
    playerData.consentementPhoto,      // O: Consentement photo
    playerData.consentementPrive,      // P: Consentement privé
    playerData.commentaires,           // Q: Commentaires
    now,                               // R: Première inscription
    now,                               // S: Dernière inscription
    'Non',                             // T: Joueur de retour
    1                                  // U: Nb inscriptions
  ];
  
  sheet.appendRow(newRow);
  var rowIndex = sheet.getLastRow();
  
  logAction('Nouveau joueur créé: ' + playerId + ' — ' + playerData.prenom + ' ' + playerData.nom);
  
  return { playerId: playerId, rowIndex: rowIndex };
}

// ============================================================
// UPDATE EXISTING PLAYER
// ============================================================

/**
 * Updates an existing player's record. Merges blank fields and
 * updates the inscription tracking fields.
 * 
 * @param {number} rowIndex - 1-based sheet row number
 * @param {Array} existingData - Current row data
 * @param {Object} newData - Fresh data from form submission
 * @returns {string} The existing player ID
 */
function updatePlayer(rowIndex, existingData, newData) {
  var sheet = getSheet(SHEET_NAMES.ROSTER);
  var playerId = existingData[ROSTER_COLS.ID_JOUEUR - 1];
  var now = newData.timestamp || new Date();
  
  // Merge: only fill in blanks — don't overwrite existing data
  // except for fields that should always update
  var mergeFields = [
    { col: ROSTER_COLS.TELEPHONE, newVal: newData.telephone },
    { col: ROSTER_COLS.SEXE, newVal: newData.sexe },
    { col: ROSTER_COLS.ANNEE_NAISSANCE, newVal: newData.anneeNaissance },
    { col: ROSTER_COLS.ADRESSE, newVal: newData.adresse },
    { col: ROSTER_COLS.NO_ASSURANCE, newVal: newData.noAssurance },
    { col: ROSTER_COLS.EXP_ASSURANCE, newVal: newData.expAssurance },
    { col: ROSTER_COLS.CONTACT_URGENCE, newVal: newData.contactUrgence },
    { col: ROSTER_COLS.TEL_URGENCE, newVal: newData.telUrgence },
    { col: ROSTER_COLS.ALLERGIE, newVal: newData.allergie },
    { col: ROSTER_COLS.CONDITION_MEDICALE, newVal: newData.conditionMedicale },
    { col: ROSTER_COLS.CONSENTEMENT_PHOTO, newVal: newData.consentementPhoto },
    { col: ROSTER_COLS.CONSENTEMENT_PRIVE, newVal: newData.consentementPrive },
    { col: ROSTER_COLS.COMMENTAIRES, newVal: newData.commentaires }
  ];
  
  for (var i = 0; i < mergeFields.length; i++) {
    var field = mergeFields[i];
    var existing = existingData[field.col - 1];
    // Fill in blank or update if new value provided
    if ((!existing || String(existing).trim() === '') && field.newVal && String(field.newVal).trim() !== '') {
      sheet.getRange(rowIndex, field.col).setValue(field.newVal);
    }
  }
  
  // Always update: last inscription date
  sheet.getRange(rowIndex, ROSTER_COLS.DERNIERE_INSCRIPTION).setValue(now);
  
  // Always update: returning player flag
  sheet.getRange(rowIndex, ROSTER_COLS.JOUEUR_RETOUR).setValue('Oui');
  
  // Increment inscription count
  var currentCount = parseInt(existingData[ROSTER_COLS.NB_INSCRIPTIONS - 1]) || 1;
  sheet.getRange(rowIndex, ROSTER_COLS.NB_INSCRIPTIONS).setValue(currentCount + 1);
  
  logAction('Joueur mis à jour: ' + playerId + ' — inscription #' + (currentCount + 1));
  
  return playerId;
}
