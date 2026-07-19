import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { RefreshCw } from "lucide-react";

function UpdateBanner() {
  const { hasUpdate, newVersion, refresh } = useVersionCheck();

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-emerald-600/50 bg-emerald-900/95 px-4 py-2 text-sm text-emerald-200 shadow-lg backdrop-blur">
      <span>发现新版本 v{newVersion}</span>
      <button
        type="button"
        onClick={refresh}
        className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-400"
      >
        <RefreshCw className="h-3 w-3" />
        立即更新
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <UpdateBanner />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}
