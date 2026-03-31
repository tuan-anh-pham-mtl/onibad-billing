/**
 * Config.js — Configuration, constants, and helpers
 * 
 * V2.0 — Two-layer architecture:
 *   Layer 1: Inscriptions (per-program decisions)
 *   Layer 2: Suivi de facturation (invoices, grouped from accepted inscriptions)
 * 
 * Additional sheets:
 *   - Notifications: consolidated review emails (1 per form submission)
 *   - Notes de crédit: refund tracking
 * 
 * HYBRID ARCHITECTURE:
 * - Apps Script handles: form trigger, dedup, roster, pricing, inscriptions, billing
 * - Autocrat handles: invoice PDF, emails (5 jobs total)
 * 
 * DEPLOYMENT NOTE:
 * Copy this file's content into the Apps Script editor
 * bound to the Billing Spreadsheet.
 */

// ============================================================
// SHEET NAMES
// ============================================================

var SHEET_NAMES = {
  FORM_RESPONSES: 'Réponses du formulaire',
  ROSTER:         'Répertoire des joueurs',
  INSCRIPTIONS:   'Inscriptions',
  BILLING:        'Suivi de facturation',
  PRICING:        'Tarifs',
  CONFIG:         'Configuration',
  NOTIFICATIONS:  'Notifications',
  CREDIT_NOTES:   'Notes de crédit'
};

// ============================================================
// COLUMN INDICES (1-based, matching sheet layout)
// ============================================================

/**
 * Répertoire des joueurs — column indices (UNCHANGED from V1)
 */
var ROSTER_COLS = {
  ID_JOUEUR:          1,  // A
  PRENOM:             2,  // B
  NOM:                3,  // C
  EMAIL:              4,  // D
  TELEPHONE:          5,  // E
  SEXE:               6,  // F
  ANNEE_NAISSANCE:    7,  // G
  ADRESSE:            8,  // H
  NO_ASSURANCE:       9,  // I
  EXP_ASSURANCE:      10, // J
  CONTACT_URGENCE:    11, // K
  TEL_URGENCE:        12, // L
  ALLERGIE:           13, // M
  CONDITION_MEDICALE: 14, // N
  CONSENTEMENT_PHOTO: 15, // O
  CONSENTEMENT_PRIVE: 16, // P
  COMMENTAIRES:       17, // Q
  PREMIERE_INSCRIPTION: 18, // R
  DERNIERE_INSCRIPTION: 19, // S
  JOUEUR_RETOUR:      20, // T
  NB_INSCRIPTIONS:    21  // U
};

var ROSTER_TOTAL_COLS = 21;

/**
 * Inscriptions — column indices (NEW in V2)
 * 
 * One row per player × program selection.
 * Admin makes per-program decisions here (accept/waitlist/reject).
 */
var INSCRIPTION_COLS = {
  ID_INSCRIPTION:       1,  // A — INS-NNN
  ID_SOUMISSION:        2,  // B — SUB-NNN (groups rows from same form)
  ID_JOUEUR:            3,  // C — links to roster
  NOM_COMPLET:          4,  // D
  EMAIL:                5,  // E
  SESSION:              6,  // F
  PROGRAMME:            7,  // G — description from pricing
  CODE_ARTICLE:         8,  // H — e.g., AB-ADT-ADV
  PRIX:                 9,  // I
  STATUT:               10, // J — En révision / Accepté / En attente / Refusé / Abandonné
  NO_FACTURE:           11, // K — filled when invoice generated
  DATE_SOUMISSION:      12, // L
  DATE_DECISION:        13, // M — when admin changed status
  NOTIFICATION_ENVOYEE: 14, // N — Oui/Non
  NOTES:                15  // O — free text, "⚠️ Soumission en double"
};

var INSCRIPTION_TOTAL_COLS = 15;

/**
 * Suivi de facturation — column indices (V2: 48 columns)
 * 
 * Core data (A-O): 15 columns — managed by Apps Script
 * Autocrat merge data (P-AR): 29 columns — read by Autocrat
 * Tracking data (AS-AV): 4 columns — status tracking
 * 
 * KEY CHANGES from V1:
 * - Invoice number assigned JIT (when status → Non généré)
 * - Temp ID used before invoice number exists
 * - 9 line item slots (up from 6)
 * - Supports family billing (payer name/email)
 * - No more "En révision" or "Refusé" at this level (moved to Inscriptions)
 */
var BILLING_COLS = {
  // --- Core billing data (A-O) ---
  ID_TEMPORAIRE:    1,  // A — TEMP-NNN
  NO_FACTURE:       2,  // B — FACT-H2026-NNN (JIT)
  NOM_COMPLET:      3,  // C — payer name
  EMAIL:            4,  // D — payer email
  SESSION:          5,  // E
  PROGRAMMES:       6,  // F — comma-separated
  COTISATION:       7,  // G — Oui/Non
  MONTANT:          8,  // H — total
  STATUT:           9,  // I
  DATE_FACTURE:     10, // J — set when Non généré
  DATE_ENVOYE:      11, // K — Autocrat sets
  DATE_PAYE:        12, // L — admin sets
  LIEN_PDF:         13, // M — Autocrat sets
  JOUEURS_INCLUS:   14, // N — all player names (family billing)
  NOTES:            15, // O — admin free text

  // --- Flattened data for Autocrat (P-AR) ---
  ADRESSE_CLIENT:   16, // P — full address for invoice

  LIGNE_1_DESC:     17, // Q
  LIGNE_1_CODE:     18, // R
  LIGNE_1_PRIX:     19, // S
  LIGNE_2_DESC:     20, // T
  LIGNE_2_CODE:     21, // U
  LIGNE_2_PRIX:     22, // V
  LIGNE_3_DESC:     23, // W
  LIGNE_3_CODE:     24, // X
  LIGNE_3_PRIX:     25, // Y
  LIGNE_4_DESC:     26, // Z
  LIGNE_4_CODE:     27, // AA
  LIGNE_4_PRIX:     28, // AB
  LIGNE_5_DESC:     29, // AC
  LIGNE_5_CODE:     30, // AD
  LIGNE_5_PRIX:     31, // AE
  LIGNE_6_DESC:     32, // AF
  LIGNE_6_CODE:     33, // AG
  LIGNE_6_PRIX:     34, // AH
  LIGNE_7_DESC:     35, // AI
  LIGNE_7_CODE:     36, // AJ
  LIGNE_7_PRIX:     37, // AK
  LIGNE_8_DESC:     38, // AL
  LIGNE_8_CODE:     39, // AM
  LIGNE_8_PRIX:     40, // AN
  LIGNE_9_DESC:     41, // AO
  LIGNE_9_CODE:     42, // AP
  LIGNE_9_PRIX:     43, // AQ

  SOUS_TOTAL:       44, // AR

  // --- Tracking data (AS-AV) ---
  RECU_ENVOYE:              45, // AS — Oui/Non
  COURRIEL_ABANDON_ENVOYE:  46, // AT — Oui/Non
  FACTURE_REMPLACE:         47, // AU — ref to voided invoice
  ID_JOUEUR_PAYEUR:         48  // AV — back-ref to roster
};

var BILLING_TOTAL_COLS = 48;

// Number of line item slots for Autocrat
var MAX_LINE_ITEMS = 9;

/**
 * Notifications — column indices (NEW in V2)
 * 
 * One row per consolidated notification email.
 * Contains flattened program+decision data for Autocrat.
 * 3 program slots (matching current form options).
 */
var NOTIFICATION_COLS = {
  ID_NOTIFICATION:      1,  // A
  ID_SOUMISSION:        2,  // B — links to inscriptions
  NOM_COMPLET:          3,  // C
  EMAIL:                4,  // D
  SESSION:              5,  // E
  PROGRAMME_1:          6,  // F
  DECISION_1:           7,  // G — Accepté / En attente / Refusé
  DETAIL_1:             8,  // H — reason or "Facture à suivre"
  PROGRAMME_2:          9,  // I
  DECISION_2:           10, // J
  DETAIL_2:             11, // K
  PROGRAMME_3:          12, // L
  DECISION_3:           13, // M
  DETAIL_3:             14, // N
  TYPE:                 15, // O — "Révision initiale" / "Mise à jour"
  DATE:                 16, // P
  NOTIFICATION_ENVOYEE: 17  // Q — Oui/Non (Autocrat condition)
};

var NOTIFICATION_TOTAL_COLS = 17;
var MAX_NOTIFICATION_PROGRAMS = 3;

/**
 * Notes de crédit — column indices (NEW in V2)
 * 
 * One row per credit note. Up to 3 removed items.
 */
var CREDIT_NOTE_COLS = {
  NO_NOTE_CREDIT:       1,  // A — NC-H2026-NNN
  NO_FACTURE_ORIGINALE: 2,  // B — reference
  NOM_COMPLET:          3,  // C
  EMAIL:                4,  // D
  SESSION:              5,  // E
  DATE:                 6,  // F
  LIGNE_1_DESC:         7,  // G — removed item
  LIGNE_1_CODE:         8,  // H
  LIGNE_1_MONTANT:      9,  // I — negative
  LIGNE_2_DESC:         10, // J
  LIGNE_2_CODE:         11, // K
  LIGNE_2_MONTANT:      12, // L
  LIGNE_3_DESC:         13, // M
  LIGNE_3_CODE:         14, // N
  LIGNE_3_MONTANT:      15, // O
  MONTANT_REMBOURSE:    16, // P — total refund
  SOLDE_RESTANT:        17, // Q — remaining on original
  RAISON:               18, // R
  LIEN_PDF:             19, // S
  ENVOYEE:              20  // T — Oui/Non (Autocrat condition)
};

var CREDIT_NOTE_TOTAL_COLS = 20;
var MAX_CREDIT_ITEMS = 3;

/**
 * Tarifs — column indices (UNCHANGED from V1)
 */
var PRICING_COLS = {
  CODE_ARTICLE:     1, // A
  CLE_PROGRAMME:    2, // B
  DESCRIPTION:      3, // C
  SESSION:          4, // D
  PRIX:             5, // E
  MOT_CLE:          6, // F
  ACTIF:            7  // G
};

var PRICING_TOTAL_COLS = 7;

// ============================================================
// STATUSES
// ============================================================

/**
 * Inscription statuses (Layer 1 — per-program decisions)
 */
var INSCRIPTION_STATUS = {
  EN_REVISION: 'En révision',
  ACCEPTED:    'Accepté',
  WAITLISTED:  'En attente',
  REFUSED:     'Refusé',
  ABANDONED:   'Abandonné'
};

/**
 * Billing statuses (Layer 2 — invoice lifecycle)
 * 
 * Note: "En révision" and "Refusé" no longer exist at this level.
 * Those decisions happen on the Inscriptions sheet.
 */
var BILLING_STATUS = {
  NOT_GENERATED: 'Non généré',
  SENT:          'Envoyé',
  PAID:          'Payé',
  ABANDONED:     'Abandonné',
  REFUNDED:      'Remboursé',
  VOIDED:        'Annulé'
};

// ============================================================
// REJECTION REASONS
// Labels used in the menu dialog and stored in the notification.
// The actual email text is defined in the Autocrat Google Docs template.
// ============================================================

var REJECTION_REASONS = {
  TROP_JEUNE: {
    code: 'TROP_JEUNE',
    label: 'Joueur trop jeune pour participer'
  },
  PLACES_EXCEDEES: {
    code: 'PLACES_EXCEDEES',
    label: 'Nombre de places excédé'
  },
  AUTRE: {
    code: 'AUTRE',
    label: 'Autre (raison personnalisée)'
  }
};

// ============================================================
// CONFIGURATION KEYS
// ============================================================

var CONFIG_KEYS = {
  NOM_ORG:                'nom_org',
  EMAIL_EXPEDITEUR:       'email_expediteur',
  SESSION_COURANTE:       'session_courante',
  PROCHAIN_NO_FACTURE:    'prochain_no_facture',
  PROCHAIN_ID_JOUEUR:     'prochain_id_joueur',
  PROCHAIN_ID_INSCRIPTION: 'prochain_id_inscription',
  PROCHAIN_ID_SOUMISSION: 'prochain_id_soumission',
  PROCHAIN_ID_TEMPORAIRE: 'prochain_id_temporaire',
  PROCHAIN_NO_NOTE_CREDIT: 'prochain_no_note_credit',
  COTISATION_PRIX:        'cotisation_prix',
  COTISATION_DESCRIPTION: 'cotisation_description',
  COTISATION_CODE_ARTICLE: 'cotisation_code_article',
  ADRESSE_ORG:            'adresse_org',
  SITE_WEB:               'site_web',
  DOSSIER_FACTURES_ID:    'dossier_factures_id'
};

// ============================================================
// CONFIGURATION SHEET HELPERS
// ============================================================

/**
 * Reads a config value from the Configuration sheet.
 * The Configuration sheet has 2 columns: Key (A) and Value (B).
 * 
 * @param {string} key - The configuration key to look up
 * @returns {string} The value, or empty string if not found
 */
function getConfig(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!configSheet) {
    throw new Error('Configuration sheet "' + SHEET_NAMES.CONFIG + '" not found.');
  }
  
  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return '';
}

/**
 * Writes a config value to the Configuration sheet.
 * 
 * @param {string} key - The configuration key
 * @param {*} value - The value to write
 */
function setConfig(key, value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!configSheet) {
    throw new Error('Configuration sheet "' + SHEET_NAMES.CONFIG + '" not found.');
  }
  
  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      configSheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // Key not found — add new row
  configSheet.appendRow([key, value]);
}

// ============================================================
// HELPER: Get sheet by name
// ============================================================

/**
 * Returns the specified sheet from the active spreadsheet.
 * Throws an error if the sheet doesn't exist.
 * 
 * @param {string} sheetName - Name of the sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" not found. Please check your spreadsheet setup.');
  }
  return sheet;
}

// ============================================================
// COTISATION YEAR LOGIC
// ============================================================

/**
 * Derives the cotisation year from a session code.
 * A cotisation year runs September to June (Automne + Hiver).
 * 
 * Examples:
 *   A2025 → "2025-2026"  (Automne starts the year)
 *   H2026 → "2025-2026"  (Hiver continues same year)
 *   A2026 → "2026-2027"
 *   H2027 → "2026-2027"
 * 
 * @param {string} sessionCode - e.g., "H2026" or "A2025"
 * @returns {string} Cotisation year e.g., "2025-2026"
 */
function getCotisationYear(sessionCode) {
  var prefix = String(sessionCode).charAt(0).toUpperCase();
  var year = parseInt(String(sessionCode).substring(1));
  
  if (isNaN(year)) {
    logAction('ATTENTION: Code session invalide pour calcul cotisation: ' + sessionCode);
    return '';
  }
  
  if (prefix === 'A') {
    // Automne starts the cotisation year
    return year + '-' + (year + 1);
  } else if (prefix === 'H') {
    // Hiver is the second half of the cotisation year
    return (year - 1) + '-' + year;
  }
  
  // Fallback for unknown prefix
  logAction('ATTENTION: Préfixe de session inconnu: ' + prefix + ' dans ' + sessionCode);
  return year + '-' + (year + 1);
}

// ============================================================
// FORMATTING HELPERS
// ============================================================

/**
 * Formats a date as DD/MM/YYYY for display.
 */
function formatDate(date) {
  if (!date) date = new Date();
  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  return (d < 10 ? '0' : '') + d + '/' + (m < 10 ? '0' : '') + m + '/' + y;
}

/**
 * Formats a date as YYYY-MM-DD for file naming.
 */
function formatDateISO(date) {
  if (!date) date = new Date();
  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}

/**
 * Formats currency in CAD.
 * 
 * @param {number} amount
 * @returns {string} e.g. "$350.00"
 */
function formatCurrency(amount) {
  return '$' + Number(amount).toFixed(2);
}

/**
 * Pads a number with leading zeros.
 * 
 * @param {number} num - The number to pad
 * @param {number} length - Desired total length
 * @returns {string}
 */
function padNumber(num, length) {
  var s = String(num);
  while (s.length < length) {
    s = '0' + s;
  }
  return s;
}

/**
 * Logs an action for audit trail.
 * 
 * @param {string} action - Description of what happened
 */
function logAction(action) {
  Logger.log('[' + new Date().toISOString() + '] ' + action);
}
