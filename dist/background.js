/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/background.ts":
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\n// Native Messagingホスト名（MCPサーバー側で設定する名前と一致させる必要があります）\nconst HOST_NAME = 'com.example.gemini_mcp_gateway';\n// Native Messagingポートを確立\nlet nativePort = null;\n// 拡張機能の起動時にNative Messagingポートを接続\nfunction connectToNativeHost() {\n    try {\n        console.log('MCPサーバーに接続を試みています...');\n        nativePort = chrome.runtime.connectNative(HOST_NAME);\n        // MCPサーバーからのメッセージを受信したときの処理\n        nativePort.onMessage.addListener((message) => {\n            console.log('MCPサーバーからメッセージを受信:', message);\n            // アクティブなタブにメッセージを転送\n            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {\n                var _a;\n                if ((_a = tabs[0]) === null || _a === void 0 ? void 0 : _a.id) {\n                    chrome.tabs.sendMessage(tabs[0].id, message);\n                }\n                else {\n                    console.error('アクティブなタブが見つかりません');\n                    sendErrorToNativeHost('アクティブなタブが見つかりません');\n                }\n            });\n        });\n        // 接続が切断されたときの処理\n        nativePort.onDisconnect.addListener(() => {\n            console.log('MCPサーバーとの接続が切断されました');\n            const error = chrome.runtime.lastError;\n            if (error) {\n                console.error('接続エラー:', error);\n            }\n            nativePort = null;\n            // 一定時間後に再接続を試みる\n            setTimeout(connectToNativeHost, 5000);\n        });\n        console.log('MCPサーバーに接続しました');\n    }\n    catch (error) {\n        console.error('MCPサーバーへの接続に失敗しました:', error);\n        nativePort = null;\n        // 一定時間後に再接続を試みる\n        setTimeout(connectToNativeHost, 5000);\n    }\n}\n// 拡張機能の起動時に接続を確立\nconnectToNativeHost();\n// content.jsからのメッセージを受信したときの処理\nchrome.runtime.onMessage.addListener((message, sender, sendResponse) => {\n    console.log('content.jsからメッセージを受信:', message);\n    // MCPサーバーにメッセージを転送\n    if (nativePort) {\n        nativePort.postMessage(message);\n    }\n    else {\n        console.error('MCPサーバーに接続されていません');\n        // 再接続を試みる\n        connectToNativeHost();\n    }\n    // 非同期レスポンスを許可\n    return true;\n});\n// エラーメッセージをMCPサーバーに送信する関数\nfunction sendErrorToNativeHost(errorMessage) {\n    if (nativePort) {\n        const errorResponse = {\n            status: 'error',\n            message: errorMessage\n        };\n        nativePort.postMessage(errorResponse);\n    }\n    else {\n        console.error('エラーを送信できません: MCPサーバーに接続されていません');\n    }\n}\n\n\n//# sourceURL=webpack://GeminiMcpGateway/./src/background.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/background.ts"](0, __webpack_exports__);
/******/ 	
/******/ })()
;