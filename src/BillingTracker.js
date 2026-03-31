/**
 * BillingTracker.js — Invoice management (Layer 2)
 * 
 * V2.0 — Complete rewrite for two-layer architecture.
 * 
 * KEY CHANGES from V1:
 * - Invoices are created FROM accepted inscriptions, not directly from form data
 * - Invoice numbers assigned JIT (when status → Non généré)
 * - 9 line item slots (up from 6) for family billing
 * - Supports grouping multiple players (family billing)
 * - Cotisation checked at invoice generation time (per-year tracking)
 * - Smart waitlist flag on abandonment
 * - Invoice regeneration (void + new)
 * 
 * Autocrat reads columns P-AR for merge tags.
 */

// ============================================================
// ID GENERATORS
// ============================================================

/**
 * Generates the next temp billing ID.
 * Format: TEMP-NNN (e.g., TEMP-001)
 * Used before invoice number is assigned.
 * 
 * @returns {string}
 */
function generateTempId() {
  var counter = parseInt(getConfig(CONFIG_KEYS.PROCHAIN_ID_TEMPORAIRE)) || 1;
  var id = 'TEMP-' + padNumber(counter, 3);
  setConfig(CONFIG_KEYS.PROCHAIN_ID_TEMPORAIRE, counter + 1);
  return id;
}

/**
 * Generates the next invoice number and increments the counter.
 * Format: FACT-SESSION-NNN (e.g., FACT-H2026-001)
 * Called JIT when status changes to "Non généré".
 * 
 * @returns {string} The new invoice number
 */
function generateInvoiceNumber() {
  var counter = parseInt(getConfig(CONFIG_KEYS.PROCHAIN_NO_FACTURE)) || 1;
  var session = getConfig(CONFIG_KEYS.SESSION_COURANTE) || 'H2026';
  var invoiceNo = 'FACT-' + session + '-' + padNumber(counter, 3);
  
  setConfig(CONFIG_KEYS.PROCHAIN_NO_FACTURE, counter + 1);
  
  return invoiceNo;
}

// ============================================================
// CREATE BILLING FROM INSCRIPTIONS
// ============================================================

/**
 * Creates a billing record from a set of accepted inscription rows.
 * This is the core V2.0 invoice generation function.
 * 
 * Supports both single-player and family (multi-player) invoices.
 * 
 * @param {Array<Object>} inscriptionRows - Array of { rowIndex, data } from Inscriptions sheet
 * @param {Object} payerInfo - Payer details (for family billing)
 *   { playerId, name, email, address }
 *   If null, uses first inscription's player data.
 * @returns {Object|null} { tempId, rowIndex } or null on error
 */
function createBillingFromInscriptions(inscriptionRows, payerInfo) {
  if (!inscriptionRows || inscriptionRows.length === 0) {
    logAction('ERREUR: Aucune inscription fournie pour créer la facture.');
    return null;
  }
  
  var sheet = getSheet(SHEET_NAMES.BILLING);
  var session = getConfig(CONFIG_KEYS.SESSION_COURANTE) || 'H2026';
  var tempId = generateTempId();
  
  // Determine payer info
  var firstIns = inscriptionRows[0].data;
  if (!payerInfo) {
    payerInfo = {
      playerId: String(firstIns[INSCRIPTION_COLS.ID_JOUEUR - 1]),
      name: String(firstIns[INSCRIPTION_COLS.NOM_COMPLET - 1]),
      email: String(firstIns[INSCRIPTION_COLS.EMAIL - 1]),
      address: getPlayerAddress(String(firstIns[INSCRIPTION_COLS.ID_JOUEUR - 1]))
    };
  }
  
  // Collect unique player names for the "Joueurs inclus" field
  var playerNamesMap = {};
  var playerIds = [];
  for (var i = 0; i < inscriptionRows.length; i++) {
    var pName = String(inscriptionRows[i].data[INSCRIPTION_COLS.NOM_COMPLET - 1]);
    var pId = String(inscriptionRows[i].data[INSCRIPTION_COLS.ID_JOUEUR - 1]);
    playerNamesMap[pName] = true;
    if (playerIds.indexOf(pId) === -1) playerIds.push(pId);
  }
  var playerNamesList = Object.keys(playerNamesMap).join(', ');
  
  // Build line items from inscriptions
  var lineItems = [];
  var programDescriptions = [];
  
  for (var j = 0; j < inscriptionRows.length; j++) {
    var ins = inscriptionRows[j].data;
    lineItems.push({
      description: String(ins[INSCRIPTION_COLS.PROGRAMME - 1]),
      codeArticle: String(ins[INSCRIPTION_COLS.CODE_ARTICLE - 1]),
      prix: parseFloat(ins[INSCRIPTION_COLS.PRIX - 1]) || 0
    });
    programDescriptions.push(String(ins[INSCRIPTION_COLS.PROGRAMME - 1]));
  }
  
  // Check cotisation for each unique player
  var includeCotisation = false;
  var cotisationCount = 0;
  for (var k = 0; k < playerIds.length; k++) {
    if (shouldAddCotisationForPlayer(playerIds[k], session)) {
      cotisationCount++;
      includeCotisation = true;
      lineItems.push({
        description: getCotisationDescription() + (playerIds.length > 1 ? ' (' + getPlayerNameById(playerIds[k]) + ')' : ''),
        codeArticle: getCotisationCodeArticle(),
        prix: getCotisationPrice()
      });
    }
  }
  
  // Check line item limit
  if (lineItems.length > MAX_LINE_ITEMS) {
    logAction('ERREUR: Trop de lignes (' + lineItems.length + '/' + MAX_LINE_ITEMS + '). Réduisez le nombre de programmes ou membres.');
    return null;
  }
  
  // Calculate total
  var totalAmount = 0;
  for (var t = 0; t < lineItems.length; t++) {
    totalAmount += lineItems[t].prix;
  }
  
  // Build flattened line items for Autocrat
  var flatItems = buildFlattenedLineItems(lineItems);
  
  // Core billing data (A-O)
  var coreData = [
    tempId,                              // A: ID Temporaire
    '',                                  // B: No. Facture (JIT — assigned later)
    payerInfo.name,                      // C: Nom complet (payeur)
    payerInfo.email,                     // D: Email (payeur)
    session,                             // E: Session
    programDescriptions.join(', '),      // F: Programme(s)
    includeCotisation ? 'Oui' : 'Non',  // G: Cotisation
    totalAmount,                         // H: Montant
    '',                                  // I: Statut (set after with assignInvoiceNumber)
    '',                                  // J: Date facture
    '',                                  // K: Date envoyé
    '',                                  // L: Date paiement
    '',                                  // M: Lien PDF
    playerNamesList,                     // N: Joueurs inclus
    ''                                   // O: Notes
  ];
  
  // Autocrat merge data (P-AR)
  var autocratData = [
    payerInfo.address || ''              // P: Adresse client
  ].concat(flatItems)                    // Q-AQ: 9 items × 3 columns
  .concat([
    totalAmount                          // AR: Sous-total
  ]);
  
  // Tracking data (AS-AV)
  var trackingData = [
    'Non',                               // AS: Reçu envoyé
    'Non',                               // AT: Courriel abandon envoyé
    '',                                  // AU: Facture remplace
    payerInfo.playerId                   // AV: ID Joueur (payeur)
  ];
  
  var fullRow = coreData.concat(autocratData).concat(trackingData);
  sheet.appendRow(fullRow);
  var rowIndex = sheet.getLastRow();
  
  // Assign invoice number JIT (sets status to Non généré)
  var invoiceNo = assignInvoiceNumber(rowIndex);
  
  // Link inscriptions to this invoice
  for (var li = 0; li < inscriptionRows.length; li++) {
    linkInscriptionToInvoice(inscriptionRows[li].rowIndex, invoiceNo);
  }
  
  // Format currency columns
  sheet.getRange(rowIndex, BILLING_COLS.MONTANT).setNumberFormat('$#,##0.00');
  sheet.getRange(rowIndex, BILLING_COLS.SOUS_TOTAL).setNumberFormat('$#,##0.00');
  for (var li2 = 0; li2 < MAX_LINE_ITEMS; li2++) {
    var priceCol = BILLING_COLS.LIGNE_1_PRIX + (li2 * 3);
    var priceVal = sheet.getRange(rowIndex, priceCol).getValue();
    if (priceVal !== '' && priceVal !== 0) {
      sheet.getRange(rowIndex, priceCol).setNumberFormat('$#,##0.00');
    }
  }
  
  logAction('Facture créée: ' + invoiceNo + ' (' + tempId + ') pour ' + 
            playerNamesList + ' — ' + formatCurrency(totalAmount));
  
  return { tempId: tempId, invoiceNumber: invoiceNo, rowIndex: rowIndex };
}

// ============================================================
// JIT INVOICE NUMBER ASSIGNMENT
// ============================================================

/**
 * Assigns an invoice number and sets status to "Non généré".
 * Called JIT when the billing record is ready for Autocrat.
 * 
 * @param {number} rowIndex - 1-based sheet row number
 * @returns {string} The assigned invoice number
 */
function assignInvoiceNumber(rowIndex) {
  var sheet = getSheet(SHEET_NAMES.BILLING);
  var invoiceNo = generateInvoiceNumber();
  
  sheet.getRange(rowIndex, BILLING_COLS.NO_FACTURE).setValue(invoiceNo);
  sheet.getRange(rowIndex, BILLING_COLS.STATUT).setValue(BILLING_STATUS.NOT_GENERATED);
  sheet.getRange(rowIndex, BILLING_COLS.DATE_FACTURE).setValue(new Date());
  
  return invoiceNo;
}

// ============================================================
// BUILD FLATTENED LINE ITEMS FOR AUTOCRAT
// ============================================================

/**
 * Builds the flattened line item columns for Autocrat.
 * 9 slots × 3 columns = 27 values.
 * 
 * @param {Array<Object>} items - Array of { description, codeArticle, prix }
 * @returns {Array} Flat array of 27 values
 */
function buildFlattenedLineItems(items) {
  var flat = [];
  
  for (var slot = 0; slot < MAX_LINE_ITEMS; slot++) {
    if (slot < items.length) {
      flat.push(items[slot].description);
      flat.push(items[slot].codeArticle);
      flat.push(items[slot].prix);
    } else {
      flat.push('');
      flat.push('');
      flat.push('');
    }
  }
  
  return flat;
}

// ============================================================
// COTISATION — PER-YEAR CHECK
// ============================================================

/**
 * Determines if cotisation should be added for a player.
 * Checks if the player has already been billed cotisation
 * for the current cotisation year.
 * 
 * @param {string} playerId - Player ID from roster
 * @param {string} session - Current session code
 * @returns {boolean} true if cotisation should be added
 */
function shouldAddCotisationForPlayer(playerId, session) {
  var cotisationYear = getCotisationYear(session);
  if (!cotisationYear) return false;
  
  // Check if this player already has cotisation in any billing record for this year
  var billingSheet = getSheet(SHEET_NAMES.BILLING);
  var lastRow = billingSheet.getLastRow();
  if (lastRow < 2) return true; // No billing records yet → include cotisation
  
  // We need to check: invoices that include this player AND have cotisation = "Oui"
  // AND are for a session in the same cotisation year
  // AND are not voided (Annulé)
  var data = billingSheet.getRange(2, 1, lastRow - 1, BILLING_TOTAL_COLS).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var rowSession = String(data[i][BILLING_COLS.SESSION - 1]);
    var rowCotisation = String(data[i][BILLING_COLS.COTISATION - 1]);
    var rowStatus = String(data[i][BILLING_COLS.STATUT - 1]);
    var rowPayerId = String(data[i][BILLING_COLS.ID_JOUEUR_PAYEUR - 1]);
    
    // Skip voided invoices
    if (rowStatus === BILLING_STATUS.VOIDED) continue;
    
    // Check if same cotisation year
    if (getCotisationYear(rowSession) !== cotisationYear) continue;
    
    // Check if cotisation is included in this invoice
    if (rowCotisation !== 'Oui') continue;
    
    // Check if this player is the payer or included in a family invoice
    // For now, check payer ID. For family invoices, check the inscriptions.
    if (rowPayerId === playerId) {
      logAction('Cotisation déjà facturée pour ' + playerId + ' année ' + cotisationYear);
      return false;
    }
    
    // Also check if the player has an inscription linked to this invoice
    var invoiceNo = String(data[i][BILLING_COLS.NO_FACTURE - 1]);
    if (invoiceNo && playerHasInscriptionOnInvoice(playerId, invoiceNo)) {
      logAction('Cotisation déjà facturée (facture familiale) pour ' + playerId + ' année ' + cotisationYear);
      return false;
    }
  }
  
  return true;
}

/**
 * Checks if a player has any inscription linked to a specific invoice.
 * 
 * @param {string} playerId
 * @param {string} invoiceNumber
 * @returns {boolean}
 */
function playerHasInscriptionOnInvoice(playerId, invoiceNumber) {
  var insSheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var lastRow = insSheet.getLastRow();
  if (lastRow < 2) return false;
  
  var data = insSheet.getRange(2, 1, lastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][INSCRIPTION_COLS.ID_JOUEUR - 1]) === playerId &&
        String(data[i][INSCRIPTION_COLS.NO_FACTURE - 1]) === invoiceNumber) {
      return true;
    }
  }
  return false;
}

// ============================================================
// PLAYER HELPERS
// ============================================================

/**
 * Gets a player's address from the roster.
 * 
 * @param {string} playerId
 * @returns {string} Address or empty string
 */
function getPlayerAddress(playerId) {
  var sheet = getSheet(SHEET_NAMES.ROSTER);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';
  
  var data = sheet.getRange(2, 1, lastRow - 1, ROSTER_COLS.ADRESSE).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][ROSTER_COLS.ID_JOUEUR - 1]) === playerId) {
      return String(data[i][ROSTER_COLS.ADRESSE - 1] || '');
    }
  }
  return '';
}

/**
 * Gets a player's name from the roster by ID.
 * 
 * @param {string} playerId
 * @returns {string} "Prénom Nom" or empty string
 */
function getPlayerNameById(playerId) {
  var sheet = getSheet(SHEET_NAMES.ROSTER);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';
  
  var data = sheet.getRange(2, 1, lastRow - 1, ROSTER_COLS.NOM).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][ROSTER_COLS.ID_JOUEUR - 1]) === playerId) {
      return String(data[i][ROSTER_COLS.PRENOM - 1]) + ' ' + String(data[i][ROSTER_COLS.NOM - 1]);
    }
  }
  return '';
}

// ============================================================
// STATUS MANAGEMENT
// ============================================================

/**
 * Updates billing status and corresponding date.
 * 
 * @param {number} rowIndex - 1-based sheet row
 * @param {string} newStatus - One of BILLING_STATUS values
 */
function updateBillingStatus(rowIndex, newStatus) {
  var sheet = getSheet(SHEET_NAMES.BILLING);
  var now = new Date();
  
  sheet.getRange(rowIndex, BILLING_COLS.STATUT).setValue(newStatus);
  
  if (newStatus === BILLING_STATUS.SENT) {
    sheet.getRange(rowIndex, BILLING_COLS.DATE_ENVOYE).setValue(now);
  } else if (newStatus === BILLING_STATUS.PAID) {
    sheet.getRange(rowIndex, BILLING_COLS.DATE_PAYE).setValue(now);
  }
  
  logAction('Statut facture mis à jour: ligne ' + rowIndex + ' → ' + newStatus);
}

/**
 * Marks a billing record as abandoned (pre-payment).
 * Sets status and primes Autocrat Job #4 for abandonment email.
 * Also checks for waitlisted players and returns smart flag info.
 * 
 * @param {number} rowIndex - 1-based sheet row
 * @param {string} notes - Reason for abandonment (stored in Notes)
 * @returns {Object} { success, waitlistedPlayers: [...] }
 */
function markBillingAbandoned(rowIndex, notes) {
  var sheet = getSheet(SHEET_NAMES.BILLING);
  var currentStatus = String(sheet.getRange(rowIndex, BILLING_COLS.STATUT).getValue());
  
  // Allowed from: Envoyé, Non généré
  if (currentStatus !== BILLING_STATUS.SENT && currentStatus !== BILLING_STATUS.NOT_GENERATED) {
    logAction('ERREUR: Impossible d\'abandonner — statut: ' + currentStatus);
    return { success: false, waitlistedPlayers: [] };
  }
  
  sheet.getRange(rowIndex, BILLING_COLS.STATUT).setValue(BILLING_STATUS.ABANDONED);
  sheet.getRange(rowIndex, BILLING_COLS.COURRIEL_ABANDON_ENVOYE).setValue('Non');
  
  if (notes) {
    var existingNotes = String(sheet.getRange(rowIndex, BILLING_COLS.NOTES).getValue());
    var fullNotes = existingNotes ? existingNotes + '\n' + notes : notes;
    sheet.getRange(rowIndex, BILLING_COLS.NOTES).setValue(fullNotes);
  }
  
  // Update linked inscriptions to Abandonné
  var invoiceNo = String(sheet.getRange(rowIndex, BILLING_COLS.NO_FACTURE).getValue());
  updateLinkedInscriptions(invoiceNo, INSCRIPTION_STATUS.ABANDONED);
  
  // Smart waitlist flag: check for waitlisted players per program
  var session = String(sheet.getRange(rowIndex, BILLING_COLS.SESSION).getValue());
  var waitlistedPlayers = getSmartWaitlistFlag(rowIndex, session);
  
  logAction('Facture abandonnée: ' + invoiceNo + ' (ligne ' + rowIndex + ')');
  
  return { success: true, waitlistedPlayers: waitlistedPlayers };
}

/**
 * Voids an invoice for regeneration. Sets status to "Annulé".
 * Does NOT send any email. Used before creating a new invoice.
 * 
 * @param {number} rowIndex - 1-based sheet row
 * @returns {string|null} The voided invoice number, or null on error
 */
function voidInvoice(rowIndex) {
  var sheet = getSheet(SHEET_NAMES.BILLING);
  var invoiceNo = String(sheet.getRange(rowIndex, BILLING_COLS.NO_FACTURE).getValue());
  
  sheet.getRange(rowIndex, BILLING_COLS.STATUT).setValue(BILLING_STATUS.VOIDED);
  
  var existingNotes = String(sheet.getRange(rowIndex, BILLING_COLS.NOTES).getValue());
  var voidNote = 'Annulée le ' + formatDate(new Date());
  sheet.getRange(rowIndex, BILLING_COLS.NOTES).setValue(
    existingNotes ? existingNotes + '\n' + voidNote : voidNote
  );
  
  logAction('Facture annulée: ' + invoiceNo + ' (ligne ' + rowIndex + ')');
  return invoiceNo;
}

// ============================================================
// SMART WAITLIST FLAG
// ============================================================

/**
 * Checks for waitlisted players for programs in an abandoned/voided invoice.
 * Returns per-program waitlist information for the admin.
 * 
 * @param {number} billingRowIndex - Billing row being abandoned
 * @param {string} session - Session code
 * @returns {Array<Object>} Array of { program, codeArticle, waitlistedPlayers: [...] }
 */
function getSmartWaitlistFlag(billingRowIndex, session) {
  var sheet = getSheet(SHEET_NAMES.BILLING);
  var invoiceNo = String(sheet.getRange(billingRowIndex, BILLING_COLS.NO_FACTURE).getValue());
  
  // Get the programs from the inscriptions linked to this invoice
  var insSheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var insLastRow = insSheet.getLastRow();
  if (insLastRow < 2) return [];
  
  var insData = insSheet.getRange(2, 1, insLastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  var programCodes = [];
  
  for (var i = 0; i < insData.length; i++) {
    if (String(insData[i][INSCRIPTION_COLS.NO_FACTURE - 1]) === invoiceNo) {
      var code = String(insData[i][INSCRIPTION_COLS.CODE_ARTICLE - 1]);
      if (code && programCodes.indexOf(code) === -1) {
        programCodes.push(code);
      }
    }
  }
  
  // For each program, check for waitlisted players
  var results = [];
  for (var j = 0; j < programCodes.length; j++) {
    var waitlisted = getWaitlistedByProgram(programCodes[j], session);
    if (waitlisted.length > 0) {
      var playerList = [];
      for (var w = 0; w < waitlisted.length; w++) {
        playerList.push({
          name: String(waitlisted[w].data[INSCRIPTION_COLS.NOM_COMPLET - 1]),
          date: waitlisted[w].data[INSCRIPTION_COLS.DATE_DECISION - 1]
        });
      }
      results.push({
        program: programCodes[j],
        waitlistedPlayers: playerList
      });
    }
  }
  
  return results;
}

/**
 * Updates all inscriptions linked to a given invoice number.
 * 
 * @param {string} invoiceNumber
 * @param {string} newStatus
 */
function updateLinkedInscriptions(invoiceNumber, newStatus) {
  if (!invoiceNumber) return;
  
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  var data = sheet.getRange(2, 1, lastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][INSCRIPTION_COLS.NO_FACTURE - 1]) === invoiceNumber) {
      sheet.getRange(i + 2, INSCRIPTION_COLS.STATUT).setValue(newStatus);
    }
  }
}

// ============================================================
// QUERY BILLING RECORDS
// ============================================================

/**
 * Returns all billing records with a given status.
 * 
 * @param {string} status
 * @returns {Array<Object>} Array of { rowIndex, data }
 */
function getRecordsByStatus(status) {
  var sheet = getSheet(SHEET_NAMES.BILLING);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, BILLING_COLS.NOTES).getValues();
  var results = [];
  
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][BILLING_COLS.STATUT - 1]) === status) {
      results.push({ rowIndex: i + 2, data: data[i] });
    }
  }
  
  return results;
}

/**
 * Gets a single billing record by row index.
 * 
 * @param {number} rowIndex
 * @returns {Array} Row data as array
 */
function getBillingRecord(rowIndex) {
  var sheet = getSheet(SHEET_NAMES.BILLING);
  return sheet.getRange(rowIndex, 1, 1, BILLING_COLS.NOTES).getValues()[0];
}
