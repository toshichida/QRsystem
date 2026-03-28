/**
 * マスタ・受付ログ・設定シートを生成しヘッダーを書き込む（要件定義書 §4）
 */
function setupSpreadsheet() {
  var ss = getBoundSpreadsheet_();
  ensureSheetWithHeaders_(ss, SHEET_NAMES.MASTER, MASTER_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.LOG, LOG_HEADERS);
  ensureConfigSheet_(ss);
  SpreadsheetApp.getUi().alert('初期化が完了しました。Config の合言葉（passphrase）を変更してください。');
}

function ensureSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, headers.length);
}

function ensureConfigSheet_(ss) {
  var sh = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAMES.CONFIG);
  }
  sh.clear();
  sh.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  var rows = [
    [CONFIG_KEYS.PASSPHRASE, 'CHANGE_ME'],
    [CONFIG_KEYS.CORS_ORIGIN, '*'],
    [CONFIG_KEYS.PARTICIPANT_DISPLAY_FIELDS, 'fullName,department,email'],
    [CONFIG_KEYS.MAIL_SUBJECT_PREFIX, '[QR受付]']
  ];
  // getRange の (row, column, numRows, numColumns) は「終了行」ではなく行数・列数
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 2);
}

/**
 * テスト用マスタ行を数件追加（既にデータ行がある場合は先頭行のみ空なら追加）
 */
function seedTestMasterRows() {
  var ss = getBoundSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.MASTER);
  if (!sh) {
    SpreadsheetApp.getUi().alert('先に「スプレッドシートを初期化」を実行してください。');
    return;
  }
  var last = sh.getLastRow();
  var startRow = last < 2 ? 2 : last + 1;
  var samples = [
    ['demo-001', '山田 太郎', '営業部', 'yamada.demo@example.com'],
    ['demo-002', '佐藤 花子', '開発部', 'sato.demo@example.com'],
    ['demo-003', '鈴木 一郎', '総務部', 'suzuki.demo@example.com']
  ];
  sh.getRange(startRow, 1, samples.length, MASTER_HEADERS.length).setValues(samples);
  SpreadsheetApp.getUi().alert('テスト用マスタを ' + samples.length + ' 行追加しました。メール列はダミーです。');
}
