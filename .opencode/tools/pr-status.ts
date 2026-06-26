import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Return concise GitHub PR status for a PR number.",
  args: {
    prNumber: tool.schema.number().describe("Pull request number"),
  },
  async execute(args) {
    const { prNumber } = args

    const result = await Bun.$`gh pr view ${prNumber} --json number,title,state,mergeable,headRefName,baseRefName,isDraft,url,commits,statusCheckRollup 2>/dev/null`.text()

    if (!result.trim()) {
      return "GitHub CLI (gh) is not available or not authenticated. Use the GitHub UI or run `gh pr view <number>` manually."
    }

    const data = JSON.parse(result)
    const checks = (data.statusCheckRollup ?? [])
      .map((c: { status: string; conclusion: string | null; name: string }) => {
        const conclusion = c.conclusion ?? c.status
        return `  ${c.name}: ${conclusion}`
      })
      .join("\n")

    return [
      `PR #${data.number}: ${data.title}`,
      `State: ${data.state}${data.isDraft ? " (draft)" : ""}`,
      `Branch: ${data.headRefName} → ${data.baseRefName}`,
      `Mergeable: ${data.mergeable}`,
      `URL: ${data.url}`,
      `Commits: ${data.commits?.length ?? 0}`,
      checks ? `\nStatus checks:\n${checks}` : "No status checks found",
    ].join("\n")
  },
})
