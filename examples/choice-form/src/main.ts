import { renderDom } from "@intent-framework/dom"
import { inspectScreen } from "@intent-framework/core"
import { RegistrationForm } from "./RegistrationForm.js"

const root = document.getElementById("root")!
renderDom(RegistrationForm, { target: root, showScreenName: true })

const inspect = document.getElementById("inspect")!
const graph = inspectScreen(RegistrationForm)
inspect.textContent = JSON.stringify(graph, null, 2)
