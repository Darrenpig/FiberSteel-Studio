import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "@/pages/Home";
import Designer from "@/pages/Designer";
import CAD from "@/pages/CAD";
import Parametric from "@/pages/Parametric";
import { cn } from "@/lib/utils";

export default function App() {
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    const check = () => {
      fetch('/api/health')
        .then((res) => setApiOk(res.ok))
        .catch(() => setApiOk(false))
    }
    check()
    const timer = setInterval(check, 5000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])
  return (
    <Router>
      <div className={cn("flex h-screen flex-col")}>
        <header className="flex items-center gap-4 border-b p-2">
          <Link to="/" className="font-semibold">FiberSteel Studio</Link>
          <nav className="flex gap-3 text-sm">
            <Link to="/designer">3D设计工作台</Link>
            <Link to="/cad">CAD绘图板</Link>
            <Link to="/parametric">参数化建模</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span>API</span>
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                apiOk === true ? "bg-green-500" : apiOk === false ? "bg-red-500" : "bg-gray-400",
              )}
              title={apiOk === true ? "在线" : apiOk === false ? "离线" : "检测中"}
            />
          </div>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/designer" element={<Designer />} />
            <Route path="/cad" element={<CAD />} />
            <Route path="/parametric" element={<Parametric />} />
            <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
