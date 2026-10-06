(() => {
  async function startCountdowns() {
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
      const endpoint = new URL(root.dataset.endpoint, window.location.origin);
      endpoint.searchParams.set("format", "multi");

      const response = await fetch(endpoint.href, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) return;

      const payload = await response.json();
      const serverTime = Date.parse(payload?.serverNow);

      if (!Number.isFinite(serverTime) || !root.isConnected) return;

      // Keep compatibility with the existing single-timer response.
      const countdowns = Array.isArray(payload?.countdowns)
        ? payload.countdowns
        : payload?.countdown
          ? [payload.countdown]
          : [];

      const syncedAt = performance.now();
      const states = [];
      const seen = new Set();

      for (const countdown of countdowns) {
        if (
          !countdown ||
          typeof countdown.id !== "string" ||
          !countdown.id ||
          typeof countdown.message !== "string" ||
          typeof countdown.countdownEndsAt !== "string" ||
          seen.has(countdown.id)
        ) {
          continue;
        }

        const deadline = Date.parse(countdown.countdownEndsAt);
        if (!Number.isFinite(deadline)) continue;

        seen.add(countdown.id);

        // Separate body-level wrappers preserve per-timer sticky behavior.
        const wrapper =
          states.length === 0 ? root : document.createElement("div");

        wrapper.classList.add("noticepro-countdown-root");

        const sticky = countdown.countdownSticky === true;
        if (sticky) {
          wrapper.classList.add("noticepro-countdown-root--sticky");
        }

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
        wrapper.replaceChildren(bar);

        const showDays = countdown.countdownShowDays === true;
        const labels = showDays
          ? ["Days", "Hr", "Min", "Sec"]
          : ["Hr", "Min", "Sec"];

        const numbers = labels.map((label) => {
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

        states.push({
          wrapper,
          timer,
          numbers,
          deadline,
          showDays,
          sticky,
          desktopOffset: safeOffset(countdown.countdownDesktopOffset),
          mobileOffset: safeOffset(countdown.countdownMobileOffset),
          expiredText:
            typeof countdown.countdownExpiredText === "string"
              ? countdown.countdownExpiredText || "Expired!"
              : "Expired!",
          expired: false,
        });
      }

      if (!states.length) return;

      const updateStickyOffsets = () => {
        let desktopBottom = 0;
        let mobileBottom = 0;

        for (const state of states) {
          if (!state.sticky || !state.wrapper.isConnected) continue;

          const desktopTop = Math.max(state.desktopOffset, desktopBottom);
          const mobileTop = Math.max(state.mobileOffset, mobileBottom);

          state.wrapper.style.setProperty(
            "--noticepro-countdown-desktop-offset",
            `${desktopTop}px`,
          );
          state.wrapper.style.setProperty(
            "--noticepro-countdown-mobile-offset",
            `${mobileTop}px`,
          );

          const measuredHeight = state.wrapper.getBoundingClientRect().height;
          const height = Number.isFinite(measuredHeight)
            ? Math.max(0, measuredHeight)
            : 0;

          desktopBottom = desktopTop + height;
          mobileBottom = mobileTop + height;
        }
      };

      const placeRoots = () => {
        const announcement = document.querySelector(
          "[data-noticepro-announcement]",
        );

        const topAnnouncement =
          announcement?.parentElement === document.body &&
          document.body.firstElementChild === announcement &&
          announcement.childElementCount > 0
            ? announcement
            : null;

        let previous = topAnnouncement;

        for (const state of states) {
          const expected = previous
            ? previous.nextElementSibling
            : document.body.firstElementChild;

          if (expected !== state.wrapper) {
            if (previous) {
              previous.after(state.wrapper);
            } else {
              document.body.prepend(state.wrapper);
            }
          }

          previous = state.wrapper;
        }

        updateStickyOffsets();
      };

      let interval = null;

      const updateTimers = () => {
        const currentTime = serverTime + (performance.now() - syncedAt);
        let layoutChanged = false;

        for (const state of states) {
          if (state.expired || !state.wrapper.isConnected) continue;

          const remaining = Math.max(
            0,
            Math.ceil((state.deadline - currentTime) / 1000),
          );

          if (remaining === 0) {
            state.expired = true;
            layoutChanged = true;

            const expiryMessage = document.createElement("span");
            expiryMessage.className = "noticepro-countdown-expired";
            expiryMessage.textContent = state.expiredText;
            state.timer.replaceChildren(expiryMessage);
            continue;
          }

          const days = Math.floor(remaining / 86400);
          const hours = state.showDays
            ? Math.floor((remaining % 86400) / 3600)
            : Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;

          const values = state.showDays
            ? [days, hours, minutes, seconds]
            : [hours, minutes, seconds];

          values.forEach((value, index) => {
            state.numbers[index].textContent = String(value).padStart(2, "0");
          });
        }

        if (layoutChanged) updateStickyOffsets();

        if (
          interval !== null &&
          states.every((state) => state.expired || !state.wrapper.isConnected)
        ) {
          window.clearInterval(interval);
          interval = null;
        }
      };

      const observer =
        typeof MutationObserver === "function"
          ? new MutationObserver(placeRoots)
          : null;

      const resizeObserver =
        typeof ResizeObserver === "function"
          ? new ResizeObserver(updateStickyOffsets)
          : null;

      const onVisibilityChange = () => {
        if (!document.hidden) updateTimers();
      };

      const onResize = () => {
        placeRoots();
        updateTimers();
      };

      const resume = () => {
        placeRoots();
        updateTimers();

        if (interval === null && states.some((state) => !state.expired)) {
          interval = window.setInterval(updateTimers, 1000);
        }

        observer?.observe(document.body, { childList: true });
        for (const state of states) {
          resizeObserver?.observe(state.wrapper);
        }

        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("resize", onResize);
      };

      const pause = () => {
        if (interval !== null) {
          window.clearInterval(interval);
          interval = null;
        }

        observer?.disconnect();
        resizeObserver?.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("resize", onResize);
      };

      resume();

      window.addEventListener("pagehide", pause);
      window.addEventListener("pageshow", resume);
    } catch {
      // Fail quietly if the app proxy or data is unavailable.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCountdowns, {
      once: true,
    });
  } else {
    startCountdowns();
  }
})();
