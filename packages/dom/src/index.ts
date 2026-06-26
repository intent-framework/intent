import type { ScreenDefinition, ActNode, DefaultScreenServices, InspectedScreen, AnyAskNode, SurfaceNode } from "@intent-framework/core"
import { createScreenRuntime, inspectScreen } from "@intent-framework/core"

function getReasonId(actId: string, suffix: string = ""): string {
  return `${actId}-reason${suffix}`
}

function getEnterHintId(askId: string, suffix: string = ""): string {
  return `${askId}-enter-hint${suffix}`
}

function sanitizeLabel(label: string): string {
  return label.replace(/\.+$/, "")
}

function surfaceSuffix(surfaceName: string, isMulti: boolean): string {
  return isMulti ? `--${surfaceName}` : ""
}

function findDefaultAction<TServices extends object = DefaultScreenServices>(
  acts: ActNode<TServices>[]
): ActNode<TServices> | undefined {
  const primaryActs = acts.filter(a => a.primary)
  if (primaryActs.length === 1) {
    return primaryActs[0]
  }
  if (acts.length === 1) {
    return acts[0]
  }
  return undefined
}

export type DomRendererOptions<TServices extends object = DefaultScreenServices> = {
  target: HTMLElement
  services?: TServices
  showScreenName?: boolean
  showSemanticIds?: boolean
}

export { renderRouter } from "./dom-router.js"
export type { RouterDomHandle, RenderRouterOptions } from "./dom-router.js"

export function renderDom<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
  options: DomRendererOptions<TServices>
): () => void {
  const { target, services, showScreenName, showSemanticIds } = options
  target.innerHTML = ""

  const isMulti = screenDef.surfaces.length > 1
  const root = buildDom(screenDef, showScreenName, showSemanticIds)
  target.appendChild(root)

  const runtime = createScreenRuntime<TServices>(screenDef, { services })
  runtime.start()

  const unsubscribers: Array<() => void> = []

  // Subscribe directly to each act's enabled Condition - per surface copy
  for (const act of screenDef.acts) {
    const unsub = act.enabled.subscribe(() => {
      for (const surface of screenDef.surfaces) {
        const suffix = surfaceSuffix(surface.name, isMulti)
        const form = getSurfaceForm(root, surface, isMulti)
        if (!form) continue

        const button = form.querySelector(`#${act.id}${suffix}`) as HTMLButtonElement | null
        if (!button) continue

        button.disabled = !act.enabled.current
        const reasonId = getReasonId(act.id, suffix)
        let reasonEl = form.querySelector(`#${reasonId}`) as HTMLElement | null
        if (!act.enabled.current && act.blockedReasons.length > 0) {
          button.setAttribute("aria-describedby", reasonId)
          if (!reasonEl) {
            reasonEl = document.createElement("p")
            reasonEl.id = reasonId
            reasonEl.className = "intent-blocked-reason"
            reasonEl.setAttribute("role", "alert")
            form.appendChild(reasonEl)
          }
          reasonEl.textContent = act.blockedReasons[0]!
        } else {
          button.removeAttribute("aria-describedby")
          if (reasonEl) {
            reasonEl.remove()
          }
        }
      }
    })
    unsubscribers.push(unsub)
  }

  // Subscribe to act status changes - update per-surface feedback output
  for (const act of screenDef.acts) {
    const unsub = act.onStatusChange(() => {
      for (const surface of screenDef.surfaces) {
        const suffix = surfaceSuffix(surface.name, isMulti)
        const form = getSurfaceForm(root, surface, isMulti)
        if (!form) continue
        const output = form.querySelector(`#feedback-output${suffix}`)
        if (output) {
          updateFeedback(act, output)
        }
      }
    })
    unsubscribers.push(unsub)
  }

  // Each button click executes its own action through the runtime
  for (const act of screenDef.acts) {
    for (const surface of screenDef.surfaces) {
      const suffix = surfaceSuffix(surface.name, isMulti)
      const form = getSurfaceForm(root, surface, isMulti)
      if (!form) continue

      const button = form.querySelector(`#${act.id}${suffix}`) as HTMLButtonElement | null
      if (button) {
        button.addEventListener("click", () => {
          if (act.enabled.current) {
            runtime.executeAct(act)
          }
        })
      }
    }
  }

  // Reactive hint for Enter key default action - per surface copy
  const defaultActionForHint = findDefaultAction(screenDef.acts)
  if (defaultActionForHint) {
    const unsub = defaultActionForHint.enabled.subscribe(() => {
      const isEnabled = defaultActionForHint.enabled.current
      for (const surface of screenDef.surfaces) {
        const suffix = surfaceSuffix(surface.name, isMulti)
        const form = getSurfaceForm(root, surface, isMulti)
        if (!form) continue

        for (const item of surface.items) {
          if (!("state" in item)) continue
          const ask = item as AnyAskNode
          const input = form.querySelector(`#${ask.id}${suffix}`) as HTMLElement | null
          const hint = form.querySelector(`#${getEnterHintId(ask.id, suffix)}`) as HTMLElement | null
          if (input && hint) {
            const hintId = getEnterHintId(ask.id, suffix)
            if (isEnabled) {
              hint.style.display = ""
              const existing = input.getAttribute("aria-describedby") || ""
              const ids = existing.split(/\s+/).filter(Boolean)
              if (!ids.includes(hintId)) {
                ids.push(hintId)
              }
              input.setAttribute("aria-describedby", ids.join(" "))
            } else {
              hint.style.display = "none"
              const existing = input.getAttribute("aria-describedby") || ""
              const ids = existing.split(/\s+/).filter(Boolean).filter(id => id !== hintId)
              if (ids.length > 0) {
                input.setAttribute("aria-describedby", ids.join(" "))
              } else {
                input.removeAttribute("aria-describedby")
              }
            }
          }
        }
      }
    })
    unsubscribers.push(unsub)
  }

  // Enter key in an ask input triggers the default action - per surface copy
  for (const surface of screenDef.surfaces) {
    const suffix = surfaceSuffix(surface.name, isMulti)
    const form = getSurfaceForm(root, surface, isMulti)
    if (!form) continue

    for (const item of surface.items) {
      if (!("state" in item)) continue
      const ask = item as AnyAskNode
      const input = form.querySelector(`#${ask.id}${suffix}`) as HTMLElement | null
      if (input) {
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key !== "Enter") return
          if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return
          if (input.tagName === "TEXTAREA") return
          if (input.tagName === "SELECT") return
          if ((input as HTMLInputElement).type === "checkbox") return

          const defaultAction = findDefaultAction(screenDef.acts)
          if (!defaultAction || !defaultAction.enabled.current) return

          event.preventDefault()
          runtime.executeAct(defaultAction)
        }
        input.addEventListener("keydown", onKeyDown)
        unsubscribers.push(() => input.removeEventListener("keydown", onKeyDown))
      }
    }
  }

  // Synchronize ask state across duplicate surface copies
  for (const ask of screenDef.asks) {
    const unsub = ask.subscribe(() => {
      for (const surface of screenDef.surfaces) {
        const suffix = surfaceSuffix(surface.name, isMulti)
        const form = getSurfaceForm(root, surface, isMulti)
        if (!form) continue

        const control = form.querySelector(`#${ask.id}${suffix}`) as HTMLElement | null
        if (!control) continue

        if (typeof ask.state.value === "boolean") {
          (control as HTMLInputElement).checked = (ask.state as unknown as { value: boolean }).value
        } else if (ask.kind === "choice") {
          (control as HTMLSelectElement).value = (ask.state as unknown as { value: string }).value
        } else {
          (control as HTMLInputElement).value = (ask.state as unknown as { value: string }).value
        }
      }
    })
    unsubscribers.push(unsub)
  }

  // Return cleanup function
  return () => {
    for (const unsub of unsubscribers) {
      unsub()
    }
    runtime.dispose()
  }
}

function getSurfaceForm(
  root: HTMLElement,
  surface: SurfaceNode,
  isMulti: boolean
): HTMLFormElement | null {
  if (isMulti) {
    const section = root.querySelector(`#${surface.id}`)
    return section ? section.querySelector("form") : null
  }
  return root.querySelector("form")
}

function buildDom<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
  showScreenName?: boolean,
  showSemanticIds?: boolean
): HTMLElement {
  let inspected: InspectedScreen | undefined
  let askSemanticIds: Map<string, string> | undefined
  let actSemanticIds: Map<string, string> | undefined

  if (showSemanticIds) {
    inspected = inspectScreen(screenDef)
    askSemanticIds = new Map(inspected.asks.map(a => [a.id, a.semanticId]))
    actSemanticIds = new Map(inspected.acts.map(a => [a.id, a.semanticId]))
  }

  const isMulti = screenDef.surfaces.length > 1
  const main = document.createElement("main")

  if (showSemanticIds && inspected) {
    main.setAttribute("data-intent-screen", inspected.semanticId)
  }

  if (showScreenName) {
    const heading = document.createElement("h1")
    heading.textContent = screenDef.name
    main.appendChild(heading)
  }

  if (isMulti) {
    for (const surface of screenDef.surfaces) {
      const section = buildSurface(screenDef, surface, showSemanticIds, askSemanticIds, actSemanticIds, isMulti)
      main.appendChild(section)
    }
  } else if (screenDef.surfaces.length === 1) {
    const surface = screenDef.surfaces[0]!
    main.id = surface.id
    const form = buildForm(screenDef, surface, showSemanticIds, askSemanticIds, actSemanticIds, isMulti)
    main.appendChild(form)
  }

  return main
}

function buildSurface<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
  surface: SurfaceNode,
  showSemanticIds?: boolean,
  askSemanticIds?: Map<string, string>,
  actSemanticIds?: Map<string, string>,
  isMulti?: boolean
): HTMLElement {
  const section = document.createElement("section")
  section.id = surface.id
  section.setAttribute("aria-label", surface.name)

  const form = buildForm(screenDef, surface, showSemanticIds, askSemanticIds, actSemanticIds, isMulti)
  section.appendChild(form)

  return section
}

function buildForm<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
  surface: SurfaceNode,
  showSemanticIds?: boolean,
  askSemanticIds?: Map<string, string>,
  actSemanticIds?: Map<string, string>,
  isMulti?: boolean
): HTMLFormElement {
  const isMultiSurface = isMulti ?? screenDef.surfaces.length > 1
  const suffix = surfaceSuffix(surface.name, isMultiSurface)

  const form = document.createElement("form")
  form.setAttribute("method", "POST")
  form.setAttribute("novalidate", "")

  if (isMultiSurface) {
    // Multi-surface: render only items contained by this surface
    for (const item of surface.items) {
      if ("state" in item) {
        buildAskControl(form, screenDef, item as AnyAskNode, suffix, showSemanticIds, askSemanticIds)
      } else if ("handler" in item) {
        buildActionButton(form, item as ActNode<TServices>, suffix, showSemanticIds, actSemanticIds)
      }
    }
  } else {
    // Single surface: render all asks and acts (backward compatible)
    // Use this surface's items to determine the render order
    const surfaceAskIds = new Set<string>()
    const surfaceActIds = new Set<string>()
    const orderedItems: Array<{ kind: "ask"; node: AnyAskNode } | { kind: "act"; node: ActNode<TServices> }> = []

    for (const item of surface.items) {
      if ("state" in item) {
        const ask = item as AnyAskNode
        surfaceAskIds.add(ask.id)
        orderedItems.push({ kind: "ask", node: ask })
      } else if ("handler" in item) {
        const act = item as ActNode<TServices>
        surfaceActIds.add(act.id)
        orderedItems.push({ kind: "act", node: act as unknown as ActNode<TServices> })
      }
    }

    // Add asks not in surface items
    for (const ask of screenDef.asks) {
      if (!surfaceAskIds.has(ask.id)) {
        orderedItems.push({ kind: "ask", node: ask })
      }
    }

    // Add acts not in surface items
    for (const act of screenDef.acts) {
      if (!surfaceActIds.has(act.id)) {
        orderedItems.push({ kind: "act", node: act as unknown as ActNode<TServices> })
      }
    }

    for (const item of orderedItems) {
      if (item.kind === "ask") {
        buildAskControl(form, screenDef, item.node, suffix, showSemanticIds, askSemanticIds)
      } else {
        buildActionButton(form, item.node as ActNode<TServices>, suffix, showSemanticIds, actSemanticIds)
      }
    }
  }

  const output = document.createElement("output")
  output.id = `feedback-output${suffix}`
  output.setAttribute("aria-live", "polite")
  form.appendChild(output)

  return form
}

function buildAskControl<TServices extends object = DefaultScreenServices>(
  form: HTMLFormElement,
  screenDef: ScreenDefinition<TServices>,
  ask: AnyAskNode,
  suffix: string,
  showSemanticIds?: boolean,
  askSemanticIds?: Map<string, string>
): void {
  const container = document.createElement("div")
  container.className = "ask-group"

  const label = document.createElement("label")
  label.textContent = ask.label
  label.htmlFor = `${ask.id}${suffix}`
  if (showSemanticIds && askSemanticIds) {
    const sid = askSemanticIds.get(ask.id)
    if (sid) {
      label.setAttribute("data-intent-ask", sid)
    }
  }
  container.appendChild(label)

  const control = createInputForAsk(ask)
  control.id = `${ask.id}${suffix}`
  ;(control as HTMLInputElement).name = `${ask.id}${suffix}`
  if (showSemanticIds && askSemanticIds) {
    const sid = askSemanticIds.get(ask.id)
    if (sid) {
      control.setAttribute("data-intent-ask", sid)
    }
  }

  if (ask.required) {
    (control as HTMLInputElement).required = true
  }

  if (ask.kind === "contact" && ask.contactKind) {
    control.setAttribute("autocomplete", ask.contactKind)
  }

  const stateObj = ask.state as unknown as { value: unknown; set: (...args: unknown[]) => void; options?: readonly string[] }

  if (typeof ask.state.value === "boolean") {
    ;(control as HTMLInputElement).checked = stateObj.value as boolean
    control.addEventListener("change", () => {
      (stateObj as { value: boolean; set: (v: boolean) => void }).set((control as HTMLInputElement).checked)
    })
  } else if (ask.kind === "choice") {
    const select = control as HTMLSelectElement
    const options = (stateObj as { options: readonly string[] }).options
    for (const opt of options) {
      const option = document.createElement("option")
      option.value = opt
      option.textContent = opt
      select.appendChild(option)
    }
    select.value = (stateObj as { value: string }).value
    select.addEventListener("change", () => {
      (stateObj as { value: string; set: (v: string) => void }).set(select.value)
    })
  } else {
    const textInput = control as HTMLInputElement
    textInput.addEventListener("input", () => {
      if (typeof (stateObj as { set: (v: string) => void }).set === "function") {
        (stateObj as { set: (v: string) => void }).set(textInput.value)
      }
    })
  }

  container.appendChild(control)

  if (ask.hintText) {
    const hint = document.createElement("p")
    hint.id = `${ask.id}-hint${suffix}`
    hint.textContent = ask.hintText
    container.appendChild(hint)
  }

  const defaultAction = findDefaultAction(screenDef.acts)
  if (defaultAction) {
    const hintId = getEnterHintId(ask.id, suffix)
    const hint = document.createElement("p")
    hint.id = hintId
    hint.textContent = `Press Enter to ${sanitizeLabel(defaultAction.label)}.`
    if (!defaultAction.enabled.current) {
      hint.style.display = "none"
    }
    container.appendChild(hint)

    if (defaultAction.enabled.current) {
      const existing = control.getAttribute("aria-describedby")
      if (existing) {
        control.setAttribute("aria-describedby", `${existing} ${hintId}`)
      } else {
        control.setAttribute("aria-describedby", hintId)
      }
    }
  }

  form.appendChild(container)
}

function buildActionButton<TServices extends object = DefaultScreenServices>(
  form: HTMLFormElement,
  act: ActNode<TServices>,
  suffix: string,
  showSemanticIds?: boolean,
  actSemanticIds?: Map<string, string>
): void {
  const button = document.createElement("button")
  button.id = `${act.id}${suffix}`
  button.type = "button"
  button.textContent = act.label
  if (showSemanticIds && actSemanticIds) {
    const sid = actSemanticIds.get(act.id)
    if (sid) {
      button.setAttribute("data-intent-action", sid)
    }
  }

  if (act.primary) {
    button.className = "primary"
  }

  if (!act.enabled.current) {
    button.disabled = true
    if (act.blockedReasons.length > 0) {
      const reasonId = getReasonId(act.id, suffix)
      button.setAttribute("aria-describedby", reasonId)
      const reasonEl = document.createElement("p")
      reasonEl.id = reasonId
      reasonEl.className = "intent-blocked-reason"
      reasonEl.setAttribute("role", "alert")
      reasonEl.textContent = act.blockedReasons[0]!
      form.appendChild(reasonEl)
    }
  }

  form.appendChild(button)
}

function updateFeedback<TServices extends object = DefaultScreenServices>(act: ActNode<TServices>, output: Element): void {
  const msg = act.feedback && act.statusMessage ? act.statusMessage : ""
  if (msg) {
    output.textContent = msg
  } else {
    output.textContent = ""
  }
}

function createInputForAsk(ask: { kind: string; contactKind?: string; state: { value: unknown } }): HTMLElement {
  if (typeof ask.state.value === "boolean") {
    const input = document.createElement("input")
    input.type = "checkbox"
    return input
  }

  if (ask.kind === "choice") {
    return document.createElement("select")
  }

  const input = document.createElement("input")

  if (ask.kind === "contact" && ask.contactKind === "email") {
    input.type = "email"
  } else if (ask.kind === "secret") {
    input.type = "password"
  } else {
    input.type = "text"
  }

  return input
}
