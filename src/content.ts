import { RequestMessage, ResponseMessage } from './types';

// Geminiページの要素のセレクタ
const SELECTORS = {
  // 入力欄のセレクタ（実際のGeminiページに合わせて調整が必要）
  INPUT_AREA: 'textarea[aria-label="プロンプトを入力"]',
  // 送信ボタンのセレクタ（実際のGeminiページに合わせて調整が必要）
  SEND_BUTTON: 'button[aria-label="送信"]',
  // 応答コンテナのセレクタ（実際のGeminiページに合わせて調整が必要）
  RESPONSE_CONTAINER: '.response-container'
};

// 初期化時にコンソールにメッセージを表示
console.log('Gemini MCP Connector: コンテンツスクリプトが読み込まれました');

// 入力欄にテキストを設定する関数
function setInput(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const inputElement = document.querySelector(SELECTORS.INPUT_AREA) as HTMLTextAreaElement;
      
      if (!inputElement) {
        console.error('入力欄が見つかりません');
        resolve(false);
        return;
      }
      
      // 入力欄にフォーカスを当てる
      inputElement.focus();
      
      // 入力欄の値を設定
      inputElement.value = text;
      
      // 入力イベントを発火させて、Geminiの内部状態を更新
      const inputEvent = new Event('input', { bubbles: true });
      inputElement.dispatchEvent(inputEvent);
      
      console.log('テキストを入力しました:', text);
      resolve(true);
    } catch (error) {
      console.error('テキスト入力中にエラーが発生しました:', error);
      resolve(false);
    }
  });
}

// 送信ボタンをクリックする関数
function clickSend(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const sendButton = document.querySelector(SELECTORS.SEND_BUTTON) as HTMLButtonElement;
      
      if (!sendButton) {
        console.error('送信ボタンが見つかりません');
        resolve(false);
        return;
      }
      
      // ボタンが無効化されていないか確認
      if (sendButton.disabled) {
        console.error('送信ボタンが無効化されています');
        resolve(false);
        return;
      }
      
      // ボタンをクリック
      sendButton.click();
      
      console.log('送信ボタンをクリックしました');
      
      // 応答監視を開始
      startResponseObserver();
      
      resolve(true);
    } catch (error) {
      console.error('送信ボタンクリック中にエラーが発生しました:', error);
      resolve(false);
    }
  });
}

// 応答を監視するMutationObserver
let responseObserver: MutationObserver | null = null;
let isObserving = false;

// 応答監視を開始する関数
function startResponseObserver() {
  if (isObserving) {
    return;
  }
  
  try {
    console.log('応答監視を開始します');
    
    // 応答コンテナを取得
    const responseContainer = document.querySelector(SELECTORS.RESPONSE_CONTAINER);
    
    if (!responseContainer) {
      console.error('応答コンテナが見つかりません');
      return;
    }
    
    // 既存のObserverをクリーンアップ
    if (responseObserver) {
      responseObserver.disconnect();
    }
    
    isObserving = true;
    
    // 新しいObserverを作成
    responseObserver = new MutationObserver((mutations) => {
      // 応答が完了したかどうかを判断する処理
      // 例: 「生成中...」のインジケータが消えたかどうかを確認
      
      // 応答テキストを抽出
      const responseText = extractResponseText();
      
      if (responseText) {
        console.log('応答テキストを抽出しました:', responseText);
        
        // 応答が完了したと判断したら、Observerを停止
        responseObserver?.disconnect();
        isObserving = false;
        
        // 応答テキストをbackground.jsに送信
        sendResponseToBackground(responseText);
      }
    });
    
    // 監視設定
    responseObserver.observe(responseContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
  } catch (error) {
    console.error('応答監視の開始中にエラーが発生しました:', error);
    isObserving = false;
  }
}

// 応答テキストを抽出する関数
function extractResponseText(): string | null {
  try {
    const responseContainer = document.querySelector(SELECTORS.RESPONSE_CONTAINER);
    
    if (!responseContainer) {
      return null;
    }
    
    // 応答テキストを抽出（実際のGeminiページの構造に合わせて調整が必要）
    // 例: すべてのテキストノードを連結する
    const textContent = responseContainer.textContent || '';
    
    return textContent.trim();
  } catch (error) {
    console.error('応答テキストの抽出中にエラーが発生しました:', error);
    return null;
  }
}

// 応答テキストをbackground.jsに送信する関数
function sendResponseToBackground(text: string) {
  const response: ResponseMessage = {
    status: 'success',
    event: 'responseReceived',
    payload: {
      text: text
    }
  };
  
  chrome.runtime.sendMessage(response);
}

// background.jsからのメッセージを受信
chrome.runtime.onMessage.addListener((message: RequestMessage, sender, sendResponse) => {
  console.log('background.jsからメッセージを受信:', message);
  
  // メッセージの種類に応じて処理を分岐
  switch (message.command) {
    case 'setInput':
      setInput(message.payload.text)
        .then((success) => {
          if (!success) {
            sendErrorToBackground('テキスト入力に失敗しました');
          }
        });
      break;
      
    case 'clickSend':
      clickSend()
        .then((success) => {
          if (!success) {
            sendErrorToBackground('送信ボタンクリックに失敗しました');
          }
        });
      break;
      
    default:
      console.error('不明なコマンドです:', message);
      sendErrorToBackground(`不明なコマンド: ${JSON.stringify(message)}`);
      break;
  }
  
  // 非同期レスポンスを許可
  return true;
});

// エラーメッセージをbackground.jsに送信する関数
function sendErrorToBackground(errorMessage: string) {
  const errorResponse: ResponseMessage = {
    status: 'error',
    message: errorMessage
  };
  
  chrome.runtime.sendMessage(errorResponse);
}

// ページ読み込み完了時の処理
window.addEventListener('load', () => {
  console.log('Gemini MCP Connector: ページが完全に読み込まれました');
});