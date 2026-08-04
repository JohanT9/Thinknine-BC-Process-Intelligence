# Architecture 2.0

```text
Business Central frames
        │
        ▼
content.js
        │ chrome.runtime.sendMessage
        ▼
background.js
        ├── session state
        ├── event queue
        ├── screenshots
        ├── chrome.storage.local
        └── debug state
                │
                ├── popup
                ├── dashboard
                └── debug panel
```

The service worker wakes for runtime messages and is not required to remain continuously active.
All persistent state lives in chrome.storage.local.
