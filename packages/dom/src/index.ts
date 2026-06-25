import type { ScreenDefinition, ActNode, DefaultScreenServices } from "@intent/core"
import { createScreenRuntime } from "@intent/core"

function getReasonId(actId: string): string {
  return `${actId}-reason`
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
}

export { renderRouter } from "./dom-router.js"
export type { RouterDomHandle, RenderRouterOptions } from "./dom-router.js"

export function renderDom<TServices extends object = DefaultScreenServices>(
  screenDef: ScreenDefinition<TServices>,
  options: DomRendererOptions<TServices>
): () => void {
  const { target, services } = options
  target.innerHTML = ""
  const root = buildDom(screenDef)
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

  // Enter key in an ask input triggers the default action
  for (const ask of screenDef.asks) {
    const input = form.querySelector(`#${ask.id}`) as HTMLElement | null
    if (input) {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter") return
        if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return
        if (input.tagName === "TEXTAREA") return

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

function buildDom<TServices extends object = DefaultScreenServices>(screenDef: ScreenDefinition<TServices>): HTMLElement {
  const surface = screenDef.surfaces[0]
  const main = document.createElement("main")

  if (surface) {
    main.id = surface.id
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
    container.appendChild(label)

    const input = createInputForAsk(ask)
    input.id = ask.id
    input.name = ask.id

    if (ask.required) {
      input.required = true
    }

    if (ask.kind === "contact" && ask.contactKind) {
      input.setAttribute("autocomplete", ask.contactKind)
    }

    input.addEventListener("input", () => {
      const stateObj = ask.state as unknown as { value: string; set: (v: string) => void }
      if (typeof stateObj.set === "function") {
        stateObj.set(input.value)
      }
    })

    container.appendChild(input)

    if (ask.hintText) {
      const hint = document.createElement("p")
      hint.id = `${ask.id}-hint`
      hint.textContent = ask.hintText
      container.appendChild(hint)
    }

    form.appendChild(container)
  }

  for (const act of screenDef.acts) {
    const button = document.createElement("button")
    button.id = act.id
    button.type = "button"
    button.textContent = act.label

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

function createInputForAsk(ask: { kind: string; contactKind?: string }): HTMLInputElement {
  const input = document.createElement("input")

  if (ask.kind === "contact" && ask.contactKind === "email") {
    input.type = "email"
  } else if (ask.kind === "secret") {
    input.type = "password"
  } else if (ask.kind === "choice") {
    input.type = "text"
    input.setAttribute("role", "combobox")
  } else {
    input.type = "text"
  }

  return input
}
