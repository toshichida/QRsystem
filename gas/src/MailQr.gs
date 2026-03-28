/**
 * GoQR API（api.qrserver.com）から QR 画像 Blob を取得（要件・API設計書 §3）
 */
function fetchQrImageBlob_(participantId) {
  var data = encodeURIComponent(String(participantId));
  var url = GOQR_API_BASE + '?size=' + QR_IMAGE_SIZE + '&data=' + data;
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('GoQR HTTP ' + resp.getResponseCode());
  }
  return resp.getBlob().setName('qr-' + participantId + '.png');
}

/**
 * マスタ先頭のデータ行（2行目）を対象に、下書きを1通作成（運用確認用）
 */
function createSampleDraftFromFirstRow() {
  var ss = getBoundSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.MASTER);
  if (!sh || sh.getLastRow() < 2) {
    throw new Error('マスタにデータ行がありません。初期化とテスト行投入を行ってください。');
  }
  var row = sh.getRange(2, 1, 1, MASTER_HEADERS.length).getValues()[0];
  var pid = row[0];
  var fullName = row[1];
  var department = row[2];
  var email = row[3];
  if (!email) {
    throw new Error('2行目のメールアドレスが空です。');
  }
  createDraftForParticipant_(email, pid, fullName, department);
}

/**
 * 宛先ごとに 1 通、QR 添付・本文に ID を大きく表示（要件定義書 §5）
 */
function createDraftForParticipant_(to, participantId, fullName, department) {
  var blob = fetchQrImageBlob_(participantId);
  var prefix = getMailSubjectPrefix_();
  var subject = prefix + ' 参加確認 QR / ' + participantId;
  var body = buildMailHtml_(participantId, fullName, department);
  GmailApp.createDraft(to, subject, '', {
    htmlBody: body,
    attachments: [blob],
    name: 'QR受付システム'
  });
}

function buildMailHtml_(participantId, fullName, department) {
  var esc = function (s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  return (
    '<div style="font-family:sans-serif;line-height:1.6;">' +
    '<p>' +
    esc(fullName) +
    ' 様（' +
    esc(department) +
    '）</p>' +
    '<p style="font-size:28px;font-weight:bold;letter-spacing:2px;margin:16px 0;">' +
    esc(participantId) +
    '</p>' +
    '<p style="font-size:14px;color:#444;">上記 ID が QR コードにエンコードされています。当日はこのメールの添付 QR をご提示ください。</p>' +
    '</div>'
  );
}

/**
 * 下書きフォルダ内で、件名がプレフィックスで始まるメールを一斉送信（要件 §5.2）
 * Gmail の送信制限を考慮し、間隔を空ける
 */
function sendAllDraftsMatchingPrefix() {
  var prefix = getMailSubjectPrefix_();
  var drafts = GmailApp.getDrafts();
  var toSend = [];
  for (var i = 0; i < drafts.length; i++) {
    var m = drafts[i].getMessage();
    if (m.getSubject().indexOf(prefix) === 0) {
      toSend.push(drafts[i]);
    }
  }
  var sent = 0;
  for (var j = 0; j < toSend.length; j++) {
    toSend[j].send();
    sent++;
    Utilities.sleep(1200);
    if (sent >= 80) {
      throw new Error('安全のため一度に送信する上限（80通）に達しました。残りは再実行してください。');
    }
  }
  return sent;
}
