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
                'Given how often a component re-renders within a time window, its change detection strategy, and what triggers the re-renders (mainTrigger), is this component re-rendering more often than expected?',
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
                frequent_event:
                  'A high-frequency event such as mousemove or scroll is triggering change detection',
                timer_or_polling:
                  'A timer, animation frame, or polling request is triggering change detection',
                unclear: 'Not enough information to determine the cause',
              },
            },
            suggested_fix: {
              type: 'choice',
              instructions: 'What is the most suitable way to reduce the unnecessary re-rendering?',
              criteria: {
                on_push: 'Switch the component to the OnPush change detection strategy',
                run_outside_angular:
                  'Run the frequent event handler or timer outside the Angular zone (NgZone.runOutsideAngular)',
                throttle: 'Debounce or throttle the frequent event or timer',
                signals: 'Move the component state to signals',
                no_action: 'No action is needed because the frequent updates are expected',
              },
            },
            intentional_update: {
              type: 'noul',
              instructions:
                'mainTrigger is the most frequent source of change detection (unknown if not available), and isRegularInterval tells whether updates arrive at regular intervals. Are these frequent re-renders likely an intentional update, such as a clock, animation, or polling, rather than a mistake?',
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
