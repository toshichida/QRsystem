(function () {
  'use strict';

  var STORAGE_KEY = 'qr_reception_passphrase';

  var els = {
    passphrase: document.getElementById('passphrase'),
    remember: document.getElementById('rememberPassphrase'),
    staffMemo: document.getElementById('staffMemo'),
    status: document.getElementById('status'),
    participant: document.getElementById('participant')
  };

  var html5QrCode = null;
  var lastScan = '';
  var cooldownUntil = 0;
  var COOLDOWN_MS = 3500;

  function getConfig() {
    var c = window.QR_RECEPTION_CONFIG || {};
    return {
      gasWebAppUrl: (c.gasWebAppUrl || '').trim()
    };
  }

  function loadStoredPassphrase() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v) els.passphrase.value = v;
    } catch (e) {}
  }

  function savePassphraseIfRequested() {
    if (!els.remember.checked) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, els.passphrase.value);
    } catch (e) {}
  }

  function setStatus(kind, message) {
    els.status.className = 'status status--' + kind;
    els.status.textContent = message;
  }

  function showParticipant(data) {
    els.participant.innerHTML = '';
    if (!data || typeof data !== 'object') {
      els.participant.classList.add('hidden');
      return;
    }
    var keys = Object.keys(data);
    if (keys.length === 0) {
      els.participant.classList.add('hidden');
      return;
    }
    var dl = document.createElement('dl');
    keys.forEach(function (k) {
      var dt = document.createElement('dt');
      dt.textContent = k;
      var dd = document.createElement('dd');
      dd.textContent = data[k] == null ? '' : String(data[k]);
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    els.participant.appendChild(dl);
    els.participant.classList.remove('hidden');
  }

  function mapError(err) {
    if (err === 'unauthorized') return '合言葉が正しくありません（401）';
    if (err === 'not_found') return 'マスタに参加者 ID がありません（404）';
    if (err === 'bad_request') return 'リクエストが不正です（400）';
    if (err === 'internal') return 'サーバエラー（500）';
    return 'エラー: ' + err;
  }

  function postCheckIn(participantId) {
    var cfg = getConfig();
    if (!cfg.gasWebAppUrl) {
      setStatus('err', 'web/js/config.js に gasWebAppUrl を設定してください。');
      return;
    }

    var passphrase = els.passphrase.value.trim();
    if (!passphrase) {
      setStatus('err', '合言葉を入力してください。');
      return;
    }

    savePassphraseIfRequested();

    setStatus('loading', '送信中…');
    els.participant.classList.add('hidden');

    // application/json だと CORS プリフライト（OPTIONS）が必須になり、
    // GAS ウェブアプリ側で失敗しやすい → form-urlencoded は「単純リクエスト」でプリフライトなし
    var params = new URLSearchParams();
    params.set('action', 'checkIn');
    params.set('participantId', participantId);
    params.set('staffMemo', els.staffMemo.value.trim());
    params.set('passphrase', passphrase);

    fetch(cfg.gasWebAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error('JSON でない応答を受け取りました');
          }
          return { httpOk: res.ok, data: data };
        });
      })
      .then(function (result) {
        var data = result.data;
        if (data && data.ok === true) {
          setStatus('ok', '受付を記録しました');
          showParticipant(data.participant || {});
          return;
        }
        var code = data && data.error ? data.error : 'unknown';
        setStatus('err', mapError(code));
        showParticipant({});
      })
      .catch(function (err) {
        setStatus('err', '通信に失敗しました: ' + (err.message || String(err)));
        showParticipant({});
      });
  }

  function onScanSuccess(decodedText) {
    var now = Date.now();
    if (now < cooldownUntil) return;
    var text = (decodedText || '').trim();
    if (!text) return;
    if (text === lastScan) return;
    lastScan = text;
    cooldownUntil = now + COOLDOWN_MS;
    postCheckIn(text);
  }

  function startCamera() {
    if (typeof Html5Qrcode === 'undefined') {
      setStatus('err', 'QR ライブラリの読み込みに失敗しました');
      return;
    }
    var regionId = 'reader';
    html5QrCode = new Html5Qrcode(regionId);
    var config = {
      fps: 12,
      qrbox: function (viewfinderWidth, viewfinderHeight) {
        var s = Math.min(viewfinderWidth, viewfinderHeight);
        var box = Math.floor(s * 0.72);
        return { width: box, height: box };
      },
      aspectRatio: 1
    };

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        onScanSuccess,
        function () {}
      )
      .catch(function (err) {
        setStatus('err', 'カメラを起動できませんでした: ' + (err.message || String(err)));
      });
  }

  els.remember.addEventListener('change', savePassphraseIfRequested);
  els.passphrase.addEventListener('blur', function () {
    if (els.remember.checked) savePassphraseIfRequested();
  });

  loadStoredPassphrase();
  setStatus('idle', '待機中');
  startCamera();
})();
