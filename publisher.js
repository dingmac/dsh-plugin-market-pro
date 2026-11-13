/**
 * Local-plugin publishing workbench for 插件市场 Pro.
 *
 * Everything here runs on the Host and is deliberately conservative:
 * - only local plugin roots already linked into a DSH profile (or explicitly added) are readable;
 * - a GitHub token is read from env / the saved config / `gh auth token`, never returned to the Client;
 * - `git push` never force-pushes and uses an ephemeral authorization header;
 * - a market is only writable when the user configured an explicit GitHub repository and index path;
 * - publishing a static DSH index is a GitHub Contents API commit, not a hidden registry API.
 */
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { chmod, mkdir, readFile, readdir, realpath, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const GITHUB_NAME = /^[A-Za-z0-9_.-]{1,100}$/
const GITHUB_OWNER = /^[A-Za-z0-9-]{1,39}$/
const REPO_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]{1,240}$/
const TAG_LIMIT = 40
const NPM_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/

class PublisherError extends Error {
  constructor(code, message, details) {
    super(message)
    this.code = code
    this.status = 400
    if (details !== undefined) this.details = details
  }
}
const CONFIG_FILE = 'publisher.json'

function redact(text) {
  return String(text ?? '')
    .replace(/github_pat_[A-Za-z0-9_]+/gu, 'github_pat_[redacted]')
    .replace(/gh[pousr]_[A-Za-z0-9_]+/gu, 'gh*_[redacted]')
    .replace(/https?:\/\/[^\s/@]+@/gu, 'https://[redacted]@')
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeUrl(value) {
  const text = asString(value)
  if (text === '') return ''
  let url
  try {
    url = new URL(text)
  } catch {
    return ''
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
  if (url.username !== '' || url.password !== '' || url.hash !== '') return ''
  return url.href
}

function normalizeApiBase(value) {
  const url = normalizeUrl(value)
  if (url === '') return ''
  try {
    return new URL(url).protocol === 'https:' ? url : ''
  } catch {
    return ''
  }
}

function normalizeRepository(input) {
  if (!isObject(input)) return null
  const owner = asString(input.owner)
  const name = asString(input.name)
  if (!GITHUB_OWNER.test(owner) || !GITHUB_NAME.test(name)) return null
  const branch = asString(input.branch) || 'main'
  const filePath = asString(input.path) || 'index.json'
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..')) return null
  if (!REPO_PATH.test(filePath)) return null
  return { owner, name, branch, path: filePath }
}

function parseGithubRemote(remote) {
  const text = asString(remote).replace(/\.git$/i, '')
  if (text === '') return null
  let match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i.exec(text)
  if (match !== null) return { owner: match[1], name: match[2], url: `https://github.com/${match[1]}/${match[2]}` }
  match = /^git@github\.com:([^/]+)\/([^/]+)$/i.exec(text)
  if (match !== null) return { owner: match[1], name: match[2], url: `https://github.com/${match[1]}/${match[2]}` }
  return null
}

function packageAuthor(value) {
  if (typeof value === 'string') return value.trim()
  if (isObject(value) && typeof value.name === 'string') return value.name.trim()
  return ''
}

function packageRepository(pkg) {
  if (typeof pkg.repository === 'string') return pkg.repository
  if (isObject(pkg.repository) && typeof pkg.repository.url === 'string') return pkg.repository.url
  return ''
}

function semverCompare(left, right) {
  const parse = (value) => {
    const [core, pre = ''] = String(value).split('-', 2)
    const numbers = core.split('.').map(Number)
    return { numbers, pre: pre === '' ? [] : pre.split('.') }
  }
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] - b.numbers[index]
  }
  if (a.pre.length === 0 && b.pre.length === 0) return 0
  if (a.pre.length === 0) return 1
  if (b.pre.length === 0) return -1
  const length = Math.max(a.pre.length, b.pre.length)
  for (let index = 0; index < length; index += 1) {
    if (a.pre[index] === undefined) return -1
    if (b.pre[index] === undefined) return 1
    const numericA = /^\d+$/.test(a.pre[index])
    const numericB = /^\d+$/.test(b.pre[index])
    if (numericA && numericB) {
      const diff = Number(a.pre[index]) - Number(b.pre[index])
      if (diff !== 0) return diff
    } else if (numericA !== numericB) {
      return numericA ? -1 : 1
    } else if (a.pre[index] !== b.pre[index]) {
      return a.pre[index] < b.pre[index] ? -1 : 1
    }
  }
  return 0
}

function versionFromTag(tag, packageName) {
  const text = asString(tag)
  if (text === '') return ''
  const candidates = []
  if (text.startsWith(`${packageName}@`)) candidates.push(text.slice(packageName.length + 1))
  if (text.startsWith('v')) candidates.push(text.slice(1))
  candidates.push(text)
  return candidates.find((value) => SEMVER.test(value)) ?? ''
}

function slugify(value) {
  const slug = asString(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || randomUUID()
}

/**
 * @param {object} options
 * @param {object} options.ctx host context (for pluginMarket.listIndexes)
 * @param {(code: string, message: string, details?: object) => never} options.fail
 * @param {string} options.stateDir
 * @param {() => number} [options.now]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
export function createPublisher(options) {
  const ctx = options.ctx ?? null
  const fail = typeof options.fail === 'function'
    ? options.fail
    : (code, message) => {
        const error = new Error(message)
        error.code = code
        throw error
      }
  const stateDir = options.stateDir
  const now = typeof options.now === 'function' ? options.now : Date.now
  const fetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : fetch
  const env = options.env ?? process.env
  const configPath = path.join(stateDir, CONFIG_FILE)
  let configCache = null
  let ghTokenCache = { at: 0, token: null }
  let dshGithubCache = { at: 0, value: null }

  function defaultConfig() {
    return {
      github: { token: '', owner: '', apiBase: 'https://api.github.com' },
      localRoots: [],
      markets: [],
    }
  }

  function normalizeConfig(value) {
    const base = defaultConfig()
    if (!isObject(value)) return base
    const github = isObject(value.github) ? value.github : {}
    base.github.token = asString(github.token)
    base.github.owner = asString(github.owner)
    base.github.apiBase = normalizeApiBase(github.apiBase) || 'https://api.github.com'
    base.localRoots = Array.isArray(value.localRoots)
      ? [...new Set(value.localRoots.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => path.resolve(item)))]
      : []
    base.markets = Array.isArray(value.markets)
      ? value.markets.map((market) => {
          if (!isObject(market)) return null
          const indexUrl = normalizeUrl(market.indexUrl)
          if (indexUrl === '') return null
          return {
            id: asString(market.id) || slugify(indexUrl),
            name: asString(market.name) || new URL(indexUrl).hostname,
            indexUrl,
            repo: normalizeRepository(market.repo),
            token: asString(market.token),
          }
        }).filter(Boolean)
      : []
    return base
  }

  async function readConfig() {
    if (configCache !== null) return configCache
    try {
      configCache = normalizeConfig(JSON.parse(await readFile(configPath, 'utf8')))
    } catch {
      configCache = defaultConfig()
    }
    return configCache
  }

  async function writeConfig(next) {
    await mkdir(stateDir, { recursive: true })
    const temporary = path.join(stateDir, `.${CONFIG_FILE}.${randomUUID()}.tmp`)
    await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
    await chmod(temporary, 0o600).catch(() => {})
    await rename(temporary, configPath)
    configCache = next
    return next
  }

  async function run(command, args, cwd, { timeout = 15_000, allowFailure = false, extraEnv = {} } = {}) {
    try {
      const result = await execFileAsync(command, args, {
        cwd,
        timeout,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...env, GIT_TERMINAL_PROMPT: '0', ...extraEnv },
      })
      return { ok: true, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') }
    } catch (error) {
      const result = {
        ok: false,
        code: typeof error?.code === 'number' ? error.code : null,
        stdout: String(error?.stdout ?? ''),
        stderr: String(error?.stderr ?? error?.message ?? 'command failed'),
      }
      if (allowFailure) return result
      throw new PublisherError('git-failed', redact(result.stderr.trim() || `${command} failed`))
    }
  }

  async function git(root, args, options) {
    return run('git', ['-C', root, ...args], root, options)
  }

  async function ghAuthToken() {
    if (now() - ghTokenCache.at < 60_000) return ghTokenCache.token
    const result = await run('gh', ['auth', 'token'], homedir(), { timeout: 4_000, allowFailure: true })
    const token = result.ok ? result.stdout.trim() : ''
    ghTokenCache = { at: now(), token: token || null }
    return ghTokenCache.token
  }

  async function gitGlobalUser() {
    const result = await run('git', ['config', '--global', 'github.user'], homedir(), { timeout: 3_000, allowFailure: true })
    return result.ok ? result.stdout.trim() : ''
  }

  async function readDshGithub() {
    if (now() - dshGithubCache.at < 300_000) return dshGithubCache.value
    const files = [
      path.join(homedir(), '.dsh', 'cordis.patch.yml'),
      ...(() => {
        const profiles = path.join(homedir(), '.dsh', 'profiles')
        try {
          return readdirSync(profiles)
            .flatMap((name) => [
              path.join(profiles, name, 'cordis.patch.yml'),
              path.join(profiles, name, 'cordis.yml'),
            ])
        } catch {
          return []
        }
      })(),
    ]
    let token = ''
    for (const file of files) {
      let text
      try {
        text = await readFile(file, 'utf8')
      } catch {
        continue
      }
      if (!/mcp-github|serverName:\s*['"]?github/iu.test(text)) continue
      const match = /['"]?Authorization['"]?:\s*['"]?Bearer\s+([A-Za-z0-9._-]+)/iu.exec(text)
      if (match !== null) {
        token = match[1]
        break
      }
    }
    let owner = ''
    try {
      const notes = JSON.parse(await readFile(path.join(homedir(), '.dsh', 'tool-management', 'mcp-notes.json'), 'utf8'))
      const note = isObject(notes) ? notes['mcp-github'] : ''
      const match = /账号\s*[:：]?\s*([A-Za-z0-9-]+)/u.exec(typeof note === 'string' ? note : '')
      if (match !== null) owner = match[1]
    } catch {
      /* no note */
    }
    const value = token === '' ? null : { token, owner, source: 'dsh-mcp' }
    dshGithubCache = { at: now(), value }
    return value
  }

  async function resolveGithub() {
    const config = await readConfig()
    const envToken = asString(env.GITHUB_TOKEN) || asString(env.GH_TOKEN)
    const fileToken = config.github.token
    let token = fileToken || envToken
    let source = fileToken !== '' ? 'file' : envToken !== '' ? 'env' : ''
    const dshGithub = token === '' ? await readDshGithub() : null
    if (token === '' && dshGithub !== null) {
      token = dshGithub.token
      source = 'dsh-mcp'
    }
    if (token === '') {
      const ghToken = await ghAuthToken()
      if (ghToken !== null) {
        token = ghToken
        source = 'gh'
      }
    }
    const owner = config.github.owner || asString(env.GITHUB_USER) || dshGithub?.owner || await gitGlobalUser()
    return {
      token,
      tokenSource: source,
      hasToken: token !== '',
      owner,
      apiBase: config.github.apiBase || 'https://api.github.com',
    }
  }

  function maskGithub(github) {
    return {
      owner: github.owner,
      hasToken: github.hasToken,
      tokenSource: github.tokenSource,
      apiBase: github.apiBase,
    }
  }

  function maskMarket(market) {
    return {
      id: market.id,
      name: market.name,
      indexUrl: market.indexUrl,
      repo: market.repo,
      hasToken: market.token !== '',
    }
  }

  async function linkedRoots() {
    const roots = []
    const profiles = path.join(homedir(), '.dsh', 'profiles')
    let entries = []
    try {
      entries = await readdir(profiles, { withFileTypes: true })
    } catch {
      entries = []
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(profiles, entry.name, 'package.json')
      try {
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
        const dependencies = isObject(manifest.dependencies) ? manifest.dependencies : {}
        for (const [name, spec] of Object.entries(dependencies)) {
          if (typeof spec !== 'string') continue
          if (!spec.startsWith('link:') && !spec.startsWith('file:')) continue
          const target = spec.slice(spec.indexOf(':') + 1)
          roots.push({ root: path.resolve(path.dirname(manifestPath), target), source: `profile:${entry.name}:${name}` })
        }
      } catch {
        /* a profile without a readable manifest contributes nothing */
      }
    }
    return roots
  }

  async function allRoots() {
    const config = await readConfig()
    const candidates = [
      ...config.localRoots.map((root) => ({ root, source: 'configured' })),
      ...await linkedRoots(),
    ]
    const seen = new Set()
    const roots = []
    for (const candidate of candidates) {
      let resolved
      try {
        resolved = await realpath(candidate.root)
      } catch {
        continue
      }
      if (seen.has(resolved)) continue
      seen.add(resolved)
      roots.push({ root: resolved, source: candidate.source })
    }
    return roots
  }

  async function allowedRoot(input) {
    const root = asString(input)
    if (root === '') fail('invalid-root', '缺少插件目录')
    let resolved
    try {
      resolved = await realpath(root)
    } catch {
      fail('invalid-root', '插件目录不存在或不可访问')
    }
    const roots = await allRoots()
    if (!roots.some((candidate) => candidate.root === resolved)) {
      fail('root-not-allowed', '只能管理已链接或已添加的本地插件目录')
    }
    return resolved
  }

  async function inspectGit(root) {
    const inside = await git(root, ['rev-parse', '--is-inside-work-tree'], { allowFailure: true })
    if (!inside.ok || inside.stdout.trim() !== 'true') {
      return { isRepo: false, repoRoot: null, branch: null, remote: null, remoteGithub: null, head: null, dirty: 0, ahead: null, behind: null, upstream: null, lastCommit: null, tags: [] }
    }
    const repoRootResult = await git(root, ['rev-parse', '--show-toplevel'], { allowFailure: true })
    const repoRoot = repoRootResult.ok ? repoRootResult.stdout.trim() : null
    const branchResult = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], { allowFailure: true })
    const branch = branchResult.ok ? branchResult.stdout.trim() : null
    const remoteResult = await git(root, ['remote', 'get-url', 'origin'], { allowFailure: true })
    const rawRemote = remoteResult.ok ? remoteResult.stdout.trim() : null
    const remote = rawRemote === null ? null : redact(rawRemote)
    const headResult = await git(root, ['rev-parse', 'HEAD'], { allowFailure: true })
    const head = headResult.ok ? headResult.stdout.trim() : null
    const statusResult = await git(root, ['status', '--porcelain=v1', '--branch'], { allowFailure: true })
    const statusLines = statusResult.ok ? statusResult.stdout.split('\n').filter(Boolean) : []
    const branchLine = statusLines.find((line) => line.startsWith('## ')) ?? ''
    const dirty = statusLines.filter((line) => !line.startsWith('## ')).length
    let ahead = null
    let behind = null
    let upstream = null
    const tracking = /^##\s+([^.\s]+)(?:\.\.\.(\S+))?(?:\s+\[(.+)\])?/u.exec(branchLine)
    if (tracking !== null) {
      upstream = tracking[2] ?? null
      const counts = /ahead (\d+)(?:, behind (\d+))?|behind (\d+)/u.exec(tracking[3] ?? '')
      if (counts !== null) {
        ahead = Number(counts[1] ?? 0)
        behind = Number(counts[2] ?? counts[3] ?? 0)
      } else if (upstream !== null) {
        ahead = 0
        behind = 0
      }
    }
    const logResult = await git(root, ['log', '-1', '--format=%H%x00%s%x00%cI'], { allowFailure: true })
    let lastCommit = null
    if (logResult.ok && logResult.stdout.trim() !== '') {
      const [sha, message, date] = logResult.stdout.trim().split('\u0000')
      lastCommit = { sha, message, date }
    }
    const tagsResult = await git(root, ['tag', '--sort=-creatordate'], { allowFailure: true })
    const tags = tagsResult.ok ? tagsResult.stdout.split('\n').map((tag) => tag.trim()).filter(Boolean).slice(0, TAG_LIMIT) : []
    return {
      isRepo: true,
      repoRoot,
      branch,
      remote,
      remoteGithub: parseGithubRemote(rawRemote),
      head,
      dirty,
      ahead,
      behind,
      upstream,
      lastCommit,
      tags,
    }
  }

  async function inspectPlugin(root) {
    let manifest
    try {
      manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
    } catch {
      return null
    }
    if (!isObject(manifest) || typeof manifest.name !== 'string' || typeof manifest.version !== 'string') return null
    if (!isObject(manifest.dsh) || !isObject(manifest.dsh.bundle)) return null
    const gitInfo = await inspectGit(root)
    return {
      root,
      name: manifest.name,
      version: manifest.version,
      description: typeof manifest.description === 'string' ? manifest.description : '',
      title: typeof manifest.dsh?.title === 'string' ? manifest.dsh.title : '',
      author: packageAuthor(manifest.author),
      homepage: normalizeUrl(manifest.homepage),
      repository: normalizeUrl(packageRepository(manifest)),
      license: typeof manifest.license === 'string' ? manifest.license : '',
      engines: isObject(manifest.engines) && typeof manifest.engines.dsh === 'string' ? manifest.engines.dsh : '',
      private: manifest.private === true,
      git: gitInfo,
    }
  }

  async function listPlugins() {
    const roots = await allRoots()
    const plugins = []
    for (const candidate of roots) {
      try {
        const plugin = await inspectPlugin(candidate.root)
        if (plugin !== null) {
          plugins.push({ ...plugin, source: candidate.source })
        }
      } catch {
        /* one broken root must not hide the others */
      }
    }
    plugins.sort((left, right) => left.name.localeCompare(right.name))
    return plugins
  }

  async function overview() {
    const [config, github, plugins] = await Promise.all([readConfig(), resolveGithub(), listPlugins()])
    let dshSources = []
    try {
      const market = ctx !== null && typeof ctx.get === 'function' ? ctx.get('pluginMarket') : null
      if (market !== null && typeof market?.listIndexes === 'function') {
        dshSources = (await market.listIndexes()).map((source) => ({
          url: source.url,
          title: source.title,
          description: source.description ?? null,
          configured: config.markets.some((entry) => entry.indexUrl === source.url),
        }))
      }
    } catch {
      dshSources = []
    }
    return {
      ok: true,
      github: maskGithub(github),
      localRoots: config.localRoots,
      markets: config.markets.map(maskMarket),
      dshSources,
      plugins,
      configPath,
    }
  }

  async function saveGithub(body) {
    const config = await readConfig()
    let apiBase = config.github.apiBase
    if (body.apiBase !== undefined) {
      const raw = asString(body.apiBase)
      const normalized = raw === '' ? 'https://api.github.com' : normalizeApiBase(raw)
      if (normalized === '') fail('invalid-api-base', 'GitHub API Base 必须是 https URL')
      apiBase = normalized
    }
    const next = {
      ...config,
      github: {
        token: typeof body.token === 'string' && body.token.trim() !== '' ? body.token.trim() : config.github.token,
        owner: body.owner === undefined ? config.github.owner : asString(body.owner),
        apiBase,
      },
    }
    if (body.clearToken === true) next.github.token = ''
    if (next.github.owner !== '' && !GITHUB_OWNER.test(next.github.owner)) {
      fail('invalid-github-owner', 'GitHub 用户名/组织名格式不正确')
    }
    await writeConfig(next)
    return { ok: true, github: maskGithub(await resolveGithub()) }
  }

  async function saveMarket(body) {
    const config = await readConfig()
    const market = isObject(body.market) ? body.market : {}
    const indexUrl = normalizeUrl(market.indexUrl)
    if (indexUrl === '') fail('invalid-market-url', '市场索引 URL 必须是 http(s)，且不能带凭据或片段')
    const existing = config.markets.find((entry) => entry.id === asString(market.id) || entry.indexUrl === indexUrl)
    const repoInput = isObject(market.repo) ? market.repo : null
    let repo
    if (market.clearRepo === true) repo = null
    else if (repoInput !== null && (asString(repoInput.owner) !== '' || asString(repoInput.name) !== '')) {
      repo = normalizeRepository(repoInput)
      if (repo === null) fail('invalid-market-repo', '市场仓库 owner/name/branch/path 格式不正确')
    } else {
      repo = existing?.repo ?? null
    }
    const nextMarket = {
      id: existing?.id ?? (asString(market.id) || slugify(indexUrl)),
      name: asString(market.name) || existing?.name || new URL(indexUrl).hostname,
      indexUrl,
      repo,
      token: typeof market.token === 'string' && market.token.trim() !== '' ? market.token.trim() : (existing?.token ?? ''),
    }
    if (body.clearToken === true) nextMarket.token = ''
    const markets = existing === undefined
      ? [...config.markets, nextMarket]
      : config.markets.map((entry) => (entry.id === existing.id ? nextMarket : entry))
    await writeConfig({ ...config, markets })
    return { ok: true, market: maskMarket(nextMarket) }
  }

  async function removeMarket(body) {
    const config = await readConfig()
    const id = asString(body.id)
    await writeConfig({ ...config, markets: config.markets.filter((entry) => entry.id !== id) })
    return { ok: true, id }
  }

  async function saveRoots(body) {
    const config = await readConfig()
    let roots = [...config.localRoots]
    if (typeof body.add === 'string' && body.add.trim() !== '') {
      let resolved
      try {
        resolved = await realpath(path.resolve(body.add.trim()))
      } catch {
        fail('invalid-root', '目录不存在或不可访问')
      }
      if (!roots.includes(resolved)) roots.push(resolved)
    }
    if (typeof body.remove === 'string' && body.remove.trim() !== '') {
      const target = path.resolve(body.remove.trim())
      roots = roots.filter((root) => root !== target)
    }
    await writeConfig({ ...config, localRoots: roots })
    return { ok: true, localRoots: roots }
  }

  async function updateVersion(body) {
    const root = await allowedRoot(body.root)
    const version = asString(body.version)
    if (!SEMVER.test(version)) fail('invalid-version', '版本号必须是精确 SemVer，例如 1.2.3 或 1.2.3-beta.1')
    const manifestPath = path.join(root, 'package.json')
    let originalText
    let manifest
    try {
      originalText = await readFile(manifestPath, 'utf8')
      manifest = JSON.parse(originalText)
    } catch {
      fail('invalid-plugin', '无法读取 package.json')
    }
    if (!NPM_NAME.test(manifest.name)) fail('invalid-plugin', 'package.json 的 name 不是合法 npm 包名')
    const previous = manifest.version
    let tag = null
    let tagName = null
    let plugin = null
    if (body.tag === true) {
      plugin = await inspectPlugin(root)
      if (plugin === null || !plugin.git.isRepo) fail('git-required', '创建版本 tag 需要插件位于 git 仓库中')
      tagName = asString(body.tagName) || `v${version}`
      if (!/^[A-Za-z0-9][A-Za-z0-9._+/-]{0,120}$/u.test(tagName) || tagName.includes('..') || tagName.endsWith('/') || tagName.endsWith('.')) {
        fail('invalid-tag', 'tag 名格式不正确')
      }
      const refCheck = await git(root, ['check-ref-format', `refs/tags/${tagName}`], { allowFailure: true })
      if (!refCheck.ok) fail('invalid-tag', 'tag 名不是合法的 git ref')
      const exists = await git(root, ['rev-parse', '--verify', '--quiet', `refs/tags/${tagName}`], { allowFailure: true })
      if (exists.ok) fail('tag-exists', `tag ${tagName} 已存在`)
    }
    manifest.version = version
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    let commit = null
    try {
      if (body.tag === true) {
        await git(root, ['add', '--', 'package.json'])
        const message = asString(body.message) || `chore(release): ${plugin.name}@${version}`
        const changed = await git(root, ['diff', '--cached', '--name-only', '--', 'package.json'], { allowFailure: true })
        if (changed.ok && changed.stdout.trim() !== '') {
          await git(root, ['commit', '-m', message, '--', 'package.json'])
          const head = await git(root, ['rev-parse', 'HEAD'])
          commit = head.stdout.trim()
        }
        await git(root, ['tag', '-a', tagName, '-m', message])
        tag = tagName
      }
    } catch (error) {
      await writeFile(manifestPath, originalText).catch(() => {})
      throw error
    }
    return { ok: true, version, previous, tag, commit }
  }

  async function tagVersions(plugin) {
    const gitInfo = plugin.git
    if (!gitInfo.isRepo || gitInfo.repoRoot === null) return []
    const result = []
    for (const tag of gitInfo.tags) {
      const version = versionFromTag(tag, plugin.name)
      if (version === '') continue
      const commitResult = await git(plugin.root, ['rev-parse', `${tag}^{commit}`], { allowFailure: true })
      if (!commitResult.ok) continue
      const pathInRepo = gitInfo.repoRoot === null ? '' : path.relative(gitInfo.repoRoot, plugin.root).split(path.sep).join('/')
      const manifestRel = pathInRepo === '' || pathInRepo === '.' ? 'package.json' : `${pathInRepo}/package.json`
      const tagManifest = await git(plugin.root, ['show', `${tag}^{commit}:${manifestRel}`], { allowFailure: true })
      let taggedVersion = ''
      try {
        taggedVersion = JSON.parse(tagManifest.stdout).version
      } catch {
        taggedVersion = ''
      }
      if (!tagManifest.ok || taggedVersion !== version) continue
      const dateResult = await git(plugin.root, ['log', '-1', '--format=%ct', `${tag}^{commit}`], { allowFailure: true })
      result.push({
        version,
        tag,
        commit: commitResult.stdout.trim(),
        timestamp: Number(dateResult.stdout.trim()) || Math.floor(now() / 1000),
      })
    }
    return result
  }

  async function buildEntry(body) {
    const root = await allowedRoot(body.root)
    const plugin = await inspectPlugin(root)
    if (plugin === null) fail('invalid-plugin', '目录不是 DSH 插件组合包（缺少 package.json 或 dsh.bundle）')
    const sourceType = body.sourceType === 'npm' ? 'npm' : 'git'
    const overrides = isObject(body.overrides) ? body.overrides : {}
    const gitInfo = plugin.git
    if (!NPM_NAME.test(plugin.name)) fail('invalid-plugin', 'package.json 的 name 不是合法 npm 包名')
    if (!SEMVER.test(plugin.version)) fail('invalid-plugin', 'package.json 的 version 不是精确 SemVer')
    const versions = []
    if (sourceType === 'npm') {
      versions.push({
        version: plugin.version,
        publishTimestamp: Math.floor(now() / 1000),
        source: { type: 'npm' },
      })
    } else {
      if (!gitInfo.isRepo || gitInfo.remote === null) {
        fail('github-remote-required', 'Git 源发布需要先为插件配置 GitHub 远程仓库')
      }
      const remote = parseGithubRemote(gitInfo.remote)
      const url = normalizeUrl(remote?.url ?? gitInfo.remote.replace(/\.git$/iu, ''))
      if (url === '') fail('invalid-git-remote', 'Git 远程地址必须是 http(s) URL')
      if (new URL(url).search !== '') fail('invalid-git-remote', 'Git 远程地址不能带 query 参数')
      const pathInRepo = gitInfo.repoRoot === null ? '' : path.relative(gitInfo.repoRoot, root).split(path.sep).join('/')
      if (pathInRepo.startsWith('..') || path.isAbsolute(pathInRepo)) fail('invalid-plugin-root', '插件目录不在 git 仓库内')
      const tagged = await tagVersions(plugin)
      const seen = new Set()
      for (const item of tagged) {
        if (seen.has(item.version)) continue
        seen.add(item.version)
        versions.push({
          version: item.version,
          publishTimestamp: item.timestamp,
          source: {
            type: 'git',
            url,
            commit: item.commit,
            ...(pathInRepo === '' || pathInRepo === '.' ? {} : { path: pathInRepo }),
          },
        })
      }
      if (!seen.has(plugin.version)) {
        if (gitInfo.head === null) fail('git-required', 'Git 仓库没有提交')
        const manifestRel = pathInRepo === '' || pathInRepo === '.' ? 'package.json' : `${pathInRepo}/package.json`
        const headManifest = await git(root, ['show', `HEAD:${manifestRel}`], { allowFailure: true })
        let headVersion = ''
        try {
          headVersion = JSON.parse(headManifest.stdout).version
        } catch {
          headVersion = ''
        }
        if (headVersion !== plugin.version) {
          fail('version-not-committed', `工作区版本 ${plugin.version} 未提交（HEAD 中为 ${headVersion || '未知'}）；请先提交并创建 tag，或把版本改回已提交值`)
        }
        versions.push({
          version: plugin.version,
          publishTimestamp: Math.floor(now() / 1000),
          source: {
            type: 'git',
            url,
            commit: gitInfo.head,
            ...(pathInRepo === '' || pathInRepo === '.' ? {} : { path: pathInRepo }),
          },
        })
      }
    }
    versions.sort((left, right) => semverCompare(right.version, left.version))
    const entry = {
      name: plugin.name,
      title: asString(overrides.title) || plugin.title || plugin.name,
      description: asString(overrides.description) || plugin.description,
      author: asString(overrides.author) || plugin.author,
      homepage: asString(overrides.homepage) || plugin.homepage,
      repository: (plugin.repository || (plugin.git.remoteGithub?.url ?? '')) ? { url: plugin.repository || plugin.git.remoteGithub.url } : undefined,
      versions,
    }
    if (asString(overrides.icon) !== '') entry.icon = asString(overrides.icon)
    const engine = asString(overrides.engines) || plugin.engines
    if (engine !== '') for (const version of versions) version.engines = { dsh: engine }
    return {
      root,
      plugin,
      sourceType,
      entry,
      warnings: [
        ...(gitInfo.dirty > 0 ? ['工作区有未提交改动；Git 源只发布已提交的 HEAD。'] : []),
        ...(sourceType === 'npm' && plugin.private ? ['package.json 标记了 private，npm 无法发布。'] : []),
      ],
    }
  }

  function githubHeaders(token) {
    return {
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'dsh-plugin-market-pro',
      authorization: `Bearer ${token}`,
    }
  }

  async function githubFetch(github, pathname, init = {}) {
    if (github.token === '') fail('github-token-required', '需要 GitHub Token：请在「GitHub 配置」中补充，或设置 GITHUB_TOKEN')
    let response
    try {
      response = await fetchImpl(`${github.apiBase.replace(/\/$/u, '')}${pathname}`, {
        ...init,
        headers: { ...githubHeaders(github.token), ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(20_000),
      })
    } catch (error) {
      fail('github-network', redact(error?.message || 'GitHub network error'))
    }
    const text = await response.text()
    let payload = null
    try {
      payload = text === '' ? null : JSON.parse(text)
    } catch {
      payload = null
    }
    if (!response.ok) {
      const message = typeof payload?.message === 'string' ? payload.message : `GitHub HTTP ${response.status}`
      fail(response.status === 401 ? 'github-auth' : 'github-api', message, { status: response.status })
    }
    return payload
  }

  async function readGithubIndex(github, market) {
    if (market.repo === null) return { index: null, sha: null }
    const encoded = market.repo.path.split('/').map(encodeURIComponent).join('/')
    const query = `?ref=${encodeURIComponent(market.repo.branch)}`
    let response
    try {
      response = await fetchImpl(`${github.apiBase.replace(/\/$/u, '')}/repos/${encodeURIComponent(market.repo.owner)}/${encodeURIComponent(market.repo.name)}/contents/${encoded}${query}`, {
        headers: githubHeaders(github.token),
        signal: AbortSignal.timeout(20_000),
      })
    } catch (error) {
      fail('github-network', redact(error?.message || 'GitHub network error'))
    }
    if (response.status === 404) return { index: null, sha: null }
    const text = await response.text()
    let payload = null
    try {
      payload = text === '' ? null : JSON.parse(text)
    } catch {
      payload = null
    }
    if (!response.ok) {
      fail('github-api', typeof payload?.message === 'string' ? payload.message : `GitHub HTTP ${response.status}`)
    }
    if (!isObject(payload) || typeof payload.content !== 'string') fail('invalid-market-index', '市场索引文件不是普通文件')
    let index
    try {
      index = JSON.parse(Buffer.from(payload.content.replace(/\n/gu, ''), 'base64').toString('utf8'))
    } catch {
      fail('invalid-market-index', '市场索引不是合法 JSON')
    }
    if (!isObject(index) || index.format !== 1 || !Array.isArray(index.plugins)) {
      fail('invalid-market-index', '市场索引不是 DSH format 1 索引')
    }
    return { index, sha: payload.sha ?? null }
  }

  async function publish(body) {
    const config = await readConfig()
    const github = await resolveGithub()
    const marketId = asString(body.marketId)
    const market = config.markets.find((entry) => entry.id === marketId)
    if (market === undefined) fail('market-not-configured', '请先在「市场配置」中保存这个市场')
    const built = await buildEntry(body)
    const token = market.token || github.token
    const dryRun = body.dryRun === true
    let noTokenPreview = false
    if (market.repo !== null && token === '') {
      if (!dryRun) fail('github-token-required', '这个市场配置了 GitHub 仓库，发布需要 Token：请在 GitHub 配置或市场配置中补充')
      noTokenPreview = true
    }
    const githubWithMarket = { ...github, token }
    let existing = { index: null, sha: null }
    if (market.repo !== null && !noTokenPreview) existing = await readGithubIndex(githubWithMarket, market)
    const index = existing.index ?? {
      format: 1,
      title: { en: market.name, zh: market.name },
      plugins: [],
    }
    const plugins = Array.isArray(index.plugins) ? [...index.plugins] : []
    const at = plugins.findIndex((entry) => entry?.name === built.entry.name)
    if (at >= 0) plugins[at] = built.entry
    else plugins.push(built.entry)
    const nextIndex = { ...index, format: 1, plugins }
    if (dryRun) {
      return {
        ok: true,
        mode: 'dry-run',
        dryRun: true,
        entry: built.entry,
        index: nextIndex,
        warnings: [
          ...built.warnings,
          ...(noTokenPreview ? ['没有 GitHub Token，未能读取现有索引；预览只包含本插件条目。'] : []),
        ],
        instructions: noTokenPreview
          ? 'dry-run：没有 Token，未读取现有索引，仅生成新条目预览；填写 Token 后可预览真实合并结果。'
          : 'dry-run：已读取现有索引并模拟合并，不会写入 GitHub。',
      }
    }
    if (market.repo === null) {
      return {
        ok: true,
        mode: 'manual',
        dryRun: false,
        entry: built.entry,
        index: nextIndex,
        warnings: built.warnings,
        instructions: '该市场尚未配置 GitHub 仓库；请把 entry 合并进其 index.json，或在「市场配置」中填写 owner/repo/branch/path 后自动提交。',
      }
    }
    const encoded = market.repo.path.split('/').map(encodeURIComponent).join('/')
    const payload = await githubFetch(githubWithMarket, `/repos/${encodeURIComponent(market.repo.owner)}/${encodeURIComponent(market.repo.name)}/contents/${encoded}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `chore(market): publish ${built.entry.name}@${built.entry.versions[0]?.version ?? ''}`,
        content: Buffer.from(`${JSON.stringify(nextIndex, null, 2)}\n`, 'utf8').toString('base64'),
        branch: market.repo.branch,
        ...(existing.sha === null ? {} : { sha: existing.sha }),
      }),
    })
    return {
      ok: true,
      mode: 'committed',
      entry: built.entry,
      commit: payload?.commit?.html_url ?? null,
      market: maskMarket(market),
      warnings: built.warnings,
    }
  }

  async function githubStatus(body) {
    const root = await allowedRoot(body.root)
    const plugin = await inspectPlugin(root)
    if (plugin === null) fail('invalid-plugin', '不是 DSH 插件组合包')
    const github = await resolveGithub()
    let api = null
    if (github.hasToken && plugin.git.remoteGithub !== null) {
      try {
        const payload = await githubFetch(github, `/repos/${encodeURIComponent(plugin.git.remoteGithub.owner)}/${encodeURIComponent(plugin.git.remoteGithub.name)}`)
        api = {
          htmlUrl: payload?.html_url ?? null,
          private: payload?.private === true,
          defaultBranch: payload?.default_branch ?? null,
          stars: payload?.stargazers_count ?? null,
          issues: payload?.open_issues_count ?? null,
          pushedAt: payload?.pushed_at ?? null,
        }
      } catch (error) {
        api = { error: error.message }
      }
    }
    return { ok: true, plugin, github: maskGithub(github), api }
  }

  async function commitIfRequested(root, body) {
    if (body.commit !== true) return null
    await git(root, ['add', '-A'])
    const status = await git(root, ['status', '--porcelain'], { allowFailure: true })
    if (!status.ok || status.stdout.trim() === '') return null
    const message = asString(body.commitMessage) || 'chore: publish local plugin updates'
    await git(root, ['commit', '-m', message])
    const head = await git(root, ['rev-parse', 'HEAD'])
    return head.stdout.trim()
  }

  async function githubPush(body) {
    const root = await allowedRoot(body.root)
    const plugin = await inspectPlugin(root)
    if (plugin === null) fail('invalid-plugin', '不是 DSH 插件组合包')
    if (plugin.git.isRepo && plugin.git.repoRoot !== null && path.resolve(plugin.git.repoRoot) !== root) {
      fail('repo-root-required', '插件位于外层 git 仓库的子目录；为避免提交/推送整个仓库，请把插件目录作为独立仓库或手动推送')
    }
    let initialized = false
    if (!plugin.git.isRepo) {
      if (body.initialize !== true) {
        fail('git-init-required', '插件目录还不是 git 仓库；请勾选“初始化 git 仓库”或先手动 git init')
      }
      await git(root, ['init'])
      const ignore = path.join(root, '.gitignore')
      if (!existsSync(ignore)) {
        await writeFile(ignore, 'node_modules/\n.git/\n*.log\n.DS_Store\n.env\n.env.*\n*.pem\n')
      }
      await git(root, ['add', '-A'])
      const message = asString(body.commitMessage) || 'chore: initial commit'
      await git(root, ['commit', '-m', message])
      await git(root, ['branch', '-M', 'main'])
      initialized = true
    } else if (plugin.git.head === null) {
      await git(root, ['add', '-A'])
      await git(root, ['commit', '-m', asString(body.commitMessage) || 'chore: initial commit'])
      initialized = true
    }
    const github = await resolveGithub()
    let remote = plugin.git.remote
    let remoteInfo = parseGithubRemote(remote)
    const createRepo = body.createRepo === true
    if (remote === null && !createRepo) fail('github-remote-required', '没有 origin 远程仓库；请勾选「创建仓库」或先手动添加')
    if (remote === null && createRepo) {
      if (!github.hasToken) fail('github-token-required', '创建 GitHub 仓库需要 Token')
      const user = await githubFetch(github, '/user')
      const login = asString(user?.login)
      const owner = asString(body.owner) || github.owner || login
      const repoName = asString(body.repoName) || plugin.name.split('/').pop() || 'dsh-plugin'
      if (!GITHUB_OWNER.test(owner)) fail('invalid-github-owner', 'GitHub 用户名/组织名格式不正确')
      if (!GITHUB_NAME.test(repoName)) fail('invalid-github-repo', '仓库名格式不正确')
      const repoPath = owner.toLowerCase() === login.toLowerCase() ? '/user/repos' : `/orgs/${encodeURIComponent(owner)}/repos`
      let created = null
      try {
        created = await githubFetch(github, repoPath, {
          method: 'POST',
          body: JSON.stringify({
            name: repoName,
            private: body.private !== false,
            description: plugin.description.slice(0, 300),
          }),
        })
      } catch (error) {
        if (error?.code !== 'github-api' || !/already exists/iu.test(error.message)) throw error
      }
      const url = created?.clone_url ?? `https://github.com/${owner}/${repoName}.git`
      await git(root, ['remote', 'add', 'origin', url])
      remote = url
      remoteInfo = parseGithubRemote(url)
    }
    const commit = await commitIfRequested(root, body)
    const branchResult = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
    const branch = branchResult.stdout.trim()
    if (branch === 'HEAD') fail('git-branch', '当前处于 detached HEAD，无法上传')
    const token = github.token
    const extraEnv = {}
    if (token !== '' && remoteInfo !== null) {
      const basic = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64')
      extraEnv.GIT_CONFIG_COUNT = '1'
      extraEnv.GIT_CONFIG_KEY_0 = 'http.https://github.com/.extraheader'
      extraEnv.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${basic}`
    }
    await git(root, ['push', '-u', 'origin', branch], { timeout: 120_000, extraEnv })
    let tagsPushed = 0
    if (body.pushTags === true) {
      const tags = await git(root, ['tag'], { allowFailure: true })
      const tagList = tags.ok ? tags.stdout.split('\n').filter(Boolean) : []
      if (tagList.length > 0) {
        await git(root, ['push', 'origin', '--tags'], { timeout: 120_000, extraEnv })
        tagsPushed = tagList.length
      }
    }
    const head = await git(root, ['rev-parse', 'HEAD'])
    const repoUrl = remoteInfo?.url ?? remote
    return {
      ok: true,
      initialized,
      repoUrl,
      htmlUrl: repoUrl,
      branch,
      commit: commit ?? head.stdout.trim(),
      tagsPushed,
      dirtyBeforePush: plugin.git.dirty,
    }
  }

  async function handle(pathname, body) {
    body = isObject(body) ? body : {}
    switch (pathname) {
      case '/publisher/overview':
        return overview()
      case '/publisher/config':
        return saveGithub(body)
      case '/publisher/markets':
        if (body.action === 'remove') return removeMarket(body)
        return saveMarket(body)
      case '/publisher/roots':
        return saveRoots(body)
      case '/publisher/version':
        return updateVersion(body)
      case '/publisher/index':
        return buildEntry(body)
      case '/publisher/github/status':
        return githubStatus(body)
      case '/publisher/github/push':
        return githubPush(body)
      case '/publisher/publish':
        return publish(body)
      default:
        fail('invalid-request', `未知发布方法 ${pathname}`)
    }
  }

  return {
    handle,
    overview,
    listPlugins,
    buildEntry,
    publish,
    githubStatus,
    githubPush,
    updateVersion,
  }
}
