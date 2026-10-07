"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ClearDemoButton() {
  const [loading, setLoading] = useState(false);
  const [message,setMessage]=useState("");
  const router = useRouter();

  async function run() {
    const ok = window.confirm(
      "Arquivar os registros marcados como demonstração? Dados reais serão preservados."
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/clear-demo", { method: "POST" });
      const body=await res.json();
      if(!res.ok){setMessage(body.error || "Não foi possível arquivar.");return;}
      setMessage(body.message);
      router.refresh();
    } catch { setMessage("Falha de conexão. Tente novamente."); } finally {
      setLoading(false);
    }
  }

  return (
    <div><Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => void run()}
    >
      {loading ? "A remover..." : "Arquivar demonstração"}
    </Button>{message && <p role="status" className="mt-2 text-sm">{message}</p>}</div>
  );
}
