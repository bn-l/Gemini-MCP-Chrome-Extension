import { RequestMessage, ResponseMessage } from './types';

// Native Messagingホスト名（MCPサーバー側で設定する名前と一致させる必要があります）
const HOST_NAME = 'com.example.gemini_mcp_gateway';

// Native Messagingポートを確立
let nativePort: chrome.runtime.Port | null = null;

// 拡張機能の起動時にNative Messagingポートを接続
function connectToNativeHost() {
  try {
    console.log('MCPサーバーに接続を試みています...');
    nativePort = chrome.runtime.connectNative(HOST_NAME);
    
    // MCPサーバーからのメッセージを受信したときの処理
    nativePort.onMessage.addListener((message: RequestMessage) => {
      console.log('MCPサーバーからメッセージを受信:', message);
      
      // アクティブなタブにメッセージを転送
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, message);
        } else {
          console.error('アクティブなタブが見つかりません');
          sendErrorToNativeHost('アクティブなタブが見つかりません');
        }
      });
    });
    
    // 接続が切断されたときの処理
    nativePort.onDisconnect.addListener(() => {
      console.log('MCPサーバーとの接続が切断されました');
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('接続エラー:', error);
      }
      nativePort = null;
      
      // 一定時間後に再接続を試みる
      setTimeout(connectToNativeHost, 5000);
    });
    
    console.log('MCPサーバーに接続しました');
  } catch (error) {
    console.error('MCPサーバーへの接続に失敗しました:', error);
    nativePort = null;
    
    // 一定時間後に再接続を試みる
    setTimeout(connectToNativeHost, 5000);
  }
}

// 拡張機能の起動時に接続を確立
connectToNativeHost();

// content.jsからのメッセージを受信したときの処理
chrome.runtime.onMessage.addListener((message: ResponseMessage, sender, sendResponse) => {
  console.log('content.jsからメッセージを受信:', message);
  
  // MCPサーバーにメッセージを転送
  if (nativePort) {
    nativePort.postMessage(message);
  } else {
    console.error('MCPサーバーに接続されていません');
    // 再接続を試みる
    connectToNativeHost();
  }
  
  // 非同期レスポンスを許可
  return true;
});

// エラーメッセージをMCPサーバーに送信する関数
function sendErrorToNativeHost(errorMessage: string) {
  if (nativePort) {
    const errorResponse: ResponseMessage = {
      status: 'error',
      message: errorMessage
    };
    nativePort.postMessage(errorResponse);
  } else {
    console.error('エラーを送信できません: MCPサーバーに接続されていません');
  }
}