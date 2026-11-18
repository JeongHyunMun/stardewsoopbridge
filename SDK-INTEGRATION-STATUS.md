# SOOP SDK integration status

## Integrated from the official documentation supplied by the user

- Browser script: `https://static.sooplive.com/asset/app/chat-sdk/sooplive-chat-sdk.js`
- Constructor: `new window.SOOP.ChatSDK(CLIENT_ID, CLIENT_SECRET)`
- Initialization and auth: `init()`, `openAuth()`, `getAuth(code)`, `setAuth(access_token)`
- Connection: `connect()`, `disconnect()`, `getRoomInfo()`, `handleChatClosed(callback)`, `handleError(callback)`
- Incoming events: `handleMessageReceived((action, message) => ...)`
- Donation action: `BALLOON_GIFTED`; `message.count`, `message.bjId`, `message.userId`, `message.userNickname`

## Implemented in the project

- Browser app loads the documented SOOP SDK script and instantiates `window.SOOP.ChatSDK`.
- OAuth callback page reads `code`/`authCode`, calls `getAuth()`, saves tokens in browser localStorage and calls `setAuth()` + `connect()`.
- `BALLOON_GIFTED` events are normalized and posted to the local Node server.
- Each local browser session authenticates its own SOOP account. The browser sends the connected broadcast ID (bjId) with each donation, and the local Node bridge forwards it to that installation’s SMAPI HTTP endpoint.

## Still requires real-environment testing

- Actual registered redirect URL and SOOP app permissions must match the developer console.
- Token response/expiry and refresh-token lifecycle must be tested; automatic refresh is not assumed.
- Confirm that the browser SDK CDN is reachable and that its methods behave as documented in the user's SDK version.
- Verify SMAPI receiver token, account linking/approval, and real donation delivery.
- The documented donation payload does not list a stable event ID, so the generated UUID cannot guarantee duplicate-event suppression.
