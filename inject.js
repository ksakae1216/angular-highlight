// inject.js - ページコンテキストで動作
// Zone.js フック + MutationObserver で Angular Change Detection を検知してハイライト表示

(function () {
  'use strict';

  let enabled = false; // content.js から初期状態を受け取るまで無効
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
            // prod mode フォールバック: __ngContext__ の存在のみで判定
            // Fix 1 の Zone 外実行 + Fix 3 の MAX_OVERLAYS で過検出は防ぐ
            components.push(node);
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
    components.forEach((el) => {
      highlightElement(el, 'zone');
      recordRender(el, 'zone');
    });
  }

  // ---- Jev (TypeSafe AI) 連携: 過剰な再レンダリングの検知 ----
  // 注意: Zone.js 経路では「変更検知サイクルが走った」ことしか分からず、
  // 実際にDOMが更新されたかまでは判定していない（近似値として扱う）。

  let jevAnalysisEnabled = false; // content.js から設定を受け取るまで無効

  const ANALYSIS_WINDOW_MS = 2000; // この時間内の再レンダリング回数を見る
  // この回数以上になったら分析対象にする（popup から変更可能）
  // 10 は経験的な目安で、統計的な根拠はない。Zone.js 経路は150ms間隔のスロットルがあるため
  // Zone.js 経路は150msに1回しか記録しないため、大きい値では判定されにくい（popup の入力上限は目安として13）
  let renderThreshold = 10;

  const renderStats = new WeakMap(); // Element -> { onPush, timestamps: number[] }
  // 一度Jevに判定をリクエストしたコンポーネント（ページをリロードするまで再判定しない）
  const analyzed = new WeakSet();
  const pendingJevRequests = new Map(); // requestId -> { el, trigger }
  let jevRequestSeq = 0;

  // ---- 変更検知の「きっかけ」の記録（Zone.js 経路のみ） ----
  // task.source は "HTMLDivElement.addEventListener:mousemove" や "setInterval" のような文字列。
  // 要素名やURLは使わず、イベント名 / API の種類だけを許可リストで取り出す。
  const TRIGGER_EVENTS = new Set([
    'mousemove', 'pointermove', 'touchmove', 'scroll', 'wheel', 'resize',
    'click', 'input', 'change', 'keydown', 'keyup', 'focus', 'blur',
  ]);
  // 「一定間隔か」を見るのはタイマー系だけ。mousemove などのイベントは、ブラウザが約16〜20msごとに
  // まとめて発火するため、人の操作でも間隔がそろってしまい、判断材料にならない
  const INTERVAL_KINDS = new Set(['setInterval', 'setTimeout', 'requestAnimationFrame', 'http']);
  const TRIGGER_LOG_MAX = 300;
  const REGULAR_INTERVAL_MAX_CV = 0.3; // 間隔のばらつき（変動係数）がこれ未満なら「一定間隔」とみなす
  const triggerLog = []; // { t: number, kind: string }

  function classifyTrigger(source) {
    if (typeof source !== 'string') return 'other';
    if (source === 'setInterval' || source === 'setTimeout' || source === 'requestAnimationFrame') {
      return source;
    }
    if (source.startsWith('XMLHttpRequest') || source === 'fetch') return 'http';
    const i = source.lastIndexOf(':');
    if (source.includes('addEventListener') && i !== -1) {
      const eventName = source.slice(i + 1);
      return TRIGGER_EVENTS.has(eventName) ? eventName : 'otherEvent';
    }
    return 'other';
  }

  function recordTrigger(task) {
    if (!jevAnalysisEnabled) return;
    triggerLog.push({ t: Date.now(), kind: classifyTrigger(task.source) });
    if (triggerLog.length > TRIGGER_LOG_MAX) triggerLog.shift();
  }

  /**
   * 直近の計測時間内の「きっかけ」を集計する。
   * ページ全体の変更検知のきっかけなので、コンポーネント単位ではなく近似値として扱う。
   * Zoneless 等で記録がなければ 'unknown'。
   */
  function summarizeTriggers(now) {
    const recent = triggerLog.filter((e) => now - e.t <= ANALYSIS_WINDOW_MS);
    if (recent.length === 0) return { mainTrigger: 'unknown' };

    const counts = {};
    for (const e of recent) counts[e.kind] = (counts[e.kind] || 0) + 1;
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const mainTrigger = ranked[0][0];
    const summary = {
      mainTrigger,
      triggerCounts: Object.fromEntries(ranked.slice(0, 3)),
    };

    const times = recent.filter((e) => e.kind === mainTrigger).map((e) => e.t);
    if (INTERVAL_KINDS.has(mainTrigger) && times.length >= 4) {
      const gaps = [];
      for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
      summary.isRegularInterval = mean > 0 && Math.sqrt(variance) / mean < REGULAR_INTERVAL_MAX_CV;
      summary.avgIntervalMs = Math.round(mean / 10) * 10;
    }
    return summary;
  }

  /**
   * ng.getComponent が使える場合にコンポーネント名を取得
   */
  function getComponentName(el) {
    try {
      if (window.ng && window.ng.getComponent) {
        const comp = window.ng.getComponent(el);
        if (comp && comp.constructor && comp.constructor.name) {
          return comp.constructor.name;
        }
      }
    } catch {
      // 取得できない場合はタグ名にフォールバック
    }
    return el.tagName ? el.tagName.toLowerCase() : 'unknown';
  }

  /**
   * OnPush戦略かどうかを Ivy のコンポーネント定義から推測する
   * 取得できない場合は null（unknown）を返す
   */
  function getOnPushInfo(el) {
    try {
      if (window.ng && window.ng.getComponent) {
        const comp = window.ng.getComponent(el);
        const def = comp && comp.constructor && comp.constructor.ɵcmp;
        if (def && typeof def.onPush === 'boolean') {
          return def.onPush;
        }
      }
    } catch {
      // 取得できない場合は unknown 扱い
    }
    return null;
  }

  /**
   * 最も近い親の Angular コンポーネントホストを探す（バッジの原因推定に使う）
   * 注: setupMutationObserver内にも同名・同趣旨のローカル関数があるが、スコープが分かれているため衝突はしない
   */
  function findClosestComponentForJev(el, skipSelf) {
    let current = skipSelf ? el.parentElement : el;
    while (current && current !== document.documentElement) {
      if (current.__ngContext__ !== undefined) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * 再レンダリングを記録し、閾値を超えたら Jev に分析をリクエストする
   */
  function recordRender(el, colorKey) {
    if (!jevAnalysisEnabled) return;

    const now = Date.now();
    let stat = renderStats.get(el);
    if (!stat) {
      stat = { onPush: getOnPushInfo(el), timestamps: [] };
      renderStats.set(el, stat);
    }
    stat.timestamps.push(now);
    stat.timestamps = stat.timestamps.filter((t) => now - t <= ANALYSIS_WINDOW_MS);

    if (stat.timestamps.length >= renderThreshold && !analyzed.has(el)) {
      analyzed.add(el);
      requestJevAnalysis(el, stat, colorKey);
    }
  }

  /**
   * content.js 経由で Jev API に判定をリクエストする
   */
  function requestJevAnalysis(el, stat, colorKey) {
    const parentEl = findClosestComponentForJev(el, true);

    // コンポーネント名・親の名前は送らない（アプリの内部情報を外に出さないため）。
    // 判定に必要な「親がいるか」だけを送る
    const state = {
      changeDetectionStrategy:
        stat.onPush === true ? 'OnPush' : stat.onPush === false ? 'Default' : 'unknown',
      renderCount: stat.timestamps.length,
      windowSeconds: ANALYSIS_WINDOW_MS / 1000,
      detectionPath: colorKey, // 'zone' or 'signal'
      hasParentComponent: parentEl !== null,
      // 変更検知のきっかけ（イベント名 / API の種類のみ。要素名・URLは含まない）
      ...summarizeTriggers(Date.now()),
    };

    const requestId = `jev_req_${++jevRequestSeq}`;
    pendingJevRequests.set(requestId, { el, trigger: state.mainTrigger });

    window.postMessage({ type: 'ANGULAR_HIGHLIGHT_JEV_REQUEST', requestId, state }, '*');
  }

  // バッジの表示文言。content.js が拡張の表示言語に合わせた翻訳を送ってくる（それまでは英語）
  // causes のキーは background.js の likely_cause の criteria キーと対応
  let jevLabels = {
    suspect: 'Possible excessive re-rendering',
    cause: 'Cause',
    priority: 'Priority',
    dismiss: 'Click to dismiss',
    trigger: 'Trigger',
    fix: 'Fix',
    nature: 'Update type',
    intentional: 'Likely intentional',
    notIntentional: 'Likely unintentional',
    priorityLevels: { low: 'Low', medium: 'Medium', high: 'High' },
    causes: {
      missing_onpush: 'OnPush not used (try OnPush)',
      parent_propagation: 'Re-rendered along with its parent component',
      event_handler_recreation: 'Functions or objects are recreated on every render',
      frequent_event: 'A high-frequency event (mousemove, scroll, etc.) triggers change detection',
      timer_or_polling: 'A timer, animation frame, or polling triggers change detection',
      unclear: 'Cause could not be determined',
    },
    fixes: {
      on_push: 'Switch to OnPush change detection',
      run_outside_angular: 'Run it outside the Angular zone (runOutsideAngular)',
      throttle: 'Debounce or throttle the event / timer',
      signals: 'Move the state to signals',
      no_action: 'No action needed if the updates are expected',
    },
  };

  // Jev の確信度（0〜1）がこの値未満の項目は表示しない。暫定値で、実際の返却値を見て調整する
  const JEV_MIN_CONFIDENCE = 0.5;

  // Noul には confidence が返らないので、確率が五分五分に近い（この幅の中）ときは表示しない
  const NOUL_UNSURE_MIN = 0.4;
  const NOUL_UNSURE_MAX = 0.6;

  function isConfident(answer) {
    return !!answer && (typeof answer.confidence !== 'number' || answer.confidence >= JEV_MIN_CONFIDENCE);
  }

  /**
   * 優先度スコア（criteria 3段階 → 0〜2 の期待値）を 低/中/高 のラベルに変換する
   */
  function toPriorityLabel(score) {
    const levels = jevLabels.priorityLevels;
    if (score < 2 / 3) return levels.low;
    if (score < 4 / 3) return levels.medium;
    return levels.high;
  }

  /**
   * Jev の判定結果をコンポーネントの上にバッジ表示する
   * 確信度が低い項目は出さない（「過剰か」の判定だけは、バッジ自体の表示条件なので常に使う）
   */
  function showJevBadge(el, answers, trigger) {
    if (!answers) return;

    const excessive = answers.excessive_rerender;
    if (!excessive || excessive.noul < 0.5) return; // 過剰でないと判定されたら何もしない

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const pct = Math.round(excessive.noul * 100);
    const lines = [];

    let head = `⚠ ${pct}% ${jevLabels.suspect}`;
    if (trigger && trigger !== 'unknown') head += ` (${jevLabels.trigger}: ${trigger})`;
    lines.push(head);

    const cause = answers.likely_cause;
    if (isConfident(cause)) {
      const text = jevLabels.causes[cause.choice] || jevLabels.causes.unclear;
      lines.push(`${jevLabels.cause}: ${text}`);
    }

    const fix = answers.suggested_fix;
    if (isConfident(fix) && jevLabels.fixes[fix.choice]) {
      lines.push(`${jevLabels.fix}: ${jevLabels.fixes[fix.choice]}`);
    }

    // 意図的っぽい更新も隠さず、ラベルで区別して見せる
    const intentional = answers.intentional_update;
    if (
      intentional &&
      typeof intentional.noul === 'number' &&
      (intentional.noul <= NOUL_UNSURE_MIN || intentional.noul >= NOUL_UNSURE_MAX)
    ) {
      const nature = intentional.noul >= 0.5 ? jevLabels.intentional : jevLabels.notIntentional;
      lines.push(`${jevLabels.nature}: ${nature}`);
    }

    const priority = answers.optimization_priority;
    if (isConfident(priority) && typeof priority.score === 'number') {
      lines.push(`${jevLabels.priority}: ${toPriorityLabel(priority.score)}`);
    }

    const badge = document.createElement('div');
    badge.setAttribute('data-ng-hl-jev', '');
    badge.title = `${getComponentName(el)} (${jevLabels.dismiss})`;
    for (const text of lines) {
      const line = document.createElement('div');
      line.textContent = text;
      badge.appendChild(line);
    }
    // 判定は1コンポーネントにつき1回だけなので、クリックで閉じるまで残す
    // スクロールに追従するよう、ページ座標の absolute で配置する
    badge.style.cssText = `
      position: absolute;
      top: 0;
      left: ${rect.left + window.scrollX}px;
      background: rgba(220, 50, 50, 0.9);
      color: white;
      font: 11px/1.4 -apple-system, sans-serif;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      z-index: 2147483647;
      white-space: nowrap;
    `;

    document.documentElement.appendChild(badge);
    // 行数に応じた高さを測って、コンポーネントの真上に置く
    badge.style.top = `${Math.max(rect.top + window.scrollY - badge.offsetHeight - 2, 0)}px`;
    // Zone 外でリスナーを登録（Angular の変更検知を走らせない）
    runOutsideZone(() => {
      badge.addEventListener('click', () => badge.remove());
    });
  }

  // Jev の設定・判定結果を content.js から受け取る
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'ANGULAR_HIGHLIGHT_JEV_SET_ENABLED') {
      jevAnalysisEnabled = event.data.enabled;
    }
    if (event.data.type === 'ANGULAR_HIGHLIGHT_JEV_SET_THRESHOLD') {
      const n = Number(event.data.threshold);
      if (Number.isFinite(n) && n >= 1) renderThreshold = n;
    }
    if (event.data.type === 'ANGULAR_HIGHLIGHT_JEV_SET_LABELS' && event.data.labels) {
      jevLabels = event.data.labels;
    }
    if (event.data.type === 'ANGULAR_HIGHLIGHT_JEV_RESPONSE') {
      const { requestId, result } = event.data;
      const pending = pendingJevRequests.get(requestId);
      pendingJevRequests.delete(requestId);
      if (pending && result) {
        showJevBadge(pending.el, result, pending.trigger);
      }
    }
  });

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
        recordTrigger(task);
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
            changedElements.forEach((el) => {
              highlightElement(el, 'signal');
              recordRender(el, 'signal');
            });
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
