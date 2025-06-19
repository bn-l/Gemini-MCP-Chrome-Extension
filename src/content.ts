/**
 * content.ts
 * 
 * このファイルはChrome拡張機能のコンテンツスクリプトとして機能し、
 * Gemini Webページ上でのDOM操作を担当します。主な機能は：
 * 1. テキスト入力欄への入力
 * 2. 送信ボタンのクリック
 * 3. Geminiからの応答テキストの取得と転送
 * 
 * 拡張機能のバックグラウンドスクリプトとメッセージングを行い、
 * MCPサーバーからのコマンドを実行します。
 */
import { RequestMessage, ResponseMessage } from './types';

/**
 * メイン処理を初期化する関数
 * 
 * この関数はGemini Webページの準備ができた時点で呼び出され、
 * DOM操作やイベントリスナーの設定を行います。
 */
function initializeMainLogic() {
  console.log('[MCP-Content] Target frame confirmed. Initializing main logic...');

  // Gemini Webページ上の要素を特定するためのセレクタ
  const SELECTORS = {
    INPUT_AREA: 'div[aria-label="ここにプロンプトを入力してください"]',
    SEND_BUTTON: 'button[aria-label="プロンプトを送信"]',
    RESPONSE_CONTAINER: 'div[id^="model-response-message-content"]'
  };

  // 最後に送信した応答を記録するためのストレージキー
  const STORAGE_KEY = 'mcp_last_response';

  // DOM変更を監視するためのオブザーバー
  let responseObserver: MutationObserver | null = null;

  // 応答テキスト取得のデバウンス処理用タイムアウトID
  let debounceTimeout: number | null = null;

  /**
   * Geminiの応答テキストを抽出する関数
   * 
   * ページ上のGeminiの応答コンテナから最新の応答テキストを取得します。
   * 応答が見つからない場合やエラーが発生した場合はnullを返します。
   * 
   * @returns 抽出された応答テキスト、または応答が見つからない場合はnull
   */
  function extractResponseText(): string | null {
    try {
      const allResponses = document.querySelectorAll(SELECTORS.RESPONSE_CONTAINER);
      if (allResponses.length === 0) return null;
      const latestResponse = allResponses[allResponses.length - 1];
      return (latestResponse.textContent || '').trim();
    } catch (error) { return null; }
  }

  /**
   * セッションストレージを初期化する関数
   * 
   * ページ読み込み時に既存の応答テキストがあれば、それをセッションストレージに
   * 保存します。これにより、同じ応答が重複して送信されるのを防ぎます。
   */
  function primeSessionStorage() {
    const initialText = extractResponseText();
    if (initialText) {
      console.log('[MCP-Content] Priming sessionStorage with initial last response:', initialText);
      sessionStorage.setItem(STORAGE_KEY, initialText);
    }
  }

  /**
   * 応答テキストをバックグラウンドスクリプトに送信する関数
   * 
   * Geminiからの応答テキストを適切な形式でバックグラウンドスクリプトに送信します。
   * バックグラウンドスクリプトはこれをMCPサーバーに転送します。
   * 
   * @param text - 送信する応答テキスト
   */
  function sendResponseToBackground(text: string) {
    const response: ResponseMessage = { status: 'success', event: 'responseReceived', payload: { text: text } };
    chrome.runtime.sendMessage(response);
  }

  /**
   * Geminiの応答を監視するオブザーバーを開始する関数
   * 
   * DOM変更を監視し、Geminiからの新しい応答テキストを検出します。
   * 新しい応答が検出された場合、それをバックグラウンドスクリプトに送信します。
   * デバウンス処理を行い、短時間に複数回の通知が発生するのを防ぎます。
   * 診断ログを出力して、応答検出プロセスの各ステップを追跡します。
   */
  function startResponseObserver() {
    // 既存のオブザーバーがあれば切断
    if (responseObserver) responseObserver.disconnect();

    const observerTarget = document.body;
    responseObserver = new MutationObserver(() => {
      // デバウンス処理（短時間に複数回実行されるのを防ぐ）
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = window.setTimeout(() => {
        console.log('[MCP-Content] --- Observer Fired ---');
        const finalText = extractResponseText();

        // 応答テキストが取得できなかった場合
        if (!finalText) {
          console.log('[MCP-Content] Observer fired, but no text was extracted.');
          return;
        }
        console.log(`[MCP-Content] Step 1: Extracted text: "${finalText.substring(0, 20)}..."`);

        try {
          // 前回送信した応答テキストを取得
          const lastSent = sessionStorage.getItem(STORAGE_KEY) || '';
          console.log(`[MCP-Content] Step 2: Read from sessionStorage. lastSent: "${lastSent.substring(0, 20)}..."`);

          // 新しい応答テキストの場合のみ送信
          if (finalText !== lastSent) {
            console.log('[MCP-Content] Step 3: ✅ Text is new. Condition (finalText !== lastSent) is TRUE.');
            console.log('[MCP-Content] Step 4: Attempting to write to sessionStorage...');
            sessionStorage.setItem(STORAGE_KEY, finalText);
            console.log('[MCP-Content] Step 5: Write to sessionStorage seems successful.');
            sendResponseToBackground(finalText);
          } else {
            console.log('[MCP-Content] Step 3: ❌ Text is old (it matches sessionStorage). Condition is FALSE. Ignoring.');
          }
        } catch (e) {
          console.error('[MCP-Content] ❌ A CRITICAL ERROR occurred while accessing sessionStorage!', e);
        }
      }, 500); // 500ミリ秒のデバウンス時間
    });

    // body要素とその子孫要素の変更を監視
    responseObserver.observe(observerTarget, { childList: true, subtree: true });
  }

  /**
   * テキスト入力欄にテキストを設定する関数
   * 
   * Geminiの入力欄に指定されたテキストを入力します。
   * 入力が成功したかどうかをPromiseで返します。
   * 
   * @param text - 入力するテキスト
   * @returns 入力が成功したかどうかを示すPromise
   */
  function setInput(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // 入力欄要素を取得
        const inputElement = document.querySelector(SELECTORS.INPUT_AREA) as HTMLElement;
        if (!inputElement) { resolve(false); return; }

        // テキストを入力
        inputElement.focus();
        inputElement.textContent = text;

        // 入力イベントを発火させてGeminiに変更を通知
        const inputEvent = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(inputEvent);

        resolve(true);
      } catch (error) { resolve(false); }
    });
  }

  /**
   * 送信ボタンをクリックする関数
   * 
   * Geminiの送信ボタンを探してクリックします。
   * ボタンが有効になるまで待機し、クリック後に応答監視を開始します。
   * 
   * @returns クリックが成功したかどうかを示すPromise
   */
  function clickSend(): Promise<boolean> {
    return new Promise((resolve) => {
      // ボタンが有効になるまで定期的にチェック
      const intervalId = setInterval(() => {
        const sendButton = document.querySelector(SELECTORS.SEND_BUTTON) as HTMLButtonElement;
        if (sendButton && !sendButton.disabled) {
          clearInterval(intervalId);
          try {
            // ボタンをクリックして応答監視を開始
            sendButton.click();
            startResponseObserver();
            resolve(true);
          } catch (error) { resolve(false); }
        }
      }, 100); // 100ミリ秒ごとにチェック
    });
  }

  /**
   * エラーメッセージをバックグラウンドスクリプトに送信する関数
   * 
   * 操作中にエラーが発生した場合、エラーメッセージを
   * バックグラウンドスクリプトに送信します。
   * 
   * @param errorMessage - 送信するエラーメッセージ
   */
  function sendErrorToBackground(errorMessage: string) {
    const errorResponse: ResponseMessage = { status: 'error', message: errorMessage };
    chrome.runtime.sendMessage(errorResponse);
  }

  // 初期化時にセッションストレージを準備
  primeSessionStorage();

  /**
   * バックグラウンドスクリプトからのメッセージを処理するリスナー
   * 
   * 以下のコマンドを処理します：
   * - areYouReady: 準備状態の確認に応答
   * - setInput: テキスト入力欄にテキストを設定
   * - clickSend: 送信ボタンをクリック
   */
  chrome.runtime.onMessage.addListener((message: RequestMessage) => {
    switch (message.command) {
      case 'areYouReady':
        // バックグラウンドスクリプトからの点呼に応答して、準備完了を通知
        console.log('[MCP-Content] Received readiness check. Replying with content_ready.');
        chrome.runtime.sendMessage({ type: 'content_ready' });
        break;
      case 'setInput':
        // テキスト入力コマンドを処理
        setInput(message.payload.text).then(success => { 
          if (!success) sendErrorToBackground('テキスト入力に失敗しました'); 
        });
        break;
      case 'clickSend':
        // 送信ボタンクリックコマンドを処理
        clickSend().then(success => { 
          if (!success) sendErrorToBackground('送信ボタンクリックに失敗しました'); 
        });
        break;
    }
    return true; // 非同期レスポンスを有効にする
  });

  // 初期化完了時にバックグラウンドスクリプトに準備完了を通知
  chrome.runtime.sendMessage({ type: 'content_ready' });
}

/**
 * 特定の要素がDOMに表示されるまで待機する関数
 * 
 * 指定されたセレクタに一致する要素がDOMに表示されるまで
 * 定期的にチェックし、要素が見つかったらコールバック関数を実行します。
 * 
 * @param selector - 待機する要素のCSSセレクタ
 * @param callback - 要素が見つかった時に実行するコールバック関数
 */
function pollForElement(selector: string, callback: () => void) {
  const intervalId = setInterval(() => {
    if (document.querySelector(selector)) {
      clearInterval(intervalId);
      callback();
    }
  }, 500); // 500ミリ秒ごとにチェック
}

// 入力欄が表示されるまで待機し、表示されたらメイン処理を初期化
pollForElement('div[aria-label="ここにプロンプトを入力してください"]', initializeMainLogic);
