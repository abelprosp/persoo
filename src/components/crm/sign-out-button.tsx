"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  tone?: "default" | "onDark";
};

export function SignOutButton({ tone = "default" }: Props) {
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  const iconOnly = state === "collapsed" && !isMobile;
  const dark = tone === "onDark";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start",
        dark
          ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          : "text-muted-foreground",
        iconOnly &&
          (dark
            ? "size-9 min-h-9 min-w-9 justify-center rounded-xl p-0 hover:bg-white/10"
            : "size-9 min-h-9 min-w-9 justify-center rounded-lg p-0 hover:bg-white/80")
      )}
      type="button"
      title={iconOnly ? "Sair" : undefined}
      onClick={() => void signOut()}
    >
      <LogOut className={cn("size-4 shrink-0", !iconOnly && "mr-2")} />
      <span className={cn(iconOnly && "sr-only")}>Sair</span>
    </Button>
  );
}
