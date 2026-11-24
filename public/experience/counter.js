(function () {
  const COUNTER_ENDPOINT = "https://script.google.com/macros/s/AKfycbxIHEIAlSRM7XSbkz2v77aDV17vtljHz5Le3QgOgScow5oRx8Qf3dFJEb6WWQhBP-O7Qg/exec";
  const inFlight = new Set();
  const sentInMemory = new Set();

  function getVisitorId() {
    try {
      let id = localStorage.getItem("sbm_vid");
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("sbm_vid", id);
      }
      return id;
    } catch {
      return "na";
    }
  }

  function createLogger(page, endpoint = COUNTER_ENDPOINT) {
    return function logExperienceEvent(event) {
      if (event !== "start" && event !== "finish") return;
      if (!endpoint) return;

      const key = `sbm_${page}_${event}`;
      if (inFlight.has(key) || sentInMemory.has(key)) return;

      try {
        if (localStorage.getItem(key)) return;
        const pendingAt = Number(localStorage.getItem(`${key}_pending`) || 0);
        if (pendingAt && Date.now() - pendingAt < 30000) return;
        localStorage.setItem(`${key}_pending`, String(Date.now()));
      } catch {
        // Continue with in-memory protection if storage is unavailable.
      }

      inFlight.add(key);
      const body = JSON.stringify({
        page,
        event,
        vid: getVisitorId(),
      });

      fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        body,
      })
        .then(() => {
          sentInMemory.add(key);
          try {
            localStorage.setItem(key, "1");
            localStorage.removeItem(`${key}_pending`);
          } catch {
            // This page session still avoids duplicate sends.
          }
        })
        .catch(() => {
          try {
            localStorage.removeItem(`${key}_pending`);
          } catch {
            // Storage may be disabled; the in-memory guard still applies.
          }
          // Do not mark failed requests as sent; a later attempt can retry.
        })
        .finally(() => {
          inFlight.delete(key);
        });
    };
  }

  window.SwachhCounter = { createLogger };
})();
