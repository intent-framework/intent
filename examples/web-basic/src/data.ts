export type Team = {
  id: string
  name: string
  members: string[]
  version: number
}

export const teams: Record<string, { id: string; name: string; members: string[] }> = {
  team_1: { id: "team_1", name: "Alpha", members: [] },
  team_2: { id: "team_2", name: "Beta", members: [] },
  team_3: { id: "team_3", name: "Gamma", members: [] },
}

export const teamVersions: Record<string, number> = {}

let teamLoadVersion = 0

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function loadTeam(teamId: string): Promise<Team> {
  await delay(80)
  const team = teams[teamId]
  if (!team) throw new Error(`Team "${teamId}" not found`)
  const version = ++teamLoadVersion
  teamVersions[teamId] = version
  return { ...team, version }
}

export async function inviteMember(teamId: string, email: string): Promise<void> {
  await delay(200)
  const team = teams[teamId]
  if (!team) throw new Error(`Team "${teamId}" not found`)
  team.members.push(email)
}
