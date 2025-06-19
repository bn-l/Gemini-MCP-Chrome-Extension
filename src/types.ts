/**
 * types.ts
 * 
 * このファイルはChrome拡張機能とMCPサーバー間のメッセージング用の
 * 型定義を提供します。明確な型定義により、タイプセーフなコミュニケーションを
 * 実現し、開発時のエラー検出を容易にします。
 */

/**
 * MCPサーバーから拡張機能へのリクエストメッセージの型定義
 */

/**
 * 準備状態確認メッセージ
 * 
 * バックグラウンドスクリプトがコンテンツスクリプトに
 * 準備ができているかどうかを確認するために使用します。
 */
export interface AreYouReadyMessage {
  command: 'areYouReady';
}

/**
 * テキスト入力メッセージ
 * 
 * Geminiの入力欄に特定のテキストを入力するよう
 * コンテンツスクリプトに指示するために使用します。
 */
export interface SetInputMessage {
  command: 'setInput';
  payload: {
    text: string; // 入力するテキスト
  };
}

/**
 * 送信ボタンクリックメッセージ
 * 
 * Geminiの送信ボタンをクリックするよう
 * コンテンツスクリプトに指示するために使用します。
 */
export interface ClickSendMessage {
  command: 'clickSend';
}

/**
 * リクエストメッセージの共用体型
 * 
 * MCPサーバーからChrome拡張機能へのすべてのリクエストタイプを
 * 一つの型として扱うために使用します。
 */
export type RequestMessage = SetInputMessage | ClickSendMessage | AreYouReadyMessage;


/**
 * 拡張機能からMCPサーバーへのレスポンスメッセージの型定義
 */

/**
 * レスポンスメッセージの共用体型
 * 
 * Chrome拡張機能からMCPサーバーへのすべてのレスポンスタイプを
 * 一つの型として扱うために使用します。
 */
export type ResponseMessage = SuccessResponseMessage | ErrorResponseMessage;

/**
 * 成功レスポンスメッセージ
 * 
 * Geminiからの応答テキストをMCPサーバーに
 * 転送するために使用します。
 */
export interface SuccessResponseMessage {
  status: 'success';
  event: 'responseReceived';
  payload: {
    text: string; // Geminiからの応答テキスト
  };
}

/**
 * エラーレスポンスメッセージ
 * 
 * 操作中に発生したエラーをMCPサーバーに
 * 通知するために使用します。
 */
export interface ErrorResponseMessage {
  status: 'error';
  message: string; // エラーメッセージ
}
