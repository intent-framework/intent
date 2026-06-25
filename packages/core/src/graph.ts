import type { ScreenDefinition } from "./screen.js"
import type { DefaultScreenServices, ActCondition } from "./act.js"
import type { AnyResourceNode } from "./resource.js"

export type DiagnosticSeverity = "info" | "warning" | "error"

export type GraphDiagnostic = {
  severity: DiagnosticSeverity
  code: string
  message: string
  nodeId?: string
}

export type InspectedScreen = {
  name: string
  asks: Array<{
    id: string
    label: string
    kind: string
    required: boolean
    isPrivate: boolean
    valid: boolean
    error: string | null
  }>
  acts: Array<{
    id: string
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
    name: string
    stepCount: number
  }>
  surfaces: Array<{
    id: string
    name: string
    itemCount: number
  }>
  resources: Array<{
    id: string
    name: string
    status: string
    hasValue: boolean
    stale: boolean
    error: string | undefined
  }>
  diagnostics: GraphDiagnostic[]
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

  return diagnostics
}

export function inspectScreen<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
  runtimeResources?: AnyResourceNode[],
): InspectedScreen {
  return {
    name: screenDef.name,
    asks: screenDef.asks.map(a => ({
      id: a.id,
      label: a.label,
      kind: a.kind,
      required: a.required,
      isPrivate: a.isPrivate,
      valid: a.valid.current,
      error: a.error,
    })),
    acts: screenDef.acts.map(a => ({
      id: a.id,
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
      name: f.name,
      stepCount: f.steps.length,
    })),
    surfaces: screenDef.surfaces.map(s => ({
      id: s.id,
      name: s.name,
      itemCount: s.items.length,
    })),
    resources: (runtimeResources ?? []).map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      hasValue: r.value !== undefined,
      stale: r.stale.current,
      error: r.status === "failed"
        ? (r.error instanceof Error ? r.error.message : String(r.error))
        : undefined,
    })),
    diagnostics: computeDiagnostics(screenDef),
  }
}
