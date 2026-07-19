import { useEffect, useState } from "react";

const CHECK_INTERVAL = 5 * 60 * 1000;

export function useVersionCheck(): { hasUpdate: boolean; newVersion: string | null; refresh: () => void } {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const refresh = () => {
    window.location.reload();
  };

  useEffect(() => {
    let timer: number | null = null;

    const check = async () => {
      try {
        const res = await fetch(`version.json?t=${Date.now()}`, {
          cache: "no-cache",
        });
        if (!res.ok) return;
        const data = await res.json();
        const latest = data.version;
        if (latest && latest !== __APP_VERSION__) {
          setHasUpdate(true);
          setNewVersion(latest);
        }
      } catch {
        // 静默失败
      }
    };

    // 页面加载 10 秒后首次检查
    const firstTimer = window.setTimeout(() => {
      check();
      timer = window.setInterval(check, CHECK_INTERVAL);
    }, 10000);

    return () => {
      clearTimeout(firstTimer);
      if (timer) clearInterval(timer);
    };
  }, []);

  return { hasUpdate, newVersion, refresh };
}
