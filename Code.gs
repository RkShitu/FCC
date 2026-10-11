/**
 * Faujdarhat Cadet College Smart Dashboard
 * Google Apps Script Web App API
 *
 * Sheet structure is created automatically by setup().
 * Store these values in Apps Script > Project Settings > Script Properties:
 *   SPREADSHEET_ID = your Google Spreadsheet ID
 *   ADMIN_PIN_HASH = SHA-256 hex hash of your admin PIN
 */

const APP = {
  DATA_SHEET: 'AppData',
  AUDIT_SHEET: 'AuditLog',
  STATE_KEY: 'APP_STATE',
  SESSION_PREFIX: 'FCC_SESSION_',
  SESSION_TTL: 21600 // 6 hours
};

function setup() {
  // ONE-CLICK SETUP:
  // 1) Automatically creates the Google Spreadsheet if it does not exist.
  // 2) Automatically creates AppData, AuditLog and Setup sheets.
  // 3) Automatically generates a strong 6-digit admin PIN on first setup.
  // 4) Saves all configuration in Script Properties.
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SPREADSHEET_ID');
  let ss;

  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('Faujdarhat Cadet College Smart Dashboard - Database');
    id = ss.getId();
    props.setProperty('SPREADSHEET_ID', id);
  }

  ensureSheets_(ss);

  let pin = null;
  if (!props.getProperty('ADMIN_PIN_HASH')) {
    pin = String(Math.floor(100000 + Math.random() * 900000));
    props.setProperty('ADMIN_PIN_HASH', sha256_(pin));
    props.setProperty('SETUP_COMPLETED_AT', new Date().toISOString());
  }

  let setupSheet = ss.getSheetByName('Setup');
  if (!setupSheet) setupSheet = ss.insertSheet('Setup');
  setupSheet.clear();
  setupSheet.getRange(1,1,8,2).setValues([
    ['ITEM','VALUE'],
    ['Status','READY'],
    ['Spreadsheet URL',ss.getUrl()],
    ['Web App URL','Deploy this Apps Script as Web app and paste the /exec URL into Dashboard'],
    ['Admin PIN',pin || 'Already configured — use your existing PIN'],
    ['Created/Updated',new Date()],
    ['Dashboard','Faujdarhat Cadet College Smart Dashboard'],
    ['Security','Do not share this Setup sheet publicly']
  ]);
  setupSheet.getRange('A1:B1').setFontWeight('bold');
  setupSheet.setFrozenRows(1);

  if (pin) {
    ss.toast('Setup complete! Your Admin PIN is: ' + pin, 'Faujdarhat Dashboard', 10);
    console.log('SETUP COMPLETE — Admin PIN: ' + pin);
  } else {
    ss.toast('Setup already completed. Existing Admin PIN remains unchanged.', 'Faujdarhat Dashboard', 8);
  }

  return {
    ok: true,
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    adminPin: pin || '(existing PIN — not changed)',
    message: 'Now deploy this Apps Script as Web app, copy the /exec URL, and paste it into Dashboard API Setup.'
  };
}

function doGet() {
  try {
    const ss = getSpreadsheet_();
    const state = readState_(ss);
    return json_({ ok: true, data: state, timestamp: new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').toLowerCase();

    if (action === 'login') return login_(body);
    if (action === 'session') return session_(body);
    if (action === 'logout') return logout_(body);
    if (action === 'save') return save_(body);
    if (action === 'change_pin') return changePin_(body);
    if (action === 'swap_request') return saveSwapRequest_(body);

    return json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID is not configured.');
  return SpreadsheetApp.openById(id);
}

function ensureSheets_(ss) {
  let data = ss.getSheetByName(APP.DATA_SHEET);
  if (!data) data = ss.insertSheet(APP.DATA_SHEET);
  if (data.getLastRow() === 0) {
    data.getRange(1, 1, 1, 3).setValues([['KEY', 'VALUE', 'UPDATED_AT']]);
    data.setFrozenRows(1);
  }

  let audit = ss.getSheetByName(APP.AUDIT_SHEET);
  if (!audit) audit = ss.insertSheet(APP.AUDIT_SHEET);
  if (audit.getLastRow() === 0) {
    audit.getRange(1, 1, 1, 5).setValues([['TIMESTAMP', 'ACTION', 'USER', 'STATUS', 'DETAIL']]);
    audit.setFrozenRows(1);
  }
}

function readState_(ss) {
  const sheet = ss.getSheetByName(APP.DATA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  const row = rows.find(r => String(r[0]) === APP.STATE_KEY);
  if (!row || !row[1]) return {};
  try { return JSON.parse(String(row[1])); }
  catch (err) { throw new Error('Stored APP_STATE is invalid JSON.'); }
}

function writeState_(ss, state) {
  ensureSheets_(ss);
  const sheet = ss.getSheetByName(APP.DATA_SHEET);
  const payload = JSON.stringify(state || {});
  const now = new Date();
  const rows = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues()
    : [];
  const index = rows.findIndex(r => String(r[0]) === APP.STATE_KEY);
  if (index >= 0) {
    sheet.getRange(index + 2, 2, 1, 2).setValues([[payload, now]]);
  } else {
    sheet.appendRow([APP.STATE_KEY, payload, now]);
  }
  sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).setNumberFormat('@');
}

function login_(body) {
  const pin = String(body.pin || '');
  if (!pin) return json_({ ok: false, error: 'PIN required.' });

  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN_HASH');
  if (!expected || sha256_(pin) !== String(expected).toLowerCase()) {
    audit_('login', 'anonymous', 'DENIED', 'Invalid PIN');
    return json_({ ok: false, error: 'Invalid PIN.' });
  }

  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put(APP.SESSION_PREFIX + token, '1', APP.SESSION_TTL);
  audit_('login', 'admin', 'OK', 'Session created');
  return json_({ ok: true, authenticated: true, token: token, expiresIn: APP.SESSION_TTL });
}

function changePin_(body) {
  if (!verifySession_(body.token)) return json_({ ok: false, error: 'Session expired. Please login again.' });
  const currentPin = String(body.currentPin || '');
  const newPin = String(body.newPin || '');
  if (newPin.length < 4) return json_({ ok: false, error: 'New PIN must be at least 4 characters.' });
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('ADMIN_PIN_HASH');
  if (!expected || sha256_(currentPin) !== String(expected).toLowerCase()) {
    audit_('change_pin', 'admin', 'DENIED', 'Invalid current PIN');
    return json_({ ok: false, error: 'বর্তমান PIN সঠিক নয়।' });
  }
  props.setProperty('ADMIN_PIN_HASH', sha256_(newPin));
  props.setProperty('ADMIN_PIN_UPDATED_AT', new Date().toISOString());
  audit_('change_pin', 'admin', 'OK', 'Admin PIN changed');
  return json_({ ok: true, message: 'Admin password/PIN পরিবর্তন হয়েছে এবং Google Apps Script-এ সংরক্ষিত হয়েছে।' });
}

function session_(body) {
  const ok = verifySession_(body.token);
  return json_({ ok: true, authenticated: ok });
}

function logout_(body) {
  if (body.token) CacheService.getScriptCache().remove(APP.SESSION_PREFIX + String(body.token));
  return json_({ ok: true });
}

function save_(body) {
  if (!verifySession_(body.token)) return json_({ ok: false, error: 'Session expired. Please login again.', code: 'AUTH_EXPIRED' });
  if (!body.data || typeof body.data !== 'object') return json_({ ok: false, error: 'No data supplied.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet_();
    writeState_(ss, sanitiseState_(body.data));
    audit_('save', 'admin', 'OK', 'Dashboard state saved');
    return json_({ ok: true, message: 'Data saved successfully.', timestamp: new Date().toISOString() });
  } finally {
    lock.releaseLock();
  }
}

function saveSwapRequest_(body) {
  const request = body.request || {};
  const ss = getSpreadsheet_();
  ensureSheets_(ss);
  const sheet = ss.getSheetByName(APP.AUDIT_SHEET);
  sheet.appendRow([new Date(), 'swap_request', 'public', 'NEW', JSON.stringify(request)]);
  return json_({ ok: true });
}

function sanitiseState_(data) {
  // Keep the schema extensible while preventing huge accidental payloads.
  const state = JSON.parse(JSON.stringify(data));
  const raw = JSON.stringify(state);
  if (raw.length > 5 * 1024 * 1024) throw new Error('State payload is too large.');
  return state;
}

function verifySession_(token) {
  if (!token) return false;
  const cache = CacheService.getScriptCache();
  const key = APP.SESSION_PREFIX + String(token);
  const valid = cache.get(key) === '1';
  if (valid) cache.put(key, '1', APP.SESSION_TTL); // sliding expiry
  return valid;
}

function audit_(action, user, status, detail) {
  try {
    const ss = getSpreadsheet_();
    ensureSheets_(ss);
    ss.getSheetByName(APP.AUDIT_SHEET).appendRow([new Date(), action, user, status, detail]);
  } catch (err) {
    console.warn(err);
  }
}

function sha256_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Missing request body.');
  const raw = String(e.postData.contents);
  try { return JSON.parse(raw); }
  catch (err) { throw new Error('Invalid JSON request.'); }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run this once in the Apps Script editor to generate a PIN hash. */
function generateAdminPinHash() {
  const pin = Browser.inputBox('Enter new admin PIN:');
  if (pin === 'cancel') return;
  Logger.log(sha256_(pin));
}
