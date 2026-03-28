/**
 * GAS Web アプリ: 受付 API（API設計書 §4）
 * 注: GAS の制約で HTTP ステータスを細かく付けられない場合があるため、本文 JSON の ok / error で判別する。
 */

function doGet() {
  return jsonResponse_({ ok: true, service: 'qr-reception', version: 1 });
}

function doOptions() {
  return jsonResponse_({ ok: true });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonError_('bad_request', 400);
    }
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonError_('bad_request', 400);
    }

    var participantId = body.participantId != null ? String(body.participantId).trim() : '';
    var staffMemo = body.staffMemo != null ? String(body.staffMemo) : '';
    var passphrase = body.passphrase != null ? String(body.passphrase) : '';

    if (!participantId) {
      return jsonError_('bad_request', 400);
    }

    if (passphrase !== getPassphrase_()) {
      return jsonError_('unauthorized', 401);
    }

    var rowInfo = findMasterRow_(participantId);
    if (!rowInfo) {
      return jsonError_('not_found', 404);
    }

    var logEntry = appendReceptionLog_(participantId, staffMemo);
    var participant = buildParticipantPayload_(rowInfo.values);

    return jsonResponse_({
      ok: true,
      participant: participant,
      log: logEntry
    });
  } catch (err) {
    Logger.log(err);
    return jsonError_('internal', 500);
  }
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
