import type { ScreenDefinition, ActNode, DefaultScreenServices, InspectedScreen } from "@intent-framework/core"
import { createScreenRuntime, inspectScreen } from "@intent-framework/core"

function getReasonId(actId: string): string {
  return `${actId}-reason`
}

function getEnterHintId(askId: string): string {
  return `${askId}-enter-hint`
}

function sanitizeLabel(label: string): string {
  return label.replace(/\.+$/, "")
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
  const root = buildDom(screenDef, showScreenName, showSemanticIds)
  target.appendChild(root)

  const runtime = createScreenRuntime<TServices>(screenDef, { services })
  runtime.start()

  const form = target.querySelector("form")!
  const output = target.querySelector("output#feedback-output")!

  const unsubscribers: Array<() => void> = []

  // Subscribe directly to each act's enabled Condition
  for (const act of screenDef.acts) {
    const button = form.querySelector(`#${act.id}`) as HTMLButtonElement | null
    if (button) {
      const unsub = act.enabled.subscribe(() => {
        button.disabled = !act.enabled.current
        const reasonId = getReasonId(act.id)
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
      })
      unsubscribers.push(unsub)
    }
  }

  // Subscribe to act status changes — update feedback output
  for (const act of screenDef.acts) {
    const unsub = act.onStatusChange(() => {
      updateFeedback(act, output)
    })
    unsubscribers.push(unsub)
  }

  // Each button click executes its own action through the runtime
  for (const act of screenDef.acts) {
    const button = form.querySelector(`#${act.id}`) as HTMLButtonElement | null
    if (button) {
      button.addEventListener("click", () => {
        if (act.enabled.current) {
          runtime.executeAct(act)
        }
      })
    }
  }

  // Reactive hint for Enter key default action
  const defaultActionForHint = findDefaultAction(screenDef.acts)
  if (defaultActionForHint) {
    const unsub = defaultActionForHint.enabled.subscribe(() => {
      const isEnabled = defaultActionForHint.enabled.current
      for (const ask of screenDef.asks) {
        const input = form.querySelector(`#${ask.id}`) as HTMLElement | null
        const hint = form.querySelector(`#${getEnterHintId(ask.id)}`) as HTMLElement | null
        if (input && hint) {
          const hintId = getEnterHintId(ask.id)
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
    })
    unsubscribers.push(unsub)
  }

  // Enter key in an ask input triggers the default action
  for (const ask of screenDef.asks) {
    const input = form.querySelector(`#${ask.id}`) as HTMLElement | null
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

  // Return cleanup function
  return () => {
    for (const unsub of unsubscribers) {
      unsub()
    }
    runtime.dispose()
  }
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

  const surface = screenDef.surfaces[0]
  const main = document.createElement("main")

  if (surface) {
    main.id = surface.id
  }

  if (showSemanticIds && inspected) {
    main.setAttribute("data-intent-screen", inspected.semanticId)
  }

  if (showScreenName) {
    const heading = document.createElement("h1")
    heading.textContent = screenDef.name
    main.appendChild(heading)
  }

  const form = document.createElement("form")
  form.setAttribute("method", "POST")
  form.setAttribute("novalidate", "")

  for (const ask of screenDef.asks) {
    const container = document.createElement("div")
    container.className = "ask-group"

    const label = document.createElement("label")
    label.textContent = ask.label
    label.htmlFor = ask.id
    if (showSemanticIds && askSemanticIds) {
      const sid = askSemanticIds.get(ask.id)
      if (sid) {
        label.setAttribute("data-intent-ask", sid)
      }
    }
    container.appendChild(label)

    const control = createInputForAsk(ask)
    control.id = ask.id
    ;(control as HTMLInputElement).name = ask.id
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

    if (typeof ask.state.value === "boolean") {
      const stateObj = ask.state as unknown as { value: boolean; set: (v: boolean) => void }
      ;(control as HTMLInputElement).checked = stateObj.value
      control.addEventListener("change", () => {
        stateObj.set((control as HTMLInputElement).checked)
      })
    } else if (ask.kind === "choice") {
      const stateObj = ask.state as unknown as { value: string; set: (v: string) => void; options: readonly string[] }
      const select = control as HTMLSelectElement
      for (const opt of stateObj.options) {
        const option = document.createElement("option")
        option.value = opt
        option.textContent = opt
        select.appendChild(option)
      }
      select.value = stateObj.value
      select.addEventListener("change", () => {
        stateObj.set(select.value)
      })
    } else {
      const textInput = control as HTMLInputElement
      textInput.addEventListener("input", () => {
        const stateObj = ask.state as unknown as { value: string; set: (v: string) => void }
        if (typeof stateObj.set === "function") {
          stateObj.set(textInput.value)
        }
      })
    }

    container.appendChild(control)

    if (ask.hintText) {
      const hint = document.createElement("p")
      hint.id = `${ask.id}-hint`
      hint.textContent = ask.hintText
      container.appendChild(hint)
    }

    const defaultAction = findDefaultAction(screenDef.acts)
    if (defaultAction) {
      const hintId = getEnterHintId(ask.id)
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

  for (const act of screenDef.acts) {
    const button = document.createElement("button")
    button.id = act.id
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
        const reasonId = getReasonId(act.id)
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

  const output = document.createElement("output")
  output.id = "feedback-output"
  output.setAttribute("aria-live", "polite")
  form.appendChild(output)

  main.appendChild(form)

  return main
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
  // Boolean-backed asks render as checkbox
  if (typeof ask.state.value === "boolean") {
    const input = document.createElement("input")
    input.type = "checkbox"
    return input
  }

  // Choice asks render as select
  if (ask.kind === "choice") {
    return document.createElement("select")
  }

  // Text / contact / secret → text-like inputs
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
