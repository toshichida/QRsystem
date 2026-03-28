/**
 * コンテナバインドのスプレッドシートを取得
 */
function getBoundSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Config シートを key -> value のマップで取得（1行目はヘッダ想定でスキップしない。A=key, B=value）
 */
function getConfigMap_() {
  var ss = getBoundSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!sh) {
    return {};
  }
  var values = sh.getDataRange().getValues();
  var map = {};
  for (var i = 0; i < values.length; i++) {
    var k = values[i][0];
    if (k === '' || k === null) continue;
    map[String(k).trim()] = values[i][1] == null ? '' : String(values[i][1]);
  }
  return map;
}

function getConfigValue_(key, defaultValue) {
  var m = getConfigMap_();
  if (m[key] !== undefined && m[key] !== '') {
    return m[key];
  }
  return defaultValue;
}

/**
 * cors_origin。未設定時は *（開発用。本番は設定シートで Pages のオリジンに更新）
 */
function getCorsOrigin_() {
  return getConfigValue_(CONFIG_KEYS.CORS_ORIGIN, '*');
}

function getPassphrase_() {
  return getConfigValue_(CONFIG_KEYS.PASSPHRASE, 'CHANGE_ME');
}

/**
 * participant オブジェクトに含めるフィールド名（マスタ列名）
 */
function getParticipantDisplayFields_() {
  var raw = getConfigValue_(CONFIG_KEYS.PARTICIPANT_DISPLAY_FIELDS, 'fullName,department,email');
  return raw.split(',').map(function (s) {
    return s.trim();
  }).filter(function (s) {
    return s.length > 0;
  });
}

function getMailSubjectPrefix_() {
  return getConfigValue_(CONFIG_KEYS.MAIL_SUBJECT_PREFIX, '[QR受付]');
}
