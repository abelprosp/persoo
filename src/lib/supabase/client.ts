"use client";

type AuthError = { message: string };

async function readError(response: Response, fallback: string): Promise<AuthError> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return { message: body?.error || fallback };
}

export function createClient() {
  return {
    auth: {
      async signInWithPassword(credentials: { email: string; password: string }) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        if (!response.ok) {
          return { error: await readError(response, "Não foi possível entrar.") };
        }
        return { error: null as AuthError | null };
      },
      async signUp(input: {
        email: string;
        password: string;
        options?: { data?: { full_name?: string }; emailRedirectTo?: string };
      }) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            fullName: input.options?.data?.full_name ?? "",
          }),
        });
        if (!response.ok) {
          return { error: await readError(response, "Não foi possível criar a conta.") };
        }
        return { error: null as AuthError | null };
      },
      async signOut() {
        await fetch("/api/auth/logout", { method: "POST" });
      },
      async getUser() {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return { data: { user: null } };
        const body = (await response.json()) as {
          user: { id: string; email?: string | null } | null;
        };
        return { data: { user: body.user } };
      },
    },
  };
}
