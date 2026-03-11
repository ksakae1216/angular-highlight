// inject.js - ページコンテキストで動作
// Zone.js フック + MutationObserver で Angular Change Detection を検知してハイライト表示

(function () {
  'use strict';

  let enabled = true;
  let highlightScheduled = false;
  let lastHighlightTime = 0;
  const HIGHLIGHT_THROTTLE_MS = 150; // 最低150ms間隔でハイライト

  // ---- メッセージ受信 (content.js からON/OFF制御) ----
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'ANGULAR_HIGHLIGHT_SET_ENABLED') {
      enabled = event.data.enabled;
    }
    if (event.data.type === 'ANGULAR_HIGHLIGHT_SET_COLORS') {
      colors = event.data.colors;
    }
  });

  // ---- ハイライト処理 ----

  /**
   * Angular コンポーネントのホスト要素を全て検出する
   * Ivy (v9+): __ngContext__ プロパティが付いている
   */
  function findAngularComponents() {
    const components = [];
    const walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_ELEMENT
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.__ngContext__ !== undefined) {
        // ng.getComponent が使えるなら（dev mode）コンポーネントホストかを確認
        try {
          if (window.ng && window.ng.getComponent) {
            if (window.ng.getComponent(node) !== null) {
              components.push(node);
            }
          } else {
            // prod mode フォールバック: __ngContext__ がオブジェクト or 配列（LView）かを確認
            // 単純な数値や文字列は内部参照なのでスキップ
            const ctx = node.__ngContext__;
            if (Array.isArray(ctx) || (ctx && typeof ctx === 'object')) {
              components.push(node);
            }
          }
        } catch {
          // エラーの場合はスキップ（誤検出しない）
        }
      }
    }
    return components;
  }

  // ハイライトカラー（popup から変更可能）
  let colors = {
    zone:   '#00c864',
    signal: '#3296ff',
  };

  // 同時表示オーバーレイ数の上限（パフォーマンス保護）
  const MAX_OVERLAYS = 50;
  let activeOverlayCount = 0;

  // Zone 外で関数を実行するヘルパー（無限ループ防止）
  // 遅延評価で Zone.js がロード済みの時点で正しく取得する
  function runOutsideZone(fn) {
    if (typeof Zone !== 'undefined' && Zone.root) {
      Zone.root.run(fn);
    } else {
      fn();
    }
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 要素の位置に固定オーバーレイをハイライト表示する
   * @param {Element} el
   * @param {'zone'|'signal'} colorKey
   */
  function highlightElement(el, colorKey = 'zone') {
    // オーバーレイ数が上限に達したらスキップ（パフォーマンス保護）
    if (activeOverlayCount >= MAX_OVERLAYS) return;

    const rect = el.getBoundingClientRect();

    // 画面外や非表示の要素はスキップ
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    if (rect.right < 0 || rect.left > window.innerWidth) return;

    const hex = colors[colorKey];
    const border = hexToRgba(hex, 1);
    const bg     = hexToRgba(hex, 0.1);
    const overlay = document.createElement('div');
    overlay.setAttribute('data-ng-hl', '');
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${border};
      background: ${bg};
      pointer-events: none;
      z-index: 2147483647;
      transition: opacity 500ms ease-out;
      opacity: 1;
      box-sizing: border-box;
    `;

    document.documentElement.appendChild(overlay);
    activeOverlayCount++;

    // Zone 外で cleanup を実行（Angular Zone の runTask フックをトリガーさせない → 無限ループ防止）
    runOutsideZone(() => {
      // 2フレーム後にフェードアウト開始
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.style.opacity = '0';
        });
      });

      // 500ms後に削除
      setTimeout(() => {
        overlay.remove();
        activeOverlayCount--;
      }, 520);
    });
  }

  /**
   * 全 Angular コンポーネントをハイライト（Zone.js トリガー → 緑）
   */
  function highlightAllComponents() {
    if (!enabled) return;
    const components = findAngularComponents();
    components.forEach((el) => highlightElement(el, 'zone'));
  }

  /**
   * ハイライトをスケジュール（重複実行 & スロットルで制限）
   */
  function scheduleHighlight() {
    if (!enabled || highlightScheduled) return;
    const now = Date.now();
    if (now - lastHighlightTime < HIGHLIGHT_THROTTLE_MS) return;
    highlightScheduled = true;
    Promise.resolve().then(() => {
      highlightScheduled = false;
      lastHighlightTime = Date.now();
      highlightAllComponents();
    });
  }

  // ---- Phase 1: Zone.js フック ----

  function patchZoneJs() {
    if (typeof Zone === 'undefined') return false;

    const originalRunTask = Zone.prototype.runTask;
    Zone.prototype.runTask = function (task, applyThis, applyArgs) {
      const result = originalRunTask.call(this, task, applyThis, applyArgs);

      // macroTask / eventTask のみ対象（microTask は除外して負荷を減らす）
      if (
        this.name === 'angular' &&
        task.type !== 'microTask'
      ) {
        scheduleHighlight();
      }

      return result;
    };

    return true;
  }

  // ---- Phase 2: MutationObserver (Angular Signals / Zoneless Angular 対応) ----
  // Zone.js がある場合は MutationObserver を無効化（Zone.js フックで十分）

  function setupMutationObserver(isZoneless) {
    let mutationTimer = null;
    const changedElements = new Set();

    /**
     * 変更があった要素から最近傍の Angular コンポーネントホストを探す
     */
    function findClosestComponent(el) {
      let current = el;
      while (current && current !== document.documentElement) {
        if (current.__ngContext__ !== undefined) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }

    const observer = new MutationObserver((mutations) => {
      if (!enabled) return;

      for (const mutation of mutations) {
        const target = mutation.target;

        // ハイライト用のオーバーレイ自体の変更は無視
        const targetEl = target.nodeType === Node.ELEMENT_NODE
          ? target
          : target.parentElement;
        if (!targetEl || targetEl.hasAttribute('data-ng-hl') || targetEl.closest('[data-ng-hl]')) {
          continue;
        }

        const component = findClosestComponent(targetEl);
        if (component) {
          changedElements.add(component);
        }

        // 追加されたノードもチェック
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const comp = findClosestComponent(node);
            if (comp) changedElements.add(comp);
          }
        });
      }

      // デバウンスして一括ハイライト（50msで十分なバッチングを確保）
      // Zone 外で setTimeout を実行して Angular Zone の runTask フックを避ける
      if (changedElements.size > 0) {
        clearTimeout(mutationTimer);
        runOutsideZone(() => {
          mutationTimer = setTimeout(() => {
            if (!enabled) {
              changedElements.clear();
              return;
            }
            changedElements.forEach((el) => highlightElement(el, 'signal'));
            changedElements.clear();
          }, 50);
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      // characterData は頻度が高いので Zoneless の時だけ有効
      // Zone.js ありの場合は childList + attributes で Signal の主要な変化をカバー
      characterData: isZoneless,
    });

    return observer;
  }

  // ---- 初期化 ----

  function init() {
    const zonePatched = patchZoneJs();

    // Zone.js の有無に関わらず MutationObserver を有効化
    // Zone.js あり → Signals の DOM 変化（青）を検知するため
    // Zone.js なし → Zoneless / Signals のみ（青）
    setupMutationObserver(!zonePatched);

    if (zonePatched) {
      console.debug('[Angular Highlight] Zone.js フック有効 + MutationObserver (Signals対応)');
    } else {
      console.debug('[Angular Highlight] Zone.js なし - MutationObserver のみ');
    }
  }

  // Zone.js はページ読み込み時に既に存在する場合と、後から読み込まれる場合がある
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
