import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createLocalStorageDropStore, createMemoryDropStore } from "./dropStore";

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
        card(name).getByRole("button", { name: `Set ${name} availability manually` }),
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
      expect(store.get("gl-timer-star-battery")).toBe(NOW + 11 * 3600 * 1000);

      expect(card("Star Battery").getByText(/reset this timer\?/i)).toBeInTheDocument();
      expect(card("Star Battery").getByRole("button", { name: "Confirm reset" })).toBeVisible();
      expect(card("Star Battery").getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    it("clears the Ready date when the player confirms", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} now={() => NOW} />);
      await startAndPressReset("Star Battery");

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Confirm reset" }));

      expect(card("Star Battery").getByText("--:--:--")).toBeInTheDocument();
      expect(card("Star Battery").getByRole("button", { name: "Start timer" })).toBeEnabled();
      expect(card("Star Battery").queryByRole("button", { name: "Confirm reset" })).toBeNull();
      expect(store.get("gl-timer-star-battery")).toBeNull();
    });

    it("keeps the Ready date when the player cancels", async () => {
      const store = createMemoryDropStore();
      render(<App store={store} now={() => NOW} />);
      await startAndPressReset("Star Battery");

      await userEvent.click(card("Star Battery").getByRole("button", { name: "Cancel" }));

      expect(card("Star Battery").getByText("11:00:00")).toBeInTheDocument();
      expect(card("Star Battery").queryByRole("button", { name: "Confirm reset" })).toBeNull();
      expect(store.get("gl-timer-star-battery")).toBe(NOW + 11 * 3600 * 1000);
    });

    it("only asks for the Drop whose reset was pressed", async () => {
      render(<App store={createMemoryDropStore()} now={() => NOW} />);
      await userEvent.click(card("Tool Case").getByRole("button", { name: "Start timer" }));

      await startAndPressReset("Star Battery");

      expect(card("Tool Case").queryByRole("button", { name: "Confirm reset" })).toBeNull();
      expect(card("Tool Case").getByText("23:00:00")).toBeInTheDocument();
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
      act(() => card("Star Battery").getByRole("button", { name: "Confirm reset" }).click());
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
