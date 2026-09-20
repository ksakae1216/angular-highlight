# Privacy Policy / プライバシーポリシー

- [English](#english)
- [日本語](#日本語)

---

## English

**Extension:** Angular Highlight
**Last updated:** 2026-09-20

### Summary

- By default, Angular Highlight collects and transmits **no data**.
- The optional **AI diagnosis** feature is **OFF by default**. It sends a small amount of technical information to the Jev API (TypeSafe AI) **only after you enter your own API key and turn the feature ON**.
- The developer of this extension does **not** operate any server and does **not** receive any of your data.

### Data stored on your device

The extension stores the following in `chrome.storage.local`, on your device only:

- Highlight on/off state and highlight colors
- AI diagnosis on/off state and the re-render threshold
- The TypeSafe API key you enter (only if you use AI diagnosis)

This data is not synced to any server by the extension. You can remove it by clearing the API key in the popup or by uninstalling the extension.

### AI diagnosis (optional)

When AI diagnosis is ON and a component re-renders many times in a short period (default: 10 times within 2 seconds), the extension sends a request to the Jev API at `https://api.typesafe.ai/` (operated by TypeSafe AI) to judge whether the re-rendering is excessive, what the likely cause is, and how urgent it is.

**Information sent in the request:**

- The component's name (or its HTML tag name)
- Its change detection strategy (`OnPush`, `Default`, or `unknown`)
- The number of re-renders within the measurement window and the window length
- The detection method (Zone.js or Signals / Zoneless)
- The name of its parent component
- Your TypeSafe API key, as an authentication header

**Information never sent:**

- Page content (text, images, form input, or any other DOM content)
- The URL or title of the page
- Your browsing history
- Any personal information

Each component is diagnosed at most once per page load.

The Jev API is operated by TypeSafe AI. How TypeSafe AI handles the requests it receives is governed by its own terms and privacy policy; please refer to https://typesafe.ai.

### Use of data

The information above is used only to provide the AI diagnosis feature. We do not sell it, use it for advertising, use it for purposes unrelated to the extension's single purpose, or use it to determine creditworthiness.

### Permissions

| Permission | Why it is needed |
|---|---|
| `storage` | Save your settings locally |
| Access to all pages (content script) | Angular apps can be hosted on any domain, so the extension must run on all pages to detect components and draw highlights. It does not collect page data |
| `https://api.typesafe.ai/*` | Send AI diagnosis requests (only when the feature is ON) |

### Your choices

- Leave AI diagnosis OFF (the default), and nothing is sent.
- Turn it OFF or clear the API key in the popup at any time.
- Uninstall the extension to remove all locally stored data.

### Changes to this policy

If this policy changes, the updated version will be published in this repository, and the "Last updated" date above will change.

### Contact

Please open an issue at https://github.com/ksakae1216/angular-highlight/issues.

---

## 日本語

**拡張機能:** Angular Highlight
**最終更新日:** 2026-09-20

### 概要

- デフォルトでは、Angular Highlight は**データを一切収集・送信しません**。
- 任意機能の **AI診断** は**デフォルトでOFF**です。**ご自身のAPIキーを入力してONにした場合にのみ**、少量の技術的な情報が Jev API（TypeSafe AI）に送信されます。
- この拡張機能の開発者はサーバーを運用しておらず、**ユーザーのデータを受け取ることはありません**。

### 端末に保存されるデータ

拡張機能は、次の情報を `chrome.storage.local`（お使いの端末内のみ）に保存します。

- ハイライトのON/OFF状態とハイライトの色
- AI診断のON/OFF状態と、再レンダリング回数のしきい値
- 入力した TypeSafe APIキー（AI診断を使う場合のみ）

拡張機能がこれらをサーバーへ同期することはありません。ポップアップでAPIキーを消去するか、拡張機能をアンインストールすると削除されます。

### AI診断（任意）

AI診断がONで、あるコンポーネントが短時間に何度も再レンダリングされたとき（デフォルトは2秒間に10回）、拡張機能は TypeSafe AI が運営する Jev API（`https://api.typesafe.ai/`）にリクエストを送り、「過剰な再レンダリングか」「原因は何か」「優先度は」を判定させます。

**リクエストで送信する情報:**

- コンポーネント名（取得できない場合はHTMLのタグ名）
- 変更検知戦略（`OnPush`、`Default`、または `unknown`）
- 計測時間内の再レンダリング回数と、計測時間の長さ
- 検知方式（Zone.js または Signals / Zoneless）
- 親コンポーネントの名前
- 認証ヘッダーとしての、ご自身の TypeSafe APIキー

**送信しない情報:**

- ページの内容（テキスト、画像、フォームの入力内容など、DOM上のあらゆる内容）
- ページのURLやタイトル
- 閲覧履歴
- 個人情報

同じコンポーネントは、ページを読み込み直すまでに最大1回しか診断しません。

Jev API は TypeSafe AI が運営しています。TypeSafe AI が受け取ったリクエストをどのように扱うかは、同社の利用規約およびプライバシーポリシーに従います。詳しくは https://typesafe.ai をご確認ください。

### データの利用目的

上記の情報は、AI診断機能を提供する目的にのみ使用します。販売、広告への利用、拡張機能の唯一の目的と無関係な目的での利用、信用力の判断への利用は行いません。

### 権限

| 権限 | 必要な理由 |
|---|---|
| `storage` | 設定を端末内に保存するため |
| すべてのページへのアクセス（コンテンツスクリプト） | Angular アプリは任意のドメインで動くため、コンポーネントの検出とハイライト表示をすべてのページで行う必要があります。ページのデータは収集しません |
| `https://api.typesafe.ai/*` | AI診断のリクエストを送信するため（機能がONのときのみ） |

### ユーザーの選択

- AI診断をOFFのまま（デフォルト）にすれば、何も送信されません。
- ポップアップからいつでもOFFにしたり、APIキーを消去したりできます。
- 拡張機能をアンインストールすると、端末内に保存されたデータはすべて削除されます。

### ポリシーの変更

本ポリシーを変更する場合は、このリポジトリで更新版を公開し、上記の「最終更新日」を更新します。

### お問い合わせ

https://github.com/ksakae1216/angular-highlight/issues にIssueを作成してください。
