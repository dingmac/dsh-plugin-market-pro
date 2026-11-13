/**
 * Client self-check for 插件市场 Pro.
 *
 * Purpose: load client.js in jsdom with a mocked Host route and verify the registration contract,
 * Discover rendering (cards, source URL, recommendation, pagination), the Manage tab, the install
 * confirmation flow, the operation overlay and the language toggle.
 *
 * Run:   node selfcheck-client.mjs
 * Exit:  0 all pass; 1 a failure.
 * Deps:  react / react-dom / jsdom resolved from the local dsh-superagent checkout; no network.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'

const DEP_ROOT = '/Users/dingmac/src/dsh-superagent/'
const requireFromDeps = createRequire(DEP_ROOT)
const { JSDOM } = requireFromDeps('jsdom')
const React = requireFromDeps('react')
const ReactDOMClient = requireFromDeps('react-dom/client')
const { Simulate } = requireFromDeps('react-dom/test-utils')

const CLIENT_PATH = path.join(import.meta.dirname, 'client.js')
const ROUTE = '/_dsh/plugin-market-pro'
const SOURCE_A = 'https://market.test/index.json'
const SOURCE_B = 'https://market.test/top.json'

/* -------------------------------------------------------------------------- */
/* jsdom environment                                                          */
/* -------------------------------------------------------------------------- */

const dom = new JSDOM('<!doctype html><html lang="zh"><body></body></html>', {
  url: 'http://127.0.0.1:5399/',
  pretendToBeVisual: true,
})
globalThis.window = dom.window
globalThis.document = dom.window.document
try {
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
} catch {
  /* plain assignment is enough */
}
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Node = dom.window.Node
globalThis.Event = dom.window.Event
globalThis.MouseEvent = dom.window.MouseEvent
globalThis.KeyboardEvent = dom.window.KeyboardEvent
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame?.bind(dom.window) ?? ((fn) => setTimeout(fn, 0))
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame?.bind(dom.window) ?? ((id) => clearTimeout(id))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => (storage.has(String(key)) ? storage.get(String(key)) : null),
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: (key) => storage.delete(String(key)),
  },
})

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function localized(text) {
  return { en: text, zh: text }
}

function card(overrides) {
  return {
    key: `${SOURCE_A}::dsh-alpha`,
    name: 'dsh-alpha',
    title: localized('Alpha plugin'),
    description: localized('Alpha does AI things'),
    icon: null,
    author: 'alice',
    homepage: 'https://example.com/alpha',
    repository: { url: 'https://github.com/example/alpha' },
    category: 'ai',
    labels: ['install-verified', 'risk-low'],
    keywords: ['ai'],
    sourceUrl: SOURCE_A,
    sourceTitle: localized('Index A'),
    version: '1.0.0',
    defaultVersion: '1.0.0',
    latestVersion: '1.0.0',
    publishedAt: 1763000000,
    publishIso: '2026-11-13T00:00:00.000Z',
    stars: 100,
    downloads: 5000,
    rank: 1,
    heat: 80,
    quality: 82,
    recency: 90,
    versionCount: 2,
    anyCompatible: true,
    installStatus: 'not-installed',
    installedVersion: null,
    install: { spec: 'dsh-alpha@1.0.0', registry: null },
    ...overrides,
  }
}

const ALPHA = card({})
const GAMMA = card({
  key: `${SOURCE_A}::dsh-gamma`,
  name: 'dsh-gamma',
  title: localized('Gamma plugin'),
  description: localized('Gamma stores documents'),
  category: 'office',
  labels: ['install-verified'],
  stars: 10,
  downloads: 100000,
  heat: 100,
  quality: 70,
  version: '2.0.0',
  defaultVersion: '3.0.0',
  latestVersion: '3.0.0',
  installStatus: 'installed',
  installedVersion: '2.0.0',
  install: { spec: 'dsh-gamma@3.0.0', registry: null },
})

const DELTA = card({
  key: `${SOURCE_B}::dsh-delta`,
  name: 'dsh-delta',
  title: localized('Delta plugin'),
  description: localized('Delta is a close alternative'),
  sourceUrl: SOURCE_B,
  sourceTitle: localized('Index B'),
  version: '1.0.0',
  defaultVersion: '1.0.0',
  latestVersion: '1.0.0',
  quality: 76,
  heat: 40,
  installStatus: 'not-installed',
  reason: { type: 'category', label: 'ai' },
})

const LOCAL_ROOT = '/Volumes/NASData/dingmac/DSH产出/插件制作/插件市场制作/脚本/插件市场Pro_批次1/plugin-market-pro'
const LOCAL_OVERVIEW = {
  ok: true,
  github: { owner: 'dingmac', hasToken: true, tokenSource: 'file', apiBase: 'https://api.github.com' },
  localRoots: [LOCAL_ROOT],
  markets: [{ id: 'demo-market', name: 'Demo market', indexUrl: 'https://example.com/index.json', repo: null, hasToken: false }],
  dshSources: [{ url: SOURCE_A, title: localized('Index A'), description: localized('first source'), configured: false }],
  plugins: [{
    root: LOCAL_ROOT,
    name: 'dsh-local-demo',
    version: '1.2.3',
    title: 'Local Demo',
    description: 'A locally created plugin',
    author: 'dingmac',
    license: 'MIT',
    private: false,
    engines: '>=0.2.0',
    source: 'configured',
    git: {
      isRepo: true,
      repoRoot: LOCAL_ROOT,
      branch: 'main',
      remote: 'https://github.com/dingmac/dsh-local-demo.git',
      remoteGithub: { owner: 'dingmac', name: 'dsh-local-demo', url: 'https://github.com/dingmac/dsh-local-demo' },
      head: 'a'.repeat(40),
      dirty: 0,
      ahead: 0,
      behind: 0,
      upstream: 'origin/main',
      lastCommit: { sha: 'a'.repeat(40), message: 'initial', date: '2026-11-13T00:00:00Z' },
      tags: ['v1.2.3'],
    },
  }],
}

const SNAPSHOT = {
  ok: true,
  protocolVersion: 1,
  pluginVersion: '1.0.0',
  runtimeVersion: '0.2.2-rc.1',
  sourceMode: 'service',
  loading: false,
  loaded: true,
  progress: { total: 2, done: 2, phase: 'done' },
  managerAvailable: true,
  syncedAt: Date.now(),
  refreshedAt: Date.now(),
  sources: [
    { url: SOURCE_A, title: localized('Index A'), description: localized('first'), count: 3, fetchedAt: Date.now(), error: null, fromCache: false },
    { url: SOURCE_B, title: localized('Index B'), description: localized('second'), count: 2, fetchedAt: Date.now(), error: null, fromCache: false },
  ],
  meta: {
    categories: { ai: { title: localized('AI') }, office: { title: localized('Office') } },
    labels: { 'install-verified': { title: localized('Install verified') }, 'risk-low': { title: localized('Low risk') } },
    sortKeys: { stars: { title: localized('Stars'), order: 'desc' }, downloads: { title: localized('Downloads'), order: 'desc' }, rank: { title: localized('Rank'), order: 'asc' } },
  },
  stats: { entries: 5, unique: 4, installed: 2, updates: 1 },
  recommend: { items: [{ ...ALPHA, key: `${SOURCE_B}::dsh-delta`, name: 'dsh-delta', title: localized('Delta plugin'), reason: { type: 'category', label: 'ai' } }], basis: [{ type: 'installed', label: 'dsh-gamma' }] },
  installed: { count: 2, updates: 1, names: ['dsh-gamma', '@local/dsh-plugin-market-pro'] },
  operations: [],
  warnings: [],
}

const INSTALLED = {
  ok: true,
  checkedAt: Date.now(),
  items: [
    {
      name: 'dsh-gamma',
      title: { en: 'Gamma plugin', zh: '伽马插件' },
      description: { en: 'Gamma description', zh: '伽马插件描述' },
      version: '2.0.0',
      enabled: true,
      installed: true,
      removable: true,
      readOnlyReason: null,
      official: false,
      optional: false,
      self: false,
      source: 'dsh-gamma@2.0.0',
      signature: 'registry',
      error: null,
      updatable: true,
      availability: 'profile',
      rows: [{ rowId: 'gamma-row', moduleName: 'dsh-gamma', entryId: 'include:gamma-row', title: { en: 'Gamma row', zh: '伽马行' }, description: null }],
      overrides: ['existing-row'],
      market: { sourceUrl: SOURCE_A, sourceTitle: localized('Index A'), latestVersion: '3.0.0', latestCompatible: '3.0.0', quality: 70, heat: 100, install: { spec: 'dsh-gamma@3.0.0', registry: null } },
      registry: { status: 'listed', registry: 'https://registry.npmjs.org/', versions: [{ version: '3.0.0' }], omitted: 0, attempts: [] },
      update: { available: true, version: '3.0.0', from: 'registry', spec: 'dsh-gamma@3.0.0', registry: 'https://registry.npmjs.org/', replacesLocalLink: false },
    },
    {
      name: '@local/dsh-plugin-market-pro',
      version: '1.0.0',
      enabled: true,
      installed: true,
      removable: true,
      readOnlyReason: null,
      official: false,
      optional: false,
      self: true,
      source: 'link:/tmp/plugin-market-pro',
      signature: 'link',
      error: null,
      updatable: false,
      market: null,
      registry: null,
      update: null,
    },
  ],
  counts: { total: 2, updates: 1, checked: 1 },
}

const DETAIL = {
  ok: true,
  item: {
    ...GAMMA,
    qualityBreakdown: { baseline: 20, verified: 12, risk: 10, stars: 2, downloads: 18, recency: 11, boards: 0, maintenance: 2 },
    versions: [
      { version: '3.0.0', publishedAt: 1763000000, publishIso: '2026-11-13T00:00:00.000Z', source: { type: 'npm' }, engines: { dsh: '^0.2.0' }, compatible: true, compatibilityUnknown: false, exempted: false, isDefault: true, isInstalled: false, isLatest: true, install: { spec: 'dsh-gamma@3.0.0', registry: null } },
      { version: '2.0.0', publishedAt: 1760000000, publishIso: '2026-10-09T00:00:00.000Z', source: { type: 'npm' }, engines: {}, compatible: true, compatibilityUnknown: false, exempted: false, isDefault: false, isInstalled: true, isLatest: false, install: { spec: 'dsh-gamma@2.0.0', registry: null } },
    ],
  },
}

/* -------------------------------------------------------------------------- */
/* Host mock                                                                  */
/* -------------------------------------------------------------------------- */

const calls = []
let operationPolls = 0
let installStarted = false
let snapshotLoading = false

function response(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload
    },
  }
}

function errorResponse(status, payload) {
  return {
    ok: false,
    status,
    async json() {
      return payload
    },
  }
}

globalThis.fetch = async (url, options) => {
  const pathname = String(url).replace(ROUTE, '')
  const body = options && typeof options.body === 'string' ? JSON.parse(options.body) : {}
  calls.push({ pathname, body })
  if (pathname === '/snapshot') {
    return response(snapshotLoading
      ? { ...SNAPSHOT, loading: true, progress: { total: 3, done: 1, phase: 'loading' } }
      : SNAPSHOT)
  }
  if (pathname === '/list') {
    let items = [ALPHA, GAMMA]
    const text = String(body.text ?? '').toLowerCase()
    if (text !== '') items = items.filter((item) => item.name.includes(text) || String(item.title.en).toLowerCase().includes(text))
    if (body.source && body.source !== 'all') items = items.filter((item) => item.sourceUrl === body.source)
    if (body.category) items = items.filter((item) => item.category === body.category)
    if (body.hideInstalled) items = items.filter((item) => item.installStatus !== 'installed')
    const pageSize = Math.min(50, Math.max(1, Number(body.pageSize) || 24))
    const page = Math.max(1, Number(body.page) || 1)
    const slice = items.slice((page - 1) * pageSize, page * pageSize)
    return response({ ok: true, items: slice, total: items.length, page, pageSize, pages: Math.max(1, Math.ceil(items.length / pageSize)), tookMs: 1 })
  }
  if (pathname === '/installed') return response(INSTALLED)
  if (pathname === '/detail') return response(DETAIL)
  if (pathname === '/readme') {
    return response({
      ok: true,
      status: 'found',
      source: 'market',
      origin: 'readme',
      path: 'README.md',
      markdown: '# Alpha 详细说明\n\n这是 Alpha 的完整说明。\n\n- 功能一\n- 功能二',
    })
  }
  if (pathname === '/ai') {
    return response({
      ok: true,
      cached: false,
      review: {
        summary: 'Alpha 是一个面向 AI 场景的插件。',
        purpose: '提供 AI 能力。',
        audience: '需要 AI 辅助的用户',
        strengths: ['安装验证通过', '低风险'],
        risks: ['依赖网络'],
        verdict: '推荐',
        score: 88,
        tags: ['ai', 'assistant'],
        ai: true,
        model: 'test-model',
      },
    })
  }
  if (pathname === '/alternatives') return response({ ok: true, items: [DELTA], basis: { category: 'ai', keywords: ['ai'] } })
  if (pathname === '/publisher/overview') return response(LOCAL_OVERVIEW)
  if (pathname === '/publisher/describe') {
    return response({
      ok: true,
      ai: true,
      draft: {
        title: 'Local Demo',
        description: 'A locally created plugin with AI copy.',
        detail: '# Local Demo\n\n## 功能\n\n- 本地插件管理\n\n## 截图\n\n![preview](../docs/preview.png)',
        screenshots: [{ path: 'docs/preview.png', caption: 'Preview' }],
      },
      screenshots: [{ path: 'docs/preview.png', caption: 'Preview' }],
    })
  }
  if (pathname === '/publisher/notes') return response({ ok: true, path: 'docs/DETAIL.md' })
  if (pathname === '/publisher/github/push') {
    return response({
      ok: true,
      operation: { id: 'pub-op-1', kind: 'github-push', status: 'running', phase: 'pushing', startedAt: Date.now() - 1200, finishedAt: null, log: [{ at: Date.now(), phase: 'pushing', message: '推送 main' }], result: null, error: null },
    })
  }
  if (pathname === '/publisher/operation') {
    return response({
      ok: true,
      operation: { id: 'pub-op-1', kind: 'github-push', status: 'done', phase: 'done', startedAt: Date.now() - 1600, finishedAt: Date.now(), log: [{ at: Date.now(), phase: 'pushing', message: '推送 main' }, { at: Date.now(), phase: 'done', message: '完成' }], result: { ok: true, initialized: false, repoUrl: 'https://github.com/dingmac/dsh-local-demo', htmlUrl: 'https://github.com/dingmac/dsh-local-demo', branch: 'main', commit: 'b'.repeat(40), tagsPushed: 1 }, error: null },
    })
  }
  if (pathname === '/publisher/github/status') {
    return response({ ok: true, plugin: LOCAL_OVERVIEW.plugins[0], github: LOCAL_OVERVIEW.github, api: { htmlUrl: 'https://github.com/dingmac/dsh-local-demo', private: false, defaultBranch: 'main', stars: 3, issues: 0, pushedAt: null } })
  }
  if (pathname === '/install') {
    installStarted = true
    operationPolls = 0
    return response({
      ok: true,
      operation: {
        id: 'op-1', kind: 'install', status: 'running', phase: 'installing',
        target: { name: body.name, version: body.version, sourceUrl: body.sourceUrl },
        startedAt: Date.now(), finishedAt: null, restartRequired: false,
        pendingBuilds: [], error: null, result: null, log: [],
      },
    })
  }
  if (pathname === '/operation') {
    operationPolls += 1
    return response({
      ok: true,
      operation: {
        id: 'op-1', kind: 'install', status: operationPolls > 0 ? 'done' : 'running', phase: operationPolls > 0 ? 'done' : 'installing',
        target: { name: 'dsh-alpha', version: '1.0.0', sourceUrl: SOURCE_A },
        startedAt: Date.now(), finishedAt: operationPolls > 0 ? Date.now() : null, restartRequired: false,
        pendingBuilds: [], error: null, result: { application: 'applied' }, log: [],
      },
    })
  }
  if (pathname === '/toggle') {
    return response({
      ok: true,
      operation: {
        id: 'op-toggle', kind: 'toggle', status: 'done', phase: 'updating',
        target: { name: body.name, enabled: body.enabled },
        startedAt: Date.now(), finishedAt: Date.now(), restartRequired: false,
        pendingBuilds: [], error: null, result: { application: 'applied' }, log: [],
      },
    })
  }
  if (pathname === '/update' || pathname === '/uninstall') {
    return response({
      ok: true,
      operation: {
        id: 'op-2', kind: pathname.slice(1), status: 'done', phase: 'done',
        target: { name: body.name, version: body.version },
        startedAt: Date.now(), finishedAt: Date.now(), restartRequired: false,
        pendingBuilds: [], error: null, result: { application: 'applied' }, log: [],
      },
    })
  }
  if (pathname === '/cancel') return response({ ok: true, outcome: 'too-late' })
  return errorResponse(404, { ok: false, error: { code: 'invalid-request', message: 'unknown' } })
}

/* -------------------------------------------------------------------------- */
/* Load client.js                                                             */
/* -------------------------------------------------------------------------- */

let moduleExport = null
globalThis.window.__ModuleLoader__ = {
  load(definition) {
    moduleExport = definition.factory((id) => {
      if (id === 'react') return React
      throw new Error(`unexpected require ${id}`)
    })
    moduleExport.__id = definition.id
  },
}
const code = readFileSync(CLIENT_PATH, 'utf8')
vm.runInThisContext(code, { filename: CLIENT_PATH })

const registered = {}
const guardEvents = new Map()
const droppedSessions = []
const sessionsMock = {
  refreshCount: 0,
  defaultRemoved: null,
  list: {
    getSnapshot() {
      return { byId: { 'session-b': { sessionId: 'session-b', origin: 'user' } } }
    },
  },
  manager: {
    sessions: new Map([['session-b', { id: 'session-b' }], ['session-c', { id: 'session-c', removed: true }]]),
    drop(sessionId, instance) {
      droppedSessions.push([sessionId, instance])
      this.sessions.delete(sessionId)
      return Promise.resolve()
    },
  },
  handleSessionRemoved(sessionId) {
    this.defaultRemoved = sessionId
  },
  refresh() {
    this.refreshCount += 1
    return Promise.resolve()
  },
}
const remoteMock = {
  $on(event, handler) {
    const handlers = guardEvents.get(event) ?? new Set()
    handlers.add(handler)
    guardEvents.set(event, handlers)
    return () => handlers.delete(handler)
  },
  emit(event, ...args) {
    for (const handler of guardEvents.get(event) ?? []) handler(...args)
  },
}
const fakeCtx = {
  sessions: sessionsMock,
  remote: remoteMock,
  get(name) {
    if (name === 'locale') {
      return { register() {}, bind() { return () => '' } }
    }
    if (name === 'remote') return remoteMock
    if (name === 'sessions') return sessionsMock
    return undefined
  },
  effect(fn) {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  slots: {
    inject(name, callback) {
      callback()
    },
    register(definition, component) {
      registered[definition.name + ':' + (definition.id ?? definition.key)] = { definition, component }
    },
  },
}

assert.ok(moduleExport, 'client module loaded')
assert.deepEqual(moduleExport.inject, ['slots', 'sessions', 'remote'])
moduleExport.apply(fakeCtx)
const main = registered['main:plugin-market-pro']
const sidebar = registered['sidebar.panellist:plugin-market-pro']
assert.ok(main, 'main panel registered')
assert.ok(sidebar, 'sidebar entry registered')
assert.equal(sidebar.definition.locale, 'plugin-market-pro')
assert.equal(sidebar.definition.label(), '插件市场')
assert.ok(droppedSessions.some(([id]) => id === 'session-c'), 'poisoned resident dropped on load')

/* -------------------------------------------------------------------------- */
/* Render                                                                     */
/* -------------------------------------------------------------------------- */

const container = document.createElement('div')
document.body.appendChild(container)
const root = ReactDOMClient.createRoot(container)
root.render(React.createElement(main.component))
await wait(300)

function text() {
  return container.textContent ?? ''
}

function byText(selector, needle) {
  return [...container.querySelectorAll(selector)].find((element) => (element.textContent ?? '').includes(needle))
}

function click(element) {
  assert.ok(element, 'clickable element exists')
  element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
}

function setInput(element, value) {
  const descriptor = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')
  descriptor.set.call(element, value)
  Simulate.change(element, { target: { value } })
}

const checks = []
async function check(name, fn) {
  try {
    await fn()
    checks.push(name)
    console.log(`ok   ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

await check('panel title and tabs render', () => {
  assert.ok(text().includes('插件市场 Pro'), text().slice(0, 200))
  assert.ok(text().includes('发现'))
  assert.ok(text().includes('管理'))
})

await check('snapshot sources and counts render', () => {
  assert.ok(text().includes('2 个来源'), text().slice(0, 400))
  assert.ok(text().includes('5 条目'))
})

await check('cards render with source URL and badges', () => {
  const cards = container.querySelectorAll('.pmp-card')
  assert.ok(cards.length >= 2, `cards ${cards.length}`)
  assert.ok(text().includes(SOURCE_A), 'card shows data URL')
  assert.ok(text().includes('Install verified'), 'label title rendered')
  assert.ok(text().includes('口碑分') || container.querySelector('.pmp-score'), 'score chip rendered')
})

await check('market detail disables install for an installed plugin', async () => {
  const cards = [...container.querySelectorAll('.pmp-card')]
  const gamma = cards.find((card) => (card.textContent ?? '').includes('Gamma plugin'))
  assert.ok(gamma, 'Gamma card exists')
  const details = [...gamma.querySelectorAll('button')].find((button) => (button.textContent ?? '').trim() === '详情')
  assert.ok(details, 'details button exists')
  click(details)
  await wait(80)
  const modal = container.querySelector('.pmp-modal')
  assert.ok(modal, 'detail modal opens')
  const install = [...modal.querySelectorAll('button')].find((button) => (button.textContent ?? '').trim().startsWith('安装'))
  assert.ok(install, 'install button exists')
  assert.equal(install.disabled, true, 'installed plugin install is disabled')
  click(modal.querySelector('.pmp-close'))
  await wait(30)
})

await check('market detail shows README, AI review and alternatives', async () => {
  const cards = [...container.querySelectorAll('.pmp-card')]
  const alpha = cards.find((card) => (card.textContent ?? '').includes('Alpha plugin'))
  assert.ok(alpha, 'Alpha card exists')
  const details = [...alpha.querySelectorAll('button')].find((button) => (button.textContent ?? '').trim() === '详情')
  click(details)
  await wait(180)
  const modal = container.querySelector('.pmp-modal')
  assert.ok(modal, 'detail modal opens')
  const content = modal.textContent ?? ''
  assert.ok(content.includes('Alpha 详细说明'), content.slice(0, 500))
  assert.ok(content.includes('AI 解读与评估'))
  assert.ok(content.includes('Alpha 是一个面向 AI 场景的插件。'))
  assert.ok(content.includes('平替推荐'))
  assert.ok(content.includes('Delta plugin'))
  const side = modal.querySelector('.pmp-detail-side')
  assert.ok(side, 'right side column exists')
  assert.ok(side.querySelector('.pmp-ai-panel'), 'AI panel is in the right column')
  assert.ok(side.querySelector('.pmp-alternatives'), 'alternatives are under AI in the right column')
  click(modal.querySelector('.pmp-close'))
  await wait(30)
})

await check('recommendation strip renders', () => {
  assert.ok(text().includes('为你推荐'))
  assert.ok(text().includes('与你已安装的同类'))
  assert.ok(container.querySelectorAll('.pmp-reco-card').length >= 1)
})

await check('pagination bar renders', () => {
  assert.ok(text().includes('共 2 个'))
  assert.ok(text().includes('每页'))
})

await check('search sends text to /list after debounce', async () => {
  const input = container.querySelector('.pmp-search input')
  assert.ok(input, 'search input exists')
  setInput(input, 'gamma')
  await wait(420)
  const last = [...calls].reverse().find((call) => call.pathname === '/list')
  assert.equal(last.body.text, 'gamma')
})

await check('status filter is sent to /list', async () => {
  const select = container.querySelector('select[aria-label="安装状态"]')
  assert.ok(select, 'status select exists')
  Simulate.change(select, { target: { value: 'update-available' } })
  await wait(120)
  const last = [...calls].reverse().find((call) => call.pathname === '/list')
  assert.equal(last.body.status, 'update-available')
  Simulate.change(select, { target: { value: 'all' } })
  await wait(80)
})

await check('manage tab lists installed plugins', async () => {
  click(byText('button[role="tab"]', '管理'))
  await wait(80)
  assert.ok(text().includes('已安装插件'), text().slice(0, 500))
  assert.ok(text().includes('dsh-gamma'))
  assert.ok(text().includes('@local/dsh-plugin-market-pro'))
  assert.ok(text().includes('更新到 v3.0.0'))
  assert.ok(text().includes('本插件'))
})

await check('manage rows show Chinese titles and open plugin detail', async () => {
  await wait(80)
  assert.ok(text().includes('伽马插件'), text().slice(0, 600))
  const row = container.querySelector('.pmp-manage-row-click')
  assert.ok(row, 'manage row exists')
  row.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  await wait(160)
  assert.ok(text().includes('插件详情'), 'installed detail modal opens')
  assert.ok(text().includes('伽马行'), 'row title shown')
  assert.ok(text().includes('existing-row'), 'override shown')
  assert.ok(text().includes('插件说明'), 'installed README section shown')
  assert.ok(text().includes('AI 解读与评估'), 'installed AI review shown')
  assert.ok(text().includes('平替推荐'), 'installed alternatives shown')
  const close = container.querySelector('.pmp-modal .pmp-close')
  assert.ok(close, 'modal close button exists')
  click(close)
  await wait(40)
})

await check('enable switch posts /toggle and reports the result', async () => {
  const toggle = container.querySelector('.pmp-manage-row .pmp-switch')
  assert.ok(toggle, 'switch exists')
  // Enter on the switch must not bubble into the row's keyboard handler.
  toggle.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  await wait(30)
  assert.equal(container.querySelectorAll('.pmp-modal').length, 0, 'switch keydown must not open the row detail')
  click(toggle)
  await wait(120)
  const call = [...calls].reverse().find((entry) => entry.pathname === '/toggle')
  assert.ok(call, 'toggle request sent')
  assert.equal(call.body.name, 'dsh-gamma')
  assert.equal(call.body.enabled, false)
  await wait(120)
  assert.ok(text().includes('已停用'), text().slice(-400))
})

await check('install confirmation reaches /install', async () => {
  click(byText('button[role="tab"]', '发现'))
  await wait(80)
  // Clear the search so cards return.
  const input = container.querySelector('.pmp-search input')
  setInput(input, '')
  await wait(420)
  const installButton = [...container.querySelectorAll('.pmp-card .pmp-btn-primary')].find((button) => (button.textContent ?? '').trim() === '安装')
  assert.ok(installButton, 'install button exists')
  click(installButton)
  await wait(30)
  assert.ok(text().includes('确认安装'), 'confirm dialog opens')
  click(byText('.pmp-modal button', '确认安装'))
  await wait(80)
  assert.ok(installStarted, 'install request sent')
  assert.ok(calls.some((call) => call.pathname === '/install' && call.body.name === 'dsh-alpha'))
})

await check('operation overlay and completion toast', async () => {
  await wait(1800)
  assert.ok(calls.some((call) => call.pathname === '/operation'), 'operation polled')
  assert.ok(text().includes('安装完成'), text().slice(-300))
})

await check('local plugins tab lists local plugins and opens maintenance detail', async () => {
  const tabs = [...container.querySelectorAll('.pmp-tab')]
  const localTab = tabs.find((tab) => (tab.textContent ?? '').includes('本地插件'))
  assert.ok(localTab, 'local tab exists')
  click(localTab)
  await wait(140)
  assert.ok(text().includes('Local Demo'), 'local plugin card rendered')
  const card = container.querySelector('.pmp-local-card-main')
  assert.ok(card, 'local plugin card main')
  click(card)
  await wait(100)
  const content = text()
  assert.ok(content.includes('版本维护'), content.slice(0, 400))
  assert.ok(content.includes('发布到插件市场'))
  assert.ok(content.includes('dsh-local-demo'))
  const modal = container.querySelector('.pmp-modal')
  const notesTab = [...modal.querySelectorAll('.pmp-local-nav-item')].find((tab) => (tab.textContent ?? '').includes('说明与截图'))
  assert.ok(notesTab, 'notes step exists')
  click(notesTab)
  await wait(30)
  const aiButton = [...modal.querySelectorAll('button')].find((button) => (button.textContent ?? '').includes('AI 补充说明'))
  assert.ok(aiButton, 'AI draft button exists')
  click(aiButton)
  await wait(300)
  const textarea = modal.querySelector('.pmp-textarea')
  assert.ok(textarea, 'notes textarea exists')
  assert.ok((textarea.value ?? '').includes('本地插件管理'), textarea.value)
  assert.ok((modal.textContent ?? '').includes('docs/preview.png'), 'screenshot listed')
  const githubTab = [...modal.querySelectorAll('.pmp-local-nav-item')].find((tab) => (tab.textContent ?? '').includes('GitHub'))
  click(githubTab)
  await wait(30)
  const uploadButton = [...modal.querySelectorAll('button')].find((button) => (button.textContent ?? '').includes('推送到 GitHub') || (button.textContent ?? '').includes('上传到 GitHub'))
  assert.ok(uploadButton, 'upload button exists')
  click(uploadButton)
  await wait(40)
  const uploadModal = [...container.querySelectorAll('.pmp-modal')].find((element) => (element.textContent ?? '').includes('上传到 GitHub'))
  assert.ok(uploadModal, 'upload modal opens')
  const startButton = [...uploadModal.querySelectorAll('button')].find((button) => (button.textContent ?? '').includes('开始上传'))
  assert.ok(startButton, 'start upload button exists')
  click(startButton)
  await wait(120)
  assert.ok((uploadModal.textContent ?? '').includes('操作完成'), uploadModal.textContent?.slice(-300))
  assert.ok((uploadModal.textContent ?? '').includes('dsh-local-demo'), 'repo result shown')
  click(uploadModal.querySelector('.pmp-close'))
  await wait(20)
  click(modal.querySelector('.pmp-close'))
  await wait(30)
})

await check('language toggle switches to English', async () => {
  const toggle = container.querySelector('.pmp-lang')
  assert.ok(toggle, 'language toggle exists')
  click(toggle)
  await wait(60)
  assert.ok(text().includes('Plugin Market Pro'), text().slice(0, 200))
  assert.ok(text().includes('Discover'))
  assert.ok(text().includes('Manage'))
})

await check('loading snapshot shows progress and stops polling when done', async () => {
  snapshotLoading = true
  const loadingContainer = document.createElement('div')
  document.body.appendChild(loadingContainer)
  const loadingRoot = ReactDOMClient.createRoot(loadingContainer)
  loadingRoot.render(React.createElement(main.component))
  await wait(120)
  assert.ok(loadingContainer.querySelector('.pmp-progress'), 'progress bar shown')
  assert.ok((loadingContainer.textContent ?? '').includes('Syncing 1/3 sources'), (loadingContainer.textContent ?? '').slice(0, 300))
  snapshotLoading = false
  await wait(950)
  assert.equal(loadingContainer.querySelector('.pmp-progress'), null, 'progress bar disappears after refresh')
  loadingRoot.unmount()
  loadingContainer.remove()
})

await check('session removal guard refreshes the list', async () => {
  const before = sessionsMock.refreshCount
  remoteMock.emit('api-session/removed', 'session-a')
  await wait(250)
  assert.equal(sessionsMock.refreshCount, before + 1, 'one removal triggers one refresh')
  remoteMock.emit('api-session/removed', 'session-a')
  remoteMock.emit('api-session/removed', 'session-a')
  await wait(250)
  assert.equal(sessionsMock.refreshCount, before + 2, 'a burst coalesces into one refresh')
})

await check('disposed user session is dropped before it can poison the composer', async () => {
  const before = sessionsMock.refreshCount
  const beforeDrops = droppedSessions.length
  sessionsMock.handleSessionRemoved('session-b')
  await wait(250)
  assert.equal(sessionsMock.defaultRemoved, null, 'default removal handler skipped for user sessions')
  assert.equal(droppedSessions.length, beforeDrops + 1, 'stale instance dropped once')
  assert.equal(droppedSessions[droppedSessions.length - 1][0], 'session-b')
  assert.equal(sessionsMock.refreshCount, before + 1, 'baseline refreshed after the drop')
})

if (process.exitCode === undefined || process.exitCode === 0) {
  console.log(`\n${checks.length} checks passed`)
} else {
  console.log(`\n${checks.length} checks passed, failures above`)
}

root.unmount()
