// content.js - Content Script
// inject.js をページコンテキストに注入し、ON/OFF状態・カラー設定を管理する

(function () {
  'use strict';

  const DEFAULT_COLORS = { zone: '#00c864', signal: '#3296ff' };

  // inject.js のロード完了後に初期状態を送信（race condition 防止）
  function injectScript(callback) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.type = 'text/javascript';
    script.onload = () => {
      script.remove();
      callback();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // inject.js のロードを待ってから storage の状態を送信
  injectScript(() => {
    chrome.storage.local.get({ enabled: true, colors: DEFAULT_COLORS }, (result) => {
      window.postMessage(
        { type: 'ANGULAR_HIGHLIGHT_SET_ENABLED', enabled: result.enabled },
        '*'
      );
      window.postMessage(
        { type: 'ANGULAR_HIGHLIGHT_SET_COLORS', colors: result.colors },
        '*'
      );
    });
  });

  // ストレージの変更を監視してリアルタイムで反映
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.enabled !== undefined) {
      window.postMessage(
        { type: 'ANGULAR_HIGHLIGHT_SET_ENABLED', enabled: changes.enabled.newValue },
        '*'
      );
    }
    if (changes.colors !== undefined) {
      window.postMessage(
        { type: 'ANGULAR_HIGHLIGHT_SET_COLORS', colors: changes.colors.newValue },
        '*'
      );
    }
  });
})();
