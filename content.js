// content.js - Content Script
// inject.js をページコンテキストに注入し、ON/OFF状態を管理する

(function () {
  'use strict';

  // inject.js をページコンテキストに script タグで注入
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.type = 'text/javascript';
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // storage から現在のON/OFF状態を読み込んで inject.js に伝える
  chrome.storage.local.get({ enabled: true }, (result) => {
    window.postMessage(
      { type: 'ANGULAR_HIGHLIGHT_SET_ENABLED', enabled: result.enabled },
      '*'
    );
  });

  // ストレージの変更を監視してリアルタイムでトグル
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled !== undefined) {
      window.postMessage(
        {
          type: 'ANGULAR_HIGHLIGHT_SET_ENABLED',
          enabled: changes.enabled.newValue,
        },
        '*'
      );
    }
  });
})();
