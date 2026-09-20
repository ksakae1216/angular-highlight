// background.js - Jev (TypeSafe AI) API 呼び出しを担当する Service Worker
// APIキーはここ(拡張のバックグラウンド)だけで扱い、ページ側(inject.js)には渡さない

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'JEV_ANALYZE') return false;

  (async () => {
    try {
      const { jevApiKey, jevEnabled } = await chrome.storage.local.get({
        jevApiKey: '',
        jevEnabled: false,
      });

      if (!jevEnabled || !jevApiKey) {
        sendResponse({ error: 'not_configured' });
        return;
      }

      const res = await fetch(JEV_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jevApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'jev-latest',
          state: JSON.stringify(message.state),
          questions: {
            excessive_rerender: {
              type: 'noul',
              instructions:
                'Given a component re-render frequency and its change detection strategy, is this component re-rendering more often than expected?',
            },
            likely_cause: {
              type: 'choice',
              instructions: 'What is the most likely cause of the excessive re-rendering?',
              criteria: {
                missing_onpush:
                  'The component does not use the OnPush change detection strategy',
                parent_propagation:
                  'Re-renders are likely triggered by an unnecessary re-render of a parent component',
                event_handler_recreation:
                  'An event handler, object, or array reference is likely being recreated on every render, breaking memoization or triggering signal updates',
                unclear: 'Not enough information to determine the cause',
              },
            },
            optimization_priority: {
              type: 'score',
              instructions: 'How urgently should this component be optimized?',
              criteria: ['Low priority', 'Medium priority', 'High priority'],
            },
          },
        }),
      });

      if (!res.ok) {
        sendResponse({ error: `http_${res.status}` });
        return;
      }

      const data = await res.json();
      sendResponse({ result: data.answers });
    } catch (err) {
      sendResponse({ error: 'request_failed' });
    }
  })();

  return true; // 非同期で sendResponse を呼ぶために必須
});
