import { renderDom } from "@intent-framework/dom"
import { inspectScreen } from "@intent-framework/core"
import { InviteMember } from "./InviteMember.js"

const root = document.getElementById("root")!
renderDom(InviteMember, { target: root, showScreenName: true })

const inspect = document.getElementById("inspect")!
const graph = inspectScreen(InviteMember)
inspect.textContent = JSON.stringify(graph, null, 2)
