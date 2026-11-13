/**
 * Host self-check for 插件市场 Pro.
 *
 * Purpose: exercise parsing, scoring, search/sort/paging, install/update/uninstall wiring and the
 * guard rails without a running DSH. Uses a fake `ctx`, a fake `pluginManager` and an in-memory
 * index pair; no network.
 *
 * Run:   node selfcheck.mjs
 * Exit:  0 all pass; 1 a failure.
 * Idempotent: no files written, no network, no profile changes.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  apply,
  createMarketService,
  ROUTE_PREFIX,
  parseIndexDocument,
  scoreEntries,
  satisfiesRange,
  compareSemver,
  indexesFromYaml,
  queryTerms,
  matchScore,
  installTarget,
  redactSecrets,
  schedulePrewarm,
  internals,
} from './index.js'
import { createPublisher } from './publisher.js'

const NOW = Date.parse('2026-11-13T00:00:00Z')
const DAY = 86_400
const nowSeconds = Math.floor(NOW / 1000)
const NOW_MS = NOW

let passed = 0
function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passed += 1
        console.log(`ok   ${name}`)
      }).catch((error) => {
        console.error(`FAIL ${name}`)
        console.error(error)
        process.exitCode = 1
      })
    }
    passed += 1
    console.log(`ok   ${name}`)
    return undefined
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error)
    process.exitCode = 1
    return undefined
  }
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function localized(text) {
  return { en: text, zh: text }
}

const INDEX_A = {
  format: 1,
  title: localized('Index A'),
  description: localized('first source'),
  metadata: {
    categories: { ai: { title: localized('AI') }, office: { title: localized('Office') } },
    labels: {
      'install-verified': { title: localized('Install verified') },
      'risk-low': { title: localized('Low risk') },
      'risk-pending': { title: localized('Pending') },
      'top-rank-stars': { title: localized('Star board') },
    },
    sortKeys: {
      stars: { title: localized('Stars'), order: 'desc' },
      downloads: { title: localized('Downloads'), order: 'desc' },
      rank: { title: localized('Rank'), order: 'asc' },
    },
  },
  plugins: [
    {
      name: 'dsh-alpha',
      title: localized('Alpha plugin'),
      description: localized('Alpha does AI things'),
      author: 'alice',
      icon: './alpha.svg',
      homepage: 'https://example.com/alpha',
      repository: { url: 'https://github.com/example/alpha' },
      metadata: {
        category: 'ai',
        keywords: ['ai', 'assistant'],
        labels: ['install-verified', 'risk-low', 'top-rank-stars'],
        sortKeys: { stars: 100, downloads: 5000 },
      },
      versions: [
        {
          version: '1.0.0',
          publishTimestamp: nowSeconds - 10 * DAY,
          source: { type: 'npm' },
          engines: { dsh: '^0.2.0' },
        },
        {
          version: '1.1.0-rc.1',
          publishTimestamp: nowSeconds - 2 * DAY,
          source: { type: 'npm' },
          engines: { dsh: '^0.2.0' },
        },
      ],
    },
    {
      name: 'dsh-beta',
      title: localized('Beta plugin'),
      description: localized('Beta is incompatible'),
      metadata: {
        category: 'office',
        labels: ['risk-pending'],
        sortKeys: { rank: 1 },
      },
      versions: [
        {
          version: '2.0.0',
          publishTimestamp: nowSeconds - 30 * DAY,
          source: { type: 'git', url: 'https://github.com/example/beta', commit: 'a'.repeat(40), path: 'packages/beta' },
          engines: { dsh: '>=99.0.0' },
        },
      ],
    },
    {
      name: 'dsh-gamma',
      title: localized('Gamma plugin'),
      description: localized('Gamma stores documents'),
      metadata: {
        category: 'office',
        keywords: ['documents'],
        labels: ['install-verified'],
        sortKeys: { downloads: 100000, stars: 10 },
      },
      versions: [
        {
          version: '3.0.0',
          publishTimestamp: nowSeconds - 400 * DAY,
          source: { type: 'npm' },
          engines: { dsh: '^0.2.0' },
        },
        {
          version: '2.0.0',
          publishTimestamp: nowSeconds - 500 * DAY,
          source: { type: 'npm' },
          engines: { dsh: '^0.2.0' },
        },
      ],
    },
    { name: 'not a package', versions: [] },
    { name: 'dsh-broken', versions: [] },
  ],
}

const INDEX_B = {
  format: 1,
  title: localized('Index B'),
  description: localized('second source'),
  metadata: {
    categories: { ai: { title: localized('AI (B)') } },
    labels: { 'risk-low': { title: localized('Low risk') } },
    sortKeys: { stars: { title: localized('Stars'), order: 'desc' } },
  },
  plugins: [
    {
      name: 'dsh-gamma',
      title: localized('Gamma plugin'),
      description: localized('Gamma mirror with fewer stars'),
      metadata: { category: 'office', sortKeys: { stars: 1 } },
      versions: [
        {
          version: '3.0.0',
          publishTimestamp: nowSeconds - 400 * DAY,
          source: { type: 'npm' },
        },
      ],
    },
    {
      name: 'dsh-delta',
      title: localized('Delta plugin'),
      description: localized('Delta is fresh'),
      metadata: { category: 'ai', keywords: ['assistant'], sortKeys: { stars: 5 } },
      versions: [
        {
          version: '1.0.0',
          publishTimestamp: nowSeconds - 1 * DAY,
          source: { type: 'npm' },
          engines: { dsh: '^0.2.0' },
        },
      ],
    },
  ],
}

const SOURCE_A = 'https://market.test/index.json'
const SOURCE_B = 'https://market.test/top.json'

const INDEX_DOCUMENTS = new Map([
  [SOURCE_A, JSON.stringify(INDEX_A)],
  [SOURCE_B, JSON.stringify(INDEX_B)],
])

let fetchCalls = 0
async function fakeFetch(url) {
  fetchCalls += 1
  const text = INDEX_DOCUMENTS.get(url)
  if (text === undefined) {
    return { ok: false, status: 404, statusText: 'Not Found', headers: { get: () => null } }
  }
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: (name) => (name.toLowerCase() === 'content-length' ? String(Buffer.byteLength(text)) : null) },
    async arrayBuffer() {
      return Buffer.from(text)
    },
  }
}

function makeManager(overrides = {}) {
  const calls = []
  const manager = {
    calls,
    bundles: [
      {
        name: 'dsh-gamma',
        version: '2.0.0',
        installed: true,
        enabled: true,
        removable: true,
        source: 'dsh-gamma@2.0.0',
        availability: 'profile',
        updatable: true,
        official: false,
        description: 'Gamma package description',
        meta: {
          title: { en: 'Gamma plugin', zh: '伽马插件' },
          description: { en: 'Gamma description', zh: '伽马插件描述' },
        },
        rows: [
          { rowId: 'gamma-row', moduleName: 'dsh-gamma', entryId: 'include:gamma-row', meta: { title: { en: 'Gamma row', zh: '伽马行' } } },
        ],
        overrides: ['existing-row'],
      },
      {
        name: '@local/dsh-plugin-market-pro',
        version: '1.0.0',
        installed: true,
        enabled: true,
        removable: true,
        source: 'link:/tmp/plugin-market-pro',
        availability: 'profile',
        updatable: false,
        official: false,
      },
      {
        name: '@deepseek-ai/dsh-base',
        version: '0.2.2-rc.1',
        installed: false,
        enabled: true,
        removable: false,
        availability: 'installation',
        official: false,
      },
    ],
    async listBundles() {
      return this.bundles
    },
    async listVersionExemptions() {
      return { exemptions: {}, warnings: [] }
    },
    async readBundleDetail(name, language) {
      calls.push({ kind: 'readBundleDetail', name, language })
      if (name === 'dsh-gamma') {
        return { status: 'found', origin: 'locale', path: 'README.md', markdown: '# Gamma\n这是伽马插件的详细说明。' }
      }
      return { status: 'none' }
    },
    async installBundle(spec, options) {
      calls.push({ kind: 'install', spec, options })
      return { application: 'applied', changed: true, stage: 'install', packageResult: { exitCode: 0, output: 'installed' } }
    },
    async setBundleEnabled(name, enabled) {
      calls.push({ kind: 'toggle', name, enabled })
      const bundle = this.bundles.find((item) => item.name === name)
      if (bundle !== undefined) bundle.enabled = enabled
      return { application: 'applied', changed: true, stage: 'enable', target: name, enabled }
    },
    async updateBundle(name, version, options) {
      calls.push({ kind: 'update', name, version, options })
      return {
        from: '2.0.0',
        to: version,
        step: 'install',
        result: { application: 'applied', changed: true, stage: 'install' },
      }
    },
    async removeBundle(name) {
      calls.push({ kind: 'remove', name })
      return { application: 'applied', changed: true, stage: 'remove' }
    },
    async listVersions(name) {
      calls.push({ kind: 'listVersions', name })
      return {
        status: 'listed',
        installed: '2.0.0',
        registry: 'https://registry.npmjs.org/',
        versions: [{ version: '3.1.0', publishedAt: '2026-10-01T00:00:00.000Z' }],
        omitted: 0,
        attempts: [],
      }
    },
    async cancelInstall(id) {
      calls.push({ kind: 'cancel', id })
      return { status: 'too-late' }
    },
    ...overrides,
  }
  return manager
}

function makeCtx(manager, market, llm = null, defaultModel = null) {
  const ctx = {
    get(name) {
      if (name === 'pluginManager') return manager
      if (name === 'pluginMarket') return market
      if (name === 'llm') return llm
      if (name === 'agentDefaultModel') return defaultModel
      return undefined
    },
  }
  return ctx
}

function makeLlmReview(review) {
  return {
    async *stream() {
      yield { type: 'text-delta', text: JSON.stringify(review) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

const marketFake = {
  async readEntryDetail(url, name, version, language) {
    if (name === 'dsh-alpha') {
      return { status: 'found', origin: 'readme', path: 'README.md', markdown: '# Alpha\n这是 Alpha 插件的详细说明。' }
    }
    return { status: 'none' }
  },
  async listIndexes() {
    return [
      { url: SOURCE_A, title: localized('Index A'), description: localized('first source') },
      { url: SOURCE_B, title: localized('Index B'), description: localized('second source') },
    ]
  },
}

function makeService(overrides = {}) {
  const manager = makeManager(overrides.manager)
  const ctx = makeCtx(manager, overrides.market === undefined ? marketFake : overrides.market, overrides.llm ?? null, overrides.defaultModel ?? null)
  const service = createMarketService({
    ctx,
    config: { diskCache: false, prewarm: false },
    fetchImpl: fakeFetch,
    now: () => NOW_MS,
  })
  return { service, manager }
}

function makeApplyContext(market) {
  const registrations = []
  const disposers = []
  const webServer = {
    register(route) {
      registrations.push(route)
      return () => {}
    },
  }
  const ctx = {
    get(name) {
      if (name === 'pluginMarket') return market
      if (name === 'pluginManager') return makeManager()
      return undefined
    },
    on() {
      return () => {}
    },
    inject(_deps, callback) {
      callback({
        get: () => null,
        webServer,
        effect(fn) {
          const dispose = fn()
          if (typeof dispose === 'function') disposers.push(dispose)
          return dispose
        },
      })
    },
  }
  return { ctx, registrations, disposers }
}

async function settle(service, attempts = 200) {
  for (let index = 0; index < attempts; index += 1) {
    const snapshot = await service.handle('/snapshot', {})
    if (snapshot.loading !== true) return snapshot
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('snapshot did not settle')
}

function waitFor(operationId, service, attempts = 200) {
  return new Promise((resolve, reject) => {
    let count = 0
    const tick = async () => {
      const view = await service.handle('/operation', { id: operationId })
      if (view.operation.status !== 'running') {
        resolve(view.operation)
        return
      }
      count += 1
      if (count > attempts) {
        reject(new Error('operation did not settle'))
        return
      }
      setTimeout(tick, 5)
    }
    void tick()
  })
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

process.env.DSH_RUNTIME_VERSION = '0.2.2-rc.1'

async function run() {
  await test('semver comparison and ranges', () => {
    assert.ok(compareSemver('1.10.0', '1.9.9') > 0)
    assert.ok(compareSemver('2.0.0-rc.1', '2.0.0') < 0)
    assert.equal(compareSemver('1.0.0', '1.0.0'), 0)
    assert.equal(satisfiesRange('0.2.2-rc.1', '^0.2.0'), true)
    assert.equal(satisfiesRange('0.2.2-rc.1', '^0.1.2-rc.1 || ^0.2.0-rc.1'), true)
    assert.equal(satisfiesRange('0.3.0', '^0.2.0'), false)
    assert.equal(satisfiesRange('0.2.5', '>=0.1.0 <0.3.0'), true)
    assert.equal(satisfiesRange('0.2.5', '>=0.1.0 <0.2.0'), false)
    assert.equal(satisfiesRange('1.2.3', '~1.2.0'), true)
    assert.equal(satisfiesRange('1.3.0', '~1.2.0'), false)
    assert.equal(satisfiesRange('1.2.3', '1.2.x'), true)
    assert.equal(satisfiesRange('2.0.0', '*'), true)
    assert.equal(satisfiesRange('2.0.0', 'garbage'), null)
  })

  await test('credential redaction removes values but keeps the key', () => {
    const cases = [
      ['token=ghp_SECRETVALUE123', 'ghp_SECRETVALUE123'],
      ['Authorization=Bearer eyJhbGciOi.SECRET', 'eyJhbGciOi.SECRET'],
      ['_authToken=SECRETTOKEN', 'SECRETTOKEN'],
      ['password=hunter2', 'hunter2'],
      ['https://user:pass@example.com/repo.git', 'pass'],
      ['Authorization: Bearer abc.def.ghi', 'abc.def.ghi'],
    ]
    for (const [input, secret] of cases) {
      const output = redactSecrets(input)
      assert.ok(!output.includes(secret), `${input} leaked ${secret} as ${output}`)
      assert.ok(output.includes('***'), input)
    }
  })

  await test('index parsing: npm/git, relative icon, skipped entries', () => {
    const parsed = parseIndexDocument(INDEX_A, SOURCE_A)
    assert.equal(parsed.entries.length, 3)
    assert.equal(parsed.skipped, 2)
    const alpha = parsed.entries.find((entry) => entry.name === 'dsh-alpha')
    assert.equal(alpha.icon, 'https://market.test/alpha.svg')
    assert.equal(alpha.versions[0].version, '1.1.0-rc.1')
    assert.equal(installTarget('dsh-alpha', alpha.versions[1]).spec, 'dsh-alpha@1.0.0')
    const beta = parsed.entries.find((entry) => entry.name === 'dsh-beta')
    assert.equal(installTarget('dsh-beta', beta.versions[0]).spec,
      `git+https://github.com/example/beta.git#${'a'.repeat(40)}&path:/packages/beta`)
  })

  await test('scoring: compatibility, default version, recency, heat, quality', () => {
    const parsedA = parseIndexDocument(INDEX_A, SOURCE_A)
    const parsedB = parseIndexDocument(INDEX_B, SOURCE_B)
    const entries = [...parsedA.entries, ...parsedB.entries]
    scoreEntries(entries, { runtimeVersion: '0.2.2-rc.1', exemptions: {}, nowMs: NOW_MS })
    const alpha = entries.find((entry) => entry.name === 'dsh-alpha')
    assert.equal(alpha.defaultVersion, '1.0.0')
    assert.equal(alpha.compatibleCount, 2)
    const beta = entries.find((entry) => entry.name === 'dsh-beta')
    assert.equal(beta.defaultVersion, null)
    assert.equal(beta.compatibleCount, 0)
    assert.ok(alpha.recency > 90, `alpha recency ${alpha.recency}`)
    assert.ok(alpha.heat >= 80, `alpha heat ${alpha.heat}`)
    assert.ok(alpha.quality >= 60, `alpha quality ${alpha.quality}`)
    assert.ok(beta.quality < alpha.quality)
    assert.ok(alpha.qualityBreakdown.verified > 0)
  })

  await test('search terms and match scoring', () => {
    assert.deepEqual(queryTerms('Alpha'), ['alpha'])
    assert.ok(queryTerms('插件市场').length >= 2)
    const parsed = parseIndexDocument(INDEX_A, SOURCE_A)
    const alpha = parsed.entries.find((entry) => entry.name === 'dsh-alpha')
    assert.ok(matchScore(alpha, queryTerms('alpha')) > 0)
    assert.equal(matchScore(alpha, queryTerms('zzz')), -1)
  })

  await test('YAML fallback parses indexes', () => {
    const text = `
- id: plugin-market
  name: "@deepseek-ai/dsh-plugin-market"
  config:
    indexes:
      - https://cdn.dsh.so/market/index.json
      - https://cdn.dsh.so/market/top-rank.json
- id: other
  config:
    indexes:
      - https://example.com/nope.json
`
    assert.deepEqual(indexesFromYaml(text), [
      'https://cdn.dsh.so/market/index.json',
      'https://cdn.dsh.so/market/top-rank.json',
    ])
  })

  await test('snapshot: sources, stats, installed, recommendations', async () => {
    const { service } = makeService()
    const snapshot = await service.handle('/snapshot', {})
    assert.equal(snapshot.ok, true)
    assert.equal(snapshot.sources.length, 2)
    assert.equal(snapshot.sourceMode, 'service')
    assert.equal(snapshot.stats.unique, 4)
    assert.equal(snapshot.installed.count, 2)
    assert.ok(snapshot.recommend.items.length > 0)
    for (const item of snapshot.recommend.items) {
      assert.notEqual(item.name, 'dsh-gamma', 'installed entry must not be recommended')
    }
  })

  await test('list: paging cap, search, source filter, sort directions', async () => {
    const { service } = makeService()
    const page = await service.handle('/list', { page: 1, pageSize: 999 })
    assert.ok(page.items.length <= 50)
    assert.equal(page.total, 4)
    assert.equal(page.items.filter((item) => item.name === 'dsh-gamma').length, 1, 'dedupe by name')
    const gamma = page.items.find((item) => item.name === 'dsh-gamma')
    assert.equal(gamma.otherSources.length, 1)

    const onlyB = await service.handle('/list', { source: SOURCE_B })
    assert.equal(onlyB.total, 2)
    assert.ok(onlyB.items.every((item) => item.sourceUrl === SOURCE_B))

    const searched = await service.handle('/list', { text: 'alpha' })
    assert.equal(searched.total, 1)
    assert.equal(searched.items[0].name, 'dsh-alpha')

    const byTime = await service.handle('/list', { sort: { key: 'time', direction: 'desc' } })
    assert.equal(byTime.items[0].name, 'dsh-delta')

    const byHeat = await service.handle('/list', { sort: { key: 'heat', direction: 'desc' } })
    assert.ok(byHeat.items[0].heat >= byHeat.items[1].heat)

    const byRating = await service.handle('/list', { sort: { key: 'rating', direction: 'desc' } })
    assert.ok(byRating.items[0].quality >= byRating.items[1].quality)

    const byRank = await service.handle('/list', { sort: { key: 'rank', direction: 'asc' } })
    assert.equal(byRank.items[0].name, 'dsh-beta', 'rank 1 first')

    const hidden = await service.handle('/list', { hideInstalled: true })
    assert.ok(hidden.items.every((item) => item.name !== 'dsh-gamma'))

    await assert.rejects(() => service.handle('/list', { source: 'https://nope.test/x.json' }), /未配置/)
  })

  await test('detail: versions and quality breakdown', async () => {
    const { service } = makeService()
    const detail = await service.handle('/detail', { name: 'dsh-alpha' })
    assert.equal(detail.item.name, 'dsh-alpha')
    assert.equal(detail.item.versions.length, 2)
    assert.equal(detail.item.versions[0].version, '1.1.0-rc.1')
    assert.equal(detail.item.versions[1].isDefault, true)
    assert.ok(detail.item.qualityBreakdown.baseline > 0)
    await assert.rejects(() => service.handle('/detail', { name: 'nope' }), /索引中没有/)
  })

  await test('installed: list, registry refresh, update candidate', async () => {
    const { service, manager } = makeService()
    const listing = await service.handle('/installed', { refresh: true })
    assert.equal(listing.ok, true)
    assert.equal(listing.items.length, 2)
    const gamma = listing.items.find((item) => item.name === 'dsh-gamma')
    assert.equal(gamma.update.available, true)
    assert.equal(gamma.update.from, 'registry')
    assert.equal(gamma.update.version, '3.1.0')
    assert.ok(manager.calls.some((call) => call.kind === 'listVersions' && call.name === 'dsh-gamma'))
    const self = listing.items.find((item) => item.name === '@local/dsh-plugin-market-pro')
    assert.equal(self.self, true)
    assert.equal(gamma.title.zh, '伽马插件')
    assert.equal(gamma.description.zh, '伽马插件描述')
    assert.equal(gamma.rows.length, 1)
    assert.equal(gamma.rows[0].title.zh, '伽马行')
    assert.equal(gamma.overrides[0], 'existing-row')
    assert.equal(gamma.availability, 'profile')
  })

  await test('install: exact spec, operation settles', async () => {
    const { service, manager } = makeService()
    const started = await service.handle('/install', { name: 'dsh-alpha' })
    assert.equal(started.ok, true)
    const settled = await waitFor(started.operation.id, service)
    assert.equal(settled.status, 'done')
    const call = manager.calls.find((entry) => entry.kind === 'install')
    assert.equal(call.spec, 'dsh-alpha@1.0.0')
    assert.equal(call.options.saveExact, true)
    assert.equal(call.options.enabled, true)
  })

  await test('install guards: unknown, incompatible, already installed', async () => {
    const { service, manager } = makeService()
    await assert.rejects(() => service.handle('/install', { name: 'nope' }), /索引中没有/)
    await assert.rejects(() => service.handle('/install', { name: 'dsh-beta' }), /没有与当前 DSH 兼容/)
    await assert.rejects(() => service.handle('/install', { name: 'dsh-gamma' }), /已安装/)
    assert.equal(manager.calls.filter((call) => call.kind === 'install').length, 0)
  })

  await test('update: registry path and market replace path', async () => {
    const { service, manager } = makeService()
    const started = await service.handle('/update', { name: 'dsh-gamma' })
    const settled = await waitFor(started.operation.id, service)
    assert.equal(settled.status, 'done')
    const updateCall = manager.calls.find((call) => call.kind === 'update')
    assert.equal(updateCall.name, 'dsh-gamma')
    assert.equal(updateCall.version, '3.1.0')

    const replaceManager = makeManager({
      bundles: [
        {
          name: 'dsh-alpha',
          version: '0.9.0',
          installed: true,
          enabled: true,
          removable: true,
          source: 'dsh-alpha@0.9.0',
          availability: 'profile',
          updatable: false,
        },
      ],
      async listVersions() {
        return { status: 'refused', problem: 'not-updatable', reason: 'nope' }
      },
    })
    const ctx = makeCtx(replaceManager, marketFake)
    const replaceService = createMarketService({ ctx, config: { diskCache: false, prewarm: false }, fetchImpl: fakeFetch, now: () => NOW_MS })
    const replaceStarted = await replaceService.handle('/update', { name: 'dsh-alpha' })
    const replaceSettled = await waitFor(replaceStarted.operation.id, replaceService)
    assert.equal(replaceSettled.status, 'done')
    const kinds = replaceManager.calls.map((call) => call.kind)
    assert.deepEqual(kinds, ['remove', 'install'])
  })

  await test('uninstall: works and protects the plugin itself', async () => {
    const { service, manager } = makeService()
    const started = await service.handle('/uninstall', { name: 'dsh-gamma' })
    const settled = await waitFor(started.operation.id, service)
    assert.equal(settled.status, 'done')
    assert.ok(manager.calls.some((call) => call.kind === 'remove' && call.name === 'dsh-gamma'))
    await assert.rejects(
      () => service.handle('/uninstall', { name: '@local/dsh-plugin-market-pro' }),
      /不能在自身面板中卸载/,
    )
  })

  await test('pending build scripts surface as needs-approval', async () => {
    const manager = makeManager({
      async installBundle(spec, options) {
        this.calls.push({ kind: 'install', spec, options })
        return {
          application: 'failed',
          changed: false,
          stage: 'install',
          pendingBuilds: ['esbuild'],
          error: { code: 'install-failed', message: 'build scripts blocked' },
        }
      },
    })
    const ctx = makeCtx(manager, marketFake)
    const service = createMarketService({ ctx, config: { diskCache: false, prewarm: false }, fetchImpl: fakeFetch, now: () => NOW_MS })
    const started = await service.handle('/install', { name: 'dsh-alpha', approvedBuilds: [] })
    const settled = await waitFor(started.operation.id, service)
    assert.equal(settled.status, 'needs-approval')
    assert.deepEqual(settled.pendingBuilds, ['esbuild'])

    // Retrying with approvedBuilds passes them to the manager.
    const retry = await service.handle('/install', { name: 'dsh-alpha', approvedBuilds: ['esbuild'] })
    await waitFor(retry.operation.id, service)
    const second = manager.calls.filter((call) => call.kind === 'install')[1]
    assert.deepEqual(second.options.approvedBuilds, ['esbuild'])
  })

  await test('cancel maps the native { status } result', async () => {
    const { service, manager } = makeService()
    const started = await service.handle('/install', { name: 'dsh-alpha' })
    const outcome = await service.handle('/cancel', { id: started.operation.id })
    assert.equal(outcome.outcome, 'too-late')
    assert.ok(manager.calls.some((call) => call.kind === 'cancel' && call.id === started.operation.id))
  })

  await test('update rejects an arbitrary newer version that no registry lists', async () => {
    const { service } = makeService()
    await assert.rejects(() => service.handle('/update', { name: 'dsh-gamma', version: '9.9.9' }), /没有可安装的 registry 版本/)
  })

  await test('update build-script approval retries as remove + install with approvedBuilds', async () => {
    const manager = makeManager({
      async updateBundle(name, version) {
        this.calls.push({ kind: 'update', name, version })
        return {
          from: '2.0.0',
          to: version,
          step: 'install',
          result: {
            application: 'failed',
            changed: false,
            stage: 'install',
            pendingBuilds: ['sharp@0.33.0'],
            error: { code: 'install-failed', message: 'build scripts blocked' },
          },
        }
      },
    })
    const ctx = makeCtx(manager, marketFake)
    const service = createMarketService({ ctx, config: { diskCache: false, prewarm: false }, fetchImpl: fakeFetch, now: () => NOW_MS })
    const first = await service.handle('/update', { name: 'dsh-gamma' })
    const firstSettled = await waitFor(first.operation.id, service)
    assert.equal(firstSettled.status, 'needs-approval')
    assert.deepEqual(firstSettled.pendingBuilds, ['sharp@0.33.0'])

    const retry = await service.handle('/update', { name: 'dsh-gamma', approvedBuilds: ['sharp@0.33.0'] })
    const retrySettled = await waitFor(retry.operation.id, service)
    assert.equal(retrySettled.status, 'done')
    const kinds = manager.calls.filter((call) => ['update', 'remove', 'install'].includes(call.kind)).map((call) => call.kind)
    assert.deepEqual(kinds, ['update', 'remove', 'install'])
    const install = manager.calls.find((call) => call.kind === 'install')
    assert.equal(install.spec, 'dsh-gamma@3.1.0')
    assert.deepEqual(install.options.approvedBuilds, ['sharp@0.33.0'])
  })

  await test('toggle: disables an installed bundle and refuses self', async () => {
    const { service, manager } = makeService()
    const started = await service.handle('/toggle', { name: 'dsh-gamma', enabled: false })
    assert.equal(started.ok, true)
    const settled = await waitFor(started.operation.id, service)
    assert.equal(settled.status, 'done')
    assert.equal(settled.target.enabled, false)
    const call = manager.calls.find((entry) => entry.kind === 'toggle')
    assert.equal(call.name, 'dsh-gamma')
    assert.equal(call.enabled, false)
    const listing = await service.handle('/installed', {})
    assert.equal(listing.items.find((item) => item.name === 'dsh-gamma').enabled, false)

    await assert.rejects(
      () => service.handle('/toggle', { name: '@local/dsh-plugin-market-pro', enabled: false }),
      /不能在自身面板中切换/,
    )
    await assert.rejects(
      () => service.handle('/toggle', { name: 'dsh-gamma', enabled: 'no' }),
      /enabled 必须是布尔值/,
    )
  })

  await test('busy guard: one mutation at a time', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const manager = makeManager({
      async installBundle(spec, options) {
        this.calls.push({ kind: 'install', spec, options })
        await gate
        return { application: 'applied', changed: true, stage: 'install' }
      },
    })
    const ctx = makeCtx(manager, marketFake)
    const service = createMarketService({ ctx, config: { diskCache: false, prewarm: false }, fetchImpl: fakeFetch, now: () => NOW_MS })
    const first = await service.handle('/install', { name: 'dsh-alpha' })
    await assert.rejects(() => service.handle('/install', { name: 'dsh-delta' }), /另一个插件操作正在进行/)
    release()
    const settled = await waitFor(first.operation.id, service)
    assert.equal(settled.status, 'done')
  })

  await test('HTTP handler rejects non-POST and unknown methods', async () => {
    const { service } = makeService()
    const makeResponse = () => {
      const chunks = []
      return {
        statusCode: 0,
        headers: {},
        chunks,
        writeHead(status, headers) {
          this.statusCode = status
          this.headers = headers
        },
        end(body) {
          this.body = body
        },
      }
    }
    const getResponse = makeResponse()
    await service.handleRequest({ method: 'GET', url: '/_dsh/plugin-market-pro/nope' }, getResponse, null)
    assert.equal(getResponse.statusCode, 405)

    const healthResponse = makeResponse()
    await service.handleRequest({ method: 'GET', url: '/_dsh/plugin-market-pro/health' }, healthResponse, null)
    assert.equal(healthResponse.statusCode, 200)
    const health = JSON.parse(healthResponse.body.toString('utf8'))
    assert.equal(health.ok, true)

    const badResponse = makeResponse()
    await service.handleRequest({ method: 'POST', url: '/_dsh/plugin-market-pro/nope' }, badResponse, null)
    assert.equal(badResponse.statusCode, 404)
  })

  await test('progressive load: first source paints before the second finishes', async () => {
    const slowFetch = async (url) => {
      if (url === SOURCE_B) await new Promise((resolve) => setTimeout(resolve, 140))
      return fakeFetch(url)
    }
    const manager = makeManager()
    const ctx = makeCtx(manager, marketFake)
    const service = createMarketService({
      ctx,
      config: { diskCache: false, prewarm: false },
      fetchImpl: slowFetch,
      now: () => NOW_MS,
    })
    const started = Date.now()
    const partial = await service.handle('/snapshot', {})
    const elapsed = Date.now() - started
    assert.equal(partial.loading, true, 'snapshot returns while a source is still loading')
    assert.ok(elapsed < 120, `first paint took ${elapsed}ms`)
    assert.equal(partial.stats.entries, 3, 'only the fast source is painted')
    const sourceB = partial.sources.find((source) => source.url === SOURCE_B)
    assert.equal(sourceB.loading, true)
    assert.equal(partial.progress.total, 2)
    assert.equal(partial.progress.done, 1)

    await new Promise((resolve) => setTimeout(resolve, 260))
    const full = await service.handle('/snapshot', {})
    assert.equal(full.loading, false)
    assert.equal(full.stats.entries, 5)
    assert.equal(full.progress.done, 2)
  })

  await test('corrupt cached entry is ignored instead of failing every read API', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'pmp-corrupt-'))
    try {
      const first = createMarketService({
        ctx: makeCtx(makeManager(), marketFake),
        config: { diskCache: true, cacheDir: directory, prewarm: false },
        fetchImpl: fakeFetch,
        now: () => NOW_MS,
      })
      await settle(first)
      const files = (await readdir(directory)).filter((file) => file.endsWith('.json'))
      const entry = JSON.parse(await readFile(path.join(directory, files[0]), 'utf8'))
      delete entry.document.entries[0].versions
      await writeFile(path.join(directory, files[0]), JSON.stringify(entry))

      const offline = createMarketService({
        ctx: makeCtx(makeManager(), marketFake),
        config: { diskCache: true, cacheDir: directory, prewarm: false },
        fetchImpl: async () => {
          throw new Error('offline')
        },
        now: () => NOW_MS,
      })
      const snapshot = await settle(offline)
      assert.ok(snapshot.stats.entries > 0, 'other entries still load')
      const list = await offline.handle('/list', { pageSize: 10 })
      assert.ok(Array.isArray(list.items), 'list still answers')
      const missing = await offline.handle('/detail', { name: 'dsh-alpha' }).then(() => 'found', (error) => error.code)
      assert.ok(missing === 'unknown-entry' || missing === 'found')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  await test('cached version with a bad timestamp or non-semver version is ignored', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'pmp-badversion-'))
    try {
      const first = createMarketService({
        ctx: makeCtx(makeManager(), marketFake),
        config: { diskCache: true, cacheDir: directory, prewarm: false },
        fetchImpl: fakeFetch,
        now: () => NOW_MS,
      })
      await settle(first)
      const files = (await readdir(directory)).filter((file) => file.endsWith('.json'))
      const entry = JSON.parse(await readFile(path.join(directory, files[0]), 'utf8'))
      entry.document.entries[0].versions[0].publishTimestamp = undefined
      entry.document.entries[0].versions[0].version = 'not-semver'
      await writeFile(path.join(directory, files[0]), JSON.stringify(entry))

      const offline = createMarketService({
        ctx: makeCtx(makeManager(), marketFake),
        config: { diskCache: true, cacheDir: directory, prewarm: false },
        fetchImpl: async () => {
          throw new Error('offline')
        },
        now: () => NOW_MS,
      })
      const snapshot = await settle(offline)
      assert.ok(snapshot.stats.entries > 0)
      const list = await offline.handle('/list', { pageSize: 10 })
      assert.ok(Array.isArray(list.items))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  await test('invalidateSources during a load forces the next load', async () => {
    let calls = 0
    const slowFetch = async (url) => {
      calls += 1
      if (url === SOURCE_B) await new Promise((resolve) => setTimeout(resolve, 120))
      return fakeFetch(url)
    }
    const service = createMarketService({
      ctx: makeCtx(makeManager(), marketFake),
      config: { diskCache: false, prewarm: false },
      fetchImpl: slowFetch,
      now: () => NOW_MS,
    })
    await service.handle('/snapshot', {})
    service.invalidateSources()
    const loading = service.state.loading
    if (loading) await loading
    assert.equal(service.state.builtAt, 0, 'an invalidated load does not mark the catalog fresh')
  })

  await test('disk cache restores the catalog without the network', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'pmp-cache-'))
    try {
      const firstCtx = makeCtx(makeManager(), marketFake)
      const first = createMarketService({
        ctx: firstCtx,
        config: { diskCache: true, cacheDir: directory, prewarm: false },
        fetchImpl: fakeFetch,
        now: () => NOW_MS,
      })
      const loaded = await settle(first)
      assert.equal(loaded.loading, false)
      assert.equal(loaded.stats.entries, 5)

      const files = (await readdir(directory)).filter((file) => file.endsWith('.json'))
      assert.equal(files.length, 2, 'one cache file per source')
      for (const file of files) {
        const entry = JSON.parse(await readFile(path.join(directory, file), 'utf8'))
        assert.equal(entry.version, 2)
        const firstEntry = entry.document.entries[0]
        assert.equal(firstEntry.quality, undefined, 'derived quality is not persisted')
        assert.equal(firstEntry.install, undefined)
        assert.equal(firstEntry.latestVersion, undefined)
        assert.equal(firstEntry.versions[0].compatible, undefined, 'derived version flags are not persisted')
      }

      // Downgrade one cache file to v1 + derived fields: the loader must accept it,
      // paint from it without the network, and rewrite it as pruned v2.
      const migrationFile = path.join(directory, files[0])
      const migrationEntry = JSON.parse(await readFile(migrationFile, 'utf8'))
      migrationEntry.version = 1
      migrationEntry.document.entries[0].quality = 99
      migrationEntry.document.entries[0].versions[0].compatible = true
      await writeFile(migrationFile, JSON.stringify(migrationEntry))

      // Leave an orphan hash-named file; the loader prunes it.
      const orphan = path.join(directory, `${'a'.repeat(64)}.json`)
      await writeFile(orphan, '{"version":2}')
      let offlineCalls = 0
      const offline = createMarketService({
        ctx: makeCtx(makeManager(), marketFake),
        config: { diskCache: true, cacheDir: directory, prewarm: false },
        fetchImpl: async () => {
          offlineCalls += 1
          throw new Error('offline')
        },
        now: () => NOW_MS,
      })
      const restored = await settle(offline)
      assert.equal(restored.stats.entries, 5, 'cached entries are available offline')
      assert.equal(offlineCalls, 0, 'a fresh disk cache skips the network')
      assert.equal(restored.sources.every((source) => source.fromCache === true), true)
      assert.equal((await readdir(directory)).includes(path.basename(orphan)), false, 'orphan cache file pruned')
      const migrated = JSON.parse(await readFile(migrationFile, 'utf8'))
      assert.equal(migrated.version, 2, 'v1 cache rewritten as v2')
      assert.equal(migrated.document.entries[0].quality, undefined, 'v1 derived fields pruned on migration')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  await test('conditional refresh sends validators and accepts 304', async () => {
    const seen = []
    let calls = 0
    const conditionalFetch = async (url, options) => {
      calls += 1
      seen.push({ url, headers: options.headers })
      if (calls > 2) {
        return {
          ok: false,
          status: 304,
          statusText: 'Not Modified',
          headers: { get: (name) => (name.toLowerCase() === 'etag' ? '"v1"' : null) },
        }
      }
      const text = INDEX_DOCUMENTS.get(url)
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name) => {
            const lower = name.toLowerCase()
            if (lower === 'content-length') return String(Buffer.byteLength(text))
            if (lower === 'etag') return '"v1"'
            if (lower === 'last-modified') return 'Thu, 13 Nov 2026 00:00:00 GMT'
            return null
          },
        },
        async arrayBuffer() {
          return Buffer.from(text)
        },
      }
    }
    const ctx = makeCtx(makeManager(), marketFake)
    const service = createMarketService({
      ctx,
      config: { diskCache: false, prewarm: false },
      fetchImpl: conditionalFetch,
      now: () => NOW_MS,
    })
    await settle(service)
    const refreshed = await service.handle('/snapshot', { refresh: true })
    assert.equal(refreshed.loading, true, 'refresh serves stale data while revalidating')
    const settled = await settle(service)
    assert.equal(settled.loading, false)
    assert.equal(settled.stats.entries, 5)
    await service.handle('/snapshot', { refresh: true })
    await settle(service)
    const conditional = seen.filter((call) => call.headers && call.headers['if-none-match'] === '"v1"')
    assert.ok(conditional.length >= 4, 'every refresh keeps if-none-match after a 304')
  })

  await test('prewarm: loads the index without a panel request and respects the switch', async () => {
    const ctx = makeCtx(makeManager(), marketFake)
    const service = createMarketService({
      ctx,
      config: { diskCache: false, prewarm: true },
      fetchImpl: fakeFetch,
      now: () => NOW_MS,
    })
    assert.equal(typeof service.prewarm, 'function')
    await service.prewarm()
    assert.ok(service.state.entries.length > 0, 'prewarm fills the in-memory catalog')
    const settled = await settle(service)
    assert.equal(settled.loading, false, 'prewarm settles the background load')

    const disabled = createMarketService({
      ctx,
      config: { diskCache: false, prewarm: false },
      fetchImpl: fakeFetch,
      now: () => NOW_MS,
    })
    await disabled.prewarm()
    assert.equal(disabled.state.builtAt, 0, 'prewarm:false keeps the service cold')
  })

  await test('schedulePrewarm tolerates a missing/throwing prewarm method', async () => {
    const uncaught = []
    const onUncaught = (error) => uncaught.push(error)
    process.on('uncaughtException', onUncaught)
    try {
      assert.equal(schedulePrewarm({ config: { prewarm: true, prewarmDelayMs: 0 } }), null)
      const warm = schedulePrewarm({
        config: { prewarm: true, prewarmDelayMs: 0 },
        prewarm() {
          throw new Error('boom')
        },
      })
      assert.notEqual(warm, null)
      await new Promise((resolve) => setTimeout(resolve, 30))
      assert.equal(uncaught.length, 0, `prewarm threw: ${uncaught[0]?.stack ?? ''}`)
    } finally {
      process.off('uncaughtException', onUncaught)
    }
  })

  await test('apply: the delayed prewarm cannot raise an uncaught exception', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'pmp-prewarm-'))
    const uncaught = []
    const onUncaught = (error) => uncaught.push(error)
    process.on('uncaughtException', onUncaught)
    try {
      const wiring = makeApplyContext(undefined)
      apply(wiring.ctx, {
        indexes: [],
        profileDir: directory,
        diskCache: false,
        prewarm: true,
        prewarmDelayMs: 0,
      })
      await new Promise((resolve) => setTimeout(resolve, 30))
      assert.equal(uncaught.length, 0, `prewarm timer threw: ${uncaught[0]?.stack ?? ''}`)
      assert.equal(wiring.registrations.length, 1, 'route registered once')
      assert.equal(wiring.registrations[0].kind, 'prefix')
      assert.equal(wiring.registrations[0].path, ROUTE_PREFIX)
      for (const dispose of wiring.disposers) dispose()
    } finally {
      process.off('uncaughtException', onUncaught)
      await rm(directory, { recursive: true, force: true })
    }
  })

  await test('readme: market source and installed bundle both resolve', async () => {
    const { service } = makeService()
    const market = await service.handle('/readme', { name: 'dsh-alpha', lang: 'zh' })
    assert.equal(market.status, 'found')
    assert.equal(market.source, 'market')
    assert.ok(market.markdown.includes('Alpha'))
    const bundle = await service.handle('/readme', { name: 'dsh-gamma', lang: 'zh' })
    assert.equal(bundle.status, 'found')
    assert.equal(bundle.source, 'bundle')
    assert.ok(bundle.markdown.includes('Gamma'))
  })

  await test('ai: LLM review parses JSON and falls back without LLM', async () => {
    const review = {
      summary: 'Alpha 是一个 AI 助手插件。',
      purpose: '提供 AI 辅助。',
      audience: 'AI 用户',
      strengths: ['安装验证通过', '低风险'],
      risks: ['需要网络'],
      verdict: '推荐',
      score: 88,
      tags: ['ai', 'assistant'],
    }
    const withLlm = makeService({
      llm: makeLlmReview(review),
      defaultModel: { currentSelection: () => ({ provider: 'test-provider', model: 'test-model' }) },
    })
    const ai = await withLlm.service.handle('/ai', { name: 'dsh-alpha', lang: 'zh' })
    assert.equal(ai.review.ai, true)
    assert.equal(ai.review.summary, review.summary)
    assert.equal(ai.review.score, 88)
    assert.equal(ai.review.model, 'test-model')

    const without = await makeService().service.handle('/ai', { name: 'dsh-alpha', lang: 'zh' })
    assert.equal(without.review.ai, false)
    assert.equal(typeof without.review.summary, 'string')
    assert.ok(Array.isArray(without.review.strengths))
  })

  await test('ai: a stream that ignores AbortSignal is cut off by the hard deadline', async () => {
    const hanging = {
      async *stream() {
        await new Promise(() => {})
      },
    }
    const ctx = makeCtx(makeManager(), marketFake, hanging, {
      currentSelection: () => ({ provider: 'test-provider', model: 'test-model' }),
    })
    const service = createMarketService({
      ctx,
      config: { diskCache: false, prewarm: false, aiTimeoutMs: 5_000 },
      fetchImpl: fakeFetch,
      now: () => NOW_MS,
    })
    const started = Date.now()
    const result = await service.handle('/ai', { name: 'dsh-alpha', lang: 'zh' })
    const elapsed = Date.now() - started
    assert.ok(elapsed < 7_000, `AI did not time out: ${elapsed}ms`)
    assert.equal(result.review.ai, false)
    assert.equal(result.review.aiNoteCode, 'timeout')
    assert.ok(typeof result.review.summary === 'string')
  })

  await test('ai: a non-JSON completion degrades to the local review', async () => {
    const textLlm = {
      async *stream() {
        yield { type: 'text-delta', text: 'not json at all' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    }
    const ctx = makeCtx(makeManager(), marketFake, textLlm, {
      currentSelection: () => ({ provider: 'test-provider', model: 'test-model' }),
    })
    const service = createMarketService({
      ctx,
      config: { diskCache: false, prewarm: false },
      fetchImpl: fakeFetch,
      now: () => NOW_MS,
    })
    const result = await service.handle('/ai', { name: 'dsh-alpha', lang: 'zh' })
    assert.equal(result.review.ai, false)
    assert.equal(result.review.aiNoteCode, 'non-json')
    assert.ok(result.review.aiNote)
  })

  await test('alternatives: same-category compatible cards, excluding installed', async () => {
    const { service } = makeService()
    const result = await service.handle('/alternatives', { name: 'dsh-alpha', lang: 'zh' })
    assert.equal(result.ok, true)
    const names = result.items.map((item) => item.name)
    assert.ok(names.includes('dsh-delta'), names.join(','))
    assert.equal(names.includes('dsh-alpha'), false)
    assert.equal(names.includes('dsh-gamma'), false, 'installed alternative excluded')
    assert.equal(names.includes('dsh-beta'), false, 'incompatible alternative excluded')
  })

  await test('publisher: discovers a local plugin, bumps/tag versions and builds a market entry', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pmp-local-plugin-'))
    const state = await mkdtemp(path.join(tmpdir(), 'pmp-publisher-state-'))
    const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
    try {
      await writeFile(path.join(root, 'package.json'), `${JSON.stringify({
        name: 'dsh-local-test',
        version: '1.0.0',
        description: 'Local publisher test',
        author: 'Tester',
        engines: { dsh: '>=0.2.0' },
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      }, null, 2)}\n`)
      await writeFile(path.join(root, 'cordis.patch.yml'), '- insert: []\n')
      git('init', '-q')
      git('config', 'user.email', 'test@example.com')
      git('config', 'user.name', 'Tester')
      git('remote', 'add', 'origin', 'https://github.com/example/dsh-local-test.git')
      git('add', '.')
      git('commit', '-qm', 'init')
      git('tag', 'v1.0.0')

      const fail = (code, message) => {
        const error = new Error(message)
        error.code = code
        throw error
      }
      const publisher = createPublisher({
        ctx: { get: () => null },
        config: {},
        fail,
        stateDir: state,
        now: () => NOW_MS,
        fetchImpl: async () => { throw new Error('no network in selfcheck') },
        env: process.env,
      })
      await publisher.handle('/publisher/roots', { add: root })
      const overview = await publisher.handle('/publisher/overview')
      const plugin = overview.plugins.find((entry) => entry.name === 'dsh-local-test')
      assert.ok(plugin)
      assert.equal(plugin.version, '1.0.0')
      assert.equal(plugin.git.remoteGithub.owner, 'example')

      const originalPackage = await readFile(path.join(root, 'package.json'), 'utf8')
      const uncommitted = JSON.parse(originalPackage)
      uncommitted.version = '9.9.9'
      await writeFile(path.join(root, 'package.json'), `${JSON.stringify(uncommitted, null, 2)}\n`)
      await assert.rejects(
        publisher.handle('/publisher/index', { root }),
        (error) => error.code === 'version-not-committed',
      )
      await writeFile(path.join(root, 'package.json'), originalPackage)

      const bumped = await publisher.handle('/publisher/version', { root, version: '1.1.0', tag: true })
      assert.equal(bumped.version, '1.1.0')
      const built = await publisher.handle('/publisher/index', { root })
      assert.equal(built.entry.name, 'dsh-local-test')
      await assert.rejects(
        publisher.handle('/publisher/version', { root, version: '1.2.0', tag: true, tagName: 'v1.1.0' }),
        (error) => error.code === 'tag-exists',
      )
      assert.equal(JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version, '1.1.0')
      assert.ok(built.entry.versions.some((version) => version.version === '1.1.0'))
      assert.ok(built.entry.versions.every((version) => /^[0-9a-f]{40}$/u.test(version.source.commit)))

      const market = await publisher.handle('/publisher/markets', {
        market: { name: 'Selfcheck market', indexUrl: 'https://example.com/index.json' },
      })
      const published = await publisher.handle('/publisher/publish', {
        root,
        marketId: market.market.id,
        sourceType: 'git',
        dryRun: true,
      })
      assert.equal(published.mode, 'dry-run')
      assert.equal(published.index.plugins[0].name, 'dsh-local-test')
      assert.ok(published.entry.versions.length >= 2)

      const bare = await mkdtemp(path.join(tmpdir(), 'pmp-bare-remote-'))
      try {
        execFileSync('git', ['init', '--bare', '-q', bare], { encoding: 'utf8' })
        git('remote', 'set-url', 'origin', bare)
        const pushed = await publisher.handle('/publisher/github/push', { root, createRepo: false, pushTags: true })
        assert.equal(pushed.ok, true)
        assert.equal(pushed.branch, 'main')
        assert.ok(pushed.tagsPushed >= 2)
      } finally {
        git('remote', 'set-url', 'origin', 'https://github.com/example/dsh-local-test.git')
        await rm(bare, { recursive: true, force: true })
      }

      const calls = []
      const githubFetch = async (url, init = {}) => {
        if (String(url).includes('/contents/')) {
          if (init.method === 'PUT') {
            calls.push(JSON.parse(init.body))
            return { ok: true, status: 200, text: async () => JSON.stringify({ commit: { html_url: 'https://github.com/example/market/commit/1' } }) }
          }
          return { ok: false, status: 404, text: async () => '' }
        }
        throw new Error(`unexpected GitHub URL ${url}`)
      }
      const publisher2 = createPublisher({
        ctx: { get: () => null },
        config: {},
        fail,
        stateDir: state,
        now: () => NOW_MS,
        fetchImpl: githubFetch,
        env: process.env,
      })
      const repoMarket = await publisher2.handle('/publisher/markets', {
        market: {
          name: 'Repo market',
          indexUrl: 'https://example.com/repo-index.json',
          repo: { owner: 'example', name: 'market', branch: 'main', path: 'index.json' },
          token: 'test-token',
        },
      })
      const committed = await publisher2.handle('/publisher/publish', {
        root,
        marketId: repoMarket.market.id,
        sourceType: 'git',
      })
      assert.equal(committed.mode, 'committed')
      assert.equal(calls.length, 1)
      const uploaded = JSON.parse(Buffer.from(calls[0].content, 'base64').toString('utf8'))
      assert.equal(uploaded.plugins[0].name, 'dsh-local-test')
      assert.equal(calls[0].branch, 'main')
      const preserved = await publisher2.handle('/publisher/markets', {
        market: { id: repoMarket.market.id, name: 'Repo market renamed', indexUrl: 'https://example.com/repo-index.json' },
      })
      assert.equal(preserved.market.repo.owner, 'example')
      const cleared = await publisher2.handle('/publisher/markets', {
        market: { id: repoMarket.market.id, name: 'Repo market', indexUrl: 'https://example.com/repo-index.json', clearRepo: true },
      })
      assert.equal(cleared.market.repo, null)
      await assert.rejects(
        publisher2.handle('/publisher/config', { apiBase: 'http://127.0.0.1:9' }),
        (error) => error.code === 'invalid-api-base',
      )
    } finally {
      await rm(root, { recursive: true, force: true })
      await rm(state, { recursive: true, force: true })
    }
  })

  await test('publisher: refuses GitHub upload from a monorepo subdirectory', async () => {
    const repo = await mkdtemp(path.join(tmpdir(), 'pmp-monorepo-'))
    const pluginRoot = path.join(repo, 'plugins', 'p')
    const state = await mkdtemp(path.join(tmpdir(), 'pmp-monorepo-state-'))
    try {
      await mkdir(pluginRoot, { recursive: true })
      await writeFile(path.join(repo, 'secret.txt'), 'parent-only')
      await writeFile(path.join(pluginRoot, 'package.json'), `${JSON.stringify({
        name: 'dsh-monorepo-plugin', version: '1.0.0',
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      }, null, 2)}\n`)
      await writeFile(path.join(pluginRoot, 'cordis.patch.yml'), '- insert: []\n')
      const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' })
      git('init', '-q'); git('config', 'user.email', 'test@example.com'); git('config', 'user.name', 'Tester'); git('add', '.'); git('commit', '-qm', 'init')
      const fail = (code, message) => { const error = new Error(message); error.code = code; throw error }
      const publisher = createPublisher({ ctx: { get: () => null }, config: {}, fail, stateDir: state, now: () => NOW_MS, fetchImpl: async () => { throw new Error('no network') }, env: process.env })
      await publisher.handle('/publisher/roots', { add: pluginRoot })
      await assert.rejects(
        publisher.handle('/publisher/github/push', { root: pluginRoot, createRepo: false }),
        (error) => error.code === 'repo-root-required',
      )
    } finally {
      await rm(repo, { recursive: true, force: true })
      await rm(state, { recursive: true, force: true })
    }
  })

  await test('publisher routes: overview works and invalid roots throw request errors', async () => {
    const service = makeService().service
    const localOverview = await service.handle('/publisher/overview', {})
    assert.ok(Array.isArray(localOverview.plugins))
    assert.equal(typeof localOverview.github.hasToken, 'boolean')
    await assert.rejects(
      service.handle('/publisher/version', { root: '/definitely/not/a/plugin', version: '1.0.0' }),
      (error) => error.code === 'invalid-root',
    )
  })

  await test('live index sanity (network, optional)', async () => {
    if (process.env.PMP_SKIP_LIVE === '1') {
      console.log('     skipped (PMP_SKIP_LIVE=1)')
      return
    }
    const url = 'https://cdn.dsh.so/market/top-rank.json'
    let response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(20000) })
    } catch (error) {
      console.log(`     skipped (network unavailable: ${error.message})`)
      return
    }
    if (!response.ok) {
      console.log(`     skipped (HTTP ${response.status})`)
      return
    }
    const document = await response.json()
    const parsed = parseIndexDocument(document, url)
    assert.ok(parsed.entries.length >= 100)
    scoreEntries(parsed.entries, { runtimeVersion: '0.2.2-rc.1', exemptions: {}, nowMs: NOW_MS })
    const best = parsed.entries.slice().sort((left, right) => right.quality - left.quality)[0]
    assert.ok(best.quality >= 50)
    console.log(`     live: ${parsed.entries.length} entries, best ${best.name} quality ${best.quality}`)
  })

  if (process.exitCode === undefined || process.exitCode === 0) {
    console.log(`\n${passed} checks passed`)
  } else {
    console.log(`\n${passed} checks passed, failures above`)
  }
}

await run()
