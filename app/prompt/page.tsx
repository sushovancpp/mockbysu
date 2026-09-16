"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActionBar, Button, LinkButton, Screen, TopBar } from "@/components/ui";
import { buildPrompt } from "@/lib/prompt";
import { storage } from "@/lib/storage";
import type { ExamConfig } from "@/lib/types";

export default function PromptPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = storage.getConfig();
    if (!saved) {
      router.replace("/configure");
      return;
    }
    setConfig(saved);
    setLoaded(true);
  }, [router]);

  const prompt = useMemo(() => (config ? buildPrompt(config) : ""), [config]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const area = document.createElement("textarea");
      area.value = prompt;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  if (!loaded || !config) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <TopBar title="Your prompt" step="Step 2 of 4" back="/configure" />

      <section className="pt-6">
        <h2 className="text-[1.6rem] leading-tight font-semibold tracking-tight">
          Paste this into ChatGPT, Gemini or Claude
        </h2>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
          It asks for {config.questionCount} questions as strict JSON. Copy the
          model&rsquo;s whole reply, then come back.
        </p>
      </section>

      <pre className="mt-6 max-h-[24rem] lg:max-h-[34rem] overflow-auto rounded-3xl border border-line bg-raised p-4 font-mono text-[0.78rem] leading-relaxed whitespace-pre-wrap">
        {prompt}
      </pre>

      <ActionBar>
        <div className="space-y-2">
          <Button full onClick={copy}>
            {copied ? "Copied" : "Copy prompt"}
          </Button>
          <LinkButton href="/import" variant="secondary">
            I have the JSON
          </LinkButton>
        </div>
      </ActionBar>
    </Screen>
  );
}
