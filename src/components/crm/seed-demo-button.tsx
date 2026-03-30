"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SeedDemoButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/seed-demo", { method: "POST" });
      await res.json();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={() => void run()}
    >
      {loading ? "A carregar…" : "Carregar dados de demonstração"}
    </Button>
  );
}
