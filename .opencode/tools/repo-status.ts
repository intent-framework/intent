import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Return concise repository status: branch, HEAD, working tree, latest commits, package scripts.",
  args: {},
  async execute(_args, context) {
    const root = context.worktree
    const lines: string[] = []

    // branch
    const branch = await Bun.$`git -C ${root} branch --show-current`.text()
    lines.push(`Branch: ${branch.trim()}`)

    // short HEAD
    const head = await Bun.$`git -C ${root} rev-parse --short HEAD`.text()
    lines.push(`HEAD: ${head.trim()}`)

    // working tree
    const status = await Bun.$`git -C ${root} status --short`.text()
    const dirty = status.trim() ? `\n${status.trimEnd()}` : "clean"
    lines.push(`Working tree: ${dirty}`)

    // latest commits
    const log = await Bun.$`git -C ${root} log --oneline -5`.text()
    lines.push(`\nLatest commits:\n${log.trimEnd()}`)

    // package scripts
    const pkg = await Bun.file(`${root}/package.json`).json()
    const scripts = Object.keys(pkg.scripts ?? {}).join(", ")
    lines.push(`\nRoot scripts: ${scripts}`)

    return lines.join("\n")
  },
})
