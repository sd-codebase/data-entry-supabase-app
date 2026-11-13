import { useEffect, useState } from "react";

export type OptionLabelStyle = "numeric" | "alpha";

const STORAGE_KEY = "option-label-style";
const EVENT = "option-label-style-change";
const ALPHA = ["a", "b", "c", "d", "e", "f", "g", "h"];

const read = (): OptionLabelStyle => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "alpha" ? "alpha" : "numeric";
  } catch {
    return "numeric";
  }
};

/** Shared (all cards, persisted) choice of showing options as 1-4 or a-d. */
export const useOptionLabelStyle = () => {
  const [style, setStyleState] = useState<OptionLabelStyle>("numeric");

  useEffect(() => {
    setStyleState(read());
    const sync = () => setStyleState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setStyle = (next: OptionLabelStyle) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setStyleState(next);
    window.dispatchEvent(new Event(EVENT));
  };

  return { style, setStyle };
};

/** Label for the option at `index` (0-based), independent of the stored key. */
export const optionLabel = (style: OptionLabelStyle, index: number) =>
  style === "alpha" ? ALPHA[index] ?? String(index + 1) : String(index + 1);
