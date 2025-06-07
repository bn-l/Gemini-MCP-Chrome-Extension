// MCPサーバーから拡張機能へのリクエスト
export type RequestMessage = SetInputMessage | ClickSendMessage;

export interface SetInputMessage {
  command: 'setInput';
  payload: {
    text: string;
  };
}

export interface ClickSendMessage {
  command: 'clickSend';
}

// 拡張機能からMCPサーバーへのレスポンス
export type ResponseMessage = SuccessResponseMessage | ErrorResponseMessage;

export interface SuccessResponseMessage {
  status: 'success';
  event: 'responseReceived';
  payload: {
    text: string;
  };
}

export interface ErrorResponseMessage {
  status: 'error';
  message: string;
}