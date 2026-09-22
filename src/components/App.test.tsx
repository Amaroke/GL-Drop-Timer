import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createAuthStore, createMemoryAuthService, type AuthService, type AuthState } from "./auth";
import { createLocalStorageDropStore, createMemoryDropStore, OLDEST_UPDATED_AT } from "./dropStore";
import type { SyncStatus } from "./firestoreDropStore";

const NOW = new Date("2026-01-01T12:00:00").getTime();
const SIGNED_OUT_AUTH = createMemoryAuthService();

function authServiceFrom(
  initial: AuthState,
): AuthService & { setState: (state: AuthState) => void } {
  const store = createAuthStore(initial);
  return {
    getState: store.getState,
    subscribe: store.subscribe,
    signIn: async () => {},
    signOut: async () => {},
    setState: store.setState,
  };
}

function fakeSyncedStore(initialStatus: SyncStatus = "synced") {
  const base = createMemoryDropStore();
  let status = initialStatus;
  const listeners = new Set<() => void>();
  return Object.assign(base, {
    getSyncStatus: () => status,
    subscribeSyncStatus(onChange: () => void) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    setSyncStatus(next: SyncStatus) {
      status = next;
      listeners.forEach((onChange) => onChange());
    },
  });
}

function chip(name: string) {
  return within(screen.getByRole("group", { name: `${name} timer` }));
}

function card(name: string) {
  return within(screen.getByRole("group", { name }));
}

async function openAdvanced(name: string) {
  await userEvent.click(screen.getByRole("button", { name: `Advanced settings for ${name}` }));
}

describe("App", () => {
  describe("layout", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "Notification",
        Object.assign(function () {}, { permission: "default", requestPermission: vi.fn() }),
      );
    });
    afterEach(() => vi.unstubAllGlobals());

    it("does not show an app title", () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      expect(screen.queryByText("GL Drop Timer")).toBeNull();
      expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    });

    it("hides the notifications button below the sm breakpoint, keeping timers and account reachable", () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      const notifications = screen.getByRole("button", { name: "Enable notifications" });
      expect(notifications.closest(".hidden")).toHaveClass("hidden", "sm:block");
      expect(screen.getByRole("button", { name: "Start Star Battery timer" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
    });

    it("keeps the Drop timers and the Planner inside the main landmark", () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      const main = screen.getByRole("main");
      expect(within(main).getByText("Star Battery")).toBeInTheDocument();
      expect(within(main).getByText("Planner")).toBeInTheDocument();
    });
  });

  describe("Planner placeholder", () => {
    it("shows 12 tabs for the main planet and every Colony slot, the main planet active by default", () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(12);
      expect(tabs[0]).toHaveAccessibleName("Planet");
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    });

    it("switches the active tab when the player clicks another one", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await userEvent.click(screen.getByRole("tab", { name: "Colony 1" }));

      expect(screen.getByRole("tab", { name: "Colony 1" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("tab", { name: "Planet" })).toHaveAttribute("aria-selected", "false");
    });

    it("shows a preview table of Buildings under the active tab", () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      const panel = screen.getByRole("tabpanel");
      expect(within(panel).getByRole("table")).toBeInTheDocument();
      expect(screen.getByText(/preview/i)).toBeInTheDocument();
    });
  });

  it("shows a Drop with no saved Ready date as not started", () => {
    render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

    const starBattery = chip("Star Battery");
    expect(starBattery.getByText("--:--:--")).toBeInTheDocument();
    expect(starBattery.getByRole("button", { name: "Start Star Battery timer" })).toBeEnabled();
  });

  it("starts the Cooldown immediately when the player presses the relaunch button", async () => {
    render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

    await userEvent.click(
      chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
    );

    expect(chip("Star Battery").getByText("11:00:00")).toBeInTheDocument();
    expect(chip("Tool Case").getByText("--:--:--")).toBeInTheDocument();
  });

  it("keeps a running Cooldown after a reload", async () => {
    const store = createMemoryDropStore();
    const { unmount } = render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
    await userEvent.click(chip("Tool Case").getByRole("button", { name: "Start Tool Case timer" }));
    unmount();

    const twoHoursLater = NOW + 2 * 3600 * 1000;
    render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => twoHoursLater} />);

    expect(chip("Tool Case").getByText("21:00:00")).toBeInTheDocument();
  });

  describe("with a corrupted stored Ready date", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it.each(["abc", "NaN", "Infinity", "-Infinity"])(
      "shows the Drop as not started when the stored value is %s",
      (value) => {
        localStorage.setItem("gl-timer-star-battery", value);

        render(
          <App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />,
        );

        const starBattery = chip("Star Battery");
        expect(starBattery.getByText("--:--:--")).toBeInTheDocument();
        expect(starBattery.getByRole("button", { name: "Start Star Battery timer" })).toBeEnabled();
      },
    );
  });

  describe("advanced settings, manual Ready date editor", () => {
    async function openEditor(name: string) {
      await openAdvanced(name);
      await userEvent.click(
        card(name).getByRole("button", { name: `Set ${name} Ready date manually` }),
      );
      return card(name).getByDisplayValue(/.*/) as HTMLInputElement;
    }

    it("saves a valid date and shows the matching Ready date", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      const input = await openEditor("Star Battery");
      await userEvent.clear(input);
      await userEvent.type(input, "2026-01-01T18:30");
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Save" }));

      expect(card("Star Battery").getByText("06:30:00")).toBeInTheDocument();
      expect(card("Star Battery").getByText(/^01\/01 at /)).toBeInTheDocument();
      expect(card("Star Battery").queryByRole("alert")).not.toBeInTheDocument();
    });

    it("rejects an invalid date, shows an error and keeps the previous Ready date", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );

      const input = await openEditor("Star Battery");
      await userEvent.clear(input);
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Save" }));

      expect(card("Star Battery").getByRole("alert")).toHaveTextContent(/invalid date/i);

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Cancel" }));

      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(card("Star Battery").queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("advanced settings, reset confirmation", () => {
    async function startAndPressReset(name: string) {
      await userEvent.click(chip(name).getByRole("button", { name: `Start ${name} timer` }));
      await openAdvanced(name);
      await userEvent.click(card(name).getByRole("button", { name: `Reset ${name} timer` }));
    }

    it("asks for confirmation and keeps the Ready date until confirmed", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await startAndPressReset("Star Battery");

      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(store.get("gl-timer-star-battery")?.readyAt).toBe(NOW + 11 * 3600 * 1000);

      expect(card("Star Battery").getByText(/reset this timer\?/i)).toBeInTheDocument();
      expect(card("Star Battery").getByRole("button", { name: "Reset" })).toBeVisible();
      expect(card("Star Battery").getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    it("clears the Ready date when the player confirms", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await startAndPressReset("Star Battery");

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Reset" }));

      expect(card("Star Battery").getByText("--:--:--")).toBeInTheDocument();
      expect(card("Star Battery").getByRole("button", { name: "Start timer" })).toBeEnabled();
      expect(card("Star Battery").queryByRole("button", { name: "Reset" })).toBeNull();
      expect(store.get("gl-timer-star-battery")?.readyAt).toBeNull();
    });

    it("keeps the Ready date when the player cancels", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await startAndPressReset("Star Battery");

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Cancel" }));

      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(card("Star Battery").queryByRole("button", { name: "Reset" })).toBeNull();
      expect(store.get("gl-timer-star-battery")?.readyAt).toBe(NOW + 11 * 3600 * 1000);
    });

    it("only affects the Drop whose reset was pressed", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await userEvent.click(
        chip("Tool Case").getByRole("button", { name: "Start Tool Case timer" }),
      );

      await startAndPressReset("Star Battery");

      expect(chip("Tool Case").getByText("23:00:00")).toBeInTheDocument();
    });
  });

  describe("updated-at tracking", () => {
    it("records the current time as updated-at when a Drop is Collected", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );

      expect(store.get("gl-timer-star-battery")?.updatedAt).toBe(NOW);
    });

    it("records the current time as updated-at when a Ready date is edited manually", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await openAdvanced("Star Battery");
      await userEvent.click(
        card("Star Battery").getByRole("button", { name: "Set Star Battery Ready date manually" }),
      );
      const input = card("Star Battery").getByDisplayValue(/.*/) as HTMLInputElement;
      await userEvent.clear(input);
      await userEvent.type(input, "2026-01-01T18:30");
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Save" }));

      expect(store.get("gl-timer-star-battery")?.updatedAt).toBe(NOW);
    });

    it("records the current time as updated-at when a Drop is reset", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );
      await openAdvanced("Star Battery");
      await userEvent.click(
        card("Star Battery").getByRole("button", { name: "Reset Star Battery timer" }),
      );

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Reset" }));

      expect(store.get("gl-timer-star-battery")?.updatedAt).toBe(NOW);
    });

    describe("a legacy value stored before this change", () => {
      beforeEach(() => localStorage.clear());
      afterEach(() => localStorage.clear());

      it("is read as the current Ready date and treated as the oldest possible value", () => {
        localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
        const store = createLocalStorageDropStore();

        render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

        expect(chip("Star Battery").getByText("03:00:00")).toBeInTheDocument();
        expect(store.get("gl-timer-star-battery")).toEqual({
          readyAt: NOW + 3 * 3600 * 1000,
          updatedAt: OLDEST_UPDATED_AT,
        });
      });
    });
  });

  describe("tab title", () => {
    const DEFAULT_TITLE = "GL Drop Timer";

    beforeEach(() => {
      document.title = DEFAULT_TITLE;
      vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    it("shows the number of Ready Drops", () => {
      const store = createMemoryDropStore({
        "gl-timer-star-battery": NOW - 1000,
        "gl-timer-tool-case": NOW - 1,
        "gl-timer-helmet": NOW + 3600 * 1000,
      });

      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      expect(document.title).toBe(`(2) ${DEFAULT_TITLE}`);
    });

    it("updates when a Drop becomes Ready", () => {
      let time = NOW;
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => time} />);
      act(() => screen.getByRole("button", { name: "Start Star Battery timer" }).click());
      expect(document.title).toBe(DEFAULT_TITLE);

      time = NOW + 12 * 3600 * 1000;
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(document.title).toBe(`(1) ${DEFAULT_TITLE}`);
    });

    it("keeps the default title when no Drop is Ready", () => {
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW + 3600 * 1000 });

      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      expect(document.title).toBe(DEFAULT_TITLE);
    });

    it("returns to the default title once the Ready Drop is reset", () => {
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW - 1000 });
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      expect(document.title).toBe(`(1) ${DEFAULT_TITLE}`);

      act(() => screen.getByRole("button", { name: "Advanced settings for Star Battery" }).click());
      act(() =>
        card("Star Battery").getByRole("button", { name: "Reset Star Battery timer" }).click(),
      );
      act(() => card("Star Battery").getByRole("button", { name: "Reset" }).click());
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(document.title).toBe(DEFAULT_TITLE);
    });

    it("restores the default title when the app unmounts", () => {
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW - 1000 });
      const { unmount } = render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      unmount();

      expect(document.title).toBe(DEFAULT_TITLE);
    });
  });

  describe("cross-tab synchronization", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    function otherTabWrites(key: string, value: string | null) {
      const oldValue = localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            oldValue,
            newValue: value,
            storageArea: localStorage,
          }),
        );
      });
    }

    it("shows a Ready date set in another tab without reload", () => {
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      expect(chip("Star Battery").getByText("--:--:--")).toBeInTheDocument();

      otherTabWrites("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));

      expect(chip("Star Battery").getByText("03:00:00")).toBeInTheDocument();
      expect(chip("Tool Case").getByText("--:--:--")).toBeInTheDocument();
    });

    it("shows a Ready date changed in another tab", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      otherTabWrites("gl-timer-star-battery", String(NOW + 5 * 3600 * 1000));

      expect(chip("Star Battery").getByText("05:00:00")).toBeInTheDocument();
    });

    it("shows a Drop as not started when it is reset in another tab", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      otherTabWrites("gl-timer-star-battery", null);

      expect(chip("Star Battery").getByText("--:--:--")).toBeInTheDocument();
      expect(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      ).toBeEnabled();
    });

    it("shows every Drop as not started when the storage is cleared in another tab", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      localStorage.setItem("gl-timer-tool-case", String(NOW + 4 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      localStorage.clear();
      act(() => {
        window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: localStorage }));
      });

      expect(chip("Star Battery").getByText("--:--:--")).toBeInTheDocument();
      expect(chip("Tool Case").getByText("--:--:--")).toBeInTheDocument();
    });

    it("ignores changes to unrelated keys and to session storage", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      otherTabWrites("unrelated", "1");
      sessionStorage.setItem("gl-timer-star-battery", String(NOW + 9 * 3600 * 1000));
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "gl-timer-star-battery",
            newValue: String(NOW + 9 * 3600 * 1000),
            storageArea: sessionStorage,
          }),
        );
      });
      sessionStorage.clear();

      expect(chip("Star Battery").getByText("03:00:00")).toBeInTheDocument();
    });

    it("dismisses a pending reset confirmation when another tab already reset the Drop", async () => {
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );
      await openAdvanced("Star Battery");
      await userEvent.click(
        card("Star Battery").getByRole("button", { name: "Reset Star Battery timer" }),
      );
      expect(card("Star Battery").getByText(/reset this timer\?/i)).toBeInTheDocument();

      otherTabWrites("gl-timer-star-battery", null);

      expect(card("Star Battery").queryByText(/reset this timer\?/i)).toBeNull();
      expect(card("Star Battery").getByRole("button", { name: "Start timer" })).toBeEnabled();
    });
  });

  describe("pending reset confirmation and a newer Ready date from another tab", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it("dismisses the confirmation so the newer Ready date is not wiped", async () => {
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );
      await openAdvanced("Star Battery");
      await userEvent.click(
        card("Star Battery").getByRole("button", { name: "Reset Star Battery timer" }),
      );

      const newer = String(NOW + 2 * 3600 * 1000);
      localStorage.setItem("gl-timer-star-battery", newer);
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "gl-timer-star-battery",
            newValue: newer,
            storageArea: localStorage,
          }),
        );
      });

      expect(card("Star Battery").queryByRole("button", { name: "Reset" })).toBeNull();
      expect(card("Star Battery").getByText("02:00:00")).toBeInTheDocument();
    });
  });

  describe("browser notifications", () => {
    type Sent = { title: string; options?: NotificationOptions };

    function installFakeNotification(
      initial: NotificationPermission,
      answer: NotificationPermission = "granted",
    ) {
      const sent: Sent[] = [];
      const requestPermission = vi.fn(async () => {
        FakeNotification.permission = answer;
        return answer;
      });
      class FakeNotification {
        static permission: NotificationPermission = initial;
        static requestPermission = requestPermission;
        constructor(title: string, options?: NotificationOptions) {
          sent.push({ title, options });
        }
      }
      vi.stubGlobal("Notification", FakeNotification);
      return { sent, requestPermission };
    }

    function tick(ms = 1000) {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    }

    async function enableNotifications() {
      await act(async () => {
        screen.getByRole("button", { name: "Enable notifications" }).click();
      });
    }

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("never requests permission on first load", () => {
      const { requestPermission } = installFakeNotification("default");

      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      tick(5000);

      expect(requestPermission).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Enable notifications" })).toBeEnabled();
    });

    it("requests permission only from the enable action", async () => {
      const { requestPermission } = installFakeNotification("default");
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await enableNotifications();

      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: "Enable notifications" })).toBeNull();
      expect(screen.getByText("Notifications enabled")).toBeInTheDocument();
    });

    it("shows a popup confirming notifications were enabled", async () => {
      installFakeNotification("default");
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await enableNotifications();

      expect(screen.getByRole("dialog", { name: "Notifications enabled" })).toBeInTheDocument();
    });

    it("shows a popup explaining notifications were blocked", async () => {
      installFakeNotification("default", "denied");
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await enableNotifications();

      expect(screen.getByRole("dialog", { name: "Notifications blocked" })).toBeInTheDocument();
    });

    it("sends one notification per Drop when it goes from running to Ready", () => {
      const { sent } = installFakeNotification("granted");
      let time = NOW;
      const store = createMemoryDropStore({
        "gl-timer-star-battery": NOW + 60 * 1000,
        "gl-timer-tool-case": NOW + 3600 * 1000,
      });
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => time} />);

      tick(3000);
      expect(sent).toHaveLength(0);

      time = NOW + 2 * 60 * 1000;
      tick();
      tick();
      tick();

      expect(sent).toHaveLength(1);
      expect(sent[0].title).toBe("Star Battery is ready");
    });

    it("sends a new notification when the same Drop becomes Ready again", () => {
      const { sent } = installFakeNotification("granted");
      let time = NOW;
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => time} />);
      act(() => screen.getByRole("button", { name: "Start Star Battery timer" }).click());
      tick();

      time = NOW + 12 * 3600 * 1000;
      tick();
      expect(sent).toHaveLength(1);

      act(() => screen.getByRole("button", { name: "Collect Star Battery" }).click());
      tick();
      time += 12 * 3600 * 1000;
      tick();

      expect(sent).toHaveLength(2);
    });

    it("sends nothing for a Drop already Ready at load", () => {
      const { sent } = installFakeNotification("granted");
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW - 1000 });

      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      tick(5000);

      expect(sent).toHaveLength(0);
    });

    it("sends nothing for a Ready date set by hand in the past", async () => {
      const { sent } = installFakeNotification("granted");
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      tick();

      act(() => screen.getByRole("button", { name: "Advanced settings for Star Battery" }).click());
      act(() =>
        card("Star Battery")
          .getByRole("button", { name: "Set Star Battery Ready date manually" })
          .click(),
      );
      const input = card("Star Battery").getByDisplayValue(/.*/) as HTMLInputElement;
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
          input,
          "2025-12-31T10:00",
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      act(() => card("Star Battery").getByRole("button", { name: "Save" }).click());
      tick(3000);

      expect(card("Star Battery").getByText("Ready!")).toBeInTheDocument();
      expect(sent).toHaveLength(0);
    });

    it("sends nothing when a running timer is reset", () => {
      const { sent } = installFakeNotification("granted");
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      act(() => screen.getByRole("button", { name: "Start Star Battery timer" }).click());
      tick();

      act(() => screen.getByRole("button", { name: "Advanced settings for Star Battery" }).click());
      act(() =>
        card("Star Battery").getByRole("button", { name: "Reset Star Battery timer" }).click(),
      );
      act(() => card("Star Battery").getByRole("button", { name: "Reset" }).click());
      tick(3000);

      expect(sent).toHaveLength(0);
    });

    it("keeps checking the other Drops when a notification cannot be created", () => {
      const { sent } = installFakeNotification("granted");
      const Working = Notification;
      let calls = 0;
      vi.stubGlobal(
        "Notification",
        Object.assign(
          function (title: string, options?: NotificationOptions) {
            calls += 1;
            if (calls === 1) throw new Error("Illegal constructor");
            return new Working(title, options);
          },
          { permission: "granted", requestPermission: vi.fn() },
        ),
      );
      let time = NOW;
      const store = createMemoryDropStore({
        "gl-timer-star-battery": NOW + 60 * 1000,
        "gl-timer-tool-case": NOW + 60 * 1000,
      });
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => time} />);
      tick();

      time = NOW + 2 * 60 * 1000;
      tick();

      expect(sent).toHaveLength(1);
    });

    it("keeps working and sends nothing when permission is denied", () => {
      const { sent } = installFakeNotification("denied");
      let time = NOW;
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => time} />);

      act(() => screen.getByRole("button", { name: "Start Star Battery timer" }).click());
      expect(chip("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      tick();
      time = NOW + 12 * 3600 * 1000;
      tick();

      expect(chip("Star Battery").getByText("Ready!")).toBeInTheDocument();
      expect(sent).toHaveLength(0);
      expect(screen.queryByRole("button", { name: "Enable notifications" })).toBeNull();
      expect(screen.getByText("Notifications blocked")).toBeInTheDocument();
    });

    it("sends nothing when the player refuses the permission prompt", async () => {
      const { sent } = installFakeNotification("default", "denied");
      let time = NOW;
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => time} />);
      await enableNotifications();

      act(() => screen.getByRole("button", { name: "Start Star Battery timer" }).click());
      time = NOW + 12 * 3600 * 1000;
      tick();

      expect(sent).toHaveLength(0);
      expect(screen.getByText("Notifications blocked")).toBeInTheDocument();
    });

    it("works without any notification support", () => {
      vi.stubGlobal("Notification", undefined);

      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      expect(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      ).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Enable notifications" })).toBeNull();
    });
  });

  describe("account", () => {
    it("lets a visitor use a Drop timer without signing in", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );

      expect(chip("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeEnabled();
    });

    it("shows who is signed in once the player signs in with Google", async () => {
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: "ada@example.com" }),
      );
      render(<App store={createMemoryDropStore()} auth={auth} now={() => NOW} />);

      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Sign in with Google" })).toBeNull();
    });

    it("falls back to the email when the Google account has no display name", async () => {
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: null, email: "ada@example.com" }),
      );
      render(<App store={createMemoryDropStore()} auth={auth} now={() => NOW} />);

      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    });

    it("returns to signed out when the player signs out", async () => {
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: "ada@example.com" }),
      );
      render(<App store={createMemoryDropStore()} auth={auth} now={() => NOW} />);
      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeEnabled();
      expect(screen.queryByText("Ada Lovelace")).toBeNull();
    });

    it("does not sign out when the player clicks the account name", async () => {
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: "ada@example.com" }),
      );
      render(<App store={createMemoryDropStore()} auth={auth} now={() => NOW} />);
      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      await userEvent.click(screen.getByText("Ada Lovelace"));

      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    });

    it("quietly returns to signed out when the sign-in popup is cancelled", async () => {
      const auth = createMemoryAuthService(() => Promise.reject(new Error("popup closed")));
      render(<App store={createMemoryDropStore()} auth={auth} now={() => NOW} />);

      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeEnabled();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      ).toBeEnabled();
    });

    it("keeps Ready dates in the local store while signed in", async () => {
      const store = createMemoryDropStore();
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: "ada@example.com" }),
      );
      render(<App store={store} auth={auth} now={() => NOW} />);
      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );

      expect(chip("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(store.get("gl-timer-star-battery")?.readyAt).toBe(NOW + 11 * 3600 * 1000);
    });
  });

  describe("auth restoring", () => {
    it("shows a loading state instead of a flash of empty timers while auth is restoring", () => {
      const auth = authServiceFrom({ status: "restoring" });
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW + 5000 });
      render(<App store={store} auth={auth} now={() => NOW} />);

      expect(screen.queryByRole("group", { name: "Star Battery timer" })).toBeNull();
      expect(screen.getByRole("status", { name: "Loading your timers" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sign in with Google" })).toBeNull();
    });

    it("shows the real timers once restoring resolves to signed-out", () => {
      const auth = authServiceFrom({ status: "restoring" });
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW + 5000 });
      render(<App store={store} auth={auth} now={() => NOW} />);

      act(() => auth.setState({ status: "signed-out" }));

      expect(screen.getByRole("group", { name: "Star Battery timer" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
      expect(screen.queryByRole("status", { name: "Loading your timers" })).toBeNull();
    });

    it("shows the returning player's data as soon as restoring resolves to signed-in", () => {
      const auth = authServiceFrom({ status: "restoring" });
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW + 5000 });
      render(<App store={store} auth={auth} now={() => NOW} />);

      act(() =>
        auth.setState({
          status: "signed-in",
          user: { uid: "1", displayName: "Ada Lovelace", email: null },
        }),
      );

      expect(chip("Star Battery").getByText("00:00:05")).toBeInTheDocument();
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });
  });

  describe("sync status indicator", () => {
    it("shows no sync status indicator while signed out", () => {
      const store = fakeSyncedStore("syncing");
      render(<App store={store} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      expect(screen.queryByRole("status", { name: /Sync|Offline/ })).toBeNull();
    });

    it("shows nothing extra once signed in while fully synced", async () => {
      const store = fakeSyncedStore("synced");
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: null }),
      );
      render(<App store={store} auth={auth} now={() => NOW} />);

      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      expect(screen.queryByRole("status", { name: /Sync|Offline/ })).toBeNull();
    });

    it("indicates when a sync is in progress", async () => {
      const store = fakeSyncedStore("syncing");
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: null }),
      );
      render(<App store={store} auth={auth} now={() => NOW} />);

      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      expect(screen.getByRole("status", { name: "Syncing…" })).toBeInTheDocument();
    });

    it("indicates when the browser is offline", async () => {
      const store = fakeSyncedStore("offline");
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: null }),
      );
      render(<App store={store} auth={auth} now={() => NOW} />);

      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

      expect(
        screen.getByRole("status", { name: "Offline — changes will sync once you're back online" }),
      ).toBeInTheDocument();
    });

    it("indicates when a sync has failed", async () => {
      const store = fakeSyncedStore("synced");
      const auth = createMemoryAuthService(() =>
        Promise.resolve({ uid: "1", displayName: "Ada Lovelace", email: null }),
      );
      render(<App store={store} auth={auth} now={() => NOW} />);
      await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
      expect(screen.queryByRole("status", { name: "Sync failed" })).toBeNull();

      act(() => store.setSyncStatus("error"));

      expect(screen.getByRole("status", { name: "Sync failed" })).toBeInTheDocument();
    });
  });

  describe("clock jumps", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("shows Ready after the clock jumps past the Ready date", () => {
      let time = NOW;
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => time} />);
      act(() => screen.getByRole("button", { name: "Start Star Battery timer" }).click());
      expect(chip("Star Battery").getByText("11:00:00")).toBeInTheDocument();

      time = NOW + 12 * 3600 * 1000;
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(chip("Star Battery").getByText("Ready!")).toBeInTheDocument();
    });
  });

  describe("advanced settings modal", () => {
    it("opens the advanced card for a Drop and closes it with the close button", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await openAdvanced("Tool Case");
      expect(
        screen.getByRole("dialog", { name: "Advanced settings for Tool Case" }),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("closes when the player presses Escape", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await openAdvanced("Helmet");
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("shows only one Drop's advanced card at a time", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await openAdvanced("Star Battery");
      await openAdvanced("Helmet");

      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(
        screen.getByRole("dialog", { name: "Advanced settings for Helmet" }),
      ).toBeInTheDocument();
    });

    it("returns focus to the button that opened it once closed", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      const trigger = screen.getByRole("button", { name: "Advanced settings for Tool Case" });

      await userEvent.click(trigger);
      await userEvent.keyboard("{Escape}");

      expect(trigger).toHaveFocus();
    });

    it("keeps Tab focus inside the dialog", async () => {
      render(<App store={createMemoryDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await openAdvanced("Tool Case");
      const dialog = screen.getByRole("dialog");
      const buttons = within(dialog).getAllByRole("button");
      expect(document.activeElement).toBe(buttons[0]);

      await userEvent.tab({ shift: true });

      expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    });
  });

  describe("the chip stays in sync with the advanced card", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it("updates the chip immediately when the Drop is relaunched from the advanced card", async () => {
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await openAdvanced("Star Battery");
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Start timer" }));

      expect(chip("Star Battery").getByText("11:00:00")).toBeInTheDocument();
    });

    it("updates the chip immediately when a manual Ready date is saved in the advanced card", async () => {
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);

      await openAdvanced("Star Battery");
      await userEvent.click(
        card("Star Battery").getByRole("button", { name: "Set Star Battery Ready date manually" }),
      );
      const input = card("Star Battery").getByDisplayValue(/.*/) as HTMLInputElement;
      await userEvent.clear(input);
      await userEvent.type(input, "2026-01-01T18:30");
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Save" }));

      expect(chip("Star Battery").getByText("06:30:00")).toBeInTheDocument();
    });

    it("updates the chip immediately when the Drop is reset from the advanced card", async () => {
      render(<App store={createLocalStorageDropStore()} auth={SIGNED_OUT_AUTH} now={() => NOW} />);
      await userEvent.click(
        chip("Star Battery").getByRole("button", { name: "Start Star Battery timer" }),
      );

      await openAdvanced("Star Battery");
      await userEvent.click(
        card("Star Battery").getByRole("button", { name: "Reset Star Battery timer" }),
      );
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Reset" }));

      expect(chip("Star Battery").getByText("--:--:--")).toBeInTheDocument();
    });
  });
});
