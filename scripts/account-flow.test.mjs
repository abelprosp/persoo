import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import ts from "typescript";

// Load the production TypeScript without a new test-framework dependency.
const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path).exports;
  const loadedModule = { exports: {} };
  cache.set(path, loadedModule);
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = id => id.startsWith("@/") ? load(`src/${id.slice(2)}.ts`) : id.startsWith(".") ? load(resolve(dirname(path), `${id}.ts`)) : require(id);
  new Function("require", "module", "exports", code)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { evaluateWorkspaceAccess } = load("src/lib/subscriptions.ts");
const { mapStripeSubscriptionStatus } = load("src/lib/stripe-sync.ts");
const { completeOnboardingWithRunner, onboardingInput } = load("src/lib/onboarding.ts");
const { provisionWorkspaceWithRunner } = load("src/lib/workspace-provisioning.ts");
const { transaction } = load("src/lib/db/pool.ts");
const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
const options = { bypass: false };
for (const [label, subscription, expected] of [
  ["trial válido", { status: "trialing", trial_ends_at: future }, true],
  ["trial expirado", { status: "trialing", trial_ends_at: past }, false],
  ["trial sem data", { status: "trialing", trial_ends_at: null }, false],
  ["trial com data inválida", { status: "trialing", trial_ends_at: "invalid" }, false],
  ["assinatura válida", { status: "active", current_period_end: future }, true],
  ["assinatura manual sem vencimento", { status: "active", current_period_end: null }, true],
  ["assinatura vencida", { status: "active", current_period_end: past }, false],
  ["assinatura com data inválida", { status: "active", current_period_end: "invalid" }, false],
  ["assinatura ausente", null, false],
  ...["past_due", "canceled", "expired", "incomplete", "unknown"].map(status => [status, { status }, false]),
]) test(label, () => assert.equal(evaluateWorkspaceAccess(subscription, options).ok, expected));
test("trial expirado mantém motivo específico para popup", () => assert.equal(evaluateWorkspaceAccess({ status: "trialing", trial_ends_at: past }, options).reason, "trial_expired"));
test("pagamento incompleto nunca ativa trial", () => assert.equal(mapStripeSubscriptionStatus("incomplete"), "past_due"));
test("pagamento confirmado ativa assinatura", () => assert.equal(mapStripeSubscriptionStatus("active"), "active"));
test("validação rejeita dados de onboarding malformados", () => assert.equal(onboardingInput.safeParse({ fullName: 42, companyName: "ACME", mode: "template" }).success, false));

function fakeRun(handler) {
  const calls = [];
  const run = async (sql, params = []) => { calls.push({ sql, params }); const rows = await handler(sql, params); return { rows: rows ?? [], rowCount: (rows ?? []).length }; };
  return { run, calls };
}
const input = { fullName: "Ana Silva", companyName: "ACME", mode: "template", templateId: "logistica" };
test("onboarding repetido não altera perfil nem workspace", async () => {
  const { run, calls } = fakeRun(() => [{ onboarding_completed: true }]);
  assert.deepEqual(await completeOnboardingWithRunner(run, "u", "w", input), { alreadyCompleted: true });
  assert.equal(calls.length, 1);
});
test("convidado conclui perfil sem modificar workspace", async () => {
  const { run, calls } = fakeRun(sql => sql.startsWith("SELECT onboarding") ? [{ onboarding_completed: false }] : sql.startsWith("SELECT w.") ? [{ owner_id: "other" }] : []);
  await completeOnboardingWithRunner(run, "u", "w", input);
  assert.equal(calls.filter(c => c.sql.startsWith("UPDATE workspaces")).length, 0);
  assert.equal(calls.filter(c => c.sql.startsWith("UPDATE profiles")).length, 1);
});
test("falha no workspace não marca onboarding como concluído", async () => {
  const { run, calls } = fakeRun(sql => { if (sql.startsWith("SELECT onboarding")) return [{ onboarding_completed: false }]; if (sql.startsWith("SELECT w.")) return [{ owner_id: "u", ai_schema: {} }]; if (sql.startsWith("UPDATE workspaces")) throw Error("database failure"); return []; });
  await assert.rejects(completeOnboardingWithRunner(run, "u", "w", input), /database failure/);
  assert.equal(calls.some(c => c.sql.startsWith("UPDATE profiles")), false);
});
test("template é salvo antes da conclusão", async () => {
  const { run, calls } = fakeRun(sql => sql.startsWith("SELECT onboarding") ? [{ onboarding_completed: false }] : sql.startsWith("SELECT w.") ? [{ owner_id: "u", ai_schema: {} }] : []);
  await completeOnboardingWithRunner(run, "u", "w", input);
  assert.ok(calls.findIndex(c => c.sql.startsWith("UPDATE workspaces")) < calls.findIndex(c => c.sql.startsWith("UPDATE profiles")));
});
test("prévia IA expirada ou de outro usuário não conclui", async () => {
  const { run, calls } = fakeRun(sql => sql.startsWith("SELECT onboarding") ? [{ onboarding_completed: false }] : sql.startsWith("SELECT w.") ? [{ owner_id: "u", ai_schema: {} }] : []);
  await assert.rejects(completeOnboardingWithRunner(run, "u", "w", { ...input, mode: "ai", previewId: "preview" }), /prévia expirou/);
  assert.equal(calls.some(c => c.sql.startsWith("UPDATE")), false);
});
test("primeiro acesso reutiliza workspace encontrado sob lock", async () => {
  const { run, calls } = fakeRun(sql => sql.startsWith("SELECT id FROM auth") ? [{ id: "u" }] : [{ id: "existing" }]);
  assert.equal((await provisionWorkspaceWithRunner(run, "u", "ACME", true)).id, "existing");
  assert.equal(calls.some(c => c.sql.startsWith("INSERT")), false);
  assert.match(calls[0].sql, /FOR UPDATE/);
});
test("terceiro workspace é recusado sem plano Pro", async () => {
  const { run, calls } = fakeRun(sql => sql.startsWith("SELECT id FROM auth") ? [{ id: "u" }] : [{ owned: 2, admin: false, pro: false }]);
  await assert.rejects(provisionWorkspaceWithRunner(run, "u", "ACME", false), /2 CRMs/);
  assert.equal(calls.some(c => c.sql.startsWith("INSERT")), false);
});
test("plano ausente não cria workspace incompleto", async () => {
  const { run, calls } = fakeRun(sql => sql.startsWith("SELECT id FROM auth") ? [{ id: "u" }] : sql.includes(" AS owned") ? [{ owned: 0, admin: false, pro: false }] : []);
  await assert.rejects(provisionWorkspaceWithRunner(run, "u", "ACME", false), /Plano de teste indisponível/);
  assert.equal(calls.some(c => c.sql.startsWith("INSERT")), false);
});
test("provisionamento insere membro e trial de sete dias", async () => {
  const { run, calls } = fakeRun(sql => sql.startsWith("SELECT id FROM auth") ? [{ id: "u" }] : sql.includes(" AS owned") ? [{ owned: 0, admin: false, pro: false }] : sql.includes("FROM subscription_plans") ? [{ id: "plan" }] : sql.startsWith("INSERT INTO workspaces") ? [{ id: "w" }] : []);
  await provisionWorkspaceWithRunner(run, "u", "ACME", false);
  assert.equal(calls.filter(c => c.sql.startsWith("INSERT")).length, 3);
  assert.deepEqual(calls.at(-1).params, ["w", "plan", 7]);
});

test("transação reverte todas as gravações se o trial falhar", async () => {
  const previous = globalThis.persooAdminPool;
  const commands = [];
  const pending = [];
  const committed = [];
  globalThis.persooAdminPool = { connect: async () => ({
    query: async sql => {
      commands.push(sql);
      if (sql === "ROLLBACK") pending.length = 0;
      else if (sql === "COMMIT") committed.push(...pending);
      else if (sql.includes("workspace_subscriptions")) throw Error("trial failure");
      else if (sql.startsWith("INSERT")) pending.push(sql);
      return { rows: [], rowCount: 0 };
    }, release: () => commands.push("RELEASE"),
  }) };
  try {
    await assert.rejects(transaction(null, async run => {
      await run("INSERT INTO workspaces");
      await run("INSERT INTO workspace_members");
      await run("INSERT INTO workspace_subscriptions");
    }), /trial failure/);
    assert.deepEqual(committed, []);
    assert.deepEqual(commands.slice(-2), ["ROLLBACK", "RELEASE"]);
  } finally { globalThis.persooAdminPool = previous; }
});
