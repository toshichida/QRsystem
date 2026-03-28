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
  var JSONP_TIMEOUT_MS = 45000;

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

  function handleCheckInResult(data) {
    if (data && data.ok === true) {
      setStatus('ok', '受付を記録しました');
      showParticipant(data.participant || {});
      return;
    }
    var code = data && data.error ? data.error : 'unknown';
    setStatus('err', mapError(code));
    showParticipant({});
  }

  /**
   * fetch は GAS が Access-Control-Allow-Origin を返さないため CORS で失敗する。
   * JSONP（GET + script）ならブラウザの CORS 制限を受けず、応答 JSON を受け取れる。
   */
  function requestCheckIn(participantId) {
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

    var cbName = 'qrJsonpCb_' + Date.now() + '_' + Math.floor(Math.random() * 1e9);
    var script = document.createElement('script');
    var timer = null;

    function cleanup() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        delete window[cbName];
      } catch (e) {
        window[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[cbName] = function (data) {
      cleanup();
      try {
        handleCheckInResult(data);
      } catch (e) {
        setStatus('err', '応答の処理に失敗しました');
        showParticipant({});
      }
    };

    try {
      var u = new URL(cfg.gasWebAppUrl);
      u.searchParams.set('action', 'checkIn');
      u.searchParams.set('participantId', participantId);
      u.searchParams.set('staffMemo', els.staffMemo.value.trim());
      u.searchParams.set('passphrase', passphrase);
      u.searchParams.set('callback', cbName);
      script.src = u.toString();
    } catch (e) {
      cleanup();
      setStatus('err', 'URL が不正です（config.js の gasWebAppUrl を確認）');
      return;
    }

    script.onerror = function () {
      cleanup();
      setStatus('err', '通信に失敗しました（スクリプト読み込み）。GAS の再デプロイと URL を確認してください。');
      showParticipant({});
    };

    timer = setTimeout(function () {
      cleanup();
      setStatus('err', '通信がタイムアウトしました');
      showParticipant({});
    }, JSONP_TIMEOUT_MS);

    document.head.appendChild(script);
  }

  function onScanSuccess(decodedText) {
    var now = Date.now();
    if (now < cooldownUntil) return;
    var text = (decodedText || '').trim();
    if (!text) return;
    if (text === lastScan) return;
    lastScan = text;
    cooldownUntil = now + COOLDOWN_MS;
    requestCheckIn(text);
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
