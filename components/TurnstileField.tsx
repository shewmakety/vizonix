"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { publicTurnstileSiteKey, type TurnstileAction } from "@/lib/turnstile-public";

type TurnstileWidgetId = string;

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => TurnstileWidgetId;
  reset: (widgetId: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = { reset: () => void };

export const TurnstileField = forwardRef<TurnstileHandle, { action: TurnstileAction; onToken: (token: string) => void }>(
  function TurnstileField({ action, onToken }, ref) {
    const container = useRef<HTMLDivElement>(null);
    const widgetId = useRef<TurnstileWidgetId | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    function renderWidget() {
      if (!container.current || widgetId.current !== null || !window.turnstile) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: publicTurnstileSiteKey(),
        action,
        appearance: "interaction-only",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    }

    useEffect(() => {
      renderWidget();
      const timer = window.setInterval(() => {
        if (widgetId.current !== null) {
          window.clearInterval(timer);
          return;
        }
        renderWidget();
      }, 200);
      return () => window.clearInterval(timer);
    }, [action]);

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetId.current !== null && window.turnstile) {
          window.turnstile.reset(widgetId.current);
        }
        onTokenRef.current("");
      },
    }));

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={renderWidget}
        />
        <div ref={container} className="turnstile-slot" />
      </>
    );
  },
);
