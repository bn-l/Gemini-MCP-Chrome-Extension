// src/content.ts (真・最終完成版)

import { RequestMessage, ResponseMessage } from './types';

// ★★★ 修正箇所：ページの読み込みが完全に完了するまで、すべての処理の開始を待つ ★★★
window.addEventListener('load', () => {

  // このフレームが操作対象のフレームか確認する
  const isTargetFrame = !!document.querySelector('div[aria-label="ここにプロンプトを入力してください"]');

  // 「当たり」のフレームでなければ、このスクリプトはここで処理を終了する
  if (isTargetFrame) {

    console.log(
        '%c ★ Gemini Content Script Loaded in TARGET FRAME! ★',
        'color: #42f560; font-size: 16px; font-weight: bold;'
    );

    const SELECTORS = {
      INPUT_AREA: 'div[aria-label="ここにプロンプトを入力してください"]',
      SEND_BUTTON: 'button[aria-label="プロンプトを送信"]',
      RESPONSE_CONTAINER: 'div[id^="model-response-message-content"]'
    };

    // 最後に送信した応答を記憶する変数
    let lastSentResponse = '';

    function setInput(text: string): Promise<boolean> {
      return new Promise((resolve) => {
        try {
          const inputElement = document.querySelector(SELECTORS.INPUT_AREA) as HTMLElement;
          if (!inputElement) { console.error('入力欄が見つかりません'); resolve(false); return; }
          inputElement.focus();
          inputElement.textContent = text;
          const inputEvent = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(inputEvent);
          resolve(true);
        } catch (error) { console.error('テキスト入力中にエラーが発生しました:', error); resolve(false); }
      });
    }

    function clickSend(): Promise<boolean> {
      return new Promise((resolve) => {
        const maxRetries = 30; let retries = 0;
        const intervalId = setInterval(() => {
          const sendButton = document.querySelector(SELECTORS.SEND_BUTTON) as HTMLButtonElement;
          if (sendButton && !sendButton.disabled) {
            clearInterval(intervalId);
            try {
              sendButton.click();
              // 新しい応答に備えて、記憶した応答をリセットする
              lastSentResponse = '';
              startResponseObserver();
              resolve(true);
            } catch (error) { console.error('送信ボタンクリック中にエラーが発生しました:', error); resolve(false); }
            return;
          }
          retries++;
          if (retries >= maxRetries) {
            clearInterval(intervalId);
            console.error('送信ボタンが見つからないか、有効になりませんでした');
            resolve(false);
          }
        }, 100);
      });
    }

    let responseObserver: MutationObserver | null = null;
    let isObserving = false;
    let debounceTimeout: number | null = null;

    function startResponseObserver() {
      if (isObserving) return;
      const observerTarget = document.body;
      if (responseObserver) responseObserver.disconnect();

      isObserving = true;
      responseObserver = new MutationObserver(() => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = window.setTimeout(() => {
          const finalText = extractResponseText();
          // 取得したテキストが新しく、かつ空でない場合のみ送信
          if (finalText && finalText !== lastSentResponse) {
            console.log('新しい応答を確定し、抽出しました:', finalText);
            lastSentResponse = finalText;
            sendResponseToBackground(finalText);

            responseObserver?.disconnect();
            isObserving = false;
          }
        }, 500);
      });

      responseObserver.observe(observerTarget, { childList: true, subtree: true, characterData: true, attributes: true });
    }

    function extractResponseText(): string | null {
      try {
        const allResponses = document.querySelectorAll(SELECTORS.RESPONSE_CONTAINER);
        if (allResponses.length === 0) return null;
        const latestResponse = allResponses[allResponses.length - 1];
        return (latestResponse.textContent || '').trim();
      } catch (error) { console.error('応答テキストの抽出中にエラーが発生しました:', error); return null; }
    }

    function sendResponseToBackground(text: string) {
      const response: ResponseMessage = { status: 'success', event: 'responseReceived', payload: { text: text } };
      chrome.runtime.sendMessage(response);
    }

    function sendErrorToBackground(errorMessage: string) {
      const errorResponse: ResponseMessage = { status: 'error', message: errorMessage };
      chrome.runtime.sendMessage(errorResponse);
    }

    chrome.runtime.onMessage.addListener((message: RequestMessage, sender, sendResponse) => {
      switch (message.command) {
        case 'setInput':
          setInput(message.payload.text).then(success => { if (!success) sendErrorToBackground('テキスト入力に失敗しました'); });
          break;
        case 'clickSend':
          clickSend().then(success => { if (!success) sendErrorToBackground('送信ボタンクリックに失敗しました'); });
          break;
      }
      return true;
    });

    // 司令塔(background.ts)に「準備完了」を通知する
    chrome.runtime.sendMessage({ type: 'content_ready' });
  }
});