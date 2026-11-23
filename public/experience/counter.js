(function () {
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

  function createLogger(page, endpoint) {
    return function logExperienceEvent(event) {
      if (event !== "start" && event !== "finish") return;
      if (!endpoint) return;

      const key = `sbm_${page}_${event}`;
      if (inFlight.has(key) || sentInMemory.has(key)) return;

      try {
        if (localStorage.getItem(key)) return;
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
          } catch {
            // This page session still avoids duplicate sends.
          }
        })
        .catch(() => {
          // Do not mark failed requests as sent; a later attempt can retry.
        })
        .finally(() => {
          inFlight.delete(key);
        });
    };
  }

  window.SwachhCounter = { createLogger };
})();
