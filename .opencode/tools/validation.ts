import { tool } from "@opencode-ai/plugin"

const ALLOWED_SCOPES = ["full", "test", "typecheck", "build", "lint", "pack", "changeset"] as const

function isAllowed(s: string): s is (typeof ALLOWED_SCOPES)[number] {
  return ALLOWED_SCOPES.includes(s as (typeof ALLOWED_SCOPES)[number])
}

type Command = { label: string; cmd: string }
type Result = { label: string; stdout: string; stderr: string; exitCode: number }

const SCOPE_COMMANDS: Record<(typeof ALLOWED_SCOPES)[number], Command[]> = {
  full: [
    { label: "test", cmd: "pnpm test" },
    { label: "typecheck", cmd: "pnpm typecheck" },
    { label: "build", cmd: "pnpm build" },
    { label: "lint", cmd: "pnpm lint" },
    { label: "pack:check", cmd: "pnpm pack:check" },
    { label: "changeset status", cmd: "pnpm changeset status" },
  ],
  test: [{ label: "test", cmd: "pnpm test" }],
  typecheck: [{ label: "typecheck", cmd: "pnpm typecheck" }],
  build: [{ label: "build", cmd: "pnpm build" }],
  lint: [{ label: "lint", cmd: "pnpm lint" }],
  pack: [{ label: "pack:check", cmd: "pnpm pack:check" }],
  changeset: [{ label: "changeset status", cmd: "pnpm changeset status" }],
}

async function run(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(cmd.split(" "), { stdout: "pipe", stderr: "pipe" })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}

export default tool({
  description: "Run selected repo validation commands.",
  args: {
    scope: tool.schema.string().describe("Validation scope: full, test, typecheck, build, lint, pack, changeset"),
  },
  async execute(args) {
    const scope = args.scope

    if (!isAllowed(scope)) {
      return `Invalid scope: "${scope}". Allowed: ${ALLOWED_SCOPES.join(", ")}`
    }

    const commands = SCOPE_COMMANDS[scope]
    const results: Result[] = []

    for (const { label, cmd } of commands) {
      const { stdout, stderr, exitCode } = await run(cmd)
      results.push({ label, stdout, stderr, exitCode })
    }

    const parts = results.map((r) => {
      const head = `## ${r.label} (exit ${r.exitCode})`
      const out = r.stdout.trim() ? `\n${r.stdout.trimEnd()}` : ""
      const err = r.stderr.trim() ? `\nstderr:\n${r.stderr.trimEnd()}` : ""
      return `${head}${out}${err}`
    })

    const failures = results.filter((r) => r.exitCode !== 0)
    if (failures.length > 0) {
      parts.push(`\n## Failures (${failures.length}/${results.length})`)
      for (const f of failures) {
        parts.push(`- ${f.label} exited with code ${f.exitCode}`)
      }
    } else {
      parts.push(`\nAll ${results.length} command(s) passed.`)
    }

    return parts.join("\n\n")
  },
})
