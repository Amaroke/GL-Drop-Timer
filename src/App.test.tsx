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
