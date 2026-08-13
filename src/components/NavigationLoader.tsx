"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/PageLoading";

function mesmaRota(url: URL, pathname: string) {
  return (
    url.pathname === pathname &&
    url.search === window.location.search &&
    url.hash === ""
  );
}

export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [barra, setBarra] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const overlayTimer = useRef<number | null>(null);
  const failsafe = useRef<number | null>(null);

  function limparTimers() {
    if (overlayTimer.current) window.clearTimeout(overlayTimer.current);
    if (failsafe.current) window.clearTimeout(failsafe.current);
    overlayTimer.current = null;
    failsafe.current = null;
  }

  function parar() {
    limparTimers();
    setBarra(false);
    setOverlay(false);
  }

  function iniciar() {
    setBarra(true);
    setOverlay(false);
    limparTimers();
    overlayTimer.current = window.setTimeout(() => setOverlay(true), 180);
    failsafe.current = window.setTimeout(parar, 10000);
  }

  useEffect(() => {
    parar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      if (a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;

      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (mesmaRota(url, pathname)) return;

      iniciar();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!barra && !overlay) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-brand-100"
        aria-hidden
      >
        <div className="nav-progress h-full rounded-r-full bg-brand-600" />
      </div>
      {overlay && (
        <div className="fixed inset-0 z-[199] flex cursor-wait items-center justify-center bg-slate-50/75 backdrop-blur-[2px]">
          <PageLoading compact />
        </div>
      )}
    </>
  );
}
