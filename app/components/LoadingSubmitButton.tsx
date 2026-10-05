import { useFormAction, useNavigation } from "react-router";
import "./LoadingSubmitButton.css";

type Props = {
  label: string;
  pendingLabel: string;
  intent?: "save" | "delete";
  widgetId?: string;
  disabled?: boolean;
};

export default function LoadingSubmitButton({
  label,
  pendingLabel,
  intent = "save",
  widgetId,
  disabled = false,
}: Props) {
  const navigation = useNavigation();
  const formAction = useFormAction();

  const isBusy = navigation.state !== "idle";
  const method = navigation.formMethod?.toLowerCase();
  const isMutation = Boolean(method && method !== "get");

  const currentPath = new URL(formAction, "https://noticepro.invalid").pathname;

  const pendingPath = navigation.formAction
    ? new URL(navigation.formAction, "https://noticepro.invalid").pathname
    : null;

  const pendingDelete = navigation.formData?.get("_action") === "delete";

  const matchesIntent = intent === "delete" ? pendingDelete : !pendingDelete;

  const matchesRecord =
    intent !== "delete" ||
    (widgetId !== undefined &&
      navigation.formData?.get("widgetId") === widgetId);

  const isPending =
    isBusy &&
    isMutation &&
    currentPath === pendingPath &&
    matchesIntent &&
    matchesRecord;

  return (
    <button
      type="submit"
      className={[
        "noticepro-submit-button",
        intent === "delete"
          ? "noticepro-submit-button--delete"
          : "noticepro-submit-button--primary",
      ].join(" ")}
      disabled={disabled || isBusy}
      aria-busy={isPending}
    >
      {isPending ? (
        <span className="noticepro-submit-spinner" aria-hidden="true" />
      ) : null}

      <span>{isPending ? pendingLabel : label}</span>
    </button>
  );
}
