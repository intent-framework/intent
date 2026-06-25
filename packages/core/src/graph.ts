import type { ScreenDefinition } from "./screen.js"

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
    error: string | undefined
  }>
}

export function inspectScreen(screenDef: ScreenDefinition): InspectedScreen {
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
    resources: screenDef.resources.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      hasValue: r.value !== undefined,
      error: r.status === "failed"
        ? (r.error instanceof Error ? r.error.message : String(r.error))
        : undefined,
    })),
  }
}
