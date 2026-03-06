// popup.js - ポップアップUI のロジック

(function () {
  'use strict';

  const toggle = document.getElementById('toggle');
  const status = document.getElementById('status');

  function updateStatus(enabled) {
    if (enabled) {
      status.textContent = '有効 - コンポーネントを監視中';
      status.className = 'status-badge on';
    } else {
      status.textContent = '無効';
      status.className = 'status-badge off';
    }
  }

  // 現在の状態を読み込み
  chrome.storage.local.get({ enabled: true }, (result) => {
    toggle.checked = result.enabled;
    updateStatus(result.enabled);
  });

  // トグル変更時に保存
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ enabled });
    updateStatus(enabled);
  });
})();
