/**
 * CreditNotes.js — Credit note generation (NEW in V2.0)
 * 
 * Handles partial refunds with proper audit trail.
 * Creates credit note rows in the "Notes de crédit" sheet
 * for Autocrat Job #5 to generate PDF and send email.
 * 
 * Credit note shows:
 * - Reference to original invoice
 * - Removed items with negative amounts
 * - Remaining balance
 * - Reason for refund
 */

// ============================================================
// GENERATE CREDIT NOTE NUMBER
// ============================================================

/**
 * Generates the next credit note number.
 * Format: NC-SESSION-NNN (e.g., NC-H2026-001)
 * 
 * @returns {string}
 */
function generateCreditNoteNumber() {
  var counter = parseInt(getConfig(CONFIG_KEYS.PROCHAIN_NO_NOTE_CREDIT)) || 1;
  var session = getConfig(CONFIG_KEYS.SESSION_COURANTE) || 'H2026';
  var noteNo = 'NC-' + session + '-' + padNumber(counter, 3);
  
  setConfig(CONFIG_KEYS.PROCHAIN_NO_NOTE_CREDIT, counter + 1);
  
  return noteNo;
}

// ============================================================
// CREATE CREDIT NOTE
// ============================================================

/**
 * Creates a credit note for a partial or full refund.
 * 
 * @param {number} billingRowIndex - The original billing row
 * @param {Array<Object>} removedItems - Items being refunded
 *   Each: { description, codeArticle, amount }
 *   Amounts should be POSITIVE — they'll be displayed as negative on the note.
 * @param {string} reason - Reason for the refund
 * @returns {Object|null} { creditNoteNumber, rowIndex, refundAmount }
 */
function createCreditNote(billingRowIndex, removedItems, reason) {
  if (!removedItems || removedItems.length === 0) {
    logAction('ERREUR: Aucun article à rembourser.');
    return null;
  }
  
  if (removedItems.length > MAX_CREDIT_ITEMS) {
    logAction('ERREUR: Maximum ' + MAX_CREDIT_ITEMS + ' articles par note de crédit.');
    return null;
  }
  
  var billingSheet = getSheet(SHEET_NAMES.BILLING);
  var billingData = billingSheet.getRange(billingRowIndex, 1, 1, BILLING_TOTAL_COLS).getValues()[0];
  
  var originalInvoice = String(billingData[BILLING_COLS.NO_FACTURE - 1]);
  var playerName = String(billingData[BILLING_COLS.NOM_COMPLET - 1]);
  var playerEmail = String(billingData[BILLING_COLS.EMAIL - 1]);
  var session = String(billingData[BILLING_COLS.SESSION - 1]);
  var originalAmount = parseFloat(billingData[BILLING_COLS.MONTANT - 1]) || 0;
  
  // Calculate refund
  var refundAmount = 0;
  for (var i = 0; i < removedItems.length; i++) {
    refundAmount += parseFloat(removedItems[i].amount) || 0;
  }
  var remainingBalance = originalAmount - refundAmount;
  
  // Build credit note row
  var creditNoteSheet = getSheet(SHEET_NAMES.CREDIT_NOTES);
  var creditNoteNo = generateCreditNoteNumber();
  
  var row = [
    creditNoteNo,                         // A: No. Note de crédit
    originalInvoice,                      // B: No. Facture originale
    playerName,                           // C: Nom complet
    playerEmail,                          // D: Email
    session,                              // E: Session
    new Date()                            // F: Date
  ];
  
  // Flattened removed items (3 slots × 3 columns = 9 values)
  for (var slot = 0; slot < MAX_CREDIT_ITEMS; slot++) {
    if (slot < removedItems.length) {
      row.push(removedItems[slot].description);
      row.push(removedItems[slot].codeArticle || '');
      row.push(-Math.abs(removedItems[slot].amount));  // Negative amount
    } else {
      row.push('');
      row.push('');
      row.push('');
    }
  }
  
  row.push(refundAmount);                // P: Montant total remboursé
  row.push(remainingBalance);            // Q: Solde restant
  row.push(reason || '');                // R: Raison
  row.push('');                          // S: Lien PDF (Autocrat fills)
  row.push('Non');                       // T: Envoyée (Autocrat trigger)
  
  creditNoteSheet.appendRow(row);
  var rowIndex = creditNoteSheet.getLastRow();
  
  // Format currency columns
  for (var ci = 0; ci < MAX_CREDIT_ITEMS; ci++) {
    var amtCol = CREDIT_NOTE_COLS.LIGNE_1_MONTANT + (ci * 3);
    creditNoteSheet.getRange(rowIndex, amtCol).setNumberFormat('$#,##0.00');
  }
  creditNoteSheet.getRange(rowIndex, CREDIT_NOTE_COLS.MONTANT_REMBOURSE).setNumberFormat('$#,##0.00');
  creditNoteSheet.getRange(rowIndex, CREDIT_NOTE_COLS.SOLDE_RESTANT).setNumberFormat('$#,##0.00');
  
  // Update original invoice status
  billingSheet.getRange(billingRowIndex, BILLING_COLS.STATUT).setValue(BILLING_STATUS.REFUNDED);
  var existingNotes = String(billingSheet.getRange(billingRowIndex, BILLING_COLS.NOTES).getValue());
  var refundNote = 'Note de crédit: ' + creditNoteNo + ' — Remboursement: ' + formatCurrency(refundAmount);
  billingSheet.getRange(billingRowIndex, BILLING_COLS.NOTES).setValue(
    existingNotes ? existingNotes + '\n' + refundNote : refundNote
  );
  
  logAction('Note de crédit créée: ' + creditNoteNo + ' pour ' + originalInvoice + 
            ' — Remboursement: ' + formatCurrency(refundAmount));
  
  return {
    creditNoteNumber: creditNoteNo,
    rowIndex: rowIndex,
    refundAmount: refundAmount,
    remainingBalance: remainingBalance
  };
}
