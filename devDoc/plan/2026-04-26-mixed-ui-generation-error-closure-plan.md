# Mixed UI, Generation, and Error Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the visible-but-incomplete Lumio image studio experience by making the mobile UI usable, generation parameters meaningful, primary actions functional, and all incomplete/error states explicit through Tips.

**Architecture:** Use a mixed closure approach. UI, canvas actions, prompt enhancement, and local front-end state should become genuinely usable now; login and invite should expose clear front-end flows and explicit integration Tips without blocking on the external `api.lumio.games` callback contract. Keep reusable business logic in small testable modules, then wire those modules into `ImageStudio.tsx`.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, localStorage for current front-end-only persistence, existing `/api/*` routes for quota/generation/history/upload/invite.

---

## Confirmed Product Direction

This round uses option C:

- UI, canvas, prompt enhancement, local作品集, reference-image reuse, image preview, and request preview must be real and usable.
- Login and invite should be clickable, visible, and understandable, but may remain front-end integration shells until the external login return/token contract is confirmed.
- Every TODO, unsupported action, front-end exception, and back-end/API exception must produce a clear modal or Tip. Buttons must not silently do nothing.

## Collected Requirements

### Mobile and Narrow Layout

- In the prompt composer, the `+` reference upload button and submit button should sit together along the lower action row, not in opposite corners.
- The type section currently hides lower controls on small screens; ratio and following controls must remain reachable.
- The six style preset cards under `热门` must be visible.
- The prompt library must be scrollable and readable; the user currently only sees the title and clipped cards.
- Remove the `游戏美术方向` helper text.

### Navigation and Front-End Feature Closure

- `探索`, `作品集`, and `教程` currently have no useful destination. Each needs a visible view, panel, or Tip-backed state.
- `作品集` should show saved images from the current browser session/local storage.
- `教程` can be a lightweight practical guide panel for prompt, reference image, type, style, and generate workflow.
- `探索` can show existing prompt library/inspiration content or route the user to the inspiration area.

### Header Entrypoints

- `邀请有礼` cannot remain a dead anchor. It should open an invite panel/modal with:
  - current integration status,
  - reward rule,
  - copyable invite link or clear "login required" Tip,
  - explicit message when full back-end invite flow is not available.
- `登录` cannot feel broken. It should:
  - clearly explain it opens Lumio account login,
  - surface return/token limitations if the user remains anonymous,
  - refresh quota after login token exists,
  - show explicit Tips for missing/expired token.

### Canvas Actions

- `保存到作品集` should save the current canvas image and make it visible from `作品集`.
- The reference-image button should support using the current generated image as the next prompt's reference image.
- Image zoom/fullscreen should open or display the current image at large size. A new browser tab with the image URL is acceptable.
- Download, delete, regenerate, save, reference reuse, and zoom must have distinct disabled states and explicit Tips.

### Prompt and Generation Semantics

- Type choices must affect the final generation prompt through configured default prompt enhancers.
- Type choices are multi-select toggles:
  - default state is no selected type,
  - clicking an unselected type selects it,
  - clicking a selected type deselects it,
  - multiple types can be selected at the same time,
  - if no type is selected, no type enhancer is added.
- Initial type enhancers:
  - `UI`: interface design, hierarchy, clear components, modern product visuals.
  - `UE`: game experience, interaction flow, feedback, playability expression.
  - `立绘`: character pose, costume, silhouette, full/half body design.
  - `3D`: volume, PBR materials, render lighting, studio presentation.
  - `二次元`: anime/illustration style, linework, cel/anime rendering.
  - `写实`: realistic photography, lens language, natural light, material detail.
  - `特效`: particles, magic/skill effects, energy flow, impact.
  - `场景原画`: environmental concept art, spatial depth, atmosphere, narrative.
- When multiple types are selected, their enhancers should be appended in a stable UI order and should not overwrite the user prompt.
- Style presets should also append meaningful prompt guidance.
- Negative prompt must be represented in the final request preview and either sent to the API if supported or surfaced as a clear Tip if not supported by the current provider contract.
- Request preview must show the final prompt/payload that will be sent, not just raw user text.

### Error and Tip Requirement

- All API errors should be rendered as user-readable Tips/modals using structured response fields when present.
- All front-end action failures should show a clear Tip.
- Any feature intentionally left as an integration shell must show a Tip explaining what is missing and what the user can do now.
- No action button should silently do nothing.

## Existing Context and Constraints

- Primary UI is in `src/components/ImageStudio.tsx`.
- Global and responsive styling is in `src/app/globals.css`.
- Existing helpers include:
  - `src/components/apiErrors.ts`
  - `src/components/generationRequestPreview.ts`
  - `src/components/imageDownload.ts`
  - `src/components/studioCanvas.ts`
  - `src/components/studioPrompt.ts`
  - `src/components/promptLibrary.ts`
- Existing server API error envelope is implemented in `src/server/http.ts`.
- Generation input normalization is in `src/server/domain/models.ts`.
- Current workspace already has uncommitted prompt-library/canvas/UI changes. Agents must not revert those changes.

## Worktree Strategy

Do not start until the user says `开始`.

Before creating worktrees, establish a safe baseline for current uncommitted work:

- Preferred: create a temporary coordination commit containing the current WIP after user approval.
- Alternative: generate a patch from the current working tree and apply it into every agent worktree.

Use one worktree per agent. To reduce merge conflicts, split work into two phases:

- Phase 1 parallel helper worktrees create focused modules and tests with little or no `ImageStudio.tsx` editing.
- Phase 2 integration worktree wires helpers into `ImageStudio.tsx` and `globals.css`.

Suggested worktree names:

- `../WebImageBuilder-agent-prompt`
- `../WebImageBuilder-agent-actions`
- `../WebImageBuilder-agent-errors`
- `../WebImageBuilder-agent-studio-ui`

## Phase 1: Parallel Helper Agents

### Agent 1: Prompt Enhancers and Request Preview

**Ownership:**

- Create: `src/components/promptEnhancers.ts`
- Test: `src/components/promptEnhancers.test.ts`
- Modify: `src/components/generationRequestPreview.ts`
- Test: `src/components/generationRequestPreview.test.ts`

**Scope:**

- Add typed type/style prompt enhancer configuration.
- Add a pure function that returns final generation prompt metadata from user prompt, selected types, selected style, and negative prompt.
- Support no selected types by returning the user/style prompt without type enhancer text.
- Support multiple selected types by appending enhancers in stable UI order.
- Extend request preview input to include raw prompt, final prompt, selected types, selected style, negative prompt, and provider support notes.
- Keep output JSON readable and stable for tests.

**Acceptance:**

- Default type state produces no type enhancer.
- Selecting `写实` adds realistic photography/lens/material guidance to final prompt.
- Selecting `UI` and `3D` appends both enhancers in stable order.
- Deselecting a selected type removes that enhancer from the final prompt.
- Selecting a style preset adds style guidance without deleting user prompt.
- Empty negative prompt is omitted or shown as empty consistently.
- Unsupported negative prompt handling is explicit in preview metadata.

**Verification:**

- `npm test -- src/components/promptEnhancers.test.ts src/components/generationRequestPreview.test.ts`

### Agent 2: Canvas Actions and Local Portfolio Utilities

**Ownership:**

- Create: `src/components/studioActions.ts`
- Test: `src/components/studioActions.test.ts`
- Modify only if needed: `src/components/studioCanvas.ts`
- Test only if modified: `src/components/studioCanvas.test.ts`

**Scope:**

- Add pure helpers for:
  - building local portfolio items from the current canvas image,
  - deduplicating saved items,
  - converting a generated image into a reusable reference asset descriptor,
  - building a zoom/open URL target,
  - computing enabled/disabled states for canvas actions.
- Keep browser APIs injectable or isolated so Vitest can test behavior.

**Acceptance:**

- Save action can create a stable portfolio item with image URL, mime type, prompt, and saved time.
- Duplicate saves do not create unbounded duplicates.
- Reference reuse helper returns a user-readable failure when no image is available.
- Zoom helper returns the image URL when available and a clear disabled reason otherwise.

**Verification:**

- `npm test -- src/components/studioActions.test.ts src/components/studioCanvas.test.ts`

### Agent 3: Error and Tip Model

**Ownership:**

- Create: `src/components/studioTips.ts`
- Test: `src/components/studioTips.test.ts`
- Modify: `src/components/apiErrors.ts`
- Test: `src/components/apiErrors.test.ts`
- Modify if needed: `src/server/http.ts`

**Scope:**

- Define a small Tip model: `type`, `title`, `message`, and optional `actionLabel/actionHref`.
- Map front-end action failures to Tips.
- Preserve structured API errors from `{ error: { code, message } }`.
- Map common server codes to Chinese user-facing messages:
  - `quota_exhausted`
  - `rate_limited`
  - `provider_error`
  - `configuration_error`
  - `unauthorized`
  - `bad_request`
- Keep technical detail visible enough for debugging without dumping raw HTML.

**Acceptance:**

- Non-JSON API errors still produce a useful message.
- Known API error codes produce clear Chinese Tips.
- Integration-shell actions can show explicit "暂未接入" or "需要登录" Tips.

**Verification:**

- `npm test -- src/components/studioTips.test.ts src/components/apiErrors.test.ts`

## Phase 2: Studio UI Integration Agent

### Agent 4: ImageStudio Integration and Responsive Layout

**Ownership:**

- Modify: `src/components/ImageStudio.tsx`
- Modify: `src/app/globals.css`
- May import helpers from Phase 1.

**Scope:**

- Move prompt upload and submit actions into a lower action row.
- Fix small-screen scrolling so type, ratio, style presets, and prompt library remain reachable.
- Show the six style preset cards under `热门`.
- Remove `游戏美术方向`.
- Change type controls from single-select to multi-select toggles with no default selection.
- Wire selected types and style into final prompt generation.
- Wire request preview to show final payload.
- Wire `保存到作品集`, reference reuse, download, delete, regenerate, and zoom to clear actions or Tips.
- Add visible views/panels for `探索`, `作品集`, `教程`, `邀请有礼`, and `登录`.
- Use the Tip model for all disabled, TODO, API, and front-end failure states.

**Acceptance:**

- On narrow screens, no essential control is permanently clipped.
- All visible navigation/header/action buttons produce a useful result or explicit Tip.
- Saving an image makes it visible in `作品集`.
- Reusing an image as reference makes the next generation mode/reference state clear.
- Zoom opens or displays the current image in large form.
- Type selections can be empty, toggled off, or multi-selected.
- Type/style selections affect final prompt and request preview only when selected.

**Verification:**

- `npm test`
- `npm run build`
- Manual browser check at `http://127.0.0.1:3000/` for:
  - prompt action row,
  - type section,
  - style presets,
  - prompt library,
  - navigation entries,
  - invite/login Tips,
  - save/reference/zoom actions,
  - API error Tip behavior with a forced failing request.

## Coordinator Merge and Review Checklist

- [ ] Confirm no agent reverted current WIP files or prompt library assets.
- [ ] Merge Phase 1 helper worktrees first.
- [ ] Run focused tests after each helper merge.
- [ ] Start or rebase Phase 2 integration on merged helper work.
- [ ] Review `ImageStudio.tsx` for uncontrolled file size growth; extract helpers instead of adding more inline branching if needed.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start dev server with `npm run dev` and verify the current browser-reported issues.
- [ ] Ensure all visible TODO/integration-shell areas show Tips.
- [ ] Ensure final response includes changed files, test output summary, and any remaining backend integration gaps.

## Out of Scope for This Round

- Full external login callback/token return implementation unless the existing repo already contains enough contract details.
- Full cloud-synced作品集 persistence.
- Full invite reward settlement UI connected to authenticated users if login identity is unavailable.
- New payment or paid quota management.
- New database migrations unless required by a small backend error-envelope improvement.

## Open Technical Notes for Start

- Current dirty worktree means normal `git worktree add` will not include uncommitted files. This must be handled before dispatch.
- `ImageStudio.tsx` is the likely merge hotspot. Keep helpers separate and phase the integration.
- If a back-end route returns an error, the client should display the structured code/message, not only a generic `请求失败`.
- Any intentional placeholder must be user-facing as a Tip, not a code `TODO` left in the UI.
