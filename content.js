// content.js - Content Script
// inject.js をページコンテキストに注入し、ON/OFF状態・カラー設定を管理する

(function () {
  'use strict';

  const DEFAULT_COLORS = { zone: '#00c864', signal: '#3296ff' };

  // inject.js をページコンテキストに script タグで注入
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.type = 'text/javascript';
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // storage から現在の状態を読み込んで inject.js に伝える
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
