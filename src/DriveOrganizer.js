/**
 * DriveOrganizer.js — Google Drive PDF folder management (NEW in V2.0)
 * 
 * Autocrat saves all generated PDFs to a single folder.
 * This module provides a menu action to organize PDFs into
 * subfolders by billing status for audit purposes.
 * 
 * Folder structure:
 *   Factures Accès Badminton/
 *   ├── À payer/      (Envoyé status)
 *   ├── Payées/        (Payé status)
 *   ├── Annulées/      (Abandonné, Annulé, Remboursé)
 *   └── Notes de crédit/
 * 
 * Called from menu: "📁 Organiser les factures (Drive)"
 */

// ============================================================
// ORGANIZE INVOICE PDFS
// ============================================================

/**
 * Organizes invoice PDFs into subfolders based on billing status.
 * Reads the billing tracker, finds PDFs by their Drive link,
 * and moves them to the appropriate subfolder.
 * 
 * @returns {Object} { moved, errors, skipped }
 */
function organizeInvoicePDFs() {
  var mainFolderId = getConfig(CONFIG_KEYS.DOSSIER_FACTURES_ID);
  
  if (!mainFolderId) {
    logAction('ERREUR: ID du dossier de factures non configuré (dossier_factures_id).');
    return { moved: 0, errors: 0, skipped: 0 };
  }
  
  var mainFolder;
  try {
    mainFolder = DriveApp.getFolderById(mainFolderId);
  } catch (e) {
    logAction('ERREUR: Impossible d\'accéder au dossier de factures: ' + e.message);
    return { moved: 0, errors: 0, skipped: 0 };
  }
  
  // Create/get subfolders
  var subfolders = {
    aPayer:       getOrCreateSubfolder(mainFolder, 'À payer'),
    payees:       getOrCreateSubfolder(mainFolder, 'Payées'),
    annulees:     getOrCreateSubfolder(mainFolder, 'Annulées'),
    creditNotes:  getOrCreateSubfolder(mainFolder, 'Notes de crédit')
  };
  
  // Map billing statuses to subfolders
  var statusFolderMap = {};
  statusFolderMap[BILLING_STATUS.SENT] = subfolders.aPayer;
  statusFolderMap[BILLING_STATUS.NOT_GENERATED] = subfolders.aPayer;
  statusFolderMap[BILLING_STATUS.PAID] = subfolders.payees;
  statusFolderMap[BILLING_STATUS.ABANDONED] = subfolders.annulees;
  statusFolderMap[BILLING_STATUS.VOIDED] = subfolders.annulees;
  statusFolderMap[BILLING_STATUS.REFUNDED] = subfolders.annulees;
  
  var stats = { moved: 0, errors: 0, skipped: 0 };
  
  // Process billing tracker PDFs
  var billingSheet = getSheet(SHEET_NAMES.BILLING);
  var lastRow = billingSheet.getLastRow();
  
  if (lastRow >= 2) {
    var data = billingSheet.getRange(2, 1, lastRow - 1, BILLING_TOTAL_COLS).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var pdfLink = String(data[i][BILLING_COLS.LIEN_PDF - 1]).trim();
      var status = String(data[i][BILLING_COLS.STATUT - 1]);
      
      if (!pdfLink) {
        stats.skipped++;
        continue;
      }
      
      var targetFolder = statusFolderMap[status];
      if (!targetFolder) {
        stats.skipped++;
        continue;
      }
      
      try {
        var fileId = extractFileIdFromLink(pdfLink);
        if (fileId) {
          moveFileToFolder(fileId, targetFolder, mainFolder);
          stats.moved++;
        } else {
          stats.skipped++;
        }
      } catch (e) {
        logAction('ERREUR déplacement PDF ligne ' + (i + 2) + ': ' + e.message);
        stats.errors++;
      }
    }
  }
  
  // Process credit note PDFs
  var creditSheet = getSheet(SHEET_NAMES.CREDIT_NOTES);
  var creditLastRow = creditSheet.getLastRow();
  
  if (creditLastRow >= 2) {
    var creditData = creditSheet.getRange(2, 1, creditLastRow - 1, CREDIT_NOTE_TOTAL_COLS).getValues();
    
    for (var j = 0; j < creditData.length; j++) {
      var cnPdfLink = String(creditData[j][CREDIT_NOTE_COLS.LIEN_PDF - 1]).trim();
      
      if (!cnPdfLink) {
        stats.skipped++;
        continue;
      }
      
      try {
        var cnFileId = extractFileIdFromLink(cnPdfLink);
        if (cnFileId) {
          moveFileToFolder(cnFileId, subfolders.creditNotes, mainFolder);
          stats.moved++;
        }
      } catch (e) {
        logAction('ERREUR déplacement note de crédit ligne ' + (j + 2) + ': ' + e.message);
        stats.errors++;
      }
    }
  }
  
  logAction('Organisation Drive terminée: ' + stats.moved + ' déplacé(s), ' + 
            stats.errors + ' erreur(s), ' + stats.skipped + ' ignoré(s)');
  
  return stats;
}

// ============================================================
// DRIVE HELPERS
// ============================================================

/**
 * Gets or creates a subfolder within a parent folder.
 * 
 * @param {GoogleAppsScript.Drive.Folder} parent
 * @param {string} name
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateSubfolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

/**
 * Extracts a Google Drive file ID from a URL.
 * Handles various URL formats (drive.google.com/file/d/..., docs.google.com, etc.)
 * 
 * @param {string} url
 * @returns {string|null} File ID or null
 */
function extractFileIdFromLink(url) {
  if (!url) return null;
  
  // Format: /file/d/FILE_ID/ or /d/FILE_ID/
  var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  
  // Format: ?id=FILE_ID
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  
  // Format: open?id=FILE_ID
  match = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  
  return null;
}

/**
 * Moves a file from one folder to another.
 * In Google Drive, files can be in multiple folders.
 * This removes the file from the main folder and adds it to the target.
 * 
 * @param {string} fileId
 * @param {GoogleAppsScript.Drive.Folder} targetFolder
 * @param {GoogleAppsScript.Drive.Folder} sourceFolder
 */
function moveFileToFolder(fileId, targetFolder, sourceFolder) {
  var file = DriveApp.getFileById(fileId);
  
  // Check if already in target folder
  var parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === targetFolder.getId()) {
      return; // Already in the right folder
    }
  }
  
  // Add to target, remove from source
  targetFolder.addFile(file);
  sourceFolder.removeFile(file);
}
