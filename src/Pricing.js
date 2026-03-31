/**
 * Pricing.js — Pricing lookup and calculation
 * 
 * Reads from the "Tarifs" sheet to match form checkbox
 * selections to program prices.
 * 
 * Tarifs sheet structure (7 columns):
 *   A: Code article    (e.g., AB-ADT-ADV)
 *   B: Clé programme   (e.g., Jeudi H2026 Adulte)
 *   C: Description      (invoice line item text)
 *   D: Session          (e.g., H2026)
 *   E: Prix             (e.g., 350.00)
 *   F: Mot-clé          (partial match key for form checkbox text)
 *   G: Actif            (Oui/Non — only active rows are matched)
 */

// ============================================================
// MATCH FORM CHOICES TO PROGRAMS
// ============================================================

/**
 * Parses the form checkbox response (comma-separated string)
 * and matches each choice to a pricing row using keyword matching.
 * 
 * Only matches rows where Actif = "Oui".
 * 
 * @param {string} formChoicesString - The raw checkbox response from the form.
 *   Example: "Entraînement Adulte: Avancés/Compétitifs Jeudi H2026 350$, ..."
 * @returns {Array<Object>} - Array of matched programs:
 *   [{ codeArticle, cle, description, session, prix }]
 */
function matchPrograms(formChoicesString) {
  if (!formChoicesString || String(formChoicesString).trim() === '') {
    return [];
  }
  
  var pricingSheet = getSheet(SHEET_NAMES.PRICING);
  var lastRow = pricingSheet.getLastRow();
  
  if (lastRow < 2) {
    logAction('ATTENTION: Le tableau des tarifs est vide.');
    return [];
  }
  
  var pricingData = pricingSheet.getRange(2, 1, lastRow - 1, PRICING_TOTAL_COLS).getValues();
  
  // Split form choices — Google Forms uses ", " as separator for checkboxes
  var choices = String(formChoicesString).split(', ');
  var matched = [];
  
  for (var c = 0; c < choices.length; c++) {
    var choice = choices[c].trim();
    if (!choice) continue;
    
    var found = false;
    for (var p = 0; p < pricingData.length; p++) {
      // Only match active rows
      var actif = String(pricingData[p][PRICING_COLS.ACTIF - 1]).trim();
      if (actif !== 'Oui') continue;
      
      var keyword = String(pricingData[p][PRICING_COLS.MOT_CLE - 1]).trim();
      if (keyword && choice.indexOf(keyword) !== -1) {
        matched.push({
          codeArticle: String(pricingData[p][PRICING_COLS.CODE_ARTICLE - 1]).trim(),
          cle: pricingData[p][PRICING_COLS.CLE_PROGRAMME - 1],
          description: pricingData[p][PRICING_COLS.DESCRIPTION - 1],
          session: pricingData[p][PRICING_COLS.SESSION - 1],
          prix: parseFloat(pricingData[p][PRICING_COLS.PRIX - 1]) || 0
        });
        found = true;
        break;
      }
    }
    
    if (!found) {
      logAction('ATTENTION: Aucune correspondance tarifaire pour: "' + choice + '"');
      // Add as unmatched with $0 so it still shows up for manual review
      matched.push({
        codeArticle: 'N/A',
        cle: 'NON_TROUVÉ',
        description: choice,
        session: getConfig(CONFIG_KEYS.SESSION_COURANTE),
        prix: 0
      });
    }
  }
  
  return matched;
}

// ============================================================
// COTISATION (MEMBERSHIP FEE) HELPER
// ============================================================

/**
 * Returns the cotisation price from configuration.
 * 
 * @returns {number} Cotisation price
 */
function getCotisationPrice() {
  return parseFloat(getConfig(CONFIG_KEYS.COTISATION_PRIX)) || 20.00;
}

/**
 * Returns the cotisation description from configuration.
 * 
 * @returns {string}
 */
function getCotisationDescription() {
  return getConfig(CONFIG_KEYS.COTISATION_DESCRIPTION) || 'Cotisation membre';
}

/**
 * Returns the cotisation article code from configuration.
 * 
 * @returns {string}
 */
function getCotisationCodeArticle() {
  return getConfig(CONFIG_KEYS.COTISATION_CODE_ARTICLE) || 'AB-COT';
}

// ============================================================
// CALCULATE TOTAL
// ============================================================

/**
 * Calculates the total amount for a set of programs,
 * optionally including the cotisation.
 * 
 * @param {Array<Object>} programs - Array from matchPrograms()
 * @param {boolean} includeCotisation - Whether to add membership fee
 * @returns {number} Total amount
 */
function calculateTotal(programs, includeCotisation) {
  var total = 0;
  
  for (var i = 0; i < programs.length; i++) {
    total += programs[i].prix;
  }
  
  if (includeCotisation) {
    total += getCotisationPrice();
  }
  
  return total;
}

/**
 * Determines if cotisation should be included based on form response.
 * 
 * @param {string} memberResponse - The radio button response from the form
 * @returns {boolean} true if cotisation should be added to the invoice
 */
function shouldIncludeCotisation(memberResponse) {
  // The option for "I want to become a member" starts with "Je désire"
  return String(memberResponse).indexOf('Je désire') !== -1 ||
         String(memberResponse).indexOf('I wish to become') !== -1;
}

/**
 * Builds a human-readable list of program descriptions.
 * 
 * @param {Array<Object>} programs - Array from matchPrograms()
 * @returns {string} Comma-separated descriptions
 */
function formatProgramList(programs) {
  var descriptions = [];
  for (var i = 0; i < programs.length; i++) {
    descriptions.push(programs[i].description);
  }
  return descriptions.join(', ');
}
