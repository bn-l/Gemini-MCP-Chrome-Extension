import { RequestMessage, ResponseMessage } from './types';

const HOST_NAME = 'com.example.gemini_mcp_gateway';

let nativePort: chrome.runtime.Port | null = null;
let isMcpServerConnected = false;
let geminiTabStatus: { [key: number]: boolean } = {}; // ★タブごとに準備完了状態を管理

// MCPサーバーへの接続処理（変更なし）
function connectToNativeHost() {
  try {
    console.log('MCPサーバーに接続を試みています...');
    nativePort = chrome.runtime.connectNative(HOST_NAME);

    nativePort.onMessage.addListener((message: RequestMessage) => {
      console.log('MCPサーバーからメッセージを受信:', message);
      isMcpServerConnected = true;

      // ★コマンドをアクティブなGeminiタブに送信する
      sendCommandsToActiveGeminiTab(message);
    });

    nativePort.onDisconnect.addListener(() => {
      console.log('MCPサーバーとの接続が切断されました');
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('接続エラー:', error);
      }
      nativePort = null;
      isMcpServerConnected = false;
      setTimeout(connectToNativeHost, 5000);
    });

    console.log('MCPサーバーに接続しました');
    isMcpServerConnected = true;
  } catch (error) {
    console.error('MCPサーバーへの接続に失敗しました:', error);
    nativePort = null;
    isMcpServerConnected = false;
    setTimeout(connectToNativeHost, 5000);
  }
}

// connectToNativeHost();

// ★★★ 修正箇所：２つあったonMessageリスナーを１つに統合し、ハンドシェイクを追加 ★★★
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. content.jsからのメッセージを処理
  if (sender.tab && sender.tab.url?.includes('gemini.google.com')) {
    const tabId = sender.tab.id;

    // content.jsからの「準備完了」挨拶(ハンドシェイク)を処理
    if (message.type === 'content_ready' && tabId) {
      console.log(`タブID: ${tabId} の準備が完了しました。`);
      geminiTabStatus[tabId] = true; // このタブは準備OKと記録
      return;
    }

    // content.jsからの応答メッセージを処理
    if (message.status) {
      console.log('content.jsから応答を受信:', message);
      if (isMcpServerConnected && nativePort) {
        nativePort.postMessage(message); // MCPサーバーへ転送
      }
      chrome.runtime.sendMessage(message); // ポップアップへも転送
    }
  }
  // 2. ポップアップからのコマンドメッセージを処理
  else if (!sender.tab && message.command) {
    console.log('ポップアップからメッセージを受信:', message);
    sendCommandsToActiveGeminiTab(message);
  }

  return true; // 非同期処理を許可
});

// アクティブなGeminiタブにコマンドを送信する共通関数
function sendCommandsToActiveGeminiTab(message: RequestMessage | { command: string, payload?: any }) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.id && activeTab.url?.includes('gemini.google.com')) {
      // タブが準備完了しているか確認
      if (geminiTabStatus[activeTab.id]) {
        chrome.tabs.sendMessage(activeTab.id, message);
      } else {
        console.error(`タブID: ${activeTab.id} はまだ準備ができていません。`);
        // 必要ならエラーを返す処理
      }
    } else {
      console.error('アクティブなGeminiタブが見つかりません');
      sendErrorToNativeHost('アクティブなGeminiタブが見つかりません');
    }
  });
}

// エラーメッセージをMCPサーバーに送信する関数（変更なし）
function sendErrorToNativeHost(errorMessage: string) {
  if (nativePort) {
    const errorResponse: ResponseMessage = { status: 'error', message: errorMessage };
    nativePort.postMessage(errorResponse);
  } else {
    console.error('エラーを送信できません: MCPサーバーに接続されていません');
  }
}