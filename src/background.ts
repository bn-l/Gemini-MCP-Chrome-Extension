/**
 * background.ts
 * 
 * このファイルはChrome拡張機能のバックグラウンドスクリプトとして機能し、
 * Native Messagingを使用して外部のMCPサーバーと通信します。
 * また、Gemini Webページを開いているタブとの通信も管理します。
 */

import { RequestMessage, ResponseMessage } from './types';

// Native Messagingホスト名（MCPサーバー側の設定と一致させる必要があります）
const HOST_NAME = 'com.example.gemini_mcp_gateway';

// Native Messagingポート（MCPサーバーとの通信に使用）
let nativePort: chrome.runtime.Port | null = null;

// Geminiタブの準備状態を追跡するオブジェクト（タブID => 準備完了フラグ）
let geminiTabStatus: { [key: number]: boolean } = {};

// 準備ができていないタブへのメッセージキュー（タブID => メッセージ配列）
let messageQueue: { [key: number]: RequestMessage[] } = {};

/**
 * Native Messagingホストに接続する関数
 * 
 * この関数は外部のMCPサーバー（Native Messagingホスト）への接続を確立し、
 * メッセージの送受信とエラー処理を設定します。
 * 接続が切断された場合は、5秒後に再接続を試みます。
 * 接続成功時には、既存のGeminiタブに準備確認メッセージを送信します。
 */
function connectToNativeHost() {
  try {
    console.log('[MCP-Background] Attempting to connect to native host...');
    nativePort = chrome.runtime.connectNative(HOST_NAME);

    // MCPサーバーからのメッセージを受信したときの処理
    nativePort.onMessage.addListener((message: RequestMessage) => {
      sendCommandsToGeminiTab(message);
    });

    // 接続が切断されたときの処理
    nativePort.onDisconnect.addListener(() => {
      console.log('%c[MCP-Background] Disconnected from native host.', 'color: red;');
      const error = chrome.runtime.lastError;
      if (error && error.message) console.error('[MCP-Background] Disconnect error:', error.message);
      nativePort = null;
      // ★★★ 状態のリセットは行わない ★★★
      // geminiTabStatus = {};
      // messageQueue = {};
      setTimeout(connectToNativeHost, 5000); // 5秒後に再接続を試みる
    });

    console.log('%c[MCP-Background] Successfully connected to native host.', 'color: orange;');

    // 接続成功時に、既存のGeminiタブに準備OKか確認する（点呼）
    chrome.tabs.query({ url: "https://gemini.google.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          console.log(`[MCP-Background] Sending readiness check to Tab ID: ${tab.id}`);
          chrome.tabs.sendMessage(tab.id, { command: 'areYouReady' });
        }
      });
    });

  } catch (error: any) {
    // 接続エラー時の処理
    if (error && error.message) console.error('[MCP-Background] Failed to connect:', error.message);
    else console.error('[MCP-Background] Failed to connect with an unknown error.');
    setTimeout(connectToNativeHost, 5000); // 5秒後に再接続を試みる
  }
}

// Native Messagingホストへの接続を開始
connectToNativeHost();

/**
 * メッセージリスナー
 * 
 * このリスナーは以下の3種類のメッセージを処理します：
 * 1. Geminiタブからの「準備完了」通知
 * 2. Geminiタブからの応答メッセージ（MCPサーバーに転送）
 * 3. ポップアップUIなど他のソースからのコマンド（Geminiタブに転送）
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  // Geminiタブからのメッセージを処理
  if (sender.tab && sender.tab.url?.includes('gemini.google.com')) {
    const tabId = sender.tab.id;
    if (tabId) {
        // タブからの「準備完了」通知を処理
        if (message.type === 'content_ready') {
            console.log(`%c[MCP-Background] Tab ID: ${tabId} is now ready.`, 'color: green;');
            geminiTabStatus[tabId] = true;

            // キューに溜まっていたメッセージがあれば送信
            if (messageQueue[tabId] && messageQueue[tabId].length > 0) {
                console.log(`[MCP-Background] Sending ${messageQueue[tabId].length} queued messages to Tab ID: ${tabId}`);
                messageQueue[tabId].forEach(queuedMsg => {
                    chrome.tabs.sendMessage(tabId, queuedMsg);
                });
                delete messageQueue[tabId];
            }
            return;
        }
    }

    // Geminiからの応答をMCPサーバーに転送
    if (message.status && nativePort) {
      nativePort.postMessage(message);
    }
  } 
  // ポップアップUIなど他のソースからのコマンドを処理
  else if (!sender.tab && message.command) {
    sendCommandsToGeminiTab(message as RequestMessage);
  }
  return true; // 非同期レスポンスを有効にする
});

/**
 * Geminiタブにコマンドメッセージを送信する関数
 * 
 * この関数はMCPサーバーやポップアップUIからのコマンドをGeminiタブに転送します。
 * タブが準備できていない場合は、メッセージをキューに入れて後で送信します。
 * 
 * @param message - Geminiタブに送信するコマンドメッセージ
 */
async function sendCommandsToGeminiTab(message: RequestMessage) {
    // Geminiタブを検索
    const tabs = await chrome.tabs.query({ url: "https://gemini.google.com/*" });
    if (tabs.length === 0) return; // Geminiタブが見つからない場合は何もしない

    const targetTab = tabs[0];
    if (targetTab && typeof targetTab.id !== 'undefined') {
        const tabId = targetTab.id;

        // タブが準備できていない場合はメッセージをキューに入れる
        if (!geminiTabStatus[tabId]) {
            console.warn(`[MCP-Background] Tab ${tabId} is not ready yet. Queuing message.`, message);
            if (!messageQueue[tabId]) messageQueue[tabId] = [];
            messageQueue[tabId].push(message);
            return;
        }
        // タブが準備できている場合はメッセージを直接送信
        chrome.tabs.sendMessage(tabId, message);
    }
}
