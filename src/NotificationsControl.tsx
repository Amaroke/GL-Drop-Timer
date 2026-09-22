import { PILL_BASE_CLASSES } from "./pillStyles";
import type { NotificationPermissionState } from "./useReadyNotifications";

type NotificationsControlProps = {
  permission: NotificationPermissionState;
  requestPermission: () => void;
};

const BELL_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 flex-shrink-0"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export function NotificationsControl({ permission, requestPermission }: NotificationsControlProps) {
  if (permission === "unsupported") return null;

  if (permission === "default") {
    return (
      <button
        type="button"
        onClick={requestPermission}
        className={`${PILL_BASE_CLASSES} text-white transition-colors hover:bg-white/12`}
      >
        {BELL_ICON}
        Enable notifications
      </button>
    );
  }

  return (
    <p className={`${PILL_BASE_CLASSES} text-white/40`}>
      {BELL_ICON}
      {permission === "granted" ? "Notifications enabled" : "Notifications blocked"}
    </p>
  );
}
