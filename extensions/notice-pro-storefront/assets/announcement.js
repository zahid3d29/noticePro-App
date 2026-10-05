(() => {
  const root = document.querySelector("[data-noticepro-announcement]");
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

  async function renderAnnouncement() {
    try {
      const response = await fetch(root.dataset.endpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return;

      const announcement = await response.json();
      if (!announcement?.id || !announcement.message) return;

      const storageKey =
        `noticepro-dismissed:${announcement.id}:` +
        encodeURIComponent(String(announcement.message).slice(0, 80));

      if (announcement.dismissible) {
        try {
          if (localStorage.getItem(storageKey) === "1") return;
        } catch {
          // Keep displaying the announcement if browser storage is unavailable.
        }
      }

      const bar = document.createElement("div");
      bar.className = "noticepro-announcement-bar";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Store announcement");
      bar.style.setProperty(
        "--noticepro-background",
        safeColor(announcement.backgroundColor, "#111827"),
      );
      bar.style.setProperty(
        "--noticepro-text",
        safeColor(announcement.textColor, "#ffffff"),
      );

      const message = document.createElement("span");
      message.className = "noticepro-announcement-message";
      message.textContent = announcement.message;
      bar.append(message);

      const href = safeHref(announcement.buttonUrl);
      if (announcement.buttonText && href) {
        const link = document.createElement("a");
        link.className = "noticepro-announcement-link";
        link.href = href;
        link.textContent = announcement.buttonText;
        bar.append(link);
      }

      if (announcement.dismissible) {
        const close = document.createElement("button");
        close.className = "noticepro-announcement-close";
        close.type = "button";
        close.setAttribute("aria-label", "Dismiss announcement");
        close.textContent = "×";
        close.addEventListener("click", () => {
          bar.remove();
          try {
            localStorage.setItem(storageKey, "1");
          } catch {
            // Dismiss for this page view even if storage is unavailable.
          }
        });
        bar.append(close);
      }

      if (announcement.position === "BOTTOM") {
        document.body.append(root);
      } else {
        document.body.prepend(root);
      }

      root.append(bar);
    } catch {
      // Fail quietly on the storefront if the app proxy is unavailable.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAnnouncement, {
      once: true,
    });
  } else {
    renderAnnouncement();
  }
})();
