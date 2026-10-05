import { useNavigation } from "react-router";

export default function AppLoadingIndicator() {
  const navigation = useNavigation();
  const isBusy = navigation.state !== "idle";

  const isFormRequest =
    navigation.formMethod !== undefined &&
    navigation.formMethod.toLowerCase() !== "get";

  const message = !isBusy
    ? ""
    : isFormRequest
      ? navigation.formData?.get("_action") === "delete"
        ? "Deleting…"
        : "Saving changes…"
      : "Loading page…";

  return (
    <>
      {isBusy ? (
        <div className="noticepro-loading-track" aria-hidden="true">
          <div className="noticepro-loading-bar" />
        </div>
      ) : null}

      <span
        className="noticepro-loading-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </span>
    </>
  );
}
