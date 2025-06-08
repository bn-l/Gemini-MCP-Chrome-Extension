// public/popup.js

// DOM要素の参照を最初に取得
const inputTextArea = document.getElementById('input-text');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const statusMessage = document.getElementById('status-message');
const responseText = document.getElementById('response-text');

// ★変更点1: 応答の待受は、ポップアップを開いた時に一度だけ設定します。
// これにより、ボタンを複数回クリックしてもリスナーが重複することがなくなります。
chrome.runtime.onMessage.addListener(handleResponse);


// 送信ボタンのクリックイベント
sendButton.addEventListener('click', () => {
  const text = inputTextArea.value.trim();

  if (!text) {
    setStatus('テキストを入力してください', true);
    return;
  }

  // ★変更点2: クリック時の処理をシンプルに。バックグラウンドに処理を依頼するだけにします。
  // これで、このファイルがパースエラーになる可能性が非常に低くなります。
  setLoading(true); //
  setStatus('Geminiに送信しています...', false); //

  // バックグラウンドスクリプトにメッセージを送信
  chrome.runtime.sendMessage({
    // ※注意: background.tsがこのコマンドを認識できるように、
    // 前回の提案通り 'executeFromPopup' のようなコマンド名にするか、
    // あるいは background.ts 側のロジックを調整する必要があります。
    // ここでは、background.tsの既存のロジックを活かすため、
    // 元のメッセージ形式に近い形に戻します。
    command: 'setInput',
    payload: { text: text }
  });
  // 2つ目のコマンドもすぐに送信します
  chrome.runtime.sendMessage({ command: 'clickSend' });
});


// クリアボタンのクリックイベント
clearButton.addEventListener('click', () => {
  inputTextArea.value = '';
  responseText.textContent = '';
  statusMessage.textContent = '';
  statusMessage.classList.remove('error');
});


// 応答メッセージを処理する関数
function handleResponse(message) {
  // ポップアップに関係のないメッセージは無視
  if (!message.status) {
    return;
  }

  console.log('応答を受信:', message);

  if (message.status === 'success' && message.event === 'responseReceived') {
    // 成功応答の処理
    responseText.textContent = message.payload.text;
    setStatus('応答を受信しました', false); //
  } else if (message.status === 'error') {
    // エラー応答の処理
    responseText.textContent = `エラー: ${message.message}`;
    setStatus(`エラーが発生しました: ${message.message}`, true); //
  }

  // UIを有効化
  setLoading(false); //
}


// ステータスメッセージを設定する関数
function setStatus(message, isError) {
  statusMessage.textContent = message;
  if (isError) {
    statusMessage.classList.add('error'); //
  } else {
    statusMessage.classList.remove('error'); //
  }
}

// ローディング状態を設定する関数
function setLoading(isLoading) {
  sendButton.disabled = isLoading; //
  inputTextArea.disabled = isLoading; //
}

// ポップアップが開かれたときの初期化
document.addEventListener('DOMContentLoaded', () => {
  // 入力欄にフォーカス
  inputTextArea.focus();
});