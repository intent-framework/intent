import type { ScreenDefinition } from "./screen.js"
import type { DefaultScreenServices, ActCondition } from "./act.js"
import type { AnyResourceNode } from "./resource.js"

export type DiagnosticSeverity = "info" | "warning" | "error"

export type GraphDiagnostic = {
  severity: DiagnosticSeverity
  code: string
  message: string
  nodeId?: string
  semanticNodeId?: string
}

export type InspectedScreen = {
  name: string
  semanticId: string
  asks: Array<{
    id: string
    semanticId: string
    label: string
    kind: string
    required: boolean
    isPrivate: boolean
    valid: boolean
    error: string | null
  }>
  acts: Array<{
    id: string
    semanticId: string
    label: string
    primary: boolean
    enabled: boolean
    blockedReasons: string[]
    status: string
    statusMessage: string | null
    invalidates: string[]
  }>
  flows: Array<{
    id: string
    semanticId: string
    name: string
    stepCount: number
  }>
  surfaces: Array<{
    id: string
    semanticId: string
    name: string
    itemCount: number
  }>
  resources: Array<{
    id: string
    semanticId: string
    name: string
    status: string
    hasValue: boolean
    stale: boolean
    error: string | undefined
  }>
  diagnostics: GraphDiagnostic[]
}

const NODE_KINDS: Record<string, string> = {
  ask: "ask",
  act: "action",
  flow: "flow",
  surface: "surface",
  resource: "resource",
}

function slugify(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function semanticNodeId(kind: string, id: string): string {
  const prefix = NODE_KINDS[kind] ?? kind
  const internalPrefix = `${kind}_`
  const slug = id.startsWith(internalPrefix)
    ? id.slice(internalPrefix.length).replace(/_/g, "-")
    : id
  return `${prefix}:${slug}`
}

function computeDiagnostics<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = []

  const primaryActions = screenDef.acts.filter(a => a.primary)
  if (primaryActions.length > 1) {
    diagnostics.push({
      severity: "warning",
      code: "multiple-primary-actions",
      message: "Screen has multiple primary actions, so default action behavior is ambiguous.",
    })
  }

  for (const ask of screenDef.asks) {
    if (ask.kind === "secret" && !ask.isPrivate) {
      diagnostics.push({
        severity: "warning",
        code: "secret-ask-not-private",
        message: "Secret ask should also be marked private.",
        nodeId: ask.id,
      })
    }
  }

  for (const act of screenDef.acts) {
    if (act.primary && act.conditions.length > 0 && act.conditions.every((c: ActCondition) => c.message === undefined)) {
      diagnostics.push({
        severity: "info",
        code: "primary-action-without-blocked-reason",
        message: "Primary action can be blocked without an explainable reason.",
        nodeId: act.id,
      })
    }
  }

  const surfacedNodeIds = new Set<string>()
  for (const surface of screenDef.surfaces) {
    for (const item of surface.items) {
      surfacedNodeIds.add(item.id)
    }
  }

  for (const ask of screenDef.asks) {
    if (!surfacedNodeIds.has(ask.id)) {
      diagnostics.push({
        severity: "warning",
        code: "ask-not-in-surface",
        message: "Ask is defined but not included in any surface.",
        nodeId: ask.id,
      })
    }
  }

  for (const act of screenDef.acts) {
    if (!surfacedNodeIds.has(act.id)) {
      diagnostics.push({
        severity: "warning",
        code: "action-not-in-surface",
        message: "Action is defined but not included in any surface.",
        nodeId: act.id,
      })
    }
  }

  return diagnostics
}

export function inspectScreen<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
  runtimeResources?: AnyResourceNode[],
): InspectedScreen {
  const diagnostics = computeDiagnostics(screenDef)

  const idToSemantic = new Map<string, string>()
  for (const a of screenDef.asks) {
    idToSemantic.set(a.id, semanticNodeId("ask", a.id))
  }
  for (const a of screenDef.acts) {
    idToSemantic.set(a.id, semanticNodeId("act", a.id))
  }

  const augmentedDiagnostics: GraphDiagnostic[] = diagnostics.map(d => ({
    ...d,
    semanticNodeId: d.nodeId ? idToSemantic.get(d.nodeId) : undefined,
  }))

  return {
    name: screenDef.name,
    semanticId: `screen:${slugify(screenDef.name)}`,
    asks: screenDef.asks.map(a => ({
      id: a.id,
      semanticId: semanticNodeId("ask", a.id),
      label: a.label,
      kind: a.kind,
      required: a.required,
      isPrivate: a.isPrivate,
      valid: a.valid.current,
      error: a.error,
    })),
    acts: screenDef.acts.map(a => ({
      id: a.id,
      semanticId: semanticNodeId("act", a.id),
      label: a.label,
      primary: a.primary,
      enabled: a.enabled.current,
      blockedReasons: a.blockedReasons,
      status: a.status,
      statusMessage: a.statusMessage,
      invalidates: a.invalidatedResourceIds,
    })),
    flows: screenDef.flows.map(f => ({
      id: f.id,
      semanticId: semanticNodeId("flow", f.id),
      name: f.name,
      stepCount: f.steps.length,
    })),
    surfaces: screenDef.surfaces.map(s => ({
      id: s.id,
      semanticId: semanticNodeId("surface", s.id),
      name: s.name,
      itemCount: s.items.length,
    })),
    resources: (runtimeResources ?? []).map(r => ({
      id: r.id,
      semanticId: semanticNodeId("resource", r.id),
      name: r.name,
      status: r.status,
      hasValue: r.value !== undefined,
      stale: r.stale.current,
      error: r.status === "failed"
        ? (r.error instanceof Error ? r.error.message : String(r.error))
        : undefined,
    })),
    diagnostics: augmentedDiagnostics,
  }
}
