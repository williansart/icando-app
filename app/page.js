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
      {/* abertura: o Dodô pulando enquanto o app carrega (some sozinho quando a primeira tela fica pronta) */}
      <div className="boot" id="boot" role="status" aria-label="Carregando o I Can Do">
        <div className="boot-dodo" aria-hidden="true">
          <span className="boot-shadow" />
          <span className="boot-body">
            <img className="b-open" src="/dodo/neutro.webp" alt="" width="132" height="132" />
            <img className="b-blink" src="/dodo/feliz.webp" alt="" width="132" height="132" />
          </span>
          <i className="boot-spark s1" /><i className="boot-spark s2" /><i className="boot-spark s3" />
        </div>
        <b>I Can Do</b>
        <span className="boot-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <div id="app" ref={ref} />
    </>
  );
}
