import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Language } from "../api";

const MONACO_LANGUAGE: Record<Language, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
};

interface CodeEditorProps {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  onRunShortcut?: () => void;
}

export default function CodeEditor({
  value,
  language,
  onChange,
  onRunShortcut,
}: CodeEditorProps) {
  // Simpan callback terbaru supaya keybinding yang dipasang sekali di onMount
  // tetap memanggil versi paling baru (closure stale-proof).
  const runRef = useRef(onRunShortcut);
  useEffect(() => {
    runRef.current = onRunShortcut;
  });

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => runRef.current?.()
    );
  };

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={MONACO_LANGUAGE[language]}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderLineHighlight: "all",
        padding: { top: 12, bottom: 12 },
        tabSize: 2,
        wordWrap: "on",
        fontFamily: "ui-monospace, Consolas, 'Courier New', monospace",
      }}
    />
  );
}
