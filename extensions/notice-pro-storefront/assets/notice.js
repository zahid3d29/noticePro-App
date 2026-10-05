(() => {
  const root = document.querySelector("[data-noticepro-notice]");
  if (!root || !root.dataset.endpoint) return;

  const safeColor = (value, fallback) =>
    typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
      ? value
      : fallback;

  const safeHref = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;

    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === "https:" || url.protocol === "http:"
        ? url.href
        : null;
    } catch {
      return null;
    }
  };

  async function renderNotice() {
    try {
      const response = await fetch(root.dataset.endpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return;

      const notice = await response.json();
      if (!notice?.id || !notice.message) return;

      const storageKey =
        `noticepro-dismissed:${notice.id}:` +
        encodeURIComponent(String(notice.message).slice(0, 80));

      if (notice.dismissible) {
        try {
          if (localStorage.getItem(storageKey) === "1") return;
        } catch {
          // Keep displaying the notice if browser storage is unavailable.
        }
      }

      const card = document.createElement("div");
      card.className = "noticepro-notice-card";
      card.setAttribute("role", "region");
      card.setAttribute("aria-label", "Store notice");
      card.setAttribute("aria-live", "polite");
      card.style.setProperty(
        "--noticepro-background",
        safeColor(notice.backgroundColor, "#FEF3C7"),
      );
      card.style.setProperty(
        "--noticepro-text",
        safeColor(notice.textColor, "#111827"),
      );

      const message = document.createElement("span");
      message.className = "noticepro-notice-message";
      message.textContent = notice.message;
      card.append(message);

      const href = safeHref(notice.buttonUrl);
      if (notice.buttonText && href) {
        const link = document.createElement("a");
        link.className = "noticepro-notice-link";
        link.href = href;
        link.textContent = notice.buttonText;
        card.append(link);
      }

      if (notice.dismissible) {
        const close = document.createElement("button");
        close.className = "noticepro-notice-dismiss";
        close.type = "button";
        close.setAttribute("aria-label", "Dismiss store notice");
        close.textContent = "×";
        close.addEventListener("click", () => {
          card.remove();
          try {
            localStorage.setItem(storageKey, "1");
          } catch {
            // Dismiss for this page view if storage is unavailable.
          }
        });
        card.append(close);
      }

      root.append(card);
    } catch {
      // Fail quietly if the app proxy is unavailable.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderNotice, { once: true });
  } else {
    renderNotice();
  }
})();
