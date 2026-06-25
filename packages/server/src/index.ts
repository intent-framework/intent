export type ServerActionDef<Input = unknown, Output = unknown> = {
  name: string
  input?: Input
  output?: Output
  run: (params: { input: Input }) => Promise<Output>
  requires?: string
}

export type ServerResourceDef<Input = unknown, Output = unknown> = {
  name: string
  input?: Input
  output?: Output
  load: (params: { input: Input }) => Promise<Output>
  requires?: string
}

export type ServerPolicyDef = {
  name: string
  check: (params: { action: string; user: unknown }) => boolean | Promise<boolean>
}

const actionRegistry = new Map<string, ServerActionDef>()
const resourceRegistry = new Map<string, ServerResourceDef>()
const policyRegistry = new Map<string, ServerPolicyDef>()

export function resetServerRegistries(): void {
  actionRegistry.clear()
  resourceRegistry.clear()
  policyRegistry.clear()
}

export function getServerActions(): ServerActionDef[] {
  return Array.from(actionRegistry.values())
}

export function getServerResources(): ServerResourceDef[] {
  return Array.from(resourceRegistry.values())
}

export function getServerPolicies(): ServerPolicyDef[] {
  return Array.from(policyRegistry.values())
}

export const server = {
  action<Input = unknown, Output = unknown>(
    name: string,
    def: ServerActionDef<Input, Output>,
  ): ServerActionDef<Input, Output> {
    if (actionRegistry.has(name)) {
      throw new Error(`Server action "${name}" is already registered.`)
    }
    actionRegistry.set(name, def as unknown as ServerActionDef)
    return def
  },

  resource<Input = unknown, Output = unknown>(
    name: string,
    def: ServerResourceDef<Input, Output>,
  ): ServerResourceDef<Input, Output> {
    if (resourceRegistry.has(name)) {
      throw new Error(`Server resource "${name}" is already registered.`)
    }
    resourceRegistry.set(name, def as unknown as ServerResourceDef)
    return def
  },

  policy(name: string, def: ServerPolicyDef): ServerPolicyDef {
    if (policyRegistry.has(name)) {
      throw new Error(`Server policy "${name}" is already registered.`)
    }
    policyRegistry.set(name, def)
    return def
  },
}

export async function executeServerAction(name: string, input: unknown): Promise<unknown> {
  const action = actionRegistry.get(name)
  if (!action) {
    throw new Error(`Server action "${name}" not found.`)
  }

  if (action.requires) {
    const policy = policyRegistry.get(action.requires)
    if (policy) {
      const allowed = await policy.check({ action: name, user: null })
      if (!allowed) {
        throw new Error(`Policy "${action.requires}" denied action "${name}".`)
      }
    }
  }

  return action.run({ input: input as never })
}

export async function loadServerResource(name: string, input: unknown): Promise<unknown> {
  const resource = resourceRegistry.get(name)
  if (!resource) {
    throw new Error(`Server resource "${name}" not found.`)
  }

  if (resource.requires) {
    const policy = policyRegistry.get(resource.requires)
    if (policy) {
      const allowed = await policy.check({ action: name, user: null })
      if (!allowed) {
        throw new Error(`Policy "${resource.requires}" denied resource "${name}".`)
      }
    }
  }

  return resource.load({ input: input as never })
}
