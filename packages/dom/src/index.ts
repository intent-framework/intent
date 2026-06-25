import type { ScreenDefinition } from "@intent/core"

export type DomRendererOptions = {
  target: HTMLElement
}

export function renderDom(screenDef: ScreenDefinition, options: DomRendererOptions): void {
  const { target } = options
  target.innerHTML = ""
  const root = buildDom(screenDef)
  target.appendChild(root)

  const form = target.querySelector("form")
  if (form) {
    form.addEventListener("submit", (e: Event) => {
      e.preventDefault()
      const primaryAct = screenDef.acts.find(a => a.primary)
      if (primaryAct?.enabled) {
        primaryAct.execute()
      }
    })
  }
}

function buildDom(screenDef: ScreenDefinition): HTMLElement {
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
      const stateObj = ask.state as { value: string; set: (v: string) => void }
      if (typeof stateObj.set === "function") {
        stateObj.set(input.value)
      }
      updateActionButtons(screenDef, form)
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
    button.type = "submit"
    button.textContent = act.label

    if (act.primary) {
      button.className = "primary"
    }

    if (!act.enabled) {
      button.disabled = true
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

function updateActionButtons(screenDef: ScreenDefinition, form: HTMLElement): void {
  for (const act of screenDef.acts) {
    const button = form.querySelector(`#${act.id}`) as HTMLButtonElement | null
    if (button) {
      button.disabled = !act.enabled
    }
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
