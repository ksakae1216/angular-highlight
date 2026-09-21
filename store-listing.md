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

**AI diagnosis (optional, beta — OFF by default)**
When a component re-renders many times in a short period, the extension can ask Jev (https://typesafe.ai), a judgment-focused AI model by TypeSafe AI, whether it is excessive, what the likely cause is, and how urgent it is. The result appears as a red badge above the component (click the badge to dismiss it).
• Requires your own TypeSafe API key. Enter it in the popup and turn the toggle ON — nothing is sent until you do
• Trigger: a component re-rendering N times within 2 seconds (default 10, adjustable from 3 to 30 in the popup). Only components whose DOM actually changes are counted. The default is a rule of thumb, not a statistically derived value
• Each component is diagnosed only once per page load, and at most 5 diagnoses are made per page load, so the number of (billable) API requests stays small
• Cause: OnPush not used / re-rendered along with its parent / functions or objects recreated on every render / undetermined
• Suggested fix: OnPush / run outside the Angular zone / debounce or throttle / signals / no action needed
• Update type: likely intentional (clock, animation, polling) or not — intentional updates are labeled, not hidden
• Items the AI is not confident about are not shown
• Priority: Low / Medium / High
• Data sent to the Jev API (only while enabled): change detection strategy (OnPush or Default), re-render count, app type (Zone.js or Zoneless), whether the component has a parent, and what triggers change detection (only the kind of event or API, such as mousemove or setInterval). Component names, page content, URLs, and user input are never sent
• Your API key is stored locally in chrome.storage.local and is used only by the extension's background service worker; it is never exposed to the page

**Technical details**
• Uses __ngContext__ (Angular Ivy, v9+) to identify component host elements
• Works on both development and production builds
• Throttled to 150ms to minimize performance impact on the page
• No data collection by default — all state is stored locally via chrome.storage.local. The only network request the extension can make is the optional AI diagnosis described above

## Privacy policy URL
https://github.com/ksakae1216/angular-highlight/blob/main/PRIVACY.md

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

**AI診断（任意・ベータ版・デフォルトOFF）**
コンポーネントが短時間に何度も再レンダリングされたとき、判定特化AIの Jev（TypeSafe AI, https://typesafe.ai）に「過剰かどうか」「原因は何か」「優先度は」を判定させ、結果をコンポーネントの上に赤いバッジで表示します（バッジはクリックで閉じられます）。
• ご自身の TypeSafe APIキーが必要です。ポップアップでキーを入力してトグルをONにするまで、何も送信されません
• 判定のきっかけ: 2秒間にN回再レンダリングされたとき（デフォルト10回、ポップアップで3〜30回に変更可能）。DOMが実際に変わったコンポーネントだけを数えます。デフォルト値は経験的な目安で、統計的な根拠があるわけではありません
• 同じコンポーネントはページを読み込み直すまで1回しか判定せず、1ページあたりの診断は最大5回までなので、課金対象のAPIリクエストが増えすぎることはありません
• 原因: OnPush未使用 / 親コンポーネントの再描画の巻き込み / 関数・オブジェクトが毎回作り直されている / 特定できず
• 対処: OnPushにする / Zone外で実行する / debounce・throttleで間引く / signalにする / 対処不要
• 更新の性質: 意図的っぽい（時計・アニメーション・ポーリングなど）かどうか。意図的なものも隠さずラベルで区別します
• AIの確信度が低い項目は表示しません
• 優先度: 低 / 中 / 高
• Jev APIに送信する情報（ONの間のみ）: 変更検知戦略（OnPush or Default）、再レンダリング回数、アプリの種類（Zone.jsかZoneless）、親コンポーネントの有無、変更検知のきっかけ（mousemove や setInterval などイベント・APIの種類のみ）。コンポーネント名・ページの内容・URL・ユーザー入力は送信しません
• APIキーは chrome.storage.local にローカル保存され、拡張のバックグラウンド（Service Worker）だけが使用します。ページ側には渡されません

**プライバシー**
デフォルトではデータ収集は一切ありません（状態は chrome.storage.local にローカル保存）。拡張が行う唯一の通信は、上記のAI診断（任意）です。
