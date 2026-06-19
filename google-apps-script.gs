// ─────────────────────────────────────────────────────────────────────────────
// Callback VM System — Google Apps Script
// ─────────────────────────────────────────────────────────────────────────────

var NOTIFICATION_EMAIL = 'zotacvoicemail@gmail.com';
var SHEET_ID           = '1ai6NZwW2Inp3ta1uj48UTQeWMwXQfOBuU0iZP8tUFEM';

function doPost(e) {
  return doGet(e);
}

function doGet(e) {
  if (!e.parameter || !e.parameter.customerName && !e.parameter.type) {
    return ContentService
      .createTextOutput('Callback VM System script is running.')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  try {
    var data = e.parameter;

    if (data.type === 'attendance') {
      handleAttendance(data);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Callback Log ─────────────────────────────────────────────────────────
    var ss    = SpreadsheetApp.openById(SHEET_ID);
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
      "'" + (data.customerPhone || ''),
      data.customerTime  || '',
      data.agentName     || '',
      data.agentTime     || '',
      data.callDetails   || ''
    ]);

    sheet.autoResizeColumns(1, 7);

    // ── Email ─────────────────────────────────────────────────────────────────
    var subject = 'Voicemail Callback Done by ' + (data.agentName || 'Unknown') +
                  ' for Phone ' + (data.customerPhone || 'Unknown') +
                  ' ' + (data.customerName || '');
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, data.callDetails || '—');

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('doGet error:', err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance handling
// ─────────────────────────────────────────────────────────────────────────────

function handleAttendance(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Attendance Log');

  if (!sheet) {
    sheet = ss.insertSheet('Attendance Log');
    var headers = [
      'Timestamp (PH)', 'Agent', 'Action',
      'IP Address', 'Location', 'ISP / Network',
      'Device', 'OS', 'Browser', 'Screen Resolution',
      'Screenshot', 'Duration', 'Clock-In At', 'Hours (decimal)'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // ── Screenshot → Google Drive ────────────────────────────────────────────
  var screenshotLink = '—';
  if (data.screenshot && data.screenshot.length > 20) {
    try {
      var decoded = Utilities.base64Decode(data.screenshot);
      var filename = 'attendance_' + (data.agentName || 'unknown') +
                     '_' + (data.action || '') + '_' +
                     Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyyMMdd_HHmmss') + '.jpg';
      var blob   = Utilities.newBlob(decoded, 'image/jpeg', filename);
      var iter   = DriveApp.getFoldersByName('CallbackVM Screenshots');
      var folder = iter.hasNext() ? iter.next() : DriveApp.createFolder('CallbackVM Screenshots');
      var file   = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      screenshotLink = file.getUrl();
    } catch (imgErr) {
      console.error('Screenshot save error:', imgErr.toString());
      screenshotLink = '(upload failed)';
    }
  }

  // ── Append row ───────────────────────────────────────────────────────────
  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Manila', 'MM/dd/yyyy hh:mm:ss a'),
    data.agentName     || '',
    data.action        || '',
    data.ip            || '',
    data.location      || '',
    data.isp           || '',
    data.device        || '',
    data.os            || '',
    data.browser       || '',
    data.screenRes     || '',
    screenshotLink,
    data.duration      || '',
    data.clockInTime   || '',
    data.durationHours ? parseFloat(data.durationHours) : '',
  ]);
  sheet.autoResizeColumns(1, 14);

  // ── Email notification ───────────────────────────────────────────────────
  try {
    var action  = data.action || '';
    var subject = 'Attendance: ' + (data.agentName || 'Unknown') + ' — ' + action;
    var body    = 'Agent:    ' + (data.agentName || '') + '\n' +
                  'Action:   ' + action + '\n' +
                  'Time:     ' + (data.timestamp || '') + '\n' +
                  'IP:       ' + (data.ip || '') + '\n' +
                  'Location: ' + (data.location || '') + '\n' +
                  'Device:   ' + (data.device || '') + ' · ' + (data.os || '') + ' · ' + (data.browser || '') + '\n';
    if (action === 'CLOCK_OUT') {
      body += 'Duration: ' + (data.duration || '') + '  (' + (data.durationHours || '') + ' hrs)\n';
      body += 'Clock-in: ' + (data.clockInTime || '') + '\n';
    }
    if (screenshotLink !== '—' && screenshotLink !== '(upload failed)') {
      body += 'Screenshot: ' + screenshotLink + '\n';
    }
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (mailErr) {
    console.error('Attendance email error:', mailErr.toString());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Run these manually once to authorize all permissions
// ─────────────────────────────────────────────────────────────────────────────

function testEmail() {
  MailApp.sendEmail(
    NOTIFICATION_EMAIL,
    'Callback VM — Test Email',
    'If you received this, the email integration is working correctly.'
  );
  Logger.log('Test email sent to ' + NOTIFICATION_EMAIL);
}

function testAttendance() {
  handleAttendance({
    agentName:     'TestAgent',
    action:        'CLOCK_IN',
    timestamp:     Utilities.formatDate(new Date(), 'Asia/Manila', 'MMM d, yyyy h:mm:ss a'),
    ip:            '1.2.3.4',
    location:      'Manila, Philippines',
    isp:           'Test ISP',
    device:        'PC',
    os:            'Windows',
    browser:       'Chrome',
    screenRes:     '1920x1080',
    screenshot:    '',
  });
  Logger.log('testAttendance done — check the Attendance Log sheet tab.');
}
