/**
 * Menu.js — Custom menu, setup wizard, and UI workflows
 * V2.0 — Complete rewrite for two-layer architecture.
 */

// ============================================================
// CUSTOM MENU
// ============================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🏸 Accès Badminton')
    .addSubMenu(ui.createMenu('📋 Inscriptions')
      .addItem('📋 Réviser les inscriptions', 'reviewInscriptions')
      .addItem('✅ Accepter l\'inscription', 'acceptSelectedInscription')
      .addItem('⏳ Mettre sur liste d\'attente', 'waitlistSelectedInscription')
      .addItem('❌ Refuser l\'inscription', 'refuseSelectedInscription')
      .addItem('✅ Accepter TOUTES', 'acceptAllInscriptionsUI')
      .addSeparator()
      .addItem('📨 Finaliser la révision', 'finalizeReviewUI')
      .addItem('🔄 Modifier la décision', 'modifyDecisionUI'))
    .addSubMenu(ui.createMenu('💰 Facturation')
      .addItem('📝 Générer la facture', 'generateInvoiceUI')
      .addItem('👪 Facture familiale', 'generateFamilyInvoiceUI')
      .addItem('🔄 Régénérer une facture', 'regenerateInvoiceUI')
      .addItem('🚫 Marquer comme abandonné', 'markAbandonedUI')
      .addItem('💸 Émettre une note de crédit', 'issueCreditNoteUI')
      .addItem('⏳ Promouvoir (liste d\'attente)', 'promoteFromWaitlistUI'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🔧 Outils')
      .addItem('➕ Ajouter une inscription manuellement', 'addManualInscriptionUI')
      .addItem('🔄 Propager les modifications du joueur', 'propagatePlayerDataUI')
      .addSeparator()
      .addItem('🔄 Retraiter une réponse', 'reprocessFormResponse')
      .addItem('📁 Organiser les factures (Drive)', 'organizeInvoicesUI')
      .addItem('⚙️ Vérifier la configuration', 'verifyConfiguration')
      .addItem('📊 Résumé de la session', 'showSessionSummary'))
    .addSeparator()
    .addItem('🛠️ Configuration initiale', 'setupSpreadsheet')
    .addToUi();
}

// ============================================================
// INSCRIPTION REVIEW
// ============================================================

function reviewInscriptions() {
  var ui = SpreadsheetApp.getUi();
  var records = getInscriptionsEnRevision();
  
  if (records.length === 0) {
    ui.alert('✅ Révision', 'Aucune inscription en attente de révision.', ui.ButtonSet.OK);
    return;
  }
  
  var report = '═══ INSCRIPTIONS EN ATTENTE ═══\n\nTotal : ' + records.length + ' inscription(s)\n\n';
  
  // Group by submission
  var submissions = {};
  for (var i = 0; i < records.length; i++) {
    var subId = String(records[i].data[INSCRIPTION_COLS.ID_SOUMISSION - 1]);
    if (!submissions[subId]) submissions[subId] = [];
    submissions[subId].push(records[i]);
  }
  
  for (var sid in submissions) {
    var group = submissions[sid];
    var name = group[0].data[INSCRIPTION_COLS.NOM_COMPLET - 1];
    var email = group[0].data[INSCRIPTION_COLS.EMAIL - 1];
    report += '── ' + sid + ' : ' + name + ' (' + email + ') ──\n';
    for (var j = 0; j < group.length; j++) {
      var prog = group[j].data[INSCRIPTION_COLS.PROGRAMME - 1];
      var prix = formatCurrency(parseFloat(group[j].data[INSCRIPTION_COLS.PRIX - 1]) || 0);
      var notes = String(group[j].data[INSCRIPTION_COLS.NOTES - 1] || '');
      report += '  Ligne ' + group[j].rowIndex + ' : ' + prog + ' — ' + prix;
      if (notes) report += ' ' + notes;
      report += '\n';
    }
    report += '\n';
  }
  
  report += '─────────────────────────────────\n';
  report += 'Sélectionnez une ligne dans l\'onglet Inscriptions,\n';
  report += 'puis utilisez le menu pour accepter, refuser ou\n';
  report += 'mettre sur liste d\'attente.';
  
  ui.alert('Révision des inscriptions', report, ui.ButtonSet.OK);
}

function acceptSelectedInscription() {
  var result = getSelectedInscriptionRow_();
  if (!result) return;
  
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert('Accepter', 'Accepter l\'inscription de ' + result.name + 
    ' pour ' + result.programme + ' ?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  updateInscriptionStatus(result.rowIndex, INSCRIPTION_STATUS.ACCEPTED);
  ui.alert('✅ Acceptée', result.name + ' — ' + result.programme, ui.ButtonSet.OK);
}

function waitlistSelectedInscription() {
  var result = getSelectedInscriptionRow_();
  if (!result) return;
  
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert('Liste d\'attente', 'Mettre ' + result.name + 
    ' sur la liste d\'attente pour ' + result.programme + ' ?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  updateInscriptionStatus(result.rowIndex, INSCRIPTION_STATUS.WAITLISTED);
  ui.alert('⏳ En attente', result.name + ' — ' + result.programme + 
    '\nLe joueur sera notifié lors de la finalisation.', ui.ButtonSet.OK);
}

function refuseSelectedInscription() {
  var result = getSelectedInscriptionRow_();
  if (!result) return;
  
  var ui = SpreadsheetApp.getUi();
  
  // Choose reason
  var reasonPrompt = ui.prompt('Motif du refus',
    'Entrez le motif (1, 2 ou 3) :\n\n1 = Joueur trop jeune\n2 = Nombre de places excédé\n3 = Autre',
    ui.ButtonSet.OK_CANCEL);
  if (reasonPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var reasonNum = reasonPrompt.getResponseText().trim();
  var reasonLabel = '';
  
  switch (reasonNum) {
    case '1': reasonLabel = REJECTION_REASONS.TROP_JEUNE.label; break;
    case '2': reasonLabel = REJECTION_REASONS.PLACES_EXCEDEES.label; break;
    case '3':
      var custom = ui.prompt('Raison personnalisée', 'Entrez la raison :', ui.ButtonSet.OK_CANCEL);
      if (custom.getSelectedButton() !== ui.Button.OK) return;
      reasonLabel = custom.getResponseText().trim();
      if (!reasonLabel) { ui.alert('Veuillez fournir une raison.'); return; }
      break;
    default: ui.alert('Numéro invalide.'); return;
  }
  
  var confirm = ui.alert('Confirmer le refus', 
    'Refuser ' + result.name + ' pour ' + result.programme + ' ?\nMotif : ' + reasonLabel, 
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  // Store reason in Notes column
  var sheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  sheet.getRange(result.rowIndex, INSCRIPTION_COLS.NOTES).setValue(reasonLabel);
  updateInscriptionStatus(result.rowIndex, INSCRIPTION_STATUS.REFUSED);
  
  ui.alert('❌ Refusée', result.name + ' — ' + result.programme + '\nMotif : ' + reasonLabel, ui.ButtonSet.OK);
}

function acceptAllInscriptionsUI() {
  var ui = SpreadsheetApp.getUi();
  var records = getInscriptionsEnRevision();
  
  if (records.length === 0) {
    ui.alert('Aucune inscription en révision.'); return;
  }
  
  var confirm = ui.alert('Accepter TOUTES', 
    'Accepter les ' + records.length + ' inscription(s) en révision ?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  var count = 0;
  for (var i = 0; i < records.length; i++) {
    updateInscriptionStatus(records[i].rowIndex, INSCRIPTION_STATUS.ACCEPTED);
    count++;
  }
  
  ui.alert('✅ ' + count + ' inscription(s) acceptée(s).\nUtilisez "Finaliser la révision" pour notifier les joueurs.', ui.ButtonSet.OK);
}

// ============================================================
// FINALIZE REVIEW
// ============================================================

function finalizeReviewUI() {
  var ui = SpreadsheetApp.getUi();
  var result = getSelectedInscriptionRow_();
  if (!result) return;
  
  var submissionId = result.submissionId;
  
  // Check all decided
  if (!allInscriptionsDecided(submissionId)) {
    ui.alert('⚠️ Impossible de finaliser', 
      'Toutes les inscriptions de cette soumission (' + submissionId + 
      ') doivent avoir une décision avant de finaliser.\nVérifiez qu\'aucune n\'est encore "En révision".', 
      ui.ButtonSet.OK);
    return;
  }
  
  // Check not already notified
  if (isNotificationAlreadySent(submissionId)) {
    ui.alert('ℹ️ Déjà finalisée', 'La notification a déjà été envoyée pour ' + submissionId + '.', ui.ButtonSet.OK);
    return;
  }
  
  // Show summary of decisions
  var inscriptions = getInscriptionsBySubmission(submissionId);
  var summary = 'Soumission : ' + submissionId + '\nJoueur : ' + result.name + '\n\n';
  for (var i = 0; i < inscriptions.length; i++) {
    var ins = inscriptions[i].data;
    summary += String(ins[INSCRIPTION_COLS.PROGRAMME - 1]) + ' → ' + 
               String(ins[INSCRIPTION_COLS.STATUT - 1]) + '\n';
  }
  summary += '\nAutocrat enverra la notification consolidée dans l\'heure.';
  
  var confirm = ui.alert('Finaliser la révision', summary, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  var notifResult = createNotificationFromSubmission(submissionId);
  if (notifResult) {
    ui.alert('📨 Notification créée', 'ID: ' + notifResult.notificationId + 
      '\nAutocrat enverra le courriel consolidé.', ui.ButtonSet.OK);
  } else {
    ui.alert('Erreur', 'Impossible de créer la notification. Vérifiez les logs.', ui.ButtonSet.OK);
  }
}

// ============================================================
// MODIFY DECISION (POST-FINALIZATION)
// ============================================================

function modifyDecisionUI() {
  var ui = SpreadsheetApp.getUi();
  var result = getSelectedInscriptionRow_();
  if (!result) return;
  
  var currentStatus = result.status;
  var options = '1 = Accepter\n2 = Mettre en attente\n3 = Refuser\n4 = Abandonner';
  
  var prompt = ui.prompt('Modifier la décision', 
    result.name + ' — ' + result.programme + '\nStatut actuel : ' + currentStatus + 
    '\n\nNouveau statut :\n' + options, ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  
  var choice = prompt.getResponseText().trim();
  var newStatus = '';
  var detail = '';
  
  switch (choice) {
    case '1': newStatus = INSCRIPTION_STATUS.ACCEPTED; detail = 'Facture à suivre'; break;
    case '2': newStatus = INSCRIPTION_STATUS.WAITLISTED; detail = 'Mis en attente'; break;
    case '3': 
      newStatus = INSCRIPTION_STATUS.REFUSED;
      var reasonP = ui.prompt('Motif', 'Raison du refus :', ui.ButtonSet.OK_CANCEL);
      if (reasonP.getSelectedButton() !== ui.Button.OK) return;
      detail = reasonP.getResponseText().trim() || 'Non précisé';
      break;
    case '4': newStatus = INSCRIPTION_STATUS.ABANDONED; detail = 'Abandonné'; break;
    default: ui.alert('Choix invalide.'); return;
  }
  
  updateInscriptionStatus(result.rowIndex, newStatus);
  
  // Create update notification if initial notification was already sent
  if (result.notified === 'Oui') {
    createUpdateNotification(result.rowIndex, newStatus, detail);
    ui.alert('🔄 Décision modifiée', result.name + ' → ' + newStatus + 
      '\nUne notification de mise à jour sera envoyée par Autocrat.', ui.ButtonSet.OK);
  } else {
    ui.alert('🔄 Décision modifiée', result.name + ' → ' + newStatus, ui.ButtonSet.OK);
  }
}

// ============================================================
// INVOICE GENERATION
// ============================================================

function generateInvoiceUI() {
  var ui = SpreadsheetApp.getUi();
  
  // Get all accepted inscriptions without an invoice
  var available = getAllAcceptedWithoutInvoice();
  if (available.length === 0) {
    ui.alert('Aucune inscription acceptée en attente de facturation.'); return;
  }
  
  // Group by player
  var byPlayer = {};
  for (var i = 0; i < available.length; i++) {
    var pId = String(available[i].data[INSCRIPTION_COLS.ID_JOUEUR - 1]);
    if (!byPlayer[pId]) byPlayer[pId] = [];
    byPlayer[pId].push(available[i]);
  }
  
  var playerIds = Object.keys(byPlayer);
  var report = 'Inscriptions prêtes à facturer :\n\n';
  for (var p = 0; p < playerIds.length; p++) {
    var group = byPlayer[playerIds[p]];
    var name = String(group[0].data[INSCRIPTION_COLS.NOM_COMPLET - 1]);
    report += name + ' :\n';
    for (var g = 0; g < group.length; g++) {
      report += '  • ' + group[g].data[INSCRIPTION_COLS.PROGRAMME - 1] + ' — ' + 
                formatCurrency(parseFloat(group[g].data[INSCRIPTION_COLS.PRIX - 1]) || 0) + '\n';
    }
    report += '\n';
  }
  report += 'Générer une facture par joueur ?';
  
  var confirm = ui.alert('Générer les factures', report, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  var count = 0;
  for (var pi = 0; pi < playerIds.length; pi++) {
    var result = createBillingFromInscriptions(byPlayer[playerIds[pi]], null);
    if (result) count++;
  }
  
  ui.alert('✅ ' + count + ' facture(s) générée(s).\nAutocrat les enverra dans l\'heure.', ui.ButtonSet.OK);
}

// ============================================================
// FAMILY BILLING
// ============================================================

function generateFamilyInvoiceUI() {
  var ui = SpreadsheetApp.getUi();
  
  var available = getAllAcceptedWithoutInvoice();
  if (available.length === 0) {
    ui.alert('Aucune inscription acceptée en attente de facturation.'); return;
  }
  
  // Group by player
  var byPlayer = {};
  for (var i = 0; i < available.length; i++) {
    var pId = String(available[i].data[INSCRIPTION_COLS.ID_JOUEUR - 1]);
    if (!byPlayer[pId]) byPlayer[pId] = { name: '', inscriptions: [] };
    byPlayer[pId].name = String(available[i].data[INSCRIPTION_COLS.NOM_COMPLET - 1]);
    byPlayer[pId].inscriptions.push(available[i]);
  }
  
  var playerIds = Object.keys(byPlayer);
  if (playerIds.length < 2) {
    ui.alert('Il faut au moins 2 joueurs pour une facture familiale.\nUtilisez "Générer la facture" pour un seul joueur.'); 
    return;
  }
  
  // Show available players and ask which to group
  var list = '';
  for (var p = 0; p < playerIds.length; p++) {
    list += (p + 1) + '. ' + byPlayer[playerIds[p]].name + ' (' + 
            byPlayer[playerIds[p]].inscriptions.length + ' programme(s))\n';
  }
  
  var selectPrompt = ui.prompt('Facture familiale',
    'Joueurs disponibles :\n\n' + list + 
    '\nEntrez les numéros à regrouper, séparés par des virgules\n(ex: 1,2 ou 1,3) :\n\n' +
    '⚠️ Maximum 3 membres par facture familiale.',
    ui.ButtonSet.OK_CANCEL);
  if (selectPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var selections = selectPrompt.getResponseText().split(',');
  var selectedInscriptions = [];
  var selectedNames = [];
  
  for (var s = 0; s < selections.length; s++) {
    var idx = parseInt(selections[s].trim()) - 1;
    if (idx >= 0 && idx < playerIds.length) {
      var pid = playerIds[idx];
      selectedInscriptions = selectedInscriptions.concat(byPlayer[pid].inscriptions);
      selectedNames.push(byPlayer[pid].name);
    }
  }
  
  if (selectedNames.length < 2) {
    ui.alert('Sélection invalide. Il faut au moins 2 joueurs.'); return;
  }
  if (selectedNames.length > 3) {
    ui.alert('Maximum 3 membres par facture familiale.'); return;
  }
  
  // Select payer
  var payerList = '';
  for (var pn = 0; pn < selectedNames.length; pn++) {
    payerList += (pn + 1) + '. ' + selectedNames[pn] + '\n';
  }
  
  var payerPrompt = ui.prompt('Sélectionner le payeur',
    'Qui est le payeur (nom et adresse sur la facture) ?\n\n' + payerList + 
    '\nEntrez le numéro :', ui.ButtonSet.OK_CANCEL);
  if (payerPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var payerIdx = parseInt(payerPrompt.getResponseText().trim()) - 1;
  if (payerIdx < 0 || payerIdx >= selectedNames.length) {
    ui.alert('Sélection invalide.'); return;
  }
  
  // Find the payer's inscription to get their info
  var payerInsIdx = 0;
  for (var pi2 = 0; pi2 < payerIdx; pi2++) {
    payerInsIdx += byPlayer[playerIds[parseInt(selections[pi2].trim()) - 1]].inscriptions.length;
  }
  var payerIns = selectedInscriptions[payerInsIdx].data;
  var payerPlayerId = String(payerIns[INSCRIPTION_COLS.ID_JOUEUR - 1]);
  
  var payerInfo = {
    playerId: payerPlayerId,
    name: String(payerIns[INSCRIPTION_COLS.NOM_COMPLET - 1]),
    email: String(payerIns[INSCRIPTION_COLS.EMAIL - 1]),
    address: getPlayerAddress(payerPlayerId)
  };
  
  // Count total line items (programs + potential cotisations)
  if (selectedInscriptions.length + selectedNames.length > MAX_LINE_ITEMS) {
    ui.alert('⚠️ Trop de lignes', 
      'Maximum ' + MAX_LINE_ITEMS + ' lignes par facture.\n' +
      'Programmes: ' + selectedInscriptions.length + ' + Cotisations potentielles: ' + selectedNames.length + 
      ' = ' + (selectedInscriptions.length + selectedNames.length), ui.ButtonSet.OK);
    return;
  }
  
  var confirm = ui.alert('Confirmer', 
    'Facture familiale pour : ' + selectedNames.join(', ') + 
    '\nPayeur : ' + payerInfo.name + 
    '\n\n' + selectedInscriptions.length + ' programme(s)', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  var result = createBillingFromInscriptions(selectedInscriptions, payerInfo);
  if (result) {
    ui.alert('✅ Facture familiale créée', 
      'No: ' + result.invoiceNumber + '\nAutocrat l\'enverra dans l\'heure.', ui.ButtonSet.OK);
  } else {
    ui.alert('Erreur lors de la création. Vérifiez les logs.');
  }
}

// ============================================================
// ABANDONMENT
// ============================================================

function markAbandonedUI() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  
  if (sheet.getName() !== SHEET_NAMES.BILLING) {
    ui.alert('Ouvrez l\'onglet "' + SHEET_NAMES.BILLING + '".'); return;
  }
  
  var rowIndex = SpreadsheetApp.getActiveRange().getRow();
  if (rowIndex < 2) { ui.alert('Sélectionnez une ligne de données.'); return; }
  
  var invoiceNo = sheet.getRange(rowIndex, BILLING_COLS.NO_FACTURE).getValue();
  var playerName = sheet.getRange(rowIndex, BILLING_COLS.NOM_COMPLET).getValue();
  var status = String(sheet.getRange(rowIndex, BILLING_COLS.STATUT).getValue());
  
  if (status !== BILLING_STATUS.SENT && status !== BILLING_STATUS.NOT_GENERATED) {
    ui.alert('Impossible — statut actuel : ' + status + '\n(Doit être "Envoyé" ou "Non généré")'); return;
  }
  
  var notesPrompt = ui.prompt('Raison de l\'abandon', 
    'Abandon de ' + invoiceNo + ' (' + playerName + ')\n\nRaison (sera ajoutée aux notes) :',
    ui.ButtonSet.OK_CANCEL);
  if (notesPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var result = markBillingAbandoned(rowIndex, notesPrompt.getResponseText().trim());
  
  if (result.success) {
    var msg = '🚫 Facture abandonnée\n' + invoiceNo + ' — ' + playerName + 
      '\nAutocrat enverra le courriel d\'abandon.';
    
    if (result.waitlistedPlayers.length > 0) {
      msg += '\n\n⚠️ LISTE D\'ATTENTE :';
      for (var w = 0; w < result.waitlistedPlayers.length; w++) {
        msg += '\n\nProgramme : ' + result.waitlistedPlayers[w].program;
        for (var wp = 0; wp < result.waitlistedPlayers[w].waitlistedPlayers.length; wp++) {
          var wpl = result.waitlistedPlayers[w].waitlistedPlayers[wp];
          msg += '\n  • ' + wpl.name;
        }
      }
      msg += '\n\nUtilisez "Promouvoir (liste d\'attente)" pour accepter un joueur.';
    }
    
    ui.alert('Abandon', msg, ui.ButtonSet.OK);
  }
}

// ============================================================
// WAITLIST PROMOTION
// ============================================================

function promoteFromWaitlistUI() {
  var ui = SpreadsheetApp.getUi();
  var result = getSelectedInscriptionRow_();
  if (!result) return;
  
  if (result.status !== INSCRIPTION_STATUS.WAITLISTED) {
    ui.alert('Cette inscription n\'est pas en attente.\nStatut actuel : ' + result.status); return;
  }
  
  var confirm = ui.alert('Promouvoir', 
    'Promouvoir ' + result.name + ' pour ' + result.programme + 
    ' ?\n\nUne facture sera générée et Autocrat l\'enverra.', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  // Change status to Accepted
  updateInscriptionStatus(result.rowIndex, INSCRIPTION_STATUS.ACCEPTED);
  
  // Generate invoice immediately
  var insData = getSheet(SHEET_NAMES.INSCRIPTIONS)
    .getRange(result.rowIndex, 1, 1, INSCRIPTION_TOTAL_COLS).getValues()[0];
  var billingResult = createBillingFromInscriptions(
    [{ rowIndex: result.rowIndex, data: insData }], null);
  
  if (billingResult) {
    ui.alert('✅ Promu', result.name + ' — ' + result.programme + 
      '\nFacture: ' + billingResult.invoiceNumber + '\nAutocrat l\'enverra.', ui.ButtonSet.OK);
  }
}

// ============================================================
// INVOICE REGENERATION
// ============================================================

function regenerateInvoiceUI() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  
  if (sheet.getName() !== SHEET_NAMES.BILLING) {
    ui.alert('Ouvrez l\'onglet "' + SHEET_NAMES.BILLING + '".'); return;
  }
  
  var rowIndex = SpreadsheetApp.getActiveRange().getRow();
  if (rowIndex < 2) { ui.alert('Sélectionnez une ligne.'); return; }
  
  var invoiceNo = String(sheet.getRange(rowIndex, BILLING_COLS.NO_FACTURE).getValue());
  var playerName = sheet.getRange(rowIndex, BILLING_COLS.NOM_COMPLET).getValue();
  
  var confirm = ui.alert('Régénérer', 
    'Annuler ' + invoiceNo + ' et créer une nouvelle facture ?\n\n' +
    'L\'ancienne facture sera marquée "Annulé".\nUne nouvelle facture avec un nouveau numéro sera créée.', 
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  // Void old invoice
  var voidedNo = voidInvoice(rowIndex);
  
  // Get linked inscriptions that are still accepted
  var insSheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var insLastRow = insSheet.getLastRow();
  if (insLastRow < 2) { ui.alert('Aucune inscription liée.'); return; }
  
  var insData = insSheet.getRange(2, 1, insLastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
  var linkedInscriptions = [];
  for (var i = 0; i < insData.length; i++) {
    if (String(insData[i][INSCRIPTION_COLS.NO_FACTURE - 1]) === invoiceNo &&
        String(insData[i][INSCRIPTION_COLS.STATUT - 1]) === INSCRIPTION_STATUS.ACCEPTED) {
      // Clear old invoice link
      insSheet.getRange(i + 2, INSCRIPTION_COLS.NO_FACTURE).setValue('');
      linkedInscriptions.push({ rowIndex: i + 2, data: insData[i] });
    }
  }
  
  if (linkedInscriptions.length === 0) {
    ui.alert('Facture annulée mais aucune inscription active à refacturer.'); return;
  }
  
  // Get payer info from old invoice
  var oldData = sheet.getRange(rowIndex, 1, 1, BILLING_TOTAL_COLS).getValues()[0];
  var payerInfo = {
    playerId: String(oldData[BILLING_COLS.ID_JOUEUR_PAYEUR - 1]),
    name: String(oldData[BILLING_COLS.NOM_COMPLET - 1]),
    email: String(oldData[BILLING_COLS.EMAIL - 1]),
    address: String(oldData[BILLING_COLS.ADRESSE_CLIENT - 1])
  };
  
  var newResult = createBillingFromInscriptions(linkedInscriptions, payerInfo);
  if (newResult) {
    // Mark the new invoice as replacing the old one
    var newSheet = getSheet(SHEET_NAMES.BILLING);
    newSheet.getRange(newResult.rowIndex, BILLING_COLS.FACTURE_REMPLACE).setValue(voidedNo);
    
    ui.alert('✅ Facture régénérée', 
      'Ancienne: ' + voidedNo + ' (Annulée)\nNouvelle: ' + newResult.invoiceNumber + 
      '\nAutocrat enverra la nouvelle facture.', ui.ButtonSet.OK);
  }
}

// ============================================================
// CREDIT NOTES
// ============================================================

function issueCreditNoteUI() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  
  if (sheet.getName() !== SHEET_NAMES.BILLING) {
    ui.alert('Ouvrez l\'onglet "' + SHEET_NAMES.BILLING + '".'); return;
  }
  
  var rowIndex = SpreadsheetApp.getActiveRange().getRow();
  if (rowIndex < 2) { ui.alert('Sélectionnez une ligne.'); return; }
  
  var status = String(sheet.getRange(rowIndex, BILLING_COLS.STATUT).getValue());
  if (status !== BILLING_STATUS.PAID) {
    ui.alert('Les notes de crédit s\'appliquent uniquement aux factures payées.\nStatut actuel : ' + status); 
    return;
  }
  
  var invoiceNo = sheet.getRange(rowIndex, BILLING_COLS.NO_FACTURE).getValue();
  
  // Ask for items to refund
  var itemsPrompt = ui.prompt('Note de crédit — ' + invoiceNo,
    'Entrez les articles à rembourser (1 par ligne) :\nFormat: Description | Code article | Montant\n\n' +
    'Exemple:\nEntraînement Adulte Jeudi | AB-ADT-ADV | 350',
    ui.ButtonSet.OK_CANCEL);
  if (itemsPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var lines = itemsPrompt.getResponseText().trim().split('\n');
  var removedItems = [];
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].split('|');
    if (parts.length >= 3) {
      removedItems.push({
        description: parts[0].trim(),
        codeArticle: parts[1].trim(),
        amount: parseFloat(parts[2].trim()) || 0
      });
    }
  }
  
  if (removedItems.length === 0) {
    ui.alert('Aucun article valide.'); return;
  }
  
  var reasonPrompt = ui.prompt('Raison du remboursement', 'Entrez la raison :', ui.ButtonSet.OK_CANCEL);
  if (reasonPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var result = createCreditNote(rowIndex, removedItems, reasonPrompt.getResponseText().trim());
  if (result) {
    ui.alert('💸 Note de crédit créée', 
      'No: ' + result.creditNoteNumber + 
      '\nRemboursement: ' + formatCurrency(result.refundAmount) +
      '\nSolde restant: ' + formatCurrency(result.remainingBalance) +
      '\nAutocrat enverra la note de crédit.', ui.ButtonSet.OK);
  }
}

// ============================================================
// DRIVE ORGANIZATION
// ============================================================

function organizeInvoicesUI() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert('Organiser les factures', 
    'Déplacer les PDFs dans les sous-dossiers selon leur statut ?\n\n' +
    '• À payer/ (Envoyé)\n• Payées/ (Payé)\n• Annulées/ (Abandonné, Annulé, Remboursé)\n• Notes de crédit/',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  var stats = organizeInvoicePDFs();
  
  ui.alert('📁 Organisation terminée', 
    stats.moved + ' fichier(s) déplacé(s)\n' + stats.errors + ' erreur(s)\n' + stats.skipped + ' ignoré(s)',
    ui.ButtonSet.OK);
}

// ============================================================
// REPROCESS FORM RESPONSE
// ============================================================

function reprocessFormResponse() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Retraiter une réponse',
    'Numéro de ligne dans "' + SHEET_NAMES.FORM_RESPONSES + '" :', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  var rowNum = parseInt(response.getResponseText());
  if (isNaN(rowNum) || rowNum < 2) { ui.alert('Numéro invalide.'); return; }
  
  var formSheet = getSheet(SHEET_NAMES.FORM_RESPONSES);
  var values = formSheet.getRange(rowNum, 1, 1, formSheet.getLastColumn()).getValues()[0];
  if (!values || !values[0]) { ui.alert('Aucune donnée à la ligne ' + rowNum + '.'); return; }
  
  var stringValues = values.map(function(v) { return String(v); });
  onFormSubmit({ values: stringValues });
  
  ui.alert('Réponse de la ligne ' + rowNum + ' retraitée.');
}

// ============================================================
// VERIFY CONFIGURATION
// ============================================================

function verifyConfiguration() {
  var ui = SpreadsheetApp.getUi();
  var issues = [];
  var info = [];
  
  var requiredKeys = [
    { key: CONFIG_KEYS.EMAIL_EXPEDITEUR, label: 'Email expéditeur' },
    { key: CONFIG_KEYS.SESSION_COURANTE, label: 'Session courante' },
    { key: CONFIG_KEYS.PROCHAIN_NO_FACTURE, label: 'Prochain no. facture' },
    { key: CONFIG_KEYS.PROCHAIN_ID_JOUEUR, label: 'Prochain ID joueur' },
    { key: CONFIG_KEYS.PROCHAIN_ID_INSCRIPTION, label: 'Prochain ID inscription' },
    { key: CONFIG_KEYS.PROCHAIN_ID_SOUMISSION, label: 'Prochain ID soumission' },
    { key: CONFIG_KEYS.COTISATION_PRIX, label: 'Prix cotisation' },
    { key: CONFIG_KEYS.COTISATION_DESCRIPTION, label: 'Description cotisation' },
    { key: CONFIG_KEYS.COTISATION_CODE_ARTICLE, label: 'Code article cotisation' },
    { key: CONFIG_KEYS.ADRESSE_ORG, label: 'Adresse organisation' },
    { key: CONFIG_KEYS.SITE_WEB, label: 'Site web' },
    { key: CONFIG_KEYS.NOM_ORG, label: 'Nom organisation' },
    { key: CONFIG_KEYS.DOSSIER_FACTURES_ID, label: 'Dossier Drive factures' }
  ];
  
  for (var i = 0; i < requiredKeys.length; i++) {
    var val = getConfig(requiredKeys[i].key);
    if (!val || String(val).trim() === '') {
      issues.push('❌ ' + requiredKeys[i].label);
    } else {
      info.push('✅ ' + requiredKeys[i].label + ': ' + val);
    }
  }
  
  // Check sheets
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requiredSheets = [
    SHEET_NAMES.FORM_RESPONSES, SHEET_NAMES.ROSTER, SHEET_NAMES.INSCRIPTIONS,
    SHEET_NAMES.BILLING, SHEET_NAMES.PRICING, SHEET_NAMES.CONFIG,
    SHEET_NAMES.NOTIFICATIONS, SHEET_NAMES.CREDIT_NOTES
  ];
  
  for (var j = 0; j < requiredSheets.length; j++) {
    if (ss.getSheetByName(requiredSheets[j])) {
      info.push('✅ Onglet: ' + requiredSheets[j]);
    } else {
      issues.push('❌ Onglet manquant: ' + requiredSheets[j]);
    }
  }
  
  // Cotisation year info
  var session = getConfig(CONFIG_KEYS.SESSION_COURANTE);
  if (session) {
    info.push('ℹ️ Année cotisation: ' + getCotisationYear(session));
  }
  
  info.push('');
  info.push('── Autocrat (5 jobs) ──');
  info.push('ℹ️ Vérifiez que les 5 jobs Autocrat sont configurés.');
  
  var report = '═══ VÉRIFICATION V2.0 ═══\n\n';
  if (issues.length > 0) {
    report += '⚠️ PROBLÈMES :\n' + issues.join('\n') + '\n\n';
  } else {
    report += '✅ Aucun problème !\n\n';
  }
  report += '── Configuration ──\n' + info.join('\n');
  
  ui.alert('Vérification', report, ui.ButtonSet.OK);
}

// ============================================================
// SESSION SUMMARY
// ============================================================

function showSessionSummary() {
  var ui = SpreadsheetApp.getUi();
  var session = getConfig(CONFIG_KEYS.SESSION_COURANTE);
  
  // Inscription stats
  var insSheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var insLastRow = insSheet.getLastRow();
  var insStats = { enRevision: 0, accepte: 0, enAttente: 0, refuse: 0, abandonne: 0 };
  
  if (insLastRow >= 2) {
    var insData = insSheet.getRange(2, 1, insLastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
    for (var i = 0; i < insData.length; i++) {
      if (String(insData[i][INSCRIPTION_COLS.SESSION - 1]) !== session) continue;
      var st = String(insData[i][INSCRIPTION_COLS.STATUT - 1]);
      if (st === INSCRIPTION_STATUS.EN_REVISION) insStats.enRevision++;
      else if (st === INSCRIPTION_STATUS.ACCEPTED) insStats.accepte++;
      else if (st === INSCRIPTION_STATUS.WAITLISTED) insStats.enAttente++;
      else if (st === INSCRIPTION_STATUS.REFUSED) insStats.refuse++;
      else if (st === INSCRIPTION_STATUS.ABANDONED) insStats.abandonne++;
    }
  }
  
  // Billing stats
  var billingSheet = getSheet(SHEET_NAMES.BILLING);
  var bilLastRow = billingSheet.getLastRow();
  var bilStats = { nonGenere: 0, envoye: 0, paye: 0, abandonne: 0, rembourse: 0, annule: 0, 
                   montantTotal: 0, montantPaye: 0 };
  
  if (bilLastRow >= 2) {
    var bilData = billingSheet.getRange(2, 1, bilLastRow - 1, BILLING_COLS.MONTANT).getValues();
    for (var j = 0; j < bilData.length; j++) {
      if (String(bilData[j][BILLING_COLS.SESSION - 1]) !== session) continue;
      var bst = String(bilData[j][BILLING_COLS.STATUT - 1]);
      var montant = parseFloat(bilData[j][BILLING_COLS.MONTANT - 1]) || 0;
      
      switch (bst) {
        case BILLING_STATUS.NOT_GENERATED: bilStats.nonGenere++; bilStats.montantTotal += montant; break;
        case BILLING_STATUS.SENT: bilStats.envoye++; bilStats.montantTotal += montant; break;
        case BILLING_STATUS.PAID: bilStats.paye++; bilStats.montantTotal += montant; bilStats.montantPaye += montant; break;
        case BILLING_STATUS.ABANDONED: bilStats.abandonne++; break;
        case BILLING_STATUS.REFUNDED: bilStats.rembourse++; break;
        case BILLING_STATUS.VOIDED: bilStats.annule++; break;
      }
    }
  }
  
  var report = '═══ SESSION ' + session + ' ═══\n\n' +
    '── Inscriptions ──\n' +
    '🔍 En révision: ' + insStats.enRevision + '\n' +
    '✅ Acceptées: ' + insStats.accepte + '\n' +
    '⏳ En attente: ' + insStats.enAttente + '\n' +
    '❌ Refusées: ' + insStats.refuse + '\n' +
    '🚫 Abandonnées: ' + insStats.abandonne + '\n\n' +
    '── Facturation ──\n' +
    '📋 Non générées: ' + bilStats.nonGenere + '\n' +
    '📧 Envoyées: ' + bilStats.envoye + '\n' +
    '✅ Payées: ' + bilStats.paye + '\n' +
    '🚫 Abandonnées: ' + bilStats.abandonne + '\n' +
    '💸 Remboursées: ' + bilStats.rembourse + '\n' +
    '🗑️ Annulées: ' + bilStats.annule + '\n\n' +
    '── Finances ──\n' +
    '💰 Revenu attendu: ' + formatCurrency(bilStats.montantTotal) + '\n' +
    '💵 Revenu reçu: ' + formatCurrency(bilStats.montantPaye) + '\n' +
    '📉 En attente: ' + formatCurrency(bilStats.montantTotal - bilStats.montantPaye);
  
  ui.alert('Résumé', report, ui.ButtonSet.OK);
}

// ============================================================
// SETUP SPREADSHEET
// ============================================================

function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var confirm = ui.alert('Configuration initiale V2.0',
    'Créer tous les onglets et la configuration initiale ?\n⚠️ Première installation uniquement.',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  // ---- Roster ----
  createSheetIfNotExists_(ss, SHEET_NAMES.ROSTER, [
    'ID Joueur', 'Prénom', 'Nom', 'Email', 'Téléphone',
    'Sexe', 'Année de naissance', 'Adresse',
    'No. Assurance maladie', 'Exp. Assurance maladie',
    'Contact urgence', 'Tél. urgence',
    'Allergie', 'Condition médicale',
    'Consentement photo', 'Consentement privé', 'Commentaires',
    'Première inscription', 'Dernière inscription',
    'Joueur de retour', 'Nb inscriptions'
  ], '#4a8c6f');
  
  // ---- Inscriptions (NEW) ----
  createSheetIfNotExists_(ss, SHEET_NAMES.INSCRIPTIONS, [
    'ID Inscription', 'ID Soumission', 'ID Joueur', 'Nom complet', 'Email',
    'Session', 'Programme', 'Code article', 'Prix', 'Statut',
    'No. Facture', 'Date soumission', 'Date décision', 'Notification envoyée', 'Notes'
  ], '#4a8c6f');
  
  // ---- Billing Tracker (V2) ----
  var billingSheet = ss.getSheetByName(SHEET_NAMES.BILLING);
  if (!billingSheet) {
    billingSheet = ss.insertSheet(SHEET_NAMES.BILLING);
    
    var coreHeaders = [
      'ID Temporaire', 'No. Facture', 'Nom complet (payeur)', 'Email (payeur)', 'Session',
      'Programme(s)', 'Cotisation', 'Montant', 'Statut',
      'Date facture', 'Date envoyé', 'Date paiement', 'Lien PDF', 'Joueurs inclus', 'Notes'
    ];
    
    var autocratHeaders = ['Adresse client'];
    for (var li = 1; li <= MAX_LINE_ITEMS; li++) {
      autocratHeaders.push('Ligne ' + li + ' Description');
      autocratHeaders.push('Ligne ' + li + ' Code article');
      autocratHeaders.push('Ligne ' + li + ' Prix');
    }
    autocratHeaders.push('Sous-total');
    
    var trackingHeaders = ['Reçu envoyé', 'Courriel abandon envoyé', 'Facture remplace', 'ID Joueur (payeur)'];
    
    var allHeaders = coreHeaders.concat(autocratHeaders).concat(trackingHeaders);
    billingSheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
    
    // Style
    billingSheet.getRange(1, 1, 1, coreHeaders.length)
      .setFontWeight('bold').setBackground('#4a8c6f').setFontColor('#ffffff');
    billingSheet.getRange(1, coreHeaders.length + 1, 1, autocratHeaders.length)
      .setFontWeight('bold').setBackground('#3d7ab5').setFontColor('#ffffff');
    billingSheet.getRange(1, coreHeaders.length + autocratHeaders.length + 1, 1, trackingHeaders.length)
      .setFontWeight('bold').setBackground('#d4a843').setFontColor('#ffffff');
    
    billingSheet.setFrozenRows(1);
    billingSheet.getRange(1, coreHeaders.length + 1)
      .setNote('Colonnes bleues = Autocrat. Ne pas modifier.');
    logAction('Onglet créé: ' + SHEET_NAMES.BILLING + ' (V2, 9 lignes, 48 colonnes)');
  }
  
  // ---- Notifications (NEW) ----
  createSheetIfNotExists_(ss, SHEET_NAMES.NOTIFICATIONS, [
    'ID Notification', 'ID Soumission', 'Nom complet', 'Email', 'Session',
    'Programme 1', 'Décision 1', 'Détail 1',
    'Programme 2', 'Décision 2', 'Détail 2',
    'Programme 3', 'Décision 3', 'Détail 3',
    'Type', 'Date', 'Notification envoyée'
  ], '#7b68ae');
  
  // ---- Credit Notes (NEW) ----
  createSheetIfNotExists_(ss, SHEET_NAMES.CREDIT_NOTES, [
    'No. Note de crédit', 'No. Facture originale', 'Nom complet', 'Email', 'Session', 'Date',
    'Ligne 1 Description', 'Ligne 1 Code article', 'Ligne 1 Montant',
    'Ligne 2 Description', 'Ligne 2 Code article', 'Ligne 2 Montant',
    'Ligne 3 Description', 'Ligne 3 Code article', 'Ligne 3 Montant',
    'Montant total remboursé', 'Solde restant', 'Raison', 'Lien PDF', 'Envoyée'
  ], '#c0392b');
  
  // ---- Pricing ----
  var pricingSheet = ss.getSheetByName(SHEET_NAMES.PRICING);
  if (!pricingSheet) {
    pricingSheet = ss.insertSheet(SHEET_NAMES.PRICING);
    pricingSheet.getRange(1, 1, 1, PRICING_TOTAL_COLS).setValues([[
      'Code article', 'Clé programme', 'Description facture',
      'Session', 'Prix', 'Mot-clé formulaire', 'Actif'
    ]]);
    pricingSheet.getRange(1, 1, 1, PRICING_TOTAL_COLS)
      .setFontWeight('bold').setBackground('#4a8c6f').setFontColor('#ffffff');
    pricingSheet.getRange(2, 1, 3, PRICING_TOTAL_COLS).setValues([
      ['AB-ADT-ADV', 'Jeudi H2026 Adulte', 'Entraînement Adulte: Avancés/Compétitifs Jeudi H2026', 'H2026', 350, 'Avancés/Compétitifs Jeudi H2026', 'Oui'],
      ['AB-ADT-TN', 'Dimanche H2026 Adulte', 'Entraînement Adulte: Tous Niveaux Dimanche H2026', 'H2026', 430, 'Tous Niveaux Dimanche H2026', 'Oui'],
      ['AB-JRN-TN', 'Dimanche H2026 Junior', 'Entraînement Junior : Tous Niveaux Dimanche H2026', 'H2026', 330, 'Junior : Tous Niveaux Dimanche H2026', 'Oui']
    ]);
    pricingSheet.getRange(2, PRICING_COLS.PRIX, 3, 1).setNumberFormat('$#,##0.00');
    pricingSheet.setFrozenRows(1);
    logAction('Onglet créé: ' + SHEET_NAMES.PRICING);
  }
  
  // ---- Configuration ----
  var configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_NAMES.CONFIG);
    configSheet.getRange(1, 1, 1, 2).setValues([['Clé', 'Valeur']]);
    configSheet.getRange(1, 1, 1, 2)
      .setFontWeight('bold').setBackground('#4a8c6f').setFontColor('#ffffff');
    
    var initialConfig = [
      [CONFIG_KEYS.NOM_ORG, 'Accès Badminton'],
      [CONFIG_KEYS.EMAIL_EXPEDITEUR, 'info@accesbadminton.ca'],
      [CONFIG_KEYS.SESSION_COURANTE, 'H2026'],
      [CONFIG_KEYS.PROCHAIN_NO_FACTURE, 1],
      [CONFIG_KEYS.PROCHAIN_ID_JOUEUR, 1],
      [CONFIG_KEYS.PROCHAIN_ID_INSCRIPTION, 1],
      [CONFIG_KEYS.PROCHAIN_ID_SOUMISSION, 1],
      [CONFIG_KEYS.PROCHAIN_ID_TEMPORAIRE, 1],
      [CONFIG_KEYS.PROCHAIN_NO_NOTE_CREDIT, 1],
      [CONFIG_KEYS.COTISATION_PRIX, 20],
      [CONFIG_KEYS.COTISATION_DESCRIPTION, 'Cotisation membre'],
      [CONFIG_KEYS.COTISATION_CODE_ARTICLE, 'AB-COT'],
      [CONFIG_KEYS.ADRESSE_ORG, '3355 Rue des Monarques, Saint-Hubert, Québec J3Y 0G7'],
      [CONFIG_KEYS.SITE_WEB, 'https://accesbadminton.ca/'],
      [CONFIG_KEYS.DOSSIER_FACTURES_ID, '']
    ];
    
    configSheet.getRange(2, 1, initialConfig.length, 2).setValues(initialConfig);
    configSheet.setColumnWidth(1, 250);
    configSheet.setColumnWidth(2, 400);
    configSheet.setFrozenRows(1);
    logAction('Onglet créé: ' + SHEET_NAMES.CONFIG);
  }
  
  ui.alert('Configuration V2.0 terminée',
    'Onglets créés :\n' +
    '• ' + SHEET_NAMES.ROSTER + '\n' +
    '• ' + SHEET_NAMES.INSCRIPTIONS + ' (NOUVEAU)\n' +
    '• ' + SHEET_NAMES.BILLING + ' (9 lignes, 48 colonnes)\n' +
    '• ' + SHEET_NAMES.NOTIFICATIONS + ' (NOUVEAU)\n' +
    '• ' + SHEET_NAMES.CREDIT_NOTES + ' (NOUVEAU)\n' +
    '• ' + SHEET_NAMES.PRICING + '\n' +
    '• ' + SHEET_NAMES.CONFIG + '\n\n' +
    'Prochaines étapes :\n' +
    '1. Liez le formulaire Google\n' +
    '2. Configurez le déclencheur onFormSubmit\n' +
    '3. Configurez les 5 jobs Autocrat (voir guide-autocrat.md)',
    ui.ButtonSet.OK);
}

// ============================================================
// MANUAL INSCRIPTION ENTRY
// ============================================================

/**
 * Allows the admin to manually add an inscription (e.g., phone registration).
 * Steps:
 * 1. Enter player email → finds existing or creates new player
 * 2. Select programs from the pricing table
 * 3. Creates inscription rows with proper IDs
 * 4. Admin then uses the normal accept → finalize → invoice flow
 */
function addManualInscriptionUI() {
  var ui = SpreadsheetApp.getUi();
  
  // Step 1: Player email
  var emailPrompt = ui.prompt('Inscription manuelle — Étape 1/3',
    'Courriel du joueur :', ui.ButtonSet.OK_CANCEL);
  if (emailPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var email = emailPrompt.getResponseText().trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) {
    ui.alert('Adresse courriel invalide.'); return;
  }
  
  // Check if player exists
  var existing = findPlayerByEmail(email);
  var playerId, playerName;
  
  if (existing) {
    var prenom = String(existing.data[ROSTER_COLS.PRENOM - 1]);
    var nom = String(existing.data[ROSTER_COLS.NOM - 1]);
    playerName = prenom + ' ' + nom;
    playerId = String(existing.data[ROSTER_COLS.ID_JOUEUR - 1]);
    
    ui.alert('Joueur trouvé', '✅ ' + playerName + ' (' + playerId + ')', ui.ButtonSet.OK);
  } else {
    // Create new player — minimal info
    var namePrompt = ui.prompt('Nouveau joueur',
      'Joueur non trouvé. Entrez les informations :\n\nPrénom Nom\n(ex: Jean Tremblay)',
      ui.ButtonSet.OK_CANCEL);
    if (namePrompt.getSelectedButton() !== ui.Button.OK) return;
    
    var nameParts = namePrompt.getResponseText().trim().split(' ');
    var prenom2 = nameParts[0] || '';
    var nom2 = nameParts.slice(1).join(' ') || '';
    
    if (!prenom2) { ui.alert('Prénom requis.'); return; }
    
    var addrPrompt = ui.prompt('Adresse',
      'Adresse complète (optionnel) :\n(ex: 123 Rue Principale, Ville, J1A 2B3)',
      ui.ButtonSet.OK_CANCEL);
    var address = (addrPrompt.getSelectedButton() === ui.Button.OK) ? addrPrompt.getResponseText().trim() : '';
    
    var result = createPlayer({
      email: email, prenom: prenom2, nom: nom2,
      adresse: address, sexe: '', anneeNaissance: '', telephone: '',
      noAssurance: '', expAssurance: '', contactUrgence: '', telUrgence: '',
      allergie: '', conditionMedicale: '', consentementPhoto: '',
      consentementPrive: '', commentaires: 'Inscription manuelle',
      timestamp: new Date()
    });
    playerId = result.playerId;
    playerName = prenom2 + ' ' + nom2;
    
    ui.alert('Joueur créé', '✅ ' + playerName + ' (' + playerId + ')', ui.ButtonSet.OK);
  }
  
  // Step 2: Select programs
  var pricingSheet = getSheet(SHEET_NAMES.PRICING);
  var pricingLastRow = pricingSheet.getLastRow();
  if (pricingLastRow < 2) { ui.alert('Aucun tarif configuré.'); return; }
  
  var pricingData = pricingSheet.getRange(2, 1, pricingLastRow - 1, PRICING_TOTAL_COLS).getValues();
  var programList = '';
  var activePrograms = [];
  var count = 0;
  
  for (var i = 0; i < pricingData.length; i++) {
    if (String(pricingData[i][PRICING_COLS.ACTIF - 1]) === 'Oui') {
      count++;
      activePrograms.push({
        index: count,
        codeArticle: String(pricingData[i][PRICING_COLS.CODE_ARTICLE - 1]),
        description: String(pricingData[i][PRICING_COLS.DESCRIPTION - 1]),
        session: String(pricingData[i][PRICING_COLS.SESSION - 1]),
        prix: parseFloat(pricingData[i][PRICING_COLS.PRIX - 1]) || 0
      });
      programList += count + '. ' + pricingData[i][PRICING_COLS.DESCRIPTION - 1] + 
                     ' — ' + formatCurrency(parseFloat(pricingData[i][PRICING_COLS.PRIX - 1]) || 0) + '\n';
    }
  }
  
  var progPrompt = ui.prompt('Inscription manuelle — Étape 2/3',
    'Programmes pour ' + playerName + ' :\n\n' + programList + 
    '\nEntrez les numéros séparés par des virgules\n(ex: 1,3) :',
    ui.ButtonSet.OK_CANCEL);
  if (progPrompt.getSelectedButton() !== ui.Button.OK) return;
  
  var selections = progPrompt.getResponseText().split(',');
  var selectedPrograms = [];
  for (var s = 0; s < selections.length; s++) {
    var idx = parseInt(selections[s].trim()) - 1;
    if (idx >= 0 && idx < activePrograms.length) {
      selectedPrograms.push(activePrograms[idx]);
    }
  }
  
  if (selectedPrograms.length === 0) { ui.alert('Aucun programme sélectionné.'); return; }
  
  // Step 3: Confirm and create
  var summary = 'Joueur : ' + playerName + ' (' + email + ')\n\n';
  for (var p = 0; p < selectedPrograms.length; p++) {
    summary += '• ' + selectedPrograms[p].description + ' — ' + formatCurrency(selectedPrograms[p].prix) + '\n';
  }
  
  var confirm = ui.alert('Inscription manuelle — Étape 3/3', summary + '\nCréer les inscriptions ?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  var session = getConfig(CONFIG_KEYS.SESSION_COURANTE);
  var insResult = createInscriptions(playerId, playerName, email, session, selectedPrograms, new Date());
  
  ui.alert('✅ Inscription manuelle créée',
    'Soumission : ' + insResult.submissionId + '\n' +
    selectedPrograms.length + ' programme(s) créé(s)\n\n' +
    'Prochaines étapes :\n' +
    '1. Accepter les inscriptions dans l\'onglet Inscriptions\n' +
    '2. Finaliser la révision (envoyer notification)\n' +
    '3. Générer la facture', ui.ButtonSet.OK);
}

// ============================================================
// PROPAGATE PLAYER DATA CHANGES
// ============================================================

/**
 * Propagates changes made to a player's Roster record to all
 * linked Inscriptions and Billing rows.
 * 
 * Use case: admin fixes a typo in the roster (name, email, address)
 * and wants the correction reflected everywhere.
 * 
 * The admin selects a row in the Roster sheet, then runs this action.
 */
function propagatePlayerDataUI() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  
  if (sheet.getName() !== SHEET_NAMES.ROSTER) {
    ui.alert('Ouvrez l\'onglet "' + SHEET_NAMES.ROSTER + '" et sélectionnez la ligne du joueur.'); 
    return;
  }
  
  var rowIndex = SpreadsheetApp.getActiveRange().getRow();
  if (rowIndex < 2) { ui.alert('Sélectionnez une ligne de données.'); return; }
  
  var rosterData = sheet.getRange(rowIndex, 1, 1, ROSTER_TOTAL_COLS).getValues()[0];
  var playerId = String(rosterData[ROSTER_COLS.ID_JOUEUR - 1]);
  var newName = String(rosterData[ROSTER_COLS.PRENOM - 1]) + ' ' + String(rosterData[ROSTER_COLS.NOM - 1]);
  var newEmail = String(rosterData[ROSTER_COLS.EMAIL - 1]);
  var newAddress = String(rosterData[ROSTER_COLS.ADRESSE - 1]);
  
  var confirm = ui.alert('Propager les modifications',
    'Mettre à jour toutes les inscriptions et factures pour :\n\n' +
    'ID: ' + playerId + '\n' +
    'Nom: ' + newName + '\n' +
    'Email: ' + newEmail + '\n' +
    'Adresse: ' + newAddress + '\n\n' +
    'Cela modifiera les onglets Inscriptions, Suivi de facturation et Notifications.',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  var stats = { inscriptions: 0, billing: 0, notifications: 0 };
  
  // Update Inscriptions
  var insSheet = getSheet(SHEET_NAMES.INSCRIPTIONS);
  var insLastRow = insSheet.getLastRow();
  if (insLastRow >= 2) {
    var insData = insSheet.getRange(2, 1, insLastRow - 1, INSCRIPTION_TOTAL_COLS).getValues();
    for (var i = 0; i < insData.length; i++) {
      if (String(insData[i][INSCRIPTION_COLS.ID_JOUEUR - 1]) === playerId) {
        insSheet.getRange(i + 2, INSCRIPTION_COLS.NOM_COMPLET).setValue(newName);
        insSheet.getRange(i + 2, INSCRIPTION_COLS.EMAIL).setValue(newEmail);
        stats.inscriptions++;
      }
    }
  }
  
  // Update Billing (where this player is the payer)
  var bilSheet = getSheet(SHEET_NAMES.BILLING);
  var bilLastRow = bilSheet.getLastRow();
  if (bilLastRow >= 2) {
    var bilData = bilSheet.getRange(2, 1, bilLastRow - 1, BILLING_TOTAL_COLS).getValues();
    for (var j = 0; j < bilData.length; j++) {
      if (String(bilData[j][BILLING_COLS.ID_JOUEUR_PAYEUR - 1]) === playerId) {
        bilSheet.getRange(j + 2, BILLING_COLS.NOM_COMPLET).setValue(newName);
        bilSheet.getRange(j + 2, BILLING_COLS.EMAIL).setValue(newEmail);
        bilSheet.getRange(j + 2, BILLING_COLS.ADRESSE_CLIENT).setValue(newAddress);
        stats.billing++;
      }
      // Also update "Joueurs inclus" if this player appears in a family invoice
      var joueursInclus = String(bilData[j][BILLING_COLS.JOUEURS_INCLUS - 1]);
      if (joueursInclus.indexOf(playerId) !== -1) {
        // Rebuild the player list from linked inscriptions
        // (simpler: just update the name in the string isn't reliable, skip for now)
      }
    }
  }
  
  // Update Notifications
  var notifSheet = getSheet(SHEET_NAMES.NOTIFICATIONS);
  var notifLastRow = notifSheet.getLastRow();
  if (notifLastRow >= 2) {
    var notifData = notifSheet.getRange(2, 1, notifLastRow - 1, NOTIFICATION_TOTAL_COLS).getValues();
    for (var k = 0; k < notifData.length; k++) {
      // Match by email (notifications don't store player ID)
      var notifEmail = String(notifData[k][NOTIFICATION_COLS.EMAIL - 1]).toLowerCase();
      if (notifEmail === newEmail.toLowerCase() || 
          notifEmail === String(insData && insData[0] ? insData[0][INSCRIPTION_COLS.EMAIL - 1] : '').toLowerCase()) {
        notifSheet.getRange(k + 2, NOTIFICATION_COLS.NOM_COMPLET).setValue(newName);
        notifSheet.getRange(k + 2, NOTIFICATION_COLS.EMAIL).setValue(newEmail);
        stats.notifications++;
      }
    }
  }
  
  ui.alert('✅ Propagation terminée',
    'Joueur: ' + newName + '\n\n' +
    stats.inscriptions + ' inscription(s) mise(s) à jour\n' +
    stats.billing + ' facture(s) mise(s) à jour\n' +
    stats.notifications + ' notification(s) mise(s) à jour\n\n' +
    '⚠️ Note : Si une facture déjà envoyée a été modifiée, \n' +
    'vous devrez la régénérer pour que le PDF reflète les changements.',
    ui.ButtonSet.OK);
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

function createSheetIfNotExists_(ss, name, headers, color) {
  if (ss.getSheetByName(name)) return;
  var sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground(color).setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  logAction('Onglet créé: ' + name);
}

function getSelectedInscriptionRow_() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  
  if (sheet.getName() !== SHEET_NAMES.INSCRIPTIONS) {
    ui.alert('Ouvrez l\'onglet "' + SHEET_NAMES.INSCRIPTIONS + '".'); return null;
  }
  
  var rowIndex = SpreadsheetApp.getActiveRange().getRow();
  if (rowIndex < 2) { ui.alert('Sélectionnez une ligne de données.'); return null; }
  
  var data = sheet.getRange(rowIndex, 1, 1, INSCRIPTION_TOTAL_COLS).getValues()[0];
  
  return {
    rowIndex: rowIndex,
    data: data,
    name: String(data[INSCRIPTION_COLS.NOM_COMPLET - 1]),
    email: String(data[INSCRIPTION_COLS.EMAIL - 1]),
    programme: String(data[INSCRIPTION_COLS.PROGRAMME - 1]),
    status: String(data[INSCRIPTION_COLS.STATUT - 1]),
    submissionId: String(data[INSCRIPTION_COLS.ID_SOUMISSION - 1]),
    notified: String(data[INSCRIPTION_COLS.NOTIFICATION_ENVOYEE - 1])
  };
}
