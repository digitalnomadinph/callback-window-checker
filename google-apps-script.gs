// ─────────────────────────────────────────────────────────────────────────────
// Callback Window Checker — Google Apps Script
//
// DEPLOY INSTRUCTIONS:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Delete all existing code, paste this entire file
//  3. Click Deploy → New Deployment
//     Type:            Web App
//     Execute as:      Me
//     Who has access:  Anyone
//  4. Click Deploy → Authorize with your Google account when prompted
//  5. Copy the Web App URL and paste it into the app
//
// SHEET SETUP:
//  - The script will auto-create headers on first run.
//  - Name your sheet tab "Callback Log" (or leave it — the script will rename it).
// ─────────────────────────────────────────────────────────────────────────────

var NOTIFICATION_EMAIL = 'zotacvoicemail@gmail.com';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── Write to sheet ────────────────────────────────────────────────────
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Callback Log');

    if (!sheet) {
      sheet = ss.getActiveSheet();
      sheet.setName('Callback Log');
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp (PH)',
        'Customer Name',
        'Customer Phone',
        'Customer Local Time',
        'Agent',
        'Agent Time (PH)',
        'Call Details'
      ]);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Manila', 'MM/dd/yyyy hh:mm:ss a'),
      data.customerName  || '',
      data.customerPhone || '',
      data.customerTime  || '',
      data.agentName     || '',
      data.agentTime     || '',
      data.callDetails   || ''
    ]);

    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, 7);

    // ── Send email ────────────────────────────────────────────────────────
    var subject = 'Voicemail Callback Done by ' + (data.agentName || 'Unknown') +
                  ' for Phone ' + (data.customerPhone || 'Unknown');

    var body = [
      'Cust name: '    + (data.customerName  || '—'),
      'Cust phone: '   + (data.customerPhone || '—'),
      'Cust time: '    + (data.customerTime  || '—'),
      'Agent: '        + (data.agentName     || '—'),
      'Agent time: '   + (data.agentTime     || '—'),
      '',
      'Call Details:',
      data.callDetails || '—'
    ].join('\n');

    GmailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Health-check endpoint — open in browser to confirm the script is live
function doGet(e) {
  return ContentService
    .createTextOutput('Callback Window Checker script is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
