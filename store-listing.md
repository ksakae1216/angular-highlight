# Chrome Web Store Listing

## Name (45 chars max)
Angular Highlight

## Short description (132 chars max)
Visualize Angular change detection in real time. Components flash green when they re-render — like React DevTools highlight updates.

## Detailed description

Angular Highlight shows you exactly which components re-render and when — just like React DevTools' "Highlight updates when components render" feature, but for Angular.

**How to use**
1. Open any Angular app
2. Click the Angular Highlight icon in the toolbar
3. Toggle ON — components will flash green every time change detection runs
4. Toggle OFF to stop

**Works with all Angular versions**
• Zone.js apps (Angular v2–v18): hooks into Zone.prototype.runTask to detect when Angular's change detection completes
• Signals & Zoneless apps (Angular v16+): uses MutationObserver to catch DOM updates and traces them back to the responsible component

**Why is this useful?**
• Spot components that re-render too often
• Verify that OnPush optimization is working
• Debug unexpected change detection cycles
• Understand how user interactions propagate through your app

**Technical details**
• Uses __ngContext__ (Angular Ivy, v9+) to identify component host elements
• Works on both development and production builds
• Throttled to 150ms to minimize performance impact on the page
• No data collection — all state is stored locally via chrome.storage.local

## Category
Developer Tools

## Language
English

---

## Japanese (日本語)

### 名前
Angular Highlight

### 短い説明
Angularのチェンジデテクションをリアルタイムで可視化。コンポーネントが再レンダリングされると緑でフラッシュします。React DevTools のハイライト機能のAngular版。

### 詳細説明

Angular Highlight は、どのコンポーネントがいつ再レンダリングされているかをリアルタイムで可視化するChrome拡張です。React DevTools の「Highlight updates when components render」と同じ体験を Angular アプリで実現します。

**使い方**
1. Angularアプリを開く
2. ツールバーの Angular Highlight アイコンをクリック
3. ON にする — チェンジデテクションが走るたびにコンポーネントが緑でフラッシュ
4. OFF で停止

**全Angularバージョンに対応**
• Zone.jsアプリ (Angular v2〜v18): Zone.prototype.runTask をフックしてCDのタイミングを検知
• Signals・Zonelessアプリ (Angular v16+): MutationObserverでDOM変化を検知し、対象コンポーネントを特定

**こんな時に役立つ**
• 再レンダリングが多すぎるコンポーネントを発見
• OnPush最適化が効いているか確認
• 予期しないチェンジデテクションをデバッグ
• ユーザー操作がどうコンポーネントツリーに伝播するか理解
