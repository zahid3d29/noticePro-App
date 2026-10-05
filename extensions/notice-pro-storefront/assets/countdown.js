(() => {
  async function startCountdown() {
    const root = document.querySelector("[data-noticepro-countdown]");

    if (!root?.dataset.endpoint || root.dataset.initialized === "true") {
      return;
    }

    root.dataset.initialized = "true";

    const safeColor = (value, fallback) =>
      typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
        ? value
        : fallback;

    const safeOffset = (value) => {
      const number = Number(value);
      return Number.isInteger(number) ? Math.min(200, Math.max(0, number)) : 0;
    };

    try {
      const response = await fetch(root.dataset.endpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) return;

      const payload = await response.json();
      const countdown = payload?.countdown;

      if (!countdown?.id || typeof countdown.message !== "string") {
        return;
      }

      const deadline = Date.parse(countdown.countdownEndsAt);
      const serverTime = Date.parse(payload.serverNow);

      if (!Number.isFinite(deadline) || !Number.isFinite(serverTime)) {
        return;
      }

      // Calculate from the server timestamp plus elapsed time.
      // Do not restart or decrement a stored counter on refresh.
      const syncedAt = performance.now();

      root.classList.add("noticepro-countdown-root");

      if (countdown.countdownSticky === true) {
        root.classList.add("noticepro-countdown-root--sticky");
      }

      root.style.setProperty(
        "--noticepro-countdown-desktop-offset",
        `${safeOffset(countdown.countdownDesktopOffset)}px`,
      );

      root.style.setProperty(
        "--noticepro-countdown-mobile-offset",
        `${safeOffset(countdown.countdownMobileOffset)}px`,
      );

      const bar = document.createElement("div");
      bar.className = "noticepro-countdown-bar";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Offer countdown");

      bar.style.setProperty(
        "--noticepro-countdown-background",
        safeColor(countdown.backgroundColor, "#00B9B8"),
      );

      bar.style.setProperty(
        "--noticepro-countdown-text",
        safeColor(countdown.textColor, "#FFFFFF"),
      );

      const message = document.createElement("span");
      message.className = "noticepro-countdown-message";
      message.textContent = countdown.message;

      const timer = document.createElement("div");
      timer.className = "noticepro-countdown-timer";
      timer.setAttribute("role", "timer");
      timer.setAttribute("aria-live", "off");

      bar.append(message, timer);
      root.replaceChildren(bar);

      const labels =
        countdown.countdownShowDays === true
          ? ["Days", "Hr", "Min", "Sec"]
          : ["Hr", "Min", "Sec"];

      const numberElements = labels.map((label) => {
        const unit = document.createElement("div");
        unit.className = "noticepro-countdown-unit";

        const number = document.createElement("span");
        number.className = "noticepro-countdown-number";

        const caption = document.createElement("span");
        caption.className = "noticepro-countdown-label";
        caption.textContent = label;

        unit.append(number, caption);
        timer.append(unit);

        return number;
      });

      let expired = false;

      const updateTimer = () => {
        if (expired) return;

        const currentTime = serverTime + (performance.now() - syncedAt);

        const remaining = Math.max(
          0,
          Math.ceil((deadline - currentTime) / 1000),
        );

        if (remaining === 0) {
          expired = true;

          const expiryMessage = document.createElement("span");
          expiryMessage.className = "noticepro-countdown-expired";
          expiryMessage.textContent =
            typeof countdown.countdownExpiredText === "string"
              ? countdown.countdownExpiredText || "Expired!"
              : "Expired!";

          timer.replaceChildren(expiryMessage);
          return;
        }

        const days = Math.floor(remaining / 86400);
        const hours =
          countdown.countdownShowDays === true
            ? Math.floor((remaining % 86400) / 3600)
            : Math.floor(remaining / 3600);

        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        const values =
          countdown.countdownShowDays === true
            ? [days, hours, minutes, seconds]
            : [hours, minutes, seconds];

        values.forEach((value, index) => {
          numberElements[index].textContent = String(value).padStart(2, "0");
        });
      };

      const placeRoot = () => {
        if (!root.isConnected) return;

        const announcement = document.querySelector(
          "[data-noticepro-announcement]",
        );

        const announcementIsAtTop =
          announcement?.parentElement === document.body &&
          (document.body.firstElementChild === announcement ||
            (document.body.firstElementChild === root &&
              root.nextElementSibling === announcement));

        if (announcementIsAtTop) {
          if (announcement.nextElementSibling !== root) {
            announcement.after(root);
          }
        } else if (document.body.firstElementChild !== root) {
          document.body.prepend(root);
        }
      };

      placeRoot();
      updateTimer();

      const interval = window.setInterval(updateTimer, 1000);

      // Announcement fetches asynchronously. Maintain the order
      // if it inserts its top bar after Countdown has loaded.
      const observer = new MutationObserver(placeRoot);
      observer.observe(document.body, { childList: true });

      const onVisibilityChange = () => {
        if (!document.hidden) updateTimer();
      };

      document.addEventListener("visibilitychange", onVisibilityChange);

      window.addEventListener(
        "pagehide",
        () => {
          window.clearInterval(interval);
          observer.disconnect();
          document.removeEventListener("visibilitychange", onVisibilityChange);
        },
        { once: true },
      );
    } catch {
      // Fail quietly if the app proxy or data is unavailable.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCountdown, {
      once: true,
    });
  } else {
    startCountdown();
  }
})();
