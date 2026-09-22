import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createLocalStorageDropStore, createMemoryDropStore, OLDEST_UPDATED_AT } from "./dropStore";

const NOW = new Date("2026-01-01T12:00:00").getTime();

function card(name: string) {
  return within(screen.getByRole("group", { name }));
}

describe("App", () => {
  it("shows a Drop with no saved Ready date as not started", () => {
    render(<App store={createMemoryDropStore()} now={() => NOW} />);

    const starBattery = card("Star Battery");
    expect(starBattery.getByText("--:--:--")).toBeInTheDocument();
    expect(starBattery.getByRole("button", { name: "Start timer" })).toBeEnabled();
  });

  it("starts the Cooldown immediately when the player presses Collect", async () => {
    render(<App store={createMemoryDropStore()} now={() => NOW} />);

    await userEvent.click(card("Star Battery").getByRole("button", { name: "Start timer" }));

    expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
    expect(card("Tool Case").getByText("--:--:--")).toBeInTheDocument();
  });

  it("keeps a running Cooldown after a reload", async () => {
    const store = createMemoryDropStore();
    const { unmount } = render(<App store={store} now={() => NOW} />);
    await userEvent.click(card("Tool Case").getByRole("button", { name: "Start timer" }));
    unmount();

    const twoHoursLater = NOW + 2 * 3600 * 1000;
    render(<App store={store} now={() => twoHoursLater} />);

    expect(card("Tool Case").getByText("21:00:00")).toBeInTheDocument();
  });

  describe("with a corrupted stored Ready date", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it.each(["abc", "NaN", "Infinity", "-Infinity"])(
      "shows the Drop as not started when the stored value is %s",
      (value) => {
        localStorage.setItem("gl-timer-star-battery", value);

        render(<App store={createLocalStorageDropStore()} now={() => NOW} />);

        const starBattery = card("Star Battery");
        expect(starBattery.getByText("--:--:--")).toBeInTheDocument();
        expect(starBattery.getByRole("button", { name: "Start timer" })).toBeEnabled();
      },
    );
  });

  describe("manual Ready date editor", () => {
    async function openEditor(name: string) {
      await userEvent.click(
        card(name).getByRole("button", { name: `Set ${name} Ready date manually` }),
      );
      return card(name).getByDisplayValue(/.*/) as HTMLInputElement;
    }

    it("saves a valid date and shows the matching Ready date", async () => {
      render(<App store={createMemoryDropStore()} now={() => NOW} />);

      const input = await openEditor("Star Battery");
      await userEvent.clear(input);
      await userEvent.type(input, "2026-01-01T18:30");
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Save" }));

      expect(card("Star Battery").getByText("06:30:00")).toBeInTheDocument();
      expect(card("Star Battery").getByText(/^01\/01 at /)).toBeInTheDocument();
      expect(card("Star Battery").queryByRole("alert")).not.toBeInTheDocument();
    });

    it("rejects an invalid date, shows an error and keeps the previous Ready date", async () => {
      render(<App store={createMemoryDropStore()} now={() => NOW} />);
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Start timer" }));

      const input = await openEditor("Star Battery");
      await userEvent.clear(input);
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Save" }));

      expect(card("Star Battery").getByRole("alert")).toHaveTextContent(/invalid date/i);

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Cancel" }));

      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(card("Star Battery").queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("reset confirmation", () => {
    async function startAndPressReset(name: string) {
      await userEvent.click(card(name).getByRole("button", { name: "Start timer" }));
      await userEvent.click(card(name).getByRole("button", { name: `Reset ${name} timer` }));
    }

    it("asks for confirmation and keeps the Ready date until confirmed", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} now={() => NOW} />);

      await startAndPressReset("Star Battery");

      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(store.get("gl-timer-star-battery")?.readyAt).toBe(NOW + 11 * 3600 * 1000);

      expect(card("Star Battery").getByText(/reset this timer\?/i)).toBeInTheDocument();
      expect(card("Star Battery").getByRole("button", { name: "Reset" })).toBeVisible();
      expect(card("Star Battery").getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    it("clears the Ready date when the player confirms", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} now={() => NOW} />);
      await startAndPressReset("Star Battery");

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Reset" }));

      expect(card("Star Battery").getByText("--:--:--")).toBeInTheDocument();
      expect(card("Star Battery").getByRole("button", { name: "Start timer" })).toBeEnabled();
      expect(card("Star Battery").queryByRole("button", { name: "Reset" })).toBeNull();
      expect(store.get("gl-timer-star-battery")?.readyAt).toBeNull();
    });

    it("keeps the Ready date when the player cancels", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} now={() => NOW} />);
      await startAndPressReset("Star Battery");

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Cancel" }));

      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(card("Star Battery").queryByRole("button", { name: "Reset" })).toBeNull();
      expect(store.get("gl-timer-star-battery")?.readyAt).toBe(NOW + 11 * 3600 * 1000);
    });

    it("only asks for the Drop whose reset was pressed", async () => {
      render(<App store={createMemoryDropStore()} now={() => NOW} />);
      await userEvent.click(card("Tool Case").getByRole("button", { name: "Start timer" }));

      await startAndPressReset("Star Battery");

      expect(card("Tool Case").queryByRole("button", { name: "Reset" })).toBeNull();
      expect(card("Tool Case").getByText("23:00:00")).toBeInTheDocument();
    });
  });

  describe("updated-at tracking", () => {
    it("records the current time as updated-at when a Drop is Collected", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} now={() => NOW} />);

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Start timer" }));

      expect(store.get("gl-timer-star-battery")?.updatedAt).toBe(NOW);
    });

    it("records the current time as updated-at when a Ready date is edited manually", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} now={() => NOW} />);

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
      render(<App store={store} now={() => NOW} />);
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Start timer" }));
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

        render(<App store={store} now={() => NOW} />);

        expect(card("Star Battery").getByText("03:00:00")).toBeInTheDocument();
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

      render(<App store={store} now={() => NOW} />);

      expect(document.title).toBe(`(2) ${DEFAULT_TITLE}`);
    });

    it("updates when a Drop becomes Ready", () => {
      let time = NOW;
      render(<App store={createMemoryDropStore()} now={() => time} />);
      act(() => card("Star Battery").getByRole("button", { name: "Start timer" }).click());
      expect(document.title).toBe(DEFAULT_TITLE);

      time = NOW + 12 * 3600 * 1000;
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(document.title).toBe(`(1) ${DEFAULT_TITLE}`);
    });

    it("keeps the default title when no Drop is Ready", () => {
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW + 3600 * 1000 });

      render(<App store={store} now={() => NOW} />);

      expect(document.title).toBe(DEFAULT_TITLE);
    });

    it("returns to the default title once the Ready Drop is reset", () => {
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW - 1000 });
      render(<App store={store} now={() => NOW} />);
      expect(document.title).toBe(`(1) ${DEFAULT_TITLE}`);

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
      const { unmount } = render(<App store={store} now={() => NOW} />);

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
      render(<App store={createLocalStorageDropStore()} now={() => NOW} />);
      expect(card("Star Battery").getByText("--:--:--")).toBeInTheDocument();

      otherTabWrites("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));

      expect(card("Star Battery").getByText("03:00:00")).toBeInTheDocument();
      expect(card("Tool Case").getByText("--:--:--")).toBeInTheDocument();
    });

    it("shows a Ready date changed in another tab", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} now={() => NOW} />);

      otherTabWrites("gl-timer-star-battery", String(NOW + 5 * 3600 * 1000));

      expect(card("Star Battery").getByText("05:00:00")).toBeInTheDocument();
    });

    it("shows a Drop as not started when it is reset in another tab", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} now={() => NOW} />);

      otherTabWrites("gl-timer-star-battery", null);

      expect(card("Star Battery").getByText("--:--:--")).toBeInTheDocument();
      expect(card("Star Battery").getByRole("button", { name: "Start timer" })).toBeEnabled();
    });

    it("shows every Drop as not started when the storage is cleared in another tab", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      localStorage.setItem("gl-timer-tool-case", String(NOW + 4 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} now={() => NOW} />);

      localStorage.clear();
      act(() => {
        window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: localStorage }));
      });

      expect(card("Star Battery").getByText("--:--:--")).toBeInTheDocument();
      expect(card("Tool Case").getByText("--:--:--")).toBeInTheDocument();
    });

    it("ignores changes to unrelated keys and to session storage", () => {
      localStorage.setItem("gl-timer-star-battery", String(NOW + 3 * 3600 * 1000));
      render(<App store={createLocalStorageDropStore()} now={() => NOW} />);

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

      expect(card("Star Battery").getByText("03:00:00")).toBeInTheDocument();
    });

    it("dismisses a pending reset confirmation when another tab already reset the Drop", async () => {
      render(<App store={createLocalStorageDropStore()} now={() => NOW} />);
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Start timer" }));
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
      render(<App store={createLocalStorageDropStore()} now={() => NOW} />);
      await userEvent.click(card("Star Battery").getByRole("button", { name: "Start timer" }));
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

      render(<App store={createMemoryDropStore()} now={() => NOW} />);
      tick(5000);

      expect(requestPermission).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Enable notifications" })).toBeEnabled();
    });

    it("requests permission only from the enable action", async () => {
      const { requestPermission } = installFakeNotification("default");
      render(<App store={createMemoryDropStore()} now={() => NOW} />);

      await enableNotifications();

      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: "Enable notifications" })).toBeNull();
      expect(screen.getByText("Notifications enabled")).toBeInTheDocument();
    });

    it("sends one notification per Drop when it goes from running to Ready", () => {
      const { sent } = installFakeNotification("granted");
      let time = NOW;
      const store = createMemoryDropStore({
        "gl-timer-star-battery": NOW + 60 * 1000,
        "gl-timer-tool-case": NOW + 3600 * 1000,
      });
      render(<App store={store} now={() => time} />);

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
      render(<App store={createMemoryDropStore()} now={() => time} />);
      act(() => card("Star Battery").getByRole("button", { name: "Start timer" }).click());
      tick();

      time = NOW + 12 * 3600 * 1000;
      tick();
      expect(sent).toHaveLength(1);

      act(() => card("Star Battery").getByRole("button", { name: "Collected" }).click());
      tick();
      time += 12 * 3600 * 1000;
      tick();

      expect(sent).toHaveLength(2);
    });

    it("sends nothing for a Drop already Ready at load", () => {
      const { sent } = installFakeNotification("granted");
      const store = createMemoryDropStore({ "gl-timer-star-battery": NOW - 1000 });

      render(<App store={store} now={() => NOW} />);
      tick(5000);

      expect(sent).toHaveLength(0);
    });

    it("sends nothing for a Ready date set by hand in the past", async () => {
      const { sent } = installFakeNotification("granted");
      render(<App store={createMemoryDropStore()} now={() => NOW} />);
      tick();

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
      render(<App store={createMemoryDropStore()} now={() => NOW} />);
      act(() => card("Star Battery").getByRole("button", { name: "Start timer" }).click());
      tick();

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
      render(<App store={store} now={() => time} />);
      tick();

      time = NOW + 2 * 60 * 1000;
      tick();

      expect(sent).toHaveLength(1);
    });

    it("keeps working and sends nothing when permission is denied", () => {
      const { sent } = installFakeNotification("denied");
      let time = NOW;
      render(<App store={createMemoryDropStore()} now={() => time} />);

      act(() => card("Star Battery").getByRole("button", { name: "Start timer" }).click());
      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      tick();
      time = NOW + 12 * 3600 * 1000;
      tick();

      expect(card("Star Battery").getByText("Ready!")).toBeInTheDocument();
      expect(sent).toHaveLength(0);
      expect(screen.queryByRole("button", { name: "Enable notifications" })).toBeNull();
      expect(screen.getByText("Notifications blocked")).toBeInTheDocument();
    });

    it("sends nothing when the player refuses the permission prompt", async () => {
      const { sent } = installFakeNotification("default", "denied");
      let time = NOW;
      render(<App store={createMemoryDropStore()} now={() => time} />);
      await enableNotifications();

      act(() => card("Star Battery").getByRole("button", { name: "Start timer" }).click());
      time = NOW + 12 * 3600 * 1000;
      tick();

      expect(sent).toHaveLength(0);
      expect(screen.getByText("Notifications blocked")).toBeInTheDocument();
    });

    it("works without any notification support", () => {
      vi.stubGlobal("Notification", undefined);

      render(<App store={createMemoryDropStore()} now={() => NOW} />);

      expect(card("Star Battery").getByRole("button", { name: "Start timer" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Enable notifications" })).toBeNull();
    });
  });

  describe("clock jumps", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("shows Ready after the clock jumps past the Ready date", () => {
      let time = NOW;
      render(<App store={createMemoryDropStore()} now={() => time} />);
      act(() => card("Star Battery").getByRole("button", { name: "Start timer" }).click());
      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();

      time = NOW + 12 * 3600 * 1000;
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(card("Star Battery").getByText("Ready!")).toBeInTheDocument();
    });
  });
});
