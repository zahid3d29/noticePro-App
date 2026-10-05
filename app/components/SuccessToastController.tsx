import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

const messages: Record<string, string> = {
  "announcement.created": "Announcement created",
  "announcement.updated": "Announcement updated",
  "announcement.deleted": "Announcement deleted",
  "notice.created": "Notice created",
  "notice.updated": "Notice updated",
  "notice.deleted": "Notice deleted",
  "countdown.created": "Countdown created",
  "countdown.updated": "Countdown updated",
  "countdown.deleted": "Countdown deleted",
};

type ToastBridgeWindow = Window & {
  shopify?: {
    toast?: {
      show: (message: string, options?: { duration?: number }) => string;
    };
  };
};

export default function SuccessToastController() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const messageKey = params.get("noticeproToast");
    const toastId = params.get("noticeproToastId");

    if (!messageKey || !toastId) return;

    const message = messages[messageKey];
    const bridge = (window as ToastBridgeWindow).shopify;

    if (message && !bridge?.toast) return;

    let alreadyShown = handledId.current === toastId;

    try {
      alreadyShown =
        alreadyShown ||
        sessionStorage.getItem("noticepro:last-success-toast") === toastId;
    } catch {
      // The ref still prevents duplicate effects when storage is unavailable.
    }

    if (message && !alreadyShown && bridge?.toast) {
      bridge.toast.show(message, { duration: 4000 });
      handledId.current = toastId;

      try {
        sessionStorage.setItem("noticepro:last-success-toast", toastId);
      } catch {
        // Toasts still work when browser storage is unavailable.
      }
    }

    params.delete("noticeproToast");
    params.delete("noticeproToastId");

    const remainingSearch = params.toString();

    void navigate(
      {
        pathname: location.pathname,
        search: remainingSearch ? `?${remainingSearch}` : "",
        hash: location.hash,
      },
      {
        replace: true,
        preventScrollReset: true,
      },
    );
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
