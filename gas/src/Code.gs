/**
 * メニューとエントリ
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('QR受付')
    .addItem('スプレッドシートを初期化', 'menuSetupSpreadsheet')
    .addItem('テスト用マスタ行を投入', 'menuSeedTestMaster')
    .addSeparator()
    .addItem('QRメール下書きを1通作成（先頭データ行）', 'menuCreateSampleDraft')
    .addItem('下書き一斉送信（件名がプレフィックス一致）', 'menuSendDrafts')
    .addToUi();
}

function menuSetupSpreadsheet() {
  setupSpreadsheet();
}

function menuSeedTestMaster() {
  seedTestMasterRows();
}

function menuCreateSampleDraft() {
  try {
    createSampleDraftFromFirstRow();
    SpreadsheetApp.getUi().alert('下書きを1通作成しました。Gmail で内容を確認してください。');
  } catch (e) {
    SpreadsheetApp.getUi().alert('エラー: ' + e.message);
  }
}

function menuSendDrafts() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert(
    '確認',
    '件名が「' + getMailSubjectPrefix_() + '」で始まる下書きをすべて送信します。よろしいですか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (res !== ui.Button.OK) return;
  try {
    var n = sendAllDraftsMatchingPrefix();
    ui.alert('送信完了: ' + n + ' 通');
  } catch (e) {
    ui.alert('エラー: ' + e.message);
  }
}
