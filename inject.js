// inject.js - ページコンテキストで動作
// Zone.js フック + MutationObserver で Angular Change Detection を検知してハイライト表示

(function () {
  'use strict';

  let enabled = true;
  let highlightScheduled = false;

  // ---- メッセージ受信 (content.js からON/OFF制御) ----
  window.addEventListener('message', (event) => {
    if (
      event.source === window &&
      event.data &&
      event.data.type === 'ANGULAR_HIGHLIGHT_SET_ENABLED'
    ) {
      enabled = event.data.enabled;
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
            // prod mode フォールバック: __ngContext__ の存在のみで判定
            components.push(node);
          }
        } catch {
          // エラーは無視（一部の内部要素でエラーが出る場合がある）
          components.push(node);
        }
      }
    }
    return components;
  }

  /**
   * 要素の位置に固定オーバーレイをハイライト表示する
   */
  function highlightElement(el) {
    const rect = el.getBoundingClientRect();

    // 画面外や非表示の要素はスキップ
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    if (rect.right < 0 || rect.left > window.innerWidth) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid rgba(0, 200, 100, 1);
      background: rgba(0, 200, 100, 0.1);
      pointer-events: none;
      z-index: 2147483647;
      transition: opacity 500ms ease-out;
      opacity: 1;
      box-sizing: border-box;
    `;

    document.documentElement.appendChild(overlay);

    // 2フレーム後にフェードアウト開始
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
      });
    });

    // 500ms後に削除
    setTimeout(() => {
      overlay.remove();
    }, 520);
  }

  /**
   * 全 Angular コンポーネントをハイライト
   */
  function highlightAllComponents() {
    if (!enabled) return;
    const components = findAngularComponents();
    components.forEach(highlightElement);
  }

  /**
   * ハイライトをスケジュール（重複実行を防ぐ）
   */
  function scheduleHighlight() {
    if (!enabled || highlightScheduled) return;
    highlightScheduled = true;
    Promise.resolve().then(() => {
      highlightScheduled = false;
      highlightAllComponents();
    });
  }

  // ---- Phase 1: Zone.js フック ----

  function patchZoneJs() {
    if (typeof Zone === 'undefined') return false;

    const originalRunTask = Zone.prototype.runTask;
    Zone.prototype.runTask = function (task, applyThis, applyArgs) {
      const result = originalRunTask.call(this, task, applyThis, applyArgs);

      // Angular の Zone（name === 'angular'）でタスクが完了したタイミングを検知
      if (this.name === 'angular') {
        scheduleHighlight();
      }

      return result;
    };

    return true;
  }

  // ---- Phase 2: MutationObserver (Angular Signals / Zoneless Angular 対応) ----

  function setupMutationObserver() {
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
        // ハイライト用のオーバーレイ自体の変更は無視
        if (
          mutation.target.style &&
          mutation.target.style.zIndex === '2147483647'
        ) {
          continue;
        }

        const target = mutation.target;
        const component = findClosestComponent(
          target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement
        );
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

      // デバウンスして一括ハイライト
      if (changedElements.size > 0) {
        clearTimeout(mutationTimer);
        mutationTimer = setTimeout(() => {
          if (!enabled) {
            changedElements.clear();
            return;
          }
          changedElements.forEach(highlightElement);
          changedElements.clear();
        }, 16); // ~1フレーム
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return observer;
  }

  // ---- 初期化 ----

  function init() {
    const zonePatched = patchZoneJs();

    // Zone.js が使われていない場合（Zoneless Angular）や Signals のために
    // MutationObserver も常に設定する
    setupMutationObserver();

    if (zonePatched) {
      console.debug('[Angular Highlight] Zone.js フック有効');
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
