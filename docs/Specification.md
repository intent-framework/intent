# Intent UI Framework

**Version:** 0.1  
**Status:** Concept specification and architecture draft  
**Document type:** Consolidated framework specification

Intent UI is a semantic application framework for building interactive software from product intent rather than component trees, markup, endpoint files, or platform-specific UI structures.

It defines applications in terms of screens, state, questions, actions, resources, flows, surfaces, policies, feedback, operations, events, jobs, subscriptions, and render targets. The framework materializes those definitions into real interfaces and runtime systems for multiple targets, including web DOM, React Native, command surfaces, tests, documentation, server transports, OpenAPI contracts, realtime streams, and observability tooling.

## Table of Contents

1. [Core Thesis](#core-thesis)
2. [One-Sentence Definition](#one-sentence-definition)
3. [Positioning](#positioning)
4. [Foundational Rule](#foundational-rule)
5. [Design Principles](#design-principles)
6. [Core Authoring Concepts](#core-authoring-concepts)
7. [High-Level Architecture](#high-level-architecture)
8. [Example: Basic Screen](#example-basic-screen)
9. [Full Example: Invite Member](#full-example-invite-member)
10. [Semantic Graph](#semantic-graph)
11. [Reactivity Model](#reactivity-model)
12. [Generated MVI Runtime](#generated-mvi-runtime)
13. [Rendering and Materialization](#rendering-and-materialization)
14. [Layout, Positioning, and Responsiveness](#layout-positioning-and-responsiveness)
15. [Adaptive Interaction Model](#adaptive-interaction-model)
16. [Renderer Targets](#renderer-targets)
17. [DOM Renderer](#dom-renderer)
18. [React Native Renderer](#react-native-renderer)
19. [Routing](#routing)
20. [SSR, SSG, Streaming, Hydration, Resume, and Edge](#ssr-ssg-streaming-hydration-resume-and-edge)
21. [Resources and Data Loading](#resources-and-data-loading)
22. [Actions](#actions)
23. [Backend Model](#backend-model)
24. [Server Resources](#server-resources)
25. [Server Actions](#server-actions)
26. [API Routes and Transport](#api-routes-and-transport)
27. [OpenAPI](#openapi)
28. [Realtime: WebSockets, SSE, and Subscriptions](#realtime-websockets-sse-and-subscriptions)
29. [Database Layer](#database-layer)
30. [Schema and Validation](#schema-and-validation)
31. [Events and Jobs](#events-and-jobs)
32. [Files and Uploads](#files-and-uploads)
33. [Authentication and Authorization](#authentication-and-authorization)
34. [Privacy and Security](#privacy-and-security)
35. [Observability](#observability)
36. [DevTools](#devtools)
37. [Testing](#testing)
38. [Accessibility](#accessibility)
39. [Internationalization](#internationalization)
40. [Styling and Design Systems](#styling-and-design-systems)
41. [Escape Hatches](#escape-hatches)
42. [Compiler](#compiler)
43. [Package Structure](#package-structure)
44. [CLI](#cli)
45. [MVP Scope](#mvp-scope)
46. [Roadmap](#roadmap)
47. [Adoption Strategy](#adoption-strategy)
48. [Comparison](#comparison)
49. [Developer Experience Goals](#developer-experience-goals)
50. [Risks](#risks)
51. [Hard Questions](#hard-questions)
52. [Philosophy](#philosophy)
53. [Sharp Positioning](#sharp-positioning)
54. [Final Definition](#final-definition)

---

## Core Thesis

Modern UI frameworks usually ask developers to author visual trees.

React asks developers to write component trees. Solid improves fine-grained reactivity but still usually authors DOM-shaped JSX. Svelte uses a compiler but still begins from markup. React Native uses native primitives, but developers still author platform-specific component trees.

Intent UI starts from a different premise:

> Product intent is the program.

The developer should describe what the user is trying to do, what the system needs to know, what state exists, what actions are available, what rules govern those actions, what feedback should happen, and what flow guides the interaction.

The framework then materializes the interface for the target platform.

- For web, the output is real semantic DOM.
- For React Native, the output is native components.
- For server, the output is resources, actions, transports, jobs, events, streams, and generated API surfaces.
- For tests, the output is semantic interaction scenarios.
- For documentation, the output is structured product behavior.

The web escaped from static HTML into reactive UI, but it never fully escaped markup-first thinking. JSX moved HTML-like syntax into JavaScript, but it did not create a truly host-language-native interaction model.

Intent UI proposes the next leap:

```txt
HTML + JavaScript
        ↓
JSX + Reactivity
        ↓
Intent + State + Actions + Flow
        ↓
Generated semantic UI
```

React made HTML reactive. Intent UI makes product intent executable.

## One-Sentence Definition

Intent UI is a semantic application framework where developers author state, questions, actions, resources, rules, policies, flows, and operations, then renderers and adapters materialize those intentions into accessible interfaces, server transports, tests, documentation, and runtime behavior.

## Positioning

Intent UI is not a React clone. It is not a JSX alternative. It is not a prettier wrapper around HTML. It is not a design system. It is not only a frontend framework.

Intent UI is an application interaction framework.

It treats UI, backend operations, routing, data loading, realtime communication, permissions, validation, feedback, testing, and documentation as parts of one semantic graph.

The key distinction:

```txt
Traditional frontend:
  Component tree → UI

Intent UI:
  Interaction graph → materialized UI
```

Expanded:

```txt
Traditional full stack:
  UI components
  API routes
  fetch calls
  schemas
  validation
  auth checks
  cache invalidation
  loading states
  error states
  tests
  docs

Intent UI:
  Semantic application graph
    → UI materializers
    → server transports
    → resources/actions
    → generated validation
    → generated feedback
    → generated tests
    → generated documentation
```

## Foundational Rule

The framework's central rule:

> UI surfaces are output, not the language.  
> API routes are transport, not the backend model.  
> Product intent is the program.

For web, the DOM is the output, not the language.

For backend, HTTP routes are transport, not the operation model.

For mobile, native components are output, not the source of truth.

This rule is the load-bearing wall. Remove it, and the framework falls back into the wrapper swamp.

## Design Principles

### Intent First

Developers should describe what the user can perceive, provide, choose, and do. The framework should decide how that becomes a concrete interface.

### Semantic Before Visual

A button is not the primitive. An action is the primitive.

An input is not the primitive. A question is the primitive.

A page is not the primitive. A screen with purpose is the primitive.

### Real Platform Output

For the web, Intent UI must output real semantic HTML. It must not replace the browser with a fake universe.

It must preserve:

- SEO
- accessibility
- forms
- links
- keyboard behavior
- browser validation
- focus
- screen reader compatibility
- SSR
- progressive enhancement
- DevTools inspectability

Intent UI hides HTML as an authoring format, not as an output contract.

### Escape Hatches Without Surrender

The framework must allow low-level DOM, React, React Native, and API access when needed. But raw target-specific code should be the escape hatch, not the main path.

```ts
$.custom("stripe-pricing-table", () => {
  return $.dom.customElement("stripe-pricing-table", {
    "pricing-table-id": "...",
    "publishable-key": "..."
  })
})
```

### Generated MVI Runtime

Intent UI is MVI-inspired internally, but developers should not manually write reducers, event unions, view functions, and state transitions for every common interaction.

They author the semantic graph. The framework derives the runtime loop.

```txt
Intent-first authoring
        ↓
Semantic interaction graph
        ↓
Generated MVI runtime
        ↓
Renderer materializes surface
```

### Accessibility by Construction

Accessibility should not be bolted on through scattered attributes. Common accessibility should be automatic. Advanced accessibility should be typed.

```ts
$.ask("Email", email)
  .asContact("email")
  .required()
  .hint("We will send an invitation link to this address.")
```

This should generate labels, input type, autocomplete, required validation, hint association, error association, focus behavior, and screen reader announcements.

### Styling as Policy

Developers should style semantic roles and interaction states, not random markup.

Instead of styling arbitrary generated buttons directly, Intent UI should prefer semantic theme policy:

```ts
theme({
  action: {
    primary: {
      emphasis: "filled",
      shape: "rounded",
      density: "comfortable"
    }
  }
})
```

The renderer turns theme policy into CSS, native styles, or target-specific visual output.

### AI-Native Structure

Modern development increasingly involves AI agents, codegen, refactoring tools, test generators, and design systems. Arbitrary JSX trees are difficult for tools to understand. Intent graphs are easier.

A framework built around semantic interaction can expose structured information:

```json
{
  "screen": "Invite member",
  "asks": ["email", "role"],
  "acts": ["sendInvite"],
  "rules": ["sendInvite requires email.valid and role.valid"],
  "feedback": ["pending", "success", "failure"]
}
```

This makes the app more inspectable by humans and machines.

## Core Authoring Concepts

Intent UI core should remain platformless.

The core primitives are:

- `screen`
- `state`
- `ask`
- `act`
- `flow`
- `surface`
- `resource`
- `policy`
- `operation`
- `event`
- `job`
- `subscription`

The following are not core primitives:

- `div`
- `button`
- `input`
- `form`
- `card`
- `column`
- `row`
- `view`
- `text`
- `pressable`
- route file
- API endpoint file

Those belong to renderers, materializers, adapters, escape hatches, or generated output.

### Screen

A screen is a user-facing interaction space. It is not just a route or component.

A screen has:

- a name
- a purpose
- state
- questions
- actions
- resources
- feedback
- flows
- surfaces
- policies

```ts
export const InviteMemberScreen = screen("Invite member", $ => {
  // interaction graph lives here
})
```

### State

State is the reactive model of the screen.

```ts
const email = $.state.text("email")

const role = $.state.choice("role", {
  initial: "viewer",
  options: ["viewer", "editor", "admin"]
})

const acceptedTerms = $.state.boolean("acceptedTerms")
```

State is not just data. State can carry meaning, privacy, validation, ownership, persistence, and serialization rules.

### Ask

An ask represents information the system needs from the user. It may materialize as an input, select, radio group, date picker, upload zone, voice prompt, wizard step, or command palette parameter.

```ts
const emailQuestion = $.ask("Email address", email)
  .asContact("email")
  .required("Enter an email address.")
  .private()
  .hint("We will send an invitation link to this address.")
```

An ask knows its label, state binding, kind, validation, privacy, hint, error behavior, and accessibility needs.

### Act

An act represents something the user or system can do. It may materialize as a button, submit action, keyboard shortcut, command palette item, menu item, gesture, server endpoint, test operation, or AI-callable operation.

```ts
const sendInvite = $.act("Send invite")
  .primary()
  .when(email.valid, "Enter a valid email first.")
  .does(async () => {
    await inviteMember({ email: email.value })
  })
  .feedback({
    pending: "Sending invitation...",
    success: "Invitation sent.",
    failure: error => error.message
  })
```

An act knows its label, priority, availability, preconditions, side effect, pending state, success state, failure state, analytics meaning, authorization rules, and accessibility behavior.

### Flow

A flow describes intended interaction order. It is not visual layout. It is behavioral sequencing.

```ts
$.flow("invite-member")
  .startsWith(emailQuestion)
  .then(roleQuestion)
  .then(sendInvite)
  .onSuccess(sendInvite, {
    next: emailQuestion,
    announce: "Ready to invite another member."
  })
```

A renderer can use flow to determine focus order, wizard steps, mobile layout, keyboard navigation, onboarding guidance, screen reader order, default actions, generated tests, and semantic analytics.

### Surface

A surface describes where and how the interaction should be presented. It does not manually define every DOM element.

```ts
$.surface("main")
  .title("Invite member")
  .purpose("invite-collaborator")
  .contains(emailQuestion, roleQuestion, sendInvite)
```

A renderer can decide whether this becomes a page, card, modal, mobile sheet, wizard, command flow, or embedded panel.

### Resource

A resource is async state with semantic meaning.

```ts
const team = $.resource("team", {
  load: () => getTeam(teamId.value),
  privacy: "normal"
})
```

Resources integrate with loading states, error states, retries, streaming, SSR, hydration, optimistic actions, dependency tracking, subscription updates, authorization, and privacy metadata.

### Policy

A policy defines permission, privacy, runtime, or safety rules attached to screens, resources, actions, server operations, and flows.

Policies should not be random `if` statements scattered across UI and server files. They should be part of the interaction graph.

### Operation

An operation is a backend capability with semantic meaning. It may be a typed read, mutation, file operation, webhook handler, job, stream, or channel operation.

### Event

An event records something meaningful that happened in the system, such as `team.member.invited` or `billing.subscription.cancelled`. Events can drive observability, jobs, realtime streams, tests, and audit logs.

### Job

A job is an async or scheduled operation that may be triggered by actions, events, cron schedules, or external systems.

### Subscription

A subscription is a semantic realtime stream. It should connect to resources, actions, and flows without forcing developers to manually wire socket messages into arbitrary component state.

## High-Level Architecture

```txt
Developer code
  screen("Invite member", $ => {
    state
    ask
    act
    flow
    surface
    resource
    policy
  })

        ↓

Semantic application graph
  nodes
  dependencies
  rules
  metadata
  policies
  runtime contracts

        ↓

Reactive runtime
  fine-grained state
  derived semantic nodes
  resources
  action lifecycle
  validation
  feedback
  effects

        ↓

Materialization planner
  chooses target-specific patterns
  maps semantic nodes to output primitives

        ↓

Renderers and adapters
  DOM
  React Native
  SSR
  server
  OpenAPI
  WebSocket
  SSE
  tests
  docs
  command palette

        ↓

Real output
  semantic HTML
  native UI
  HTTP endpoints
  generated clients
  streams
  jobs
  tests
  documentation
```

The framework lives or dies by this distinction:

```txt
Core concepts:
  screen
  state
  ask
  act
  flow
  surface
  resource
  policy

Renderer concepts:
  button
  input
  form
  section
  dialog
  card
  grid
  CSS
  DOM
```

Core must stay semantic. Visual primitives can exist, but they must live in renderers, materializers, kits, or escape hatches.

## Example: Basic Screen

```ts
export const SettingsScreen = screen("Settings", $ => {
  const email = $.state.text("email")

  const emailAsk = $.ask("Email address", email)
    .asContact("email")
    .required("Enter an email address.")
    .private()
    .hint("We will send account updates to this address.")

  const save = $.act("Save changes")
    .primary()
    .when(email.valid, "Enter a valid email first.")
    .does(saveProfile)
    .feedback({
      pending: "Saving...",
      success: "Settings saved.",
      failure: error => error.message
    })

  $.flow("settings")
    .startsWith(emailAsk)
    .then(save)

  $.surface("main")
    .title("Settings")
    .purpose("manage-account-settings")
    .contains(emailAsk, save)
})
```

This describes the screen, state, question, validation, privacy semantics, action, precondition, action feedback, flow, and surface purpose. It does not describe DOM, React Native components, CSS, or route files.

## Full Example: Invite Member

### Domain Code

```ts
export type TeamRole = "viewer" | "editor" | "admin"

export type InviteMemberInput = {
  teamId: string
  email: string
  role: TeamRole
}

export type Team = {
  id: string
  name: string
}

export async function getTeam(teamId: string): Promise<Team> {
  const res = await fetch(`/api/teams/${teamId}`)

  if (!res.ok) {
    throw new Error("Could not load team")
  }

  return res.json()
}

export async function inviteMember(input: InviteMemberInput): Promise<void> {
  const res = await fetch(`/api/teams/${input.teamId}/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not send invitation")
  }
}
```

### Screen Code

```ts
import { screen } from "intent-ui"
import { getTeam, inviteMember, type TeamRole } from "../domain/team"

export const InviteMemberScreen = screen("Invite member", $ => {
  const teamId = $.route.param("teamId")

  const team = $.resource("team", {
    load: () => getTeam(teamId.value)
  })

  const email = $.state.text("email", {
    initial: ""
  })

  const role = $.state.choice<TeamRole>("role", {
    initial: "viewer",
    options: [
      {
        value: "viewer",
        label: "Viewer",
        description: "Can read project content."
      },
      {
        value: "editor",
        label: "Editor",
        description: "Can create and update content."
      },
      {
        value: "admin",
        label: "Admin",
        description: "Can manage members and settings.",
        danger: "Use carefully."
      }
    ]
  })

  const emailQuestion = $.ask("Email address", email)
    .asContact("email")
    .required("Enter an email address.")
    .validate(value => {
      if (!value.includes("@")) {
        return "Email must contain @."
      }

      return true
    })
    .private()
    .hint("We will send an invitation link to this address.")

  const roleQuestion = $.ask("Role", role)
    .asChoice()
    .required("Choose a role.")
    .hint("You can change this later.")

  const sendInvite = $.act("Send invite")
    .primary()
    .when(team.ready, "Team must load first.")
    .when(email.valid, "Enter a valid email first.")
    .when(role.valid, "Choose a role first.")
    .does(async () => {
      await inviteMember({
        teamId: teamId.value,
        email: email.value,
        role: role.value
      })
    })
    .feedback({
      pending: "Sending invitation...",
      success: "Invitation sent.",
      failure: error => error.message
    })
    .afterSuccess(() => {
      email.clear()
      role.set("viewer")
    })

  $.flow("invite-member")
    .startsWith(emailQuestion)
    .then(roleQuestion)
    .then(sendInvite)
    .onSuccess(sendInvite, {
      next: emailQuestion,
      announce: "Ready to invite another member."
    })

  $.surface("main")
    .title(() => {
      if (team.ready) {
        return `Invite member to ${team.value.name}`
      }

      return "Invite member"
    })
    .purpose("invite-collaborator")
    .contains(emailQuestion, roleQuestion, sendInvite)
})
```

### App Setup

```ts
import { createApp } from "intent-ui"
import { domRenderer } from "intent-ui/dom"
import { InviteMemberScreen } from "./screens/invite-member.screen"

export const app = createApp({
  name: "Team Console"
})
  .route("/teams/:teamId/invite", InviteMemberScreen)
  .renderWith(
    domRenderer({
      target: "semantic-dom",
      accessibility: {
        generateLabels: true,
        announceFeedback: true,
        manageFocus: true,
        preferNativeElements: true
      },
      forms: {
        useNativeValidation: true,
        supportNoScriptSubmit: true
      },
      hydration: {
        mode: "islands",
        hydrateOnlyInteractiveIntents: true
      },
      styling: {
        strategy: "compiled-css",
        theme: {
          density: "comfortable",
          radius: "medium",
          colorScheme: "system"
        }
      }
    })
  )
```

### Browser Entry

```ts
import { app } from "./app"

app.mount(document.getElementById("root")!)
```

### Server Entry

```ts
import { createServer } from "intent-ui/server"
import { app } from "./app"

const server = createServer(app, {
  render: "ssr",
  stream: true
})

server.listen(3000)
```

## Semantic Graph

The authoring API produces a graph. The graph is the framework's source of truth.

The graph contains:

- screens
- states
- resources
- asks
- acts
- rules
- validations
- flows
- surfaces
- feedback
- policies
- privacy metadata
- analytics metadata
- accessibility requirements
- operations
- events
- jobs
- subscriptions
- render target requirements

Example shape:

```ts
type IntentGraph = {
  screens: ScreenNode[]
  states: StateNode[]
  asks: AskNode[]
  acts: ActNode[]
  flows: FlowNode[]
  surfaces: SurfaceNode[]
  resources: ResourceNode[]
  policies: PolicyNode[]
  operations: OperationNode[]
  events: EventNode[]
  jobs: JobNode[]
  subscriptions: SubscriptionNode[]
}
```

The graph is what enables semantic reactivity, generated runtime behavior, target-specific materialization, DevTools, testing, documentation, privacy redaction, accessibility warnings, OpenAPI generation, and AI inspection.

## Reactivity Model

Intent UI should not use component rerendering as its main reactive unit.

Traditional component-based reactivity:

```txt
state changes
  ↓
component reruns
  ↓
virtual tree changes
  ↓
diff
  ↓
DOM/native patch
```

Intent UI reactivity:

```txt
semantic state changes
  ↓
dependent semantic nodes update
  ↓
materialized target nodes update
```

The reactive unit is a semantic node, not a component.

Semantic nodes may include:

- `StateNode`
- `AskNode`
- `ValidationNode`
- `ActNode`
- `ResourceNode`
- `FlowNode`
- `FeedbackNode`
- `SurfaceNode`
- `PolicyNode`
- `MaterializedNode`

Example:

```ts
const email = $.state.text("email")

const emailAsk = $.ask("Email address", email)
  .asContact("email")
  .required()
  .validate(value => {
    if (!value.includes("@")) {
      return "Email must contain @."
    }

    return true
  })

const save = $.act("Save")
  .when(email.valid)
  .does(saveProfile)
```

Internal dependency graph:

```txt
email.value
   ↓
required validation
   ↓
custom validation
   ↓
email.valid
   ↓
save.enabled
   ↓
materialized action state
```

When the user changes the email value, the framework recomputes only the affected semantic nodes. It does not rerender the entire screen.

The runtime can use Solid-like fine-grained signals internally. Possible primitive shape:

```ts
type Signal<T> = {
  get(): T
  set(value: T): void
  subscribe(listener: () => void): () => void
}

type Computed<T> = {
  get(): T
  dependencies: ReactiveNode[]
}

type ReactiveNode =
  | StateNode
  | ComputedNode
  | ResourceNode
  | ActionNode
  | ValidationNode
  | FeedbackNode
```

These primitives are infrastructure. Developers should not have to think in low-level signals most of the time. They think in state, ask, act, flow, and resource.

React knows that a component rerendered. Intent UI should know that an email is invalid, an action is blocked, feedback is visible, a resource is pending, a flow cannot advance, or a private field changed.

That semantic awareness enables better DevTools, accessibility, testing, analytics, privacy, AI inspection, and generated UI.

The special power is not merely faster rendering. The special power is that the runtime knows what changed in product terms.

## Generated MVI Runtime

Intent UI is MVI-inspired internally, but developers should not manually author MVI boilerplate.

Traditional MVI:

```txt
Model
View
Intent
Reducer
```

Intent UI:

```txt
Developer authors:
  state
  ask
  act
  flow
  rules
  feedback
  policy

Framework generates:
  model
  user intent events
  update transitions
  materialized view
```

Example generated event types:

```ts
type GeneratedIntent =
  | { type: "answer.changed"; askId: string; value: unknown }
  | { type: "act.requested"; actId: string }
  | { type: "act.succeeded"; actId: string }
  | { type: "act.failed"; actId: string; error: Error }
  | { type: "resource.loaded"; resourceId: string; value: unknown }
  | { type: "resource.failed"; resourceId: string; error: Error }
```

The framework owns common transitions:

```txt
answer.changed
  → update state
  → validate ask
  → update dependent action availability
  → update feedback
  → update materialized target nodes
```

The developer writes the interaction contract. The framework derives the runtime loop.

## Rendering and Materialization

Intent UI does not render components directly. It materializes semantic graphs.

Rendering pipeline:

```txt
Semantic graph
   ↓
presentation plan
   ↓
layout plan
   ↓
materializer selection
   ↓
target output
```

For the web, a semantic ask may materialize as an HTML input. For React Native, it may materialize as a `TextInput`. For a command palette, it may materialize as a parameter prompt. For a test renderer, it may materialize as a semantic test handle.

Example semantic node:

```ts
$.ask("Email address", email)
  .asContact("email")
  .required()
  .private()
```

DOM materialization may produce:

```html
<label for="email">Email address</label>

<input
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  required
/>
```

React Native materialization may produce:

```tsx
<Text>Email address</Text>

<TextInput
  keyboardType="email-address"
  textContentType="emailAddress"
  autoCapitalize="none"
/>
```

The authoring code remains unchanged.

### Presentation Plan

A renderer creates a presentation plan before target-specific output.

```ts
{
  surface: "main",
  title: "Invite member",
  pattern: "form-flow",
  groups: [
    {
      kind: "question-group",
      items: ["email", "role"]
    },
    {
      kind: "action-group",
      items: ["sendInvite"]
    }
  ]
}
```

The presentation plan is still not DOM. It is a target-neutral interface plan.

### Materializer Selection

A DOM renderer maps semantic patterns to actual DOM.

```txt
ask.contact.email   → EmailFieldMaterializer
ask.choice.role     → RadioGroupMaterializer or SelectMaterializer
act.primary.submit  → ButtonMaterializer
surface.main        → MainRegionMaterializer
feedback.live       → LiveOutputMaterializer
```

The browser receives honest semantic DOM. The developer did not write HTML.

## Layout, Positioning, and Responsiveness

Intent UI should rethink responsiveness and layout as semantic adaptation, not manual breakpoint management.

Traditional responsive design:

```txt
same tree + CSS breakpoints
```

Intent UI:

```txt
same intent graph + target/capability-specific materialization
```

Layout should be declared through grouping, priority, flow order, surface purpose, target capabilities, interaction density, modality, and placement policy.

```ts
$.layout("invite-member", $ => {
  $.group(emailAsk, roleAsk)
    .as("invite-details")
    .priority(1)

  $.group(sendInvite, cancel)
    .as("actions")
    .priority(2)
    .sticky("bottom", { on: "compact" })

  $.region("main")
    .maxWidth("comfortable")
    .density("comfortable")
})
```

This does not author HTML or CSS directly. It gives the renderer semantic layout intent.

The DOM renderer may compile this to semantic HTML, CSS Grid, Flexbox, container queries, CSS variables, media queries, CSS layers, logical properties, and view transitions.

The React Native renderer may compile this to `SafeAreaView`, `ScrollView`, keyboard-aware containers, footer actions, and platform-specific input flows.

### Positioning Model

Positioning should be driven by:

- semantic role
- flow order
- priority
- grouping
- surface purpose
- screen size
- input modality
- theme
- kit
- renderer target

Example:

```ts
$.act("Send invite")
  .primary()
  .placement({
    desktop: "after-flow",
    mobile: "sticky-bottom"
  })
```

Desktop output may be a normal form submit button. Mobile output may be a sticky footer action. The authoring model stays semantic.

### Use the Web Platform Underneath

Intent UI should not invent a new layout engine. The DOM renderer should compile layout policy into normal web technology:

- CSS Grid
- Flexbox
- container queries
- media queries
- CSS variables
- CSS layers
- logical properties
- view transitions

Intent UI hides CSS as the default authoring language, but it must not fight CSS as the output technology.

### Materialization Kits

To avoid generic-looking UI, Intent UI should support kits.

A kit is a set of materialization rules for a visual or product style.

Examples:

- admin dashboard
- mobile web
- commerce
- docs
- marketing
- dense enterprise

Usage:

```ts
domRenderer({
  kit: "admin"
})
```

The same semantic screen can materialize differently depending on the kit:

```txt
admin kit       → form card with inline validation
mobile-web kit  → full-screen flow with sticky action
command kit     → command with parameters
commerce kit    → checkout-style step
```

This keeps the core semantic while allowing strong visual identity.

## Adaptive Interaction Model

Intent UI should treat responsiveness as interaction adaptation.

Capability inputs:

- screen size
- target platform
- touch availability
- mouse availability
- keyboard availability
- orientation
- network quality
- motion preferences
- accessibility settings
- language direction
- safe area
- device class

Same intent:

```ts
$.act("Delete project")
  .danger()
  .confirm("This cannot be undone.")
  .does(deleteProject)
```

Possible materializations:

```txt
Desktop web:
  danger button + confirmation dialog

Mobile web:
  danger row + bottom sheet confirmation

React Native iOS:
  native action sheet or alert

React Native Android:
  platform alert/dialog

Command palette:
  command item + typed confirmation

Screen reader optimized:
  explicit confirmation flow with announcements
```

Same intent. Different surface. This is more powerful than layout breakpoints. It is semantic adaptation.

## Renderer Targets

Intent UI should support multiple renderer targets.

Initial target:

- DOM renderer

First-class future target:

- React Native renderer

Additional renderer targets:

- SSR renderer
- command palette renderer
- semantic test renderer
- documentation renderer
- email renderer
- terminal/admin renderer
- AI inspection renderer

The core must not depend on any target. Each renderer receives the semantic graph and materializes it according to target capabilities.

## DOM Renderer

The DOM renderer is the first and most important renderer. It must prove that Intent UI is not a fake web platform.

The DOM renderer must produce real, inspectable, semantic web output.

It must support:

- semantic HTML
- native forms
- labels
- inputs
- buttons
- links
- focus
- keyboard behavior
- accessibility tree
- SSR
- streaming
- hydration
- progressive enhancement
- CSS output
- custom elements
- browser DevTools inspection

Example mapping:

```txt
surface("main")    → <main>
ask.contact.email  → <label> + <input type="email">
ask.choice         → <fieldset>, <select>, or radio group
act.primary        → <button>
feedback.live      → <output aria-live="polite">
flow               → focus order and form structure
```

The DOM is the output contract. It is not the source language.

### Native Element Mapping

Intent UI should prefer native elements wherever possible.

```txt
act("Save")          → <button type="submit">
ask(...).asContact() → <input type="email">
ask(...).asChoice()  → <fieldset> or <select>
surface("main")      → <main>
flow(...)            → focus order and form structure
feedback(...)        → <output aria-live="polite">
```

### Progressive Enhancement

A generated form should be usable before JavaScript loads.

JavaScript enhances instant validation, optimistic updates, async feedback, partial hydration, client-side routing, and richer transitions. But the baseline interface should still be meaningful HTML.

### Example Generated DOM

The developer authors this:

```ts
ask("Email address", email)
  .asContact("email")
  .required()
  .private()

act("Send invite")
  .when(email.valid)
  .does(inviteMember)
```

The DOM renderer may generate this:

```html
<form method="post" action="/intent/team.invite">
  <section aria-describedby="email-hint">
    <label for="email">Email address</label>
    <input
      id="email"
      name="email"
      type="email"
      autocomplete="email"
      required
    />
    <p id="email-hint">
      We will send an invitation link to this address.
    </p>
  </section>

  <button type="submit" disabled>
    Send invite
  </button>

  <output aria-live="polite"></output>
</form>
```

Intent UI must preserve semantic output. The generated interface should be inspectable, accessible, and progressively enhanced.

## React Native Renderer

React Native should be supported as a first-class renderer, not as a wrapper layer.

The React Native renderer maps semantic concepts to native primitives.

Example mapping:

```txt
surface.main       → SafeAreaView / Screen container
ask.contact.email  → TextInput with email keyboard
ask.secret         → TextInput with secureTextEntry
ask.choice         → Picker, segmented control, radio list, action sheet
act.primary        → Pressable / Button
feedback.success   → inline message, toast, announcement
flow               → focus order, keyboard next behavior, wizard steps
```

The same screen can target web and native.

Shared:

- state
- validation
- actions
- permissions
- resources
- feedback
- flow
- analytics
- privacy

Platform-specific:

- visual primitives
- navigation conventions
- keyboard behavior
- focus behavior
- accessibility APIs
- safe areas
- gestures
- native feedback

This avoids “write once, ugly everywhere.”

The goal is:

> Author once at the intent level.  
> Materialize properly per platform.

## Routing

Intent UI should include a built-in router.

Routing is not just URL matching. Routing is part of interaction meaning. Routes should point to screens, not components.

```ts
const app = createApp()
  .route("home", "/", HomeScreen)
  .route("team.invite", "/teams/:teamId/invite", InviteMemberScreen)
  .route("settings", "/settings", SettingsScreen)
```

Inside a screen:

```ts
const teamId = $.route.param("teamId")
const tab = $.route.query("tab")
```

Navigation should be semantic:

```ts
$.act("View team")
  .does(() => {
    $.navigate("team.details", {
      teamId: teamId.value
    })
  })
```

Router features:

- typed routes
- route params
- search params
- hash
- nested routes
- layouts
- redirects
- not found screens
- error screens
- pending navigation state
- scroll restoration
- route resources
- prefetching
- navigation guards
- view transitions
- server routing
- client routing

Because Intent UI has flows, the router should also support journey-aware routing.

```ts
$.flow("checkout")
  .screen(ContactScreen)
  .then(ShippingScreen)
  .then(PaymentScreen)
  .then(ReviewScreen)
```

This allows route guards, progress indicators, resume behavior, generated tests, back button policy, mobile wizard materialization, and semantic analytics.

React routers understand URLs. Intent UI's router should understand journeys.

## SSR, SSG, Streaming, Hydration, Resume, and Edge

Intent UI should support modern rendering modes from the beginning. These features should be built around the semantic graph, not bolted onto components.

### SSR

Server-side rendering flow:

```txt
request
  ↓
match route
  ↓
create screen graph
  ↓
load resources
  ↓
materialize semantic DOM
  ↓
send HTML
```

Example:

```ts
const server = createServer(app, {
  render: "ssr"
})
```

### Streaming SSR

Resources can be marked streamable:

```ts
const team = $.resource("team", {
  load: () => getTeam(teamId.value),
  stream: true
})
```

The server can send the shell first and then stream resolved regions when resources complete. Because the framework knows which semantic nodes depend on which resources, it can stream meaningful boundaries.

### SSG

Static screens can be prerendered:

```ts
app.route("docs.start", "/docs/getting-started", DocsScreen, {
  prerender: true
})
```

### ISR-Like Regeneration

Prerendered screens can be regenerated:

```ts
app.route("blog.post", "/blog/:slug", BlogPostScreen, {
  prerender: true,
  revalidate: "10m"
})
```

### Hydration

Hydration should be semantic and selective. The framework should not hydrate the entire page by default.

Example hydration map:

```txt
static title: no hydration
email ask: hydrate
role ask: hydrate
send action: hydrate
feedback output: hydrate
static hint: no hydration
```

Config:

```ts
domRenderer({
  hydration: {
    mode: "semantic-islands",
    hydrateOnlyInteractiveIntents: true
  }
})
```

### Semantic Resume

Full resumability can be explored later. Intent UI may support a lighter form:

```txt
serialize semantic graph state
serialize resource state
serialize action bindings
resume runtime on first interaction
```

This could provide some benefits of resumability without committing to Qwik-style architecture immediately.

### Edge Rendering

Server adapters should support:

- Node
- Bun
- Deno
- Cloudflare Workers
- Vercel Edge
- Netlify Edge

Runtime requirements should be explicit:

```ts
$.resource("geo", {
  runtime: "edge",
  load: request => getGeo(request)
})
```

The compiler should warn when edge-bound code imports incompatible APIs.

## Resources and Data Loading

Resources are semantic async state.

```ts
const team = $.resource("team", {
  key: () => ["team", teamId.value],
  load: () => getTeam(teamId.value),
  staleTime: "5m",
  stream: true
})
```

A resource should support:

- keying
- loading state
- success state
- error state
- retry
- stale time
- cache time
- invalidation
- dependency tracking
- SSR
- streaming
- hydration
- optimistic updates
- subscription updates
- authorization policy
- privacy metadata

Resources should be usable from screens, backend operations, and generated API clients.

If Intent UI does not solve data loading and invalidation, users will immediately reach for external tools and the framework's semantic spell will fracture.

## Actions

Actions represent things the user or system can do.

```ts
const sendInvite = $.act("Send invite")
  .primary()
  .when(email.valid, "Enter a valid email first.")
  .does(async () => {
    await inviteMember({
      teamId: teamId.value,
      email: email.value,
      role: role.value
    })
  })
  .feedback({
    pending: "Sending invitation...",
    success: "Invitation sent.",
    failure: error => error.message
  })
  .invalidates(() => [
    ["team", teamId.value, "members"]
  ])
```

Actions should support:

- availability rules
- permission rules
- confirmation
- pending state
- success state
- failure state
- optimistic updates
- resource invalidation
- analytics
- privacy metadata
- server execution
- retry policy
- idempotency
- rate limits
- audit logs

An action may materialize as:

- web button
- native pressable
- menu item
- keyboard shortcut
- command palette item
- server endpoint
- test operation
- AI-callable operation

## Backend Model

Intent UI should rethink backend architecture around operations, resources, policies, events, jobs, streams, and transports.

API routes should exist, but they should not be the primary authoring model.

Backend source of truth:

- resource
- action
- policy
- event
- job
- subscription
- webhook
- file operation

HTTP routes are generated transport. Manual API routes are escape hatches.

The framework should separate operation meaning from transport shape.

## Server Resources

Server resources represent typed reads.

```ts
export const teamMembers = server.resource("team.members", {
  input: schema({
    teamId: string()
  }),

  key: input => ["team", input.teamId, "members"],

  requires: "team.member.read",

  load: async ({ input, db }) => {
    return db.member.findMany({
      where: {
        teamId: input.teamId
      }
    })
  }
})
```

Usage inside a screen:

```ts
const members = $.resource("members", {
  load: () => teamMembers({
    teamId: teamId.value
  })
})
```

## Server Actions

Server actions represent typed mutations.

```ts
export const inviteMember = server.action("team.member.invite", {
  input: schema({
    teamId: string(),
    email: email(),
    role: enumOf("viewer", "editor", "admin")
  }),

  requires: "team.member.invite",

  run: async ({ input, user, db }) => {
    await db.invite.create({
      data: {
        teamId: input.teamId,
        email: input.email,
        role: input.role,
        invitedBy: user.id
      }
    })
  },

  invalidates: input => [
    ["team", input.teamId, "members"]
  ],

  emits: input => [
    {
      type: "team.member.invited",
      payload: {
        teamId: input.teamId,
        email: input.email,
        role: input.role
      }
    }
  ]
})
```

The framework generates:

- client call
- server transport
- input validation
- permission check
- execution wrapper
- error normalization
- cache invalidation
- event emission
- optional OpenAPI operation
- semantic tests

## API Routes and Transport

Internal app behavior should prefer server resources and server actions.

Manual API routes are still necessary for:

- public APIs
- third-party integrations
- OAuth callbacks
- webhooks
- legacy endpoints
- health checks
- file upload callbacks
- custom protocol endpoints

Escape hatch:

```ts
app.api.route("POST", "/api/stripe/webhook", async request => {
  return handleStripeWebhook(request)
})
```

Generated transport may include:

- HTTP POST for actions
- HTTP GET for resources
- RPC-style internal calls
- OpenAPI endpoints
- server action bridge
- SSE streams
- WebSocket messages
- webhook handlers

API routes are transport. They are not the backend model.

## OpenAPI

Intent UI should support OpenAPI generation for resources and actions.

A server action:

```ts
server.action("team.member.invite", {
  input: schema({
    teamId: string(),
    email: email(),
    role: enumOf("viewer", "editor", "admin")
  }),

  output: schema({
    ok: boolean()
  }),

  run: async (...) => {
    // ...
  }
})
```

Can generate an OpenAPI operation.

Potential generated route:

```txt
POST /api/actions/team.member.invite
```

Potential OpenAPI metadata:

```ts
server.action("team.member.invite", {
  summary: "Invite a team member",
  description: "Creates an invitation for a user to join a team.",
  tags: ["Teams"],
  public: false,
  // ...
})
```

OpenAPI support should include:

- input schemas
- output schemas
- error schemas
- auth requirements
- tags
- summary
- description
- deprecation metadata
- rate-limit metadata
- generated clients
- mock servers
- documentation
- contract tests

Public APIs may require explicit route shape:

```ts
server.publicRoute("POST", "/v1/teams/{teamId}/invites")
  .fromAction(inviteMember)
  .openapi({
    tags: ["Teams"],
    summary: "Invite team member"
  })
```

This allows internal semantic actions and external API contracts to coexist.

## Realtime: WebSockets, SSE, and Subscriptions

Intent UI should support realtime as semantic subscriptions, not raw socket handling by default.

### Subscription Primitive

```ts
export const teamMemberEvents = server.subscription("team.members.events", {
  input: schema({
    teamId: string()
  }),

  requires: "team.member.read",

  stream: async function* ({ input, events }) {
    for await (const event of events.subscribe("team.member.*")) {
      if (event.payload.teamId === input.teamId) {
        yield event
      }
    }
  }
})
```

Usage:

```ts
const memberEvents = $.subscription("memberEvents", {
  connect: () => teamMemberEvents({
    teamId: teamId.value
  }),

  onEvent: event => {
    members.invalidate()
  }
})
```

### Transport Selection

The framework may materialize subscriptions through:

- SSE
- WebSocket
- WebTransport
- long polling
- platform-native subscription adapter

Selection can be automatic or explicit:

```ts
$.subscription("memberEvents", {
  connect: () => teamMemberEvents({ teamId: teamId.value }),
  transport: "sse"
})
```

### SSE

SSE is suitable for:

- server-to-client event streams
- notifications
- resource updates
- progress updates
- logs
- AI streaming
- build progress

Example:

```ts
server.stream("project.build.progress", {
  input: schema({
    projectId: string()
  }),

  transport: "sse",

  stream: async function* ({ input }) {
    yield { status: "queued" }
    yield { status: "building" }
    yield { status: "done" }
  }
})
```

### WebSockets

WebSockets are suitable for:

- bidirectional collaboration
- presence
- live editing
- multiplayer interactions
- chat
- low-latency state sync

Example:

```ts
server.channel("project.presence", {
  input: schema({
    projectId: string()
  }),

  requires: "project.read",

  onConnect: async ({ input, user, channel }) => {
    channel.broadcast("user.joined", {
      userId: user.id
    })
  },

  onMessage: {
    "cursor.moved": async ({ message, channel, user }) => {
      channel.broadcast("cursor.moved", {
        userId: user.id,
        position: message.position
      })
    }
  }
})
```

### UI Integration

Realtime should connect to resources and actions.

```ts
const members = $.resource("members", {
  load: () => teamMembers({ teamId: teamId.value })
})

$.subscription("member-events", {
  connect: () => teamMemberEvents({ teamId: teamId.value }),
  onEvent: () => members.invalidate()
})
```

The developer should not manually wire socket messages into random component state unless needed.

## Database Layer

Intent UI should not require a specific database. It should define database integration points through adapters.

Supported patterns:

- ORM adapters
- query builder adapters
- raw SQL adapters
- document database adapters
- edge database adapters
- transaction adapters
- migration integration
- schema introspection
- generated admin resources

Example context:

```ts
const server = createServer(app, {
  context: async request => ({
    db: createDbClient(request),
    user: await getUser(request)
  })
})
```

Server action:

```ts
server.action("team.member.invite", {
  input: InviteInput,

  run: async ({ input, db, user }) => {
    return db.transaction(async tx => {
      const invite = await tx.invite.create(...)
      await tx.auditLog.create(...)
      return invite
    })
  }
})
```

### Data Modeling

Intent UI should not replace database schema tools in the MVP. It should integrate with them.

Possible integrations:

- Prisma
- Drizzle
- Kysely
- SQL
- Postgres
- SQLite
- MySQL
- MongoDB
- Supabase
- Neon
- Turso
- PlanetScale

The framework's primary responsibility is not to own the database. Its responsibility is to connect database operations to semantic resources, actions, policies, invalidation, events, and tests.

### Transactions

Actions should support transactions:

```ts
server.action("billing.subscription.cancel", {
  input: CancelInput,

  transaction: true,

  run: async ({ input, tx }) => {
    await tx.subscription.update(...)
    await tx.event.create(...)
  }
})
```

### Authorization Near Data

Policies should be close to operations.

```ts
server.policy("team.member.invite", async ({ user, input, db }) => {
  return db.permission.exists({
    userId: user.id,
    teamId: input.teamId,
    permission: "team.member.invite"
  })
})
```

The framework should prevent actions from running without required policy checks unless explicitly marked public.

## Schema and Validation

Schemas should be shared across:

- client validation
- server validation
- OpenAPI generation
- forms
- resource input
- action input
- database boundaries
- tests
- mock data
- documentation

Example:

```ts
const InviteInput = schema({
  teamId: string(),
  email: email(),
  role: enumOf("viewer", "editor", "admin")
})
```

Used in server action:

```ts
server.action("team.member.invite", {
  input: InviteInput,
  run: async (...) => {
    // ...
  }
})
```

Used in UI:

```ts
const email = $.state.text("email")

$.ask("Email address", email)
  .fromSchema(InviteInput.shape.email)
```

The framework should avoid duplicated validation.

## Events and Jobs

Actions may emit events. Events may trigger jobs.

Example event:

```ts
server.event("team.member.invited", {
  payload: schema({
    teamId: string(),
    email: email(),
    role: string()
  })
})
```

Job:

```ts
server.job("send-invite-email", {
  input: schema({
    teamId: string(),
    email: email()
  }),

  run: async ({ input, mailer }) => {
    await mailer.sendInvite(input)
  }
})
```

Event handler:

```ts
server.on("team.member.invited", async event => {
  await server.jobs.enqueue("send-invite-email", {
    teamId: event.payload.teamId,
    email: event.payload.email
  })
})
```

Supported job backends:

- in-memory development queue
- database-backed queue
- Redis-backed queue
- cloud queue adapter
- worker runtime
- cron scheduler

## Files and Uploads

File operations should be semantic.

```ts
const avatar = $.state.file("avatar")

$.ask("Profile photo", avatar)
  .asImageUpload()
  .accept(["image/png", "image/jpeg"])
  .maxSize("5MB")
  .private()
```

Server file operation:

```ts
server.file("profile.avatar.upload", {
  input: schema({
    userId: string()
  }),

  accept: ["image/png", "image/jpeg"],
  maxSize: "5MB",

  requires: "profile.update",

  store: async ({ file, input, storage }) => {
    return storage.put(`avatars/${input.userId}`, file)
  }
})
```

Potential transports:

- multipart upload
- signed URL upload
- direct-to-storage upload
- resumable upload
- chunked upload
- native file picker

## Authentication and Authorization

Authentication should be provided through server context.

```ts
const server = createServer(app, {
  context: async request => ({
    user: await authenticate(request),
    db
  })
})
```

Authorization should be policy-based.

```ts
server.policy("project.delete", async ({ user, input, db }) => {
  return db.projectRole.has({
    userId: user.id,
    projectId: input.projectId,
    role: "owner"
  })
})
```

UI action:

```ts
$.act("Delete project")
  .danger()
  .requires("project.delete", {
    fallback: "disabled",
    reason: "Only project owners can delete this project."
  })
  .confirm("This cannot be undone.")
  .does(deleteProject)
```

The same policy can affect:

- UI visibility
- UI disabled state
- server execution
- OpenAPI auth metadata
- tests
- audit logs
- documentation

## Privacy and Security

Privacy should be graph-level metadata.

```ts
$.ask("Email address", email)
  .private()

$.ask("Password", password)
  .asSecret()
  .private()
```

Privacy metadata should affect:

- analytics
- logs
- session replay
- error reports
- AI inspection
- DevTools
- server serialization
- test snapshots
- debug exports
- OpenAPI examples

Private values should be redacted automatically unless explicitly allowed.

### Permissions

Actions should support permission rules.

```ts
$.act("Delete project")
  .danger()
  .requires("project.delete", {
    fallback: "disabled",
    reason: "Only admins can delete projects."
  })
  .does(deleteProject)
```

This allows the renderer to decide whether to hide the action, disable the action, show a reason, show request-access UI, or show upgrade UI.

Permissions become part of the interaction model, not scattered conditional rendering.

## Observability

Intent UI should provide semantic observability.

Generated telemetry should be structured around:

- screen opened
- ask answered
- validation failed
- act requested
- act blocked
- act succeeded
- act failed
- resource loaded
- resource failed
- flow advanced
- policy denied
- subscription connected
- job started
- job failed

Example event:

```json
{
  "type": "act.failed",
  "screen": "Invite member",
  "act": "Send invite",
  "reason": "permission.denied",
  "durationMs": 183
}
```

Observability integrations:

- OpenTelemetry
- console development logger
- cloud logging adapters
- analytics adapters
- audit log adapters
- performance traces
- error reporting

## DevTools

Intent UI requires first-class DevTools. Without DevTools, semantic abstraction becomes spooky.

DevTools should show:

- screens
- states
- asks
- acts
- resources
- flows
- surfaces
- policies
- subscriptions
- server actions
- events
- jobs
- DOM/native mappings
- hydration boundaries
- why-disabled explanations
- why-invalid explanations
- privacy redaction
- resource invalidation

Example DevTools view:

```txt
Screen: Invite member

Ask: Email address
  value: "mahyar"
  valid: false
  error: "Email must contain @."
  private: true

Act: Send invite
  enabled: false
  blocked by:
    email.valid is false

Resource: team
  status: ready
  key: ["team", "abc123"]

Surface: main
  renderer: dom
  materialized as:
    <main>
    <form>
    <input type="email">
    <button>
```

DevTools should answer questions directly:

- Why is this action disabled?
- Why is this ask invalid?
- Which resource is pending or stale?
- What invalidated this resource?
- Which semantic node produced this DOM element?
- Which DOM element belongs to this semantic node?
- Which semantic node produced this native component?
- What changed after this user event?
- What data was redacted due to privacy?
- What will hydrate on the client?
- What was server-rendered?
- What streamed?

Example why-disabled explanation:

```txt
Button: Send invite
Status: disabled
Reason: email.valid is false
Source: invite-member.screen.ts:42
Validation: Email must contain @.
```

This is the kind of DevTools React cannot naturally provide because React mostly sees components, not product meaning.

## Testing

Intent UI should support semantic tests as the default.

Instead of testing only DOM details:

```ts
await page.getByLabel("Email address").fill("m@example.com")
await page.getByRole("button", { name: "Send invite" }).click()
```

We can test interaction meaning:

```ts
testScreen(InviteMemberScreen, async screen => {
  await screen.answer("Email address", "mahyar@example.com")
  await screen.answer("Role", "editor")
  await screen.act("Send invite")

  expect(screen.feedback()).toContain("Invitation sent.")
})
```

This test remains valid if the renderer changes from a web form to a mobile wizard or command flow.

Test types:

- semantic screen tests
- resource tests
- server action tests
- policy tests
- flow tests
- accessibility tests
- OpenAPI contract tests
- realtime tests
- job tests
- DOM renderer tests
- React Native renderer tests
- end-to-end tests

Generated test suggestions:

```txt
required ask empty        → action disabled
invalid email             → validation feedback
valid inputs              → action enabled
action succeeds           → success feedback
action fails              → failure feedback
permission denied         → fallback visible
private fields            → redacted from logs
resource invalidated      → reload occurs
subscription event        → resource updates
```

DOM-level tests still matter. Semantic tests become the default product-behavior tests.

## Accessibility

Accessibility should be produced from semantic meaning.

```ts
$.ask("Email address", email)
  .asContact("email")
  .required()
  .hint("We will send an invitation link to this address.")
```

DOM renderer should generate:

```html
<label for="email">Email address</label>

<input
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  required
  aria-describedby="email-hint"
/>

<p id="email-hint">
  We will send an invitation link to this address.
</p>
```

Semantic accessibility warnings:

- destructive action has no confirmation
- private password field not marked secret
- surface has multiple primary actions
- flow reaches submit before required asks
- dialog has no close path
- feedback has no live region
- choice ask has no labels

For advanced cases:

```ts
$.surface("billing-details")
  .role("region")
  .labelledBy("billing-heading")
```

Or:

```ts
$.act("Expand filters")
  .controls("filters-panel")
  .expanded(filtersOpen)
```

The goal is not to hide accessibility. The goal is to make accessibility structured, typed, and hard to forget.

## Internationalization

Labels, hints, validation messages, action feedback, and errors should be localizable.

Simple form:

```ts
$.ask(t("settings.email.label"), email)
  .hint(t("settings.email.hint"))
  .required(t("settings.email.required"))
```

Structured form:

```ts
$.ask("settings.email", email)
  .label("Email address")
  .hint("We will send account updates to this address.")
  .required("Enter an email address.")
```

Action:

```ts
$.act("settings.save")
  .label("Save changes")
  .feedback({
    pending: "Saving...",
    success: "Settings saved.",
    failure: "Could not save settings."
  })
```

Because Intent UI is semantic, it can extract translation catalogs more reliably than arbitrary JSX.

## Styling and Design Systems

Intent UI should style semantic roles first.

```ts
theme({
  ask: {
    labelPlacement: "above",
    errorPlacement: "inline"
  },

  action: {
    primary: {
      emphasis: "filled",
      shape: "rounded",
      density: "comfortable"
    },

    danger: {
      emphasis: "filled",
      tone: "critical"
    }
  },

  surface: {
    main: {
      maxWidth: "comfortable"
    }
  },

  feedback: {
    success: {
      tone: "positive"
    },

    failure: {
      tone: "critical"
    }
  }
})
```

The renderer compiles this into CSS, native styles, or target-specific visual output.

### Design System Integration

Companies will ask: can it use our design system?

Intent UI should answer: yes, through materializers and kits.

```ts
createDomKit("acme", {
  materializers: {
    "act.primary": AcmePrimaryButton,
    "ask.contact.email": AcmeEmailField,
    "ask.choice": AcmeChoiceGroup,
    "surface.main": AcmeMainSurface
  }
})
```

The design system owns visual output. Intent UI owns semantics.

### Styling Escape Hatch

```ts
$.surface("main")
  .class("settings-page")
  .contains(...)
```

Or:

```ts
$.ask("Email", email)
  .style({
    maxWidth: "$formWidth"
  })
```

The escape hatch exists, but semantic styling remains the default.

## Escape Hatches

Escape hatches are required. They should be explicit and isolated.

### Raw DOM

```ts
$.custom("legacy-widget")
  .dom(html => {
    return html.div({ class: "legacy-widget" })
  })
```

### React Island

```tsx
$.custom("legacy-chart")
  .react(() => <LegacyChart data={chartData.value} />)
```

### React Native Custom Materializer

```ts
$.ask("Avatar", avatar)
  .asImageUpload()
  .materialize("react-native", AvatarUploadNative)
```

### API Route Escape Hatch

```ts
app.api.route("POST", "/api/stripe/webhook", handleStripeWebhook)
```

Escape hatches prevent the framework from becoming a cage. They should not become the main authoring path.

## Compiler

The MVP can build graphs at runtime. Future versions should include a compiler.

Compiler responsibilities:

- extract static graph structure
- generate type-safe routes
- generate action clients
- generate resource clients
- generate OpenAPI specs
- extract translation keys
- generate hydration manifests
- split client/server code
- tree-shake unused materializers
- generate validation plans
- generate semantic tests
- detect unreachable actions
- detect invalid flows
- detect missing feedback
- detect privacy leaks
- detect edge-incompatible imports
- detect missing policies
- detect unsafe public operations

The compiler should make the framework safer and more inspectable. It should not become opaque magic.

### MVP Approach

The MVP should prefer runtime graph building with strong TypeScript types and a transparent inspector. This keeps the first implementation small and debuggable.

### Future Compiler

The future compiler should optimize the stable graph, generate metadata, split code, and surface warnings. It should not be required for basic usage to feel understandable.

## Package Structure

Potential package layout:

```txt
intent-ui
intent-ui/dom
intent-ui/react-native
intent-ui/server
intent-ui/router
intent-ui/testing
intent-ui/devtools
intent-ui/compiler
intent-ui/openapi
intent-ui/realtime
intent-ui/jobs
intent-ui/files
intent-ui/react
intent-ui/kits/admin
intent-ui/kits/mobile-web
```

### Core Package

`intent-ui`

Contains:

- screen
- state
- ask
- act
- flow
- surface
- resource
- policy
- semantic graph
- reactive runtime

### DOM Package

`intent-ui/dom`

Contains:

- DOM renderer
- semantic HTML materializers
- forms
- accessibility
- hydration
- compiled CSS
- browser runtime

### React Native Package

`intent-ui/react-native`

Contains:

- React Native renderer
- native materializers
- screen containers
- safe area behavior
- keyboard behavior
- native accessibility
- native navigation integration

### Server Package

`intent-ui/server`

Contains:

- server resources
- server actions
- server policies
- events
- jobs
- SSR
- streaming
- edge adapters
- server transport

### OpenAPI Package

`intent-ui/openapi`

Contains:

- OpenAPI generation
- contract tests
- client generation
- public route mapping
- documentation metadata

### Realtime Package

`intent-ui/realtime`

Contains:

- subscriptions
- SSE adapter
- WebSocket adapter
- channels
- presence
- message validation
- resource invalidation integration

### Testing Package

`intent-ui/testing`

Contains:

- semantic screen tests
- resource tests
- action tests
- policy tests
- flow tests
- renderer test utilities

### DevTools Package

`intent-ui/devtools`

Contains:

- graph inspector
- why-disabled debugger
- why-invalid debugger
- hydration inspector
- privacy redaction viewer
- DOM/native mapping viewer

## CLI

The framework should include a CLI.

Possible commands:

```txt
intent dev
intent build
intent start
intent graph
intent inspect
intent openapi generate
intent test
intent check
intent routes
intent actions
intent resources
intent devtools
```

Important commands:

```txt
intent graph
  outputs semantic application graph

intent check
  runs semantic checks

intent openapi generate
  generates OpenAPI schema

intent routes
  lists typed routes

intent actions
  lists server actions and policies

intent resources
  lists resource keys and invalidation rules
```

## MVP Scope

The MVP should be small and undeniable.

The MVP must prove:

> A developer can build real web interactions without authoring DOM, JSX, or component trees, while still getting real semantic HTML, validation, feedback, routing, and server actions.

### MVP Must Include

- `screen`
- `state.text`
- `state.choice`
- `state.boolean`
- `ask`
- `act`
- `flow`
- `surface`
- `resource`
- policy basics
- DOM renderer
- basic router
- basic server actions
- basic SSR
- basic hydration
- basic validation
- basic feedback
- basic styling
- semantic graph inspector
- semantic tests

### MVP Demo Screens

Build exactly three demos:

1. Login
2. Invite member
3. Edit profile

These demonstrate:

- state
- validation
- actions
- async behavior
- feedback
- resources
- routing
- SSR
- accessibility
- semantic DOM
- layout policy
- server actions

### MVP Non-Goals

Do not build initially:

- full design system
- full React Native renderer
- full OpenAPI suite
- full realtime suite
- visual editor
- AI assistant
- massive component library
- complex compiler
- full edge deployment matrix
- full database abstraction

The MVP should prove the authoring model. Breadth comes later.

## Roadmap

### Phase 1: Core Prototype

Goal: prove semantic authoring.

Includes:

- screen
- state
- ask
- act
- flow
- surface
- runtime graph
- simple DOM renderer
- graph inspector

### Phase 2: Web Honesty

Goal: prove real web output.

Includes:

- semantic HTML
- forms
- labels
- validation
- accessibility
- basic CSS
- basic hydration
- SSR

### Phase 3: Server Operations

Goal: connect frontend intent to backend operations.

Includes:

- server resources
- server actions
- schemas
- policies
- generated transport
- resource invalidation

### Phase 4: Tooling

Goal: make abstraction trustworthy.

Includes:

- DevTools
- semantic tests
- CLI
- graph inspection
- semantic checks

### Phase 5: API and Realtime

Goal: make the backend model production-ready.

Includes:

- OpenAPI generation
- SSE
- WebSockets
- subscriptions
- events
- jobs
- files

### Phase 6: React Native Renderer

Goal: prove multi-surface architecture.

Includes:

- React Native renderer
- native materializers
- native accessibility
- safe area support
- native navigation integration
- adaptive interaction policies

## Adoption Strategy

Intent UI should not begin as a “React killer.” It should begin where semantic interactions are obviously valuable.

Best initial domains:

- admin tools
- internal dashboards
- SaaS settings
- onboarding flows
- forms
- checkout flows
- permission-heavy interfaces
- enterprise CRUD
- AI-generated apps
- multi-step workflows

These domains suffer from repeated glue:

- validation
- loading states
- disabled states
- permissions
- privacy
- analytics
- forms
- accessibility
- routing
- testing
- backend endpoints
- cache invalidation

Intent UI can replace that glue with semantic structure.

## Comparison

### React

React is excellent at composing components, but components are still visual/runtime units. React asks developers to manage UI shape and behavior through component trees. Intent UI asks developers to model the interaction graph and lets renderers materialize the surface.

### SolidJS

Solid offers fine-grained reactivity, but most authoring still begins with DOM-shaped JSX. Intent UI may use signal-like ideas internally, but its public unit is the semantic node, not the component or DOM element.

### Svelte

Svelte compiles markup into efficient code. Intent UI starts before markup. It compiles or materializes product meaning into target output.

### Flutter and Jetpack Compose

Flutter and Compose provide powerful declarative UI trees. Intent UI does not start from visual widgets. It starts from screens, questions, actions, flows, resources, and policies.

### Form Libraries

Form libraries solve part of the problem: inputs, validation, submission, and sometimes errors. Intent UI generalizes beyond forms into routing, resources, actions, policies, backend operations, realtime, tests, documentation, and multi-target rendering.

## Developer Experience Goals

Intent UI should feel like authoring product behavior directly in TypeScript.

DX goals:

- readable screen definitions
- strong type inference
- clear runtime errors
- no magical string soup
- inspectable semantic graph
- predictable generated output
- escape hatches where needed
- first-class DevTools
- semantic tests
- platform-honest output
- compiler help without compiler opacity

The authoring API should be chainable where chaining improves readability, but it should not become a mystical DSL fog-machine.

## Risks

### Over-Abstraction

If developers cannot predict or inspect output, the framework will feel unsafe.

Mitigation:

- excellent DevTools
- generated HTML preview
- DOM/native mapping
- source locations
- escape hatches
- materializer customization

### Wrapper Collapse

If the core becomes `Button`, `Input`, `Card`, and `Column`, the framework loses its unique value.

Mitigation:

- keep visual primitives out of core
- document `ask`, `act`, `flow`, and `surface` as the primary API
- make visual primitives renderer-level only

### Generic UI

Generated interfaces may look generic.

Mitigation:

- materialization kits
- design system adapters
- theme policies
- custom materializers
- escape hatches

### Hard Custom Experiences

Some interfaces are not naturally ask/act flows.

Examples:

- canvas editors
- kanban boards
- rich text editors
- timelines
- data grids
- charts
- file managers
- media editors

Mitigation:

- custom semantic nodes
- custom materializers
- experience nodes
- raw renderer escape hatches

### Backend Scope Explosion

Rethinking frontend and backend together can become too large.

Mitigation:

- MVP starts with minimal server actions and resources
- OpenAPI/realtime/jobs/files come later
- database layer remains adapter-based

### Ecosystem Adoption

Developers may resist a framework that does not look like the component systems they already know.

Mitigation:

- start with high-value workflow-heavy domains
- interoperate with React islands and existing design systems
- show generated DOM and runtime graph clearly
- ship excellent examples and migration paths

## Hard Questions

### What is the exact boundary between core and renderer?

Core must know product semantics. Renderers must know target primitives. The boundary should be strict enough to prevent wrapper collapse and flexible enough for rich product experiences.

### How much layout control is enough?

Developers need control, but visual tree authoring should not become the default. Intent UI needs a layout language based on grouping, priority, placement policy, density, and target capability.

### How do custom product experiences work?

The framework must support non-form experiences without forcing everything into questions and actions. Custom semantic nodes and materializers are required.

### How do we avoid over-abstraction?

Output must be inspectable. DevTools must show exactly what the graph produced, why it produced it, and where it came from.

### How does it handle arbitrary content?

Documents, marketing pages, rich text, charts, dashboards, and canvas-like interactions need flexible semantic and escape-hatch models.

### What is the relationship to AI?

AI should inspect and operate on the semantic graph. AI should not be required for the framework to work. The AI advantage comes from structured intent, not from generated mystery code.

### What is the adoption wedge?

The strongest wedge is not general website building. The strongest wedge is workflow-heavy product software: admin, SaaS settings, onboarding, permissions, CRUD, forms, dashboards, and AI-generated apps.

## Philosophy

Intent UI's philosophical promise:

```txt
The DOM is output, not the language.
Native components are output, not the language.
API routes are transport, not the backend model.
Product intent is the program.
```

The framework's architectural promise:

```txt
Write the interaction.
Materialize the interface.
Generate the transport.
Preserve the platform.
Inspect everything.
```

Intent UI should not try to make React slightly better. It should move application development from component-first and endpoint-first thinking to intent-first software.

## Sharp Positioning

Intent UI is not:

- HTML in TypeScript
- JSX without React
- a component library
- a design system
- a form library
- a route-file convention
- an API-route convention
- a fake browser
- a native wrapper

Intent UI is:

- a semantic interaction framework
- a graph of product behavior
- a target-materialization system
- a generated runtime model
- a bridge between UI intent and backend operations
- a structure humans, compilers, tests, DevTools, and AI can inspect

Slogan options:

- Product intent is the program.
- Write intent. Ship interfaces.
- Author behavior. Materialize surfaces.
- The DOM is output, not the language.
- Components describe what appears. Intent describes why it exists.

## Final Definition

Intent UI is a semantic full-stack interaction framework for TypeScript applications. It lets developers author product behavior as state, questions, actions, resources, flows, surfaces, policies, and operations, then materializes that semantic graph into accessible web interfaces, native mobile interfaces, backend transports, realtime streams, generated API contracts, tests, documentation, and runtime observability.

Its goal is not to make React slightly better.

Its goal is to move application development from component-first and endpoint-first thinking to intent-first software.

---

## Source Documents Consolidated

This consolidated document merges and deduplicates the following source documents:

- `Intent UI Framework Overview.docx`
- `Intent UI Architecture Addendum.docx`
- `Intent UI Framework Specification.docx`
