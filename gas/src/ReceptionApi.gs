/**
 * GAS Web アプリ: 受付 API（API設計書 §4）
 * ブラウザは fetch ではなく JSONP（doGet + callback）を使う。GAS は ACAO を返しにくく、fetch は CORS で失敗しやすいため。
 */

function doGet(e) {
  try {
    var p = e.parameter;
    if (p.action === 'checkIn') {
      var result = runCheckInFromParams_(p);
      var cb = sanitizeJsonpCallback_(p.callback);
      if (cb) {
        return jsonpResponse_(cb, result);
      }
      if (result.ok) {
        return jsonResponse_(result);
      }
      return jsonResponse_({ ok: false, error: result.error, http: result.http });
    }
    return jsonResponse_({ ok: true, service: 'qr-reception', version: 1 });
  } catch (err) {
    Logger.log(err);
    return jsonError_('internal', 500);
  }
}

function doOptions() {
  return jsonResponse_({ ok: true });
}

function doPost(e) {
  try {
    var p = parsePostParams_(e);
    if (!p) {
      return jsonError_('bad_request', 400);
    }
    var result = runCheckInFromParams_(p);
    if (result.ok) {
      return jsonResponse_(result);
    }
    return jsonResponse_({ ok: false, error: result.error, http: result.http });
  } catch (err) {
    Logger.log(err);
    return jsonError_('internal', 500);
  }
}

/**
 * 受付処理の本体。成功時は { ok:true, participant, log }、失敗時は { ok:false, error, http }
 */
function runCheckInFromParams_(p) {
  var participantId = String(p.participantId || '').trim();
  var staffMemo = p.staffMemo != null ? String(p.staffMemo) : '';
  var passphrase = p.passphrase != null ? String(p.passphrase) : '';

  if (!participantId) {
    return { ok: false, error: 'bad_request', http: 400 };
  }
  if (passphrase !== getPassphrase_()) {
    return { ok: false, error: 'unauthorized', http: 401 };
  }
  var rowInfo = findMasterRow_(participantId);
  if (!rowInfo) {
    return { ok: false, error: 'not_found', http: 404 };
  }
  try {
    var logEntry = appendReceptionLog_(participantId, staffMemo);
    var participant = buildParticipantPayload_(rowInfo.values);
    return { ok: true, participant: participant, log: logEntry };
  } catch (err) {
    Logger.log(err);
    return { ok: false, error: 'internal', http: 500 };
  }
}

function parsePostParams_(e) {
  if (e.parameter && e.parameter.participantId !== undefined) {
    return {
      participantId: e.parameter.participantId,
      staffMemo: e.parameter.staffMemo,
      passphrase: e.parameter.passphrase
    };
  }
  if (e.postData && e.postData.contents) {
    var ct = (e.postData.type || '').toLowerCase();
    if (ct.indexOf('application/x-www-form-urlencoded') >= 0) {
      var sp = new URLSearchParams(e.postData.contents);
      return {
        participantId: sp.get('participantId'),
        staffMemo: sp.get('staffMemo'),
        passphrase: sp.get('passphrase')
      };
    }
    if (ct.indexOf('application/json') >= 0 || ct.indexOf('text/plain') >= 0) {
      try {
        var body = JSON.parse(e.postData.contents);
        return {
          participantId: body.participantId,
          staffMemo: body.staffMemo,
          passphrase: body.passphrase
        };
      } catch (ignore) {
        return null;
      }
    }
  }
  return null;
}

/** JSONP 用コールバック名（英数字と _ のみ） */
function sanitizeJsonpCallback_(name) {
  var s = name == null ? '' : String(name);
  if (s.length === 0 || s.length > 64) {
    return '';
  }
  if (!/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(s)) {
    return '';
  }
  return s;
}

function jsonpResponse_(callbackName, result) {
  var payload = JSON.stringify(result);
  return ContentService.createTextOutput(callbackName + '(' + payload + ');').setMimeType(
    ContentService.MimeType.JAVASCRIPT
  );
}

function findMasterRow_(participantId) {
  var ss = getBoundSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.MASTER);
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]).trim() === participantId) {
      return { rowIndex: r + 1, values: data[r] };
    }
  }
  return null;
}

function buildParticipantPayload_(rowValues) {
  var headers = MASTER_HEADERS;
  var obj = {};
  for (var c = 0; c < headers.length; c++) {
    obj[headers[c]] = rowValues[c];
  }
  var fields = getParticipantDisplayFields_();
  var out = {};
  for (var i = 0; i < fields.length; i++) {
    var key = fields[i];
    if (obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}

function appendReceptionLog_(participantId, staffMemo) {
  var ss = getBoundSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.LOG);
  if (!sh) {
    throw new Error('ReceptionLog シートがありません');
  }
  var now = new Date();
  var receptionAtIso = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  var row = [receptionAtIso, participantId, true, staffMemo];
  sh.appendRow(row);
  return {
    receptionAt: receptionAtIso,
    participantId: participantId,
    checkedIn: true,
    staffMemo: staffMemo
  };
}

function jsonResponse_(obj) {
  var origin = getCorsOrigin_();
  var out = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  try {
    if (out.setHeader) {
      out.setHeader('Access-Control-Allow-Origin', origin);
      out.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      out.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  } catch (ignore) {}
  return out;
}

function jsonError_(code, httpHint) {
  return jsonResponse_({ ok: false, error: code, http: httpHint });
}
