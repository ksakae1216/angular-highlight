// popup.js - ポップアップUI のロジック

(function () {
  'use strict';

  // i18n: data-i18n 属性を持つ要素にテキストを適用
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
  });

  const DEFAULT_COLORS = {
    zone:   '#00c864',
    signal: '#3296ff',
  };

  const toggle      = document.getElementById('toggle');
  const status      = document.getElementById('status');
  const colorZone   = document.getElementById('color-zone');
  const colorSig    = document.getElementById('color-signal');
  const hexZone     = document.getElementById('hex-zone');
  const hexSig      = document.getElementById('hex-signal');
  const dotZone     = document.getElementById('dot-zone');
  const dotSig      = document.getElementById('dot-signal');
  const resetBtn    = document.getElementById('reset-btn');
  const jevToggle   = document.getElementById('jev-toggle');
  const jevApiKey   = document.getElementById('jev-api-key');

  function updateStatus(enabled) {
    if (enabled) {
      status.textContent = chrome.i18n.getMessage('statusOn');
      status.className = 'status-badge on';
    } else {
      status.textContent = chrome.i18n.getMessage('statusOff');
      status.className = 'status-badge off';
    }
  }

  function applyColors(colors) {
    colorZone.value = colors.zone;
    colorSig.value  = colors.signal;
    hexZone.textContent = colors.zone;
    hexSig.textContent  = colors.signal;
    dotZone.style.background = colors.zone;
    dotSig.style.background  = colors.signal;
  }

  // 現在の状態を読み込み
  chrome.storage.local.get(
    { enabled: true, colors: DEFAULT_COLORS },
    (result) => {
      toggle.checked = result.enabled;
      updateStatus(result.enabled);
      applyColors(result.colors);
    }
  );

  // ON/OFF トグル
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ enabled });
    updateStatus(enabled);
  });

  // カラーピッカー変更
  function onColorChange() {
    const colors = { zone: colorZone.value, signal: colorSig.value };
    applyColors(colors);
    chrome.storage.local.set({ colors });
  }

  colorZone.addEventListener('input', onColorChange);
  colorSig.addEventListener('input',  onColorChange);

  // リセット
  resetBtn.addEventListener('click', () => {
    applyColors(DEFAULT_COLORS);
    chrome.storage.local.set({ colors: DEFAULT_COLORS });
  });

  // ---- Jev (TypeSafe AI) 設定 ----

  const DEFAULT_JEV_THRESHOLD = 10;
  const JEV_THRESHOLD_MIN = 3;
  const JEV_THRESHOLD_MAX = 30;
  const jevThreshold = document.getElementById('jev-threshold');

  // 範囲外・不正な値は許容範囲に丸める
  function clampThreshold(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return DEFAULT_JEV_THRESHOLD;
    return Math.min(JEV_THRESHOLD_MAX, Math.max(JEV_THRESHOLD_MIN, n));
  }

  chrome.storage.local.get(
    { jevEnabled: false, jevApiKey: '', jevThreshold: DEFAULT_JEV_THRESHOLD },
    (result) => {
      jevToggle.checked = result.jevEnabled;
      jevApiKey.value = result.jevApiKey;
      jevThreshold.value = clampThreshold(result.jevThreshold);
    }
  );

  jevThreshold.addEventListener('change', () => {
    const valid = clampThreshold(jevThreshold.value);
    jevThreshold.value = valid;
    chrome.storage.local.set({ jevThreshold: valid });
  });

  jevToggle.addEventListener('change', () => {
    chrome.storage.local.set({ jevEnabled: jevToggle.checked });
  });

  // 入力のたびに毎回書き込むと負荷が高いので、入力が止まってから保存する
  let jevKeySaveTimer = null;
  jevApiKey.addEventListener('input', () => {
    clearTimeout(jevKeySaveTimer);
    jevKeySaveTimer = setTimeout(() => {
      chrome.storage.local.set({ jevApiKey: jevApiKey.value.trim() });
    }, 400);
  });
})();
