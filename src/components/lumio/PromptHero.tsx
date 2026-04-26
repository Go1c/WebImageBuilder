"use client";

import { useState, type FormEvent } from "react";

export type ModelKey = "gpt-image-2" | "gemini-image";

export type PromptHeroProps = {
  initialPrompt?: string;
  models: Array<{ key: ModelKey; label: string }>;
  defaultModel?: ModelKey;
  defaultCount?: number;
  showCountControl?: boolean;
  showAspectControl?: boolean;
  busy?: boolean;
  onSubmit: (input: {
    prompt: string;
    model: ModelKey;
    count: number;
    aspect: "1:1" | "3:4" | "4:3";
  }) => void;
};

export function PromptHero(props: PromptHeroProps) {
  const [prompt, setPrompt] = useState(props.initialPrompt ?? "");
  const [model, setModel] = useState<ModelKey>(props.defaultModel ?? props.models[0]?.key ?? "gpt-image-2");
  const [count, setCount] = useState(props.defaultCount ?? 4);
  const [aspect, setAspect] = useState<"1:1" | "3:4" | "4:3">("1:1");

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || props.busy) return;
    props.onSubmit({ prompt: prompt.trim(), model, count, aspect });
  }

  return (
    <form className="v2-hero" onSubmit={submit}>
      <textarea
        className="v2-hero-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="描述你想画的场景、角色、氛围…"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
      />
      <div className="v2-hero-toolbar">
        <select
          className="v2-pill"
          value={model}
          onChange={(e) => setModel(e.target.value as ModelKey)}
          aria-label="模型"
        >
          {props.models.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        {props.showAspectControl !== false && (
          <div className="v2-mode" style={{ height: 32 }}>
            {(["1:1", "3:4", "4:3"] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={aspect === a ? "is-on" : ""}
                onClick={() => setAspect(a)}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        {props.showCountControl !== false && (
          <div className="v2-mode" style={{ height: 32 }}>
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={count === n ? "is-on" : ""}
                onClick={() => setCount(n)}
              >
                ×{n}
              </button>
            ))}
          </div>
        )}

        <span className="grow" />

        <button
          type="submit"
          className="v2-btn-primary"
          disabled={props.busy || !prompt.trim()}
        >
          {props.busy ? "生成中…" : "生成"}
        </button>
      </div>
    </form>
  );
}
