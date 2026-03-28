import { useEffect, useMemo, useRef, useState } from "react";
import { connectWS } from "./ws";
import { FaComments, FaUniversalAccess } from "react-icons/fa";

const DEFAULT_A11Y = {
  fontScale: 100,
  lineSpacing: 100,
  letterSpacing: 0,
  highContrast: false,
  monochrome: false,
  reducedMotion: false,
  largeCursor: false,
  focusMode: true,
  easyReadFont: false,
};

function loadAccessibilitySettings() {
  if (typeof window === "undefined") return DEFAULT_A11Y;

  try {
    const raw = window.localStorage.getItem("clearchat-accessibility-settings");
    if (!raw) return DEFAULT_A11Y;
    return { ...DEFAULT_A11Y, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_A11Y;
  }
}

function SectionCard({ title, description, action, active, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left transition cursor-pointer ${
        active
          ? "border-rose-600 bg-rose-50 shadow-sm ring-2 ring-rose-200"
          : "border-zinc-200 bg-white hover:border-rose-300 hover:bg-rose-50/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            active ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                active ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {action}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p>
        </div>
      </div>
    </button>
  );
}

function RangeControl({ label, value, onDecrease, onIncrease, valueLabel }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{label}</div>
          <div className="text-xs text-zinc-500">{valueLabel}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDecrease}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <div className="min-w-12 text-center text-sm font-semibold text-zinc-700">
            {value}
          </div>
          <button
            type="button"
            onClick={onIncrease}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const timer = useRef(null);
  const socket = useRef(null);
  const synthRef = useRef(null);
  const [userName, setUserName] = useState("");
  const [showNamePopup, setShowNamePopup] = useState(true);
  const [inputName, setInputName] = useState("");
  const [typers, setTypers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [a11y, setA11y] = useState(loadAccessibilitySettings);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setTtsSupported(true);
    }

    socket.current = connectWS();

    socket.current.on("connect", () => {
      socket.current.on("roomNotice", (joinedUserName) => {
        console.log(`${joinedUserName} joined to group!`);
      });

      socket.current.on("chatMessage", (msg) => {
        console.log("msg", msg);
        setMessages((prev) => [...prev, msg]);
      });

      socket.current.on("typing", (typingUserName) => {
        setTypers((prev) => {
          const isExist = prev.find((typer) => typer === typingUserName);
          if (!isExist) {
            return [...prev, typingUserName];
          }

          return prev;
        });
      });

      socket.current.on("stopTyping", (typingUserName) => {
        setTypers((prev) => prev.filter((typer) => typer !== typingUserName));
      });
    });

    return () => {
      clearTimeout(timer.current);
      synthRef.current?.cancel();
      socket.current?.off("roomNotice");
      socket.current?.off("chatMessage");
      socket.current?.off("typing");
      socket.current?.off("stopTyping");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "clearchat-accessibility-settings",
      JSON.stringify(a11y),
    );
  }, [a11y]);

  useEffect(() => {
    if (!text || !userName || !socket.current) return;

    socket.current.emit("typing", userName);
    clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      socket.current?.emit("stopTyping", userName);
    }, 1000);

    return () => clearTimeout(timer.current);
  }, [text, userName]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const appStyle = useMemo(
    () => ({
      fontSize: `${a11y.fontScale}%`,
      lineHeight: Math.max(1.2, a11y.lineSpacing / 100),
      letterSpacing: `${a11y.letterSpacing}px`,
    }),
    [a11y.fontScale, a11y.letterSpacing, a11y.lineSpacing],
  );

  const accessibilityClassNames = [
    a11y.highContrast ? "cc-high-contrast" : "",
    a11y.monochrome ? "cc-monochrome" : "",
    a11y.reducedMotion ? "cc-reduced-motion" : "",
    a11y.largeCursor ? "cc-large-cursor" : "",
    a11y.focusMode ? "cc-focus-highlight" : "",
    a11y.easyReadFont ? "cc-easy-read" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function updateSetting(key, value) {
    setA11y((prev) => ({ ...prev, [key]: value }));
  }

  function changeNumericSetting(key, delta, min, max) {
    setA11y((prev) => ({
      ...prev,
      [key]: Math.min(max, Math.max(min, prev[key] + delta)),
    }));
  }

  function resetAccessibility() {
    synthRef.current?.cancel();
    setSpeakingMessageId(null);
    setA11y(DEFAULT_A11Y);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function handleNameSubmit(e) {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) return;

    socket.current.emit("joinRoom", trimmed);
    setUserName(trimmed);
    setShowNamePopup(false);
  }

  function sendMessage() {
    const t = text.trim();
    if (!t) return;

    const msg = {
      id: Date.now(),
      sender: userName,
      text: t,
      ts: Date.now(),
    };

    setMessages((m) => [...m, msg]);
    socket.current.emit("chatMessage", msg);
    setText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function speakMessage(message) {
    if (!ttsSupported || !synthRef.current || !message?.text?.trim()) return;

    const synth = synthRef.current;
    if (speakingMessageId === message.id) {
      synth.cancel();
      setSpeakingMessageId(null);
      return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const availableVoices = synth.getVoices();
    const englishVoice =
      availableVoices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("en-ca"),
      ) ||
      availableVoices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("en"),
      ) ||
      null;

    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => setSpeakingMessageId(message.id);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    synth.speak(utterance);
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-zinc-50 via-violet-50 to-indigo-100 text-zinc-900 ${accessibilityClassNames}`}
      style={appStyle}
    >
      {panelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
          onClick={() => setPanelOpen(false)}
        />
      )}
      {/* JSX Accessibility floating btn */}
      {/* <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-rose-700 text-white shadow-2xl ring-4 ring-white/80 transition hover:scale-105 hover:bg-rose-800 cursor-pointer"
        aria-label="Open accessibility controls"
        title="Accessibility controls"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-9 w-9"
        >
          <path d="M11.25 2.25a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0ZM7.02 7.5a.75.75 0 0 1 .73-.6h8.5a.75.75 0 0 1 .14 1.49l-3.38.68l.63 2.71l2.64 2.42a.75.75 0 0 1-.5 1.3h-1.95l-.91 5.2a.75.75 0 0 1-1.48 0l-.92-5.2H8.22a.75.75 0 0 1-.5-1.3l2.64-2.42l.63-2.71l-3.38-.68a.75.75 0 0 1-.59-.89Z" />
        </svg>
      </button> */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ${
          panelOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!panelOpen}
      >
        <div className="bg-gradient-to-r from-rose-800 via-rose-700 to-red-700 px-5 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                ClearChat
              </div>
              <h2 className="mt-1 text-2xl font-bold">Accessibility</h2>
              <p className="mt-1 text-sm text-rose-100">
                Reading, contrast, spacing, motion and cursor controls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25 cursor-pointer"
              aria-label="Close accessibility controls"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-7 w-7"
              >
                <path d="M6.22 4.97a.75.75 0 0 1 1.06 0L12 9.69l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 10.75l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 11.81l-4.72 4.72a.75.75 0 1 1-1.06-1.06l4.72-4.72L6.22 6.03a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-zinc-50 px-5 py-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-800">
                Reading & navigation
              </h3>
              <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                Core tools
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SectionCard
                title="Text Reader"
                description="Keeps the message speaker icon visible so each line can be read aloud with the browser TTS voice."
                action={ttsSupported ? "Ready" : "No TTS"}
                active={ttsSupported}
                onClick={() => {}}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M13.5 4.06a.75.75 0 0 1 1.28-.53l3.22 3.22h2.25a.75.75 0 0 1 0 1.5h-2.56a.75.75 0 0 1-.53-.22L15 5.87v12.26l2.16-2.16a.75.75 0 0 1 .53-.22h2.56a.75.75 0 0 1 0 1.5H18l-3.22 3.22a.75.75 0 0 1-1.28-.53V4.06Z" />
                    <path d="M5.25 9A2.25 2.25 0 0 1 7.5 6.75h2.25a.75.75 0 0 1 0 1.5H7.5A.75.75 0 0 0 6.75 9v6c0 .414.336.75.75.75h2.25a.75.75 0 0 1 0 1.5H7.5A2.25 2.25 0 0 1 5.25 15V9Z" />
                  </svg>
                }
              />
              <SectionCard
                title="Focus Highlight"
                description="Adds stronger keyboard outlines around buttons and inputs so users can track where they are."
                action={a11y.focusMode ? "On" : "Off"}
                active={a11y.focusMode}
                onClick={() => updateSetting("focusMode", !a11y.focusMode)}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M4.5 4.5h5.25v1.5H6v3.75H4.5V4.5Zm9.75 0h5.25v5.25H18V6h-3.75V4.5ZM4.5 14.25H6V18h3.75v1.5H4.5v-5.25Zm13.5 0h1.5v5.25h-5.25V18H18v-3.75Z" />
                  </svg>
                }
              />
              <SectionCard
                title="Easy Read Font"
                description="Switches the app to a softer sans-serif stack that is easier to scan during longer chat sessions."
                action={a11y.easyReadFont ? "On" : "Off"}
                active={a11y.easyReadFont}
                onClick={() =>
                  updateSetting("easyReadFont", !a11y.easyReadFont)
                }
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M12.75 3a.75.75 0 0 1 .69.46l6 14.25a.75.75 0 0 1-1.38.58l-1.52-3.61H8.46l-1.52 3.61a.75.75 0 1 1-1.38-.58l6-14.25A.75.75 0 0 1 12.75 3Zm-3.66 10.17h6.82L12.5 5.07l-3.41 8.1Z" />
                  </svg>
                }
              />
              <SectionCard
                title="Large Cursor"
                description="Makes the pointer easier to notice and click, helpful for low-vision or motor accessibility support."
                action={a11y.largeCursor ? "On" : "Off"}
                active={a11y.largeCursor}
                onClick={() => updateSetting("largeCursor", !a11y.largeCursor)}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M6 3.75a.75.75 0 0 1 .75.75v9.69l2.72-2.72a.75.75 0 0 1 1.2.21l2.86 5.72a.75.75 0 0 1-.34 1.01l-1.8.9a.75.75 0 0 1-1-.34l-2.14-4.28l-2.72 2.72A.75.75 0 0 1 4.5 17.6V4.5A.75.75 0 0 1 5.25 3.75H6Z" />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-base font-bold text-rose-800">
              Color adjustment
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <SectionCard
                title="High Contrast"
                description="Boosts separation between foreground and background colors to improve readability."
                action={a11y.highContrast ? "On" : "Off"}
                active={a11y.highContrast}
                onClick={() =>
                  updateSetting("highContrast", !a11y.highContrast)
                }
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M12 3.75a8.25 8.25 0 1 0 0 16.5A8.25 8.25 0 0 0 12 3.75Zm0 1.5v13.5a6.75 6.75 0 0 1 0-13.5Z" />
                  </svg>
                }
              />
              <SectionCard
                title="Monochrome"
                description="Turns the interface into grayscale for users who prefer lower color intensity."
                action={a11y.monochrome ? "On" : "Off"}
                active={a11y.monochrome}
                onClick={() => updateSetting("monochrome", !a11y.monochrome)}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M12 4.5c-4.75 0-8.9 2.97-10.5 7.5c1.6 4.53 5.75 7.5 10.5 7.5s8.9-2.97 10.5-7.5c-1.6-4.53-5.75-7.5-10.5-7.5Zm0 12a4.5 4.5 0 1 1 0-9a4.5 4.5 0 0 1 0 9Z" />
                  </svg>
                }
              />
              <SectionCard
                title="Reduced Motion"
                description="Cuts down transitions and animated polish for users sensitive to movement."
                action={a11y.reducedMotion ? "On" : "Off"}
                active={a11y.reducedMotion}
                onClick={() =>
                  updateSetting("reducedMotion", !a11y.reducedMotion)
                }
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 17.25V6.75Zm4.5 1.5a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H9Zm0 6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5H9Z" />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-base font-bold text-rose-800">
              Content adjustment
            </h3>
            <div className="space-y-3">
              <RangeControl
                label="Font size"
                value={`${a11y.fontScale}%`}
                valueLabel="Increase or decrease overall app text size"
                onDecrease={() =>
                  changeNumericSetting("fontScale", -10, 80, 160)
                }
                onIncrease={() =>
                  changeNumericSetting("fontScale", 10, 80, 160)
                }
              />
              <RangeControl
                label="Line spacing"
                value={`${a11y.lineSpacing}%`}
                valueLabel="More breathing room between lines of text"
                onDecrease={() =>
                  changeNumericSetting("lineSpacing", -10, 100, 180)
                }
                onIncrease={() =>
                  changeNumericSetting("lineSpacing", 10, 100, 180)
                }
              />
              <RangeControl
                label="Letter spacing"
                value={`${a11y.letterSpacing}px`}
                valueLabel="Wider spacing helps with dense text blocks"
                onDecrease={() =>
                  changeNumericSetting("letterSpacing", -0.5, 0, 3)
                }
                onIncrease={() =>
                  changeNumericSetting("letterSpacing", 0.5, 0, 3)
                }
              />
            </div>
          </section>
        </div>

        <div className="border-t border-zinc-200 bg-white px-5 py-4">
          <div className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Tip: message speaker icons remain beside each chat bubble for
            line-by-line reading.
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetAccessibility}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Reset all
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="flex-1 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen p-4">
        {showNamePopup && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-2xl border border-white bg-white/90 p-6 shadow-xl">
              <h1 className="text-xl font-semibold text-zinc-900">
                Enter your name
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Enter your name to start chatting. This will be used to
                identify.
              </p>

              <form onSubmit={handleNameSubmit} className="mt-4">
                <input
                  autoFocus
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="Your name"
                />
                <button
                  type="submit"
                  className="ml-auto mt-3 block rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 cursor-pointer"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        )}

        {!showNamePopup && (
          <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-lg">
              {/*  This is the app icon */}
              <div className="flex items-center gap-3 border-b border-violet-900/10 bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 px-4 py-3 text-white">
                {/* App icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-2 ring-white/25">
                  <FaComments className="h-5 w-5" />
                </div>

                {/* Accessibility button beside app icon */}
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-2 ring-white/25 transition hover:scale-105 hover:bg-white/20 cursor-pointer"
                  aria-label="Open accessibility controls"
                  title="Accessibility controls"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition">
                    <FaUniversalAccess className="h-5 w-5" />
                  </div>{" "}
                </button>

                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">
                    Realtime Messaging Platform
                  </div>
                  {typers.length ? (
                    <div className="text-xs text-violet-100">
                      {typers.join(", ")} is typing...
                    </div>
                  ) : null}
                </div>

                <div className="text-right text-sm text-violet-100">
                  <div>
                    Signed in as{" "}
                    <span className="font-semibold capitalize text-white">
                      {userName}
                    </span>
                  </div>
                  {!ttsSupported && (
                    <div className="text-[11px] text-violet-200">
                      TTS not supported in this browser
                    </div>
                  )}
                </div>
              </div>

              <div className="flex h-[78vh] flex-col bg-gradient-to-b from-zinc-50 to-violet-50/40">
                <div className="border-b border-zinc-200/70 bg-white/70 px-4 py-2 text-xs text-zinc-600">
                  Accessibility status:{" "}
                  <span className="font-semibold text-zinc-900">
                    {[
                      a11y.highContrast && "high contrast",
                      a11y.monochrome && "monochrome",
                      a11y.reducedMotion && "reduced motion",
                      a11y.easyReadFont && "easy read font",
                    ]
                      .filter(Boolean)
                      .join(", ") || "default"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex flex-col gap-3">
                    {messages.map((m) => {
                      const mine = m.sender === userName;
                      const isSpeaking = speakingMessageId === m.id;

                      return (
                        <div
                          key={m.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-[18px] border p-3 text-sm shadow-sm ${
                              mine
                                ? "border-violet-500/30 bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                                : "border-zinc-200 bg-white text-zinc-900"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                                {m.text}
                              </div>

                             <button
  type="button"
  onClick={() => speakMessage(m)}
  disabled={!ttsSupported}
  title={
    !ttsSupported
      ? "Text-to-speech is not supported in this browser"
      : isSpeaking
        ? "Stop reading"
        : "Read message aloud"
  }
  aria-label={
    isSpeaking
      ? `Stop reading message from ${m.sender}`
      : `Read message from ${m.sender}`
  }
  className={`shrink-0 rounded-full p-1.5 transition cursor-pointer ${
    mine
      ? "bg-white/15 text-white hover:bg-white/25 disabled:bg-white/10 disabled:text-violet-200"
      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:text-zinc-400"
  }`}
>
  {isSpeaking ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M6.75 5.25h3v13.5h-3V5.25Zm7.5 0h3v13.5h-3V5.25Z" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M13.5 4.06a.75.75 0 0 1 1.28-.53l3.22 3.22h2.25a.75.75 0 0 1 0 1.5h-2.56a.75.75 0 0 1-.53-.22L15 5.87v12.26l2.16-2.16a.75.75 0 0 1 .53-.22h2.56a.75.75 0 0 1 0 1.5H18l-3.22 3.22a.75.75 0 0 1-1.28-.53V4.06ZM5.25 9A2.25 2.25 0 0 1 7.5 6.75h2.25a.75.75 0 0 1 0 1.5H7.5A.75.75 0 0 0 6.75 9v6c0 .414.336.75.75.75h2.25a.75.75 0 0 1 0 1.5H7.5A2.25 2.25 0 0 1 5.25 15V9Z" />
    </svg>
  )}
</button>
                            </div>

                            <div className="mt-1 flex items-center justify-between gap-16">
                              <div
                                className={`text-[11px] font-bold ${mine ? "text-violet-100" : "text-zinc-700"}`}
                              >
                                {m.sender}
                              </div>
                              <div
                                className={`text-[11px] ${mine ? "text-violet-200" : "text-zinc-500"}`}
                              >
                                {formatTime(m.ts)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-4 rounded-full border border-zinc-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-violet-300">
                    <textarea
                      rows={1}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="w-full resize-none rounded-full bg-transparent px-4 py-3 text-sm outline-none placeholder-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      className="mr-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
