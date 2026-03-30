"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ClearDemoButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    const ok = window.confirm(
      "Tem a certeza que quer remover todos os dados de demonstração deste workspace?"
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/clear-demo", { method: "POST" });
      await res.json();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => void run()}
    >
      {loading ? "A remover..." : "Remover dados de demonstração"}
    </Button>
  );
}
