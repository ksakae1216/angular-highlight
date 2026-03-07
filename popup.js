// popup.js - ポップアップUI のロジック

(function () {
  'use strict';

  const DEFAULT_COLORS = {
    zone:   '#00c864',
    signal: '#3296ff',
  };

  const toggle     = document.getElementById('toggle');
  const status     = document.getElementById('status');
  const colorZone  = document.getElementById('color-zone');
  const colorSig   = document.getElementById('color-signal');
  const hexZone    = document.getElementById('hex-zone');
  const hexSig     = document.getElementById('hex-signal');
  const dotZone    = document.getElementById('dot-zone');
  const dotSig     = document.getElementById('dot-signal');
  const resetBtn   = document.getElementById('reset-btn');

  function updateStatus(enabled) {
    if (enabled) {
      status.textContent = '有効 - コンポーネントを監視中';
      status.className = 'status-badge on';
    } else {
      status.textContent = '無効';
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
})();
