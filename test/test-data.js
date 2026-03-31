/**
 * test-data.js — Sample test data and test functions
 * 
 * Use these functions to test the system without needing
 * real form submissions. Run from the Apps Script editor.
 * 
 * ⚠️ REMOVE OR DISABLE BEFORE PRODUCTION USE
 */

// ============================================================
// SIMULATE FORM SUBMISSION
// ============================================================

/**
 * Simulates a form submission for testing.
 * Creates a fake event object that mimics Google Forms' onFormSubmit event.
 * 
 * This test will:
 * 1. Create a new player in the roster
 * 2. Match programs to pricing (2 programs + cotisation)
 * 3. Create a billing record with flattened Autocrat data
 */
function testFormSubmit_NewPlayer() {
  var fakeEvent = {
    values: [
      '2026-03-27 10:30:00',                    // Timestamp
      'marie.tremblay@gmail.com',                // Email (collect email)
      'Marie',                                   // Prénom
      'Tremblay',                                // Nom
      'Féminin / Female',                        // Sexe
      '1995',                                    // Année de naissance
      '514-555-1234',                            // Téléphone
      'TREM95031234',                            // No. assurance maladie
      '2027-03-15',                              // Exp. assurance maladie
      'Jean Tremblay',                           // Contact urgence
      '514-555-5678',                            // Tél. urgence
      '123 Rue Principale',                      // Adresse
      'Montréal',                                // Ville
      'H2X 1A1',                                 // Code postal
      'Aucune',                                  // Allergie
      'Aucune',                                  // Condition médicale
      'Je désire devenir membre et la cotisation sera incluse dans la facture / I wish to become a member and the membership fee will be included in the invoice.',  // Membre
      'Entraînement Adulte: Tous Niveaux Dimanche H2026 430$, Entraînement Adulte: Avancés/Compétitifs Jeudi H2026 350$',  // Choix activité
      'Oui',                                     // Consentement photo
      'oui',                                     // Consentement privé
      ''                                         // Commentaires
    ]
  };
  
  onFormSubmit(fakeEvent);
  Logger.log('=== Test nouveau joueur terminé ===');
  Logger.log('Vérifiez:');
  Logger.log('  1. Répertoire des joueurs — nouveau joueur ajouté');
  Logger.log('  2. Suivi de facturation — nouvelle ligne avec statut "Non généré"');
  Logger.log('  3. Colonnes Autocrat (O-AI) — données aplaties pour le PDF');
}

/**
 * Simulates a RETURNING player submission (same email as above).
 */
function testFormSubmit_ReturningPlayer() {
  var fakeEvent = {
    values: [
      '2026-03-28 14:00:00',                    // Timestamp
      'marie.tremblay@gmail.com',                // Same email = returning
      'Marie',                                   // Prénom
      'Tremblay',                                // Nom
      'Féminin / Female',                        // Sexe
      '1995',                                    // Année de naissance
      '514-555-9999',                            // Updated phone
      'TREM95031234',                            // Same
      '2027-03-15',                              // Same
      'Jean Tremblay',                           // Same
      '514-555-5678',                            // Same
      '456 Nouveau Boulevard',                   // New address
      'Longueuil',                               // New city
      'J4K 2B3',                                 // New postal code
      'Aucune',                                  // Same
      'Aucune',                                  // Same
      'Oui, je me suis inscrit et j\'ai payé ma cotisation / Yes, I signed up and paid my membership fee.',  // Already member
      'Entraînement Adulte: Tous Niveaux Dimanche H2026 430$',  // Only one program
      'Oui',                                     // Same
      'oui',                                     // Same
      'Je reviens pour une autre session!'        // Comment
    ]
  };
  
  onFormSubmit(fakeEvent);
  Logger.log('=== Test joueur de retour terminé ===');
  Logger.log('Vérifiez:');
  Logger.log('  1. Répertoire — "Joueur de retour" = Oui, "Nb inscriptions" = 2');
  Logger.log('  2. Suivi — devrait montrer "Facture existante" (même session)');
}

/**
 * Simulates a junior player submission.
 */
function testFormSubmit_JuniorPlayer() {
  var fakeEvent = {
    values: [
      '2026-03-27 11:00:00',
      'parent.junior@gmail.com',
      'Lucas',
      'Dupont',
      'Masculin / Male',
      '2012',
      '438-555-7890',
      'DUPO12091234',
      '2028-09-01',
      'Sophie Dupont',
      '438-555-1111',
      '789 Avenue des Pins',
      'Saint-Hubert',
      'J3Y 0G7',
      'Arachides',
      'Asthme léger',
      'Je désire devenir membre et la cotisation sera incluse dans la facture / I wish to become a member and the membership fee will be included in the invoice.',
      'Entraînement Junior : Tous Niveaux Dimanche H2026 330$',
      'Oui',
      'oui',
      'Première fois au badminton'
    ]
  };
  
  onFormSubmit(fakeEvent);
  Logger.log('=== Test joueur junior terminé ===');
  Logger.log('Vérifiez:');
  Logger.log('  1. Code article dans colonnes Autocrat = AB-JRN-TN');
  Logger.log('  2. Cotisation apparaît comme ligne supplémentaire (AB-COT)');
}

// ============================================================
// TEST PRICING (with article codes)
// ============================================================

/**
 * Tests the pricing matching logic, including article codes.
 */
function testPricingMatch() {
  var testCases = [
    'Entraînement Adulte: Avancés/Compétitifs Jeudi H2026 350$',
    'Entraînement Adulte: Tous Niveaux Dimanche H2026 430$',
    'Entraînement Junior : Tous Niveaux Dimanche H2026 330$',
    'Entraînement Adulte: Avancés/Compétitifs Jeudi H2026 350$, Entraînement Adulte: Tous Niveaux Dimanche H2026 430$'
  ];
  
  for (var i = 0; i < testCases.length; i++) {
    Logger.log('\n--- Test ' + (i + 1) + ' ---');
    Logger.log('Input: ' + testCases[i]);
    var result = matchPrograms(testCases[i]);
    Logger.log('Matched ' + result.length + ' program(s):');
    for (var j = 0; j < result.length; j++) {
      Logger.log('  [' + result[j].codeArticle + '] ' + result[j].description + ' — ' + formatCurrency(result[j].prix));
    }
    Logger.log('Total (with cotisation): ' + formatCurrency(calculateTotal(result, true)));
    Logger.log('Total (without cotisation): ' + formatCurrency(calculateTotal(result, false)));
  }
}

// ============================================================
// TEST FLATTENED LINE ITEMS (for Autocrat)
// ============================================================

/**
 * Tests the buildFlattenedLineItems function.
 * Verifies that line items are correctly flattened for Autocrat.
 */
function testFlattenedLineItems() {
  // Simulate 2 programs
  var programs = [
    { codeArticle: 'AB-ADT-ADV', cle: 'test', description: 'Adulte Avancés Jeudi', session: 'H2026', prix: 350 },
    { codeArticle: 'AB-ADT-TN', cle: 'test', description: 'Adulte Tous Niveaux Dimanche', session: 'H2026', prix: 430 }
  ];
  
  var flat = buildFlattenedLineItems(programs, true);
  
  Logger.log('=== Test données aplaties pour Autocrat ===');
  Logger.log('Nombre de valeurs: ' + flat.length + ' (attendu: ' + (MAX_LINE_ITEMS * 3) + ')');
  Logger.log('');
  
  for (var i = 0; i < MAX_LINE_ITEMS; i++) {
    var desc = flat[i * 3];
    var code = flat[i * 3 + 1];
    var prix = flat[i * 3 + 2];
    if (desc) {
      Logger.log('Ligne ' + (i + 1) + ': [' + code + '] ' + desc + ' — ' + prix);
    } else {
      Logger.log('Ligne ' + (i + 1) + ': (vide)');
    }
  }
}

// ============================================================
// CLEAN TEST DATA
// ============================================================

/**
 * Removes all test data from roster and billing sheets.
 * ⚠️ USE WITH CAUTION — this deletes real data too!
 */
function cleanTestData() {
  var ui = SpreadsheetApp.getUi();
  var confirm = ui.alert(
    '⚠️ Attention',
    'Cette action va supprimer TOUTES les données du répertoire et du suivi.\n\n' +
    'Êtes-vous sûr ?',
    ui.ButtonSet.YES_NO
  );
  
  if (confirm !== ui.Button.YES) return;
  
  var rosterSheet = getSheet(SHEET_NAMES.ROSTER);
  if (rosterSheet.getLastRow() > 1) {
    rosterSheet.deleteRows(2, rosterSheet.getLastRow() - 1);
  }
  
  var billingSheet = getSheet(SHEET_NAMES.BILLING);
  if (billingSheet.getLastRow() > 1) {
    billingSheet.deleteRows(2, billingSheet.getLastRow() - 1);
  }
  
  // Reset counters
  setConfig(CONFIG_KEYS.PROCHAIN_NO_FACTURE, 1);
  setConfig(CONFIG_KEYS.PROCHAIN_ID_JOUEUR, 1);
  
  ui.alert('Données nettoyées et compteurs réinitialisés.');
}
