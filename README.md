# Gemini MCP Connector

Chrome拡張機能を使用して、MCPクライアントからGemini Webインターフェースを操作するためのプロジェクトです。

## プロジェクト概要

このプロジェクトは、外部のMCPクライアントからMCPサーバーを介してGoogle GeminiのWebインターフェースを操作するためのChrome拡張機能です。TypeScriptで開発されており、コードの品質と保守性を高めています。

### システムアーキテクチャ

データの流れは以下の通りです：

`[MCPクライアント] <--(MCP)--> [MCPサーバー] <--(Native Messaging)--> [Chrome拡張機能] <--(DOM)--> [Gemini Webページ]`

## セットアップ方法

### 前提条件

- Node.js と npm がインストールされていること
- Google Chrome ブラウザがインストールされていること

### インストール手順

1. リポジトリをクローンまたはダウンロードします
   ```
   git clone <リポジトリURL>
   cd GeminiMcpGateway
   ```

2. 依存パッケージをインストールします
   ```
   npm install
   ```

3. 拡張機能をビルドします
   ```
   npm run build
   ```

4. Chrome拡張機能をインストールします
   - Chromeで `chrome://extensions` を開きます
   - 「デベロッパーモード」を有効にします
   - 「パッケージ化されていない拡張機能を読み込む」をクリックします
   - プロジェクトのディレクトリを選択します（distディレクトリが含まれていることを確認してください）

### MCPサーバーの設定

MCPサーバー側では、Native Hostマニフェストを作成し、適切な場所に配置する必要があります。マニフェストには以下の情報を含める必要があります：

- ホスト名: `com.example.gemini_mcp_gateway`（background.tsで指定されている名前と一致させる必要があります）
- 実行可能ファイルのパス
- 許可されるChrome拡張機能のID

詳細な設定方法については、[Chrome Native Messaging のドキュメント](https://developer.chrome.com/docs/apps/nativeMessaging)を参照してください。

## 使用方法

1. Chrome拡張機能をインストールした状態で、Gemini Webページ（https://gemini.google.com/）にアクセスします
2. MCPクライアントから、MCPサーバーを介して以下のコマンドを送信できます：
   - テキスト入力: `{"command": "setInput", "payload": {"text": "入力するテキスト"}}`
   - 送信ボタンクリック: `{"command": "clickSend"}`
3. Geminiからの応答は、MCPサーバーを介してMCPクライアントに返されます：
   - 成功時: `{"status": "success", "event": "responseReceived", "payload": {"text": "応答テキスト"}}`
   - エラー時: `{"status": "error", "message": "エラーメッセージ"}`

## 開発情報

### プロジェクト構造

```
/project-root
|-- /dist            <- ビルド後のファイルが出力されるディレクトリ
|-- /public          <- 静的ファイルを格納するディレクトリ
|   `-- manifest.json <- Chrome拡張機能のマニフェスト
|-- /src             <- ソースコードを格納するディレクトリ
|   |-- background.ts <- Native Messaging担当
|   |-- content.ts    <- DOM操作担当
|   `-- types.ts      <- 型定義
|-- package.json
|-- tsconfig.json
`-- webpack.config.js
```

### ビルドコマンド

- `npm run build`: 拡張機能をビルドします

## 注意事項

- セレクタ（SELECTORS）は、Geminiページの実際の構造に合わせて調整が必要な場合があります
- Native Messagingホスト名（HOST_NAME）は、MCPサーバー側の設定と一致させる必要があります