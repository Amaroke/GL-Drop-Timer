import { IconPopover } from "./IconPopover";
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
    className="h-5 w-5"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export function NotificationsControl({ permission, requestPermission }: NotificationsControlProps) {
  if (permission === "unsupported") return null;

  return (
    <IconPopover label="Notifications" align="left" icon={BELL_ICON}>
      {permission === "default" && (
        <button
          type="button"
          onClick={requestPermission}
          className="w-full rounded-xl bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
        >
          Enable notifications
        </button>
      )}
      {permission === "granted" && <p className="text-sm text-white/40">Notifications enabled</p>}
      {permission === "denied" && <p className="text-sm text-white/40">Notifications blocked</p>}
    </IconPopover>
  );
}
