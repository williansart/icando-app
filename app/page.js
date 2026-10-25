"use client";
import { useEffect, useRef } from "react";

export default function Page() {
  const ref = useRef(null);
  useEffect(() => {
    let stop;
    let cancelled = false;
    import("../lib/app").then(m => { if (!cancelled) stop = m.start(ref.current); });
    return () => { cancelled = true; if (stop) stop(); };
  }, []);
  return (
    <>
      <div className="backdrop" aria-hidden="true">I CAN DO</div>
      <div id="app" ref={ref} />
    </>
  );
}
