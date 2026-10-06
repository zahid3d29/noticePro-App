(() => {
  const root = document.querySelector("[data-noticepro-announcement]");
  if (!root || !root.dataset.endpoint) return;
  if (root.dataset.noticeproInitialized === "true") return;
  root.dataset.noticeproInitialized = "true";

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

  const createBar = (announcement) => {
    const storageKey =
      `noticepro-dismissed:${announcement.id}:` +
      encodeURIComponent(announcement.message.slice(0, 80));

    if (announcement.dismissible) {
      try {
        if (localStorage.getItem(storageKey) === "1") return null;
      } catch {
        // Keep displaying if browser storage is unavailable.
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
    if (
      typeof announcement.buttonText === "string" &&
      announcement.buttonText.trim() &&
      href
    ) {
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
          // Dismiss for this page view even without storage.
        }
      });
      bar.append(close);
    }

    return bar;
  };

  async function renderAnnouncements() {
    try {
            const endpoint = new URL(
              root.dataset.endpoint,
              window.location.origin,
            );
            endpoint.searchParams.set("format", "multi");

            const response = await fetch(endpoint.href, {
              credentials: "same-origin",
              headers: { Accept: "application/json" },
            });

      if (!response.ok) return;

      const payload = await response.json();

      // Support the future envelope and the current single-widget response.
      const announcements = Array.isArray(payload?.announcements)
        ? payload.announcements
        : Array.isArray(payload)
          ? payload
          : payload
            ? [payload]
            : [];

      const topFragment = document.createDocumentFragment();
      const bottomFragment = document.createDocumentFragment();
      const seen = new Set();

      for (const announcement of announcements) {
        if (
          !announcement ||
          typeof announcement.id !== "string" ||
          !announcement.id ||
          typeof announcement.message !== "string" ||
          !announcement.message.trim() ||
          seen.has(announcement.id)
        ) {
          continue;
        }

        seen.add(announcement.id);
        const bar = createBar(announcement);
        if (!bar) continue;

        if (announcement.position === "BOTTOM") {
          bottomFragment.append(bar);
        } else {
          topFragment.append(bar);
        }
      }

      if (topFragment.childNodes.length) {
        root.classList.add("noticepro-announcement-stack");
        root.append(topFragment);
        document.body.prepend(root);
      }

      if (bottomFragment.childNodes.length) {
        const bottomRoot = document.createElement("div");
        bottomRoot.className = "noticepro-announcement-stack";
        bottomRoot.append(bottomFragment);
        document.body.append(bottomRoot);
      }
    } catch {
      // Fail quietly if the app proxy is unavailable.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAnnouncements, {
      once: true,
    });
  } else {
    renderAnnouncements();
  }
})();
