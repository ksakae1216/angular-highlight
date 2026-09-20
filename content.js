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

  // inject.js はページ側で動き chrome.i18n を使えないため、翻訳済みの文言をここで用意して渡す
  function buildJevLabels() {
    const t = (key) => chrome.i18n.getMessage(key);
    return {
      suspect: t('jevBadgeSuspect'),
      cause: t('jevBadgeCause'),
      priority: t('jevBadgePriority'),
      dismiss: t('jevBadgeDismiss'),
      priorityLevels: {
        low: t('jevPriorityLow'),
        medium: t('jevPriorityMedium'),
        high: t('jevPriorityHigh'),
      },
      causes: {
        missing_onpush: t('jevCauseMissingOnpush'),
        parent_propagation: t('jevCauseParentPropagation'),
        event_handler_recreation: t('jevCauseEventHandlerRecreation'),
        unclear: t('jevCauseUnclear'),
      },
    };
  }

  // inject.js のロードを待ってから storage の状態を送信
  injectScript(() => {
    window.postMessage(
      { type: 'ANGULAR_HIGHLIGHT_JEV_SET_LABELS', labels: buildJevLabels() },
      '*'
    );
    chrome.storage.local.get(
      { enabled: true, colors: DEFAULT_COLORS, jevEnabled: false, jevThreshold: 10 },
      (result) => {
        window.postMessage(
          { type: 'ANGULAR_HIGHLIGHT_JEV_SET_THRESHOLD', threshold: result.jevThreshold },
          '*'
        );
        window.postMessage(
          { type: 'ANGULAR_HIGHLIGHT_SET_ENABLED', enabled: result.enabled },
          '*'
        );
        window.postMessage(
          { type: 'ANGULAR_HIGHLIGHT_SET_COLORS', colors: result.colors },
          '*'
        );
        window.postMessage(
          { type: 'ANGULAR_HIGHLIGHT_JEV_SET_ENABLED', enabled: result.jevEnabled },
          '*'
        );
      }
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
    if (changes.jevThreshold !== undefined) {
      window.postMessage(
        { type: 'ANGULAR_HIGHLIGHT_JEV_SET_THRESHOLD', threshold: changes.jevThreshold.newValue },
        '*'
      );
    }
    if (changes.jevEnabled !== undefined) {
      window.postMessage(
        { type: 'ANGULAR_HIGHLIGHT_JEV_SET_ENABLED', enabled: changes.jevEnabled.newValue },
        '*'
      );
    }
  });

  // inject.js からの Jev 分析リクエストを background.js に中継する
  // （inject.js はページ本体のコンテキストで動くため chrome.* API を直接呼べない）
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type !== 'ANGULAR_HIGHLIGHT_JEV_REQUEST') return;

    const { requestId, state } = event.data;
    chrome.runtime.sendMessage({ type: 'JEV_ANALYZE', state }, (response) => {
      // 拡張のリロード直後などで sendMessage が失敗することがあるためチェック
      if (chrome.runtime.lastError) return;
      window.postMessage(
        {
          type: 'ANGULAR_HIGHLIGHT_JEV_RESPONSE',
          requestId,
          result: response && response.result,
          error: response && response.error,
        },
        '*'
      );
    });
  });
})();
