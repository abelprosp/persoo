import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-sm text-muted-foreground">
          A carregar…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
