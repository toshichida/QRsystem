/**
 * シート名・列定義（要件定義書 §4 に整合）
 */
var SHEET_NAMES = {
  MASTER: 'Master',
  LOG: 'ReceptionLog',
  CONFIG: 'Config'
};

/** マスタ: 参加者ID・氏名・部署・メール */
var MASTER_HEADERS = ['participantId', 'fullName', 'department', 'email'];

/** 受付ログ: 受付日時・参加者ID・受付済み・スタッフメモ */
var LOG_HEADERS = ['receptionAt', 'participantId', 'checkedIn', 'staffMemo'];

/** 設定シートのキー（Config 列A） */
var CONFIG_KEYS = {
  PASSPHRASE: 'passphrase',
  CORS_ORIGIN: 'cors_origin',
  /** カンマ区切り。レスポンス participant に含めるマスタ列名 */
  PARTICIPANT_DISPLAY_FIELDS: 'participant_display_fields',
  /** メール下書き・送信で使う件名プレフィックス */
  MAIL_SUBJECT_PREFIX: 'mail_subject_prefix'
};

var GOQR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';
var QR_IMAGE_SIZE = '320x320';
