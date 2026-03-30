import { JoinClient } from "./join-client";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp.token ?? "").trim();
  return <JoinClient initialToken={token} />;
}
