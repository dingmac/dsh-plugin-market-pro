/**
 * Client half of 插件市场 Pro.
 *
 * Registers a sidebar entry and the matching main panel. Two tabs:
 *   - 发现 (Discover): cards from every index source the native plugin market is configured with,
 *     with search, source/category/label filters, sorting (recommendation / time / heat / quality /
 *     name / stars / downloads / rank), pagination (max 50 per page), recommendations and install.
 *   - 管理 (Manage): installed bundles, registry version refresh, update and uninstall.
 *
 * Every action goes through the Host route registered by index.js; this file never talks to the
 * network or the profile directly.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-plugin-market-pro',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'plugin-market-pro'
    const ROUTE = '/_dsh/plugin-market-pro'
    const PANEL_KEY = 'plugin-market-pro'
    const ENTRY_ORDER = 31
    const LANG_STORAGE = 'dsh-plugin-market-pro.lang'
    const PAGE_SIZES = [12, 24, 48, 50]
    const BASE_SORTS = ['recommended', 'relevance', 'time', 'heat', 'rating', 'name', 'stars', 'downloads', 'rank']

    const DICT = {
      zh: {
        'nav.title': '插件市场',
        'panel.title': '插件市场 Pro',
        'panel.subtitle': '读取原生插件市场索引源，卡片化浏览、搜索、排序与推荐，并安装 / 更新 / 卸载',
        'tab.discover': '发现',
        'tab.manage': '管理',
        'tab.local': '本地插件',
        'action.refresh': '同步',
        'action.refreshing': '同步中…',
        'action.retry': '重试',
        'action.enable': '启用',
        'action.disable': '停用',
        'action.install': '安装',
        'action.installed': '已安装',
        'action.update': '更新',
        'action.updateTo': '更新到 v{version}',
        'action.uninstall': '卸载',
        'action.details': '详情',
        'action.close': '关闭',
        'action.cancel': '取消',
        'action.confirm': '确认',
        'action.confirmInstall': '确认安装',
        'action.confirmUpdate': '确认更新',
        'action.confirmUninstall': '确认卸载',
        'action.allowAndRetry': '允许并重试',
        'action.clear': '清空',
        'action.prev': '上一页',
        'action.next': '下一页',
        'action.cancelOperation': '取消操作',
        'label.source': '来源',
        'label.dataUrl': '数据 URL',
        'label.category': '分类',
        'label.labels': '标签',
        'label.quality': '口碑分',
        'label.heat': '热度',
        'label.stars': '星标',
        'label.downloads': '下载',
        'label.installedVersion': '已安装 v{version}',
        'label.versionCount': '{count} 个版本',
        'label.total': '共 {total} 个',
        'label.perPage': '每页',
        'label.noSources': '尚未配置索引来源',
        'label.noSourcesHint': '先在原生插件页的「发现」中添加索引源，再回到这里点「同步」。',
        'label.empty': '没有符合条件的插件',
        'label.emptyHint': '试试更换关键词、来源或筛选条件。',
        'label.syncedAt': '同步于 {time}',
        'label.syncingSources': '正在同步来源 {done}/{total}…',
        'label.sources': '{count} 个来源',
        'label.entries': '{count} 条目',
        'label.hideInstalled': '隐藏已安装',
        'label.onlyCompatible': '仅显示兼容',
        'label.recommend': '为你推荐',
        'label.recommendBasis': '按已安装插件与热度综合推荐',
        'label.manageTitle': '已安装插件',
        'label.pluginDetail': '插件详情',
        'label.rows': '插件行',
        'label.overrides': '覆盖的已有行',
        'label.availability': '可用性',
        'label.noRows': '没有声明行',
        'label.marketInfo': '市场信息',
        'label.enableState': '启用状态',
        'label.manageSubtitle': '查看版本、刷新更新并卸载',
        'label.updateAvailable': '可更新',
        'label.upToDate': '已是最新',
        'label.localLink': '本地链接',
        'label.self': '本插件',
        'label.builtin': '内置',
        'label.enabled': '已启用',
        'label.disabled': '已停用',
        'label.readOnly': '受保护',
        'label.error': '错误',
        'label.checkedAt': '版本检查于 {time}',
        'label.refreshVersions': '刷新版本',
        'label.refreshingVersions': '检查版本中…',
        'label.registryVersions': 'registry 新版本',
        'label.marketVersion': '市场最新 v{version}',
        'label.noUpdates': '没有可用更新',
        'label.installedCount': '已安装 {count} 个',
        'label.updatesCount': '{count} 个可更新',
        'label.opRunning': '正在{kind}…',
        'label.opNeedsApproval': '需要批准构建脚本',
        'label.opDone': '完成',
        'label.opFailed': '失败',
        'label.opCancelled': '已取消',
        'label.elapsed': '已用时 {seconds}s',
        'label.pendingBuilds': '待批准的构建脚本',
        'label.pendingBuildsHint': 'pnpm 阻止了以下依赖脚本。仅在你信任该插件及其来源时批准。',
        'label.trust': '第三方内容，安装前请自行确认来源与权限。',
        'label.readme': '插件说明',
        'label.aiReview': 'AI 解读与评估',
        'label.localReview': '本地评估',
        'label.aiLoading': 'AI 正在阅读插件说明…',
        'label.aiUnavailable': 'AI 暂时不可用',
        'label.strengths': '优势',
        'label.risks': '风险',
        'label.verdict': '结论',
        'label.alternatives': '平替推荐',
        'label.alternativesNone': '暂时没有合适的平替',
        'label.noReadme': '源地址没有提供说明文档',
        'label.aiModel': '模型',
        'label.audience': '适合',
        'label.purpose': '用途',
        'label.reviewSource': '依据',
        'label.sourceMarket': '市场源',
        'label.sourceBundle': '本地包',
        'label.rawReview': 'AI 原始输出',
        'msg.readmeFailed': '读取说明失败：{message}',
        'msg.aiFailed': 'AI 评估失败：{message}',
        'msg.alternativesFailed': '读取平替失败：{message}',
        'ai.note.non-json': '模型未返回结构化结果，已显示本地评估。',
        'ai.note.timeout': 'AI 超时，已显示本地评估。',
        'ai.note.llm-error': 'AI 调用失败，已显示本地评估。',

        'label.installedHint': '已安装在当前 profile；请在「管理」tab 更新或卸载后再切换版本。',
        'label.replacesLink': '该插件当前是本地链接/路径版本，更新会替换为市场或 registry 版本。',
        'label.qualityHint': '口碑分由安装验证、安全结论、星标、下载量与更新活跃度综合计算，不是用户评分。',
        'label.sourceCount': '+{count} 个来源',
        'label.versionList': '版本',
        'label.version': '版本',
        'badge.latest': '最新',
        'badge.exempted': '已豁免',
        'label.footer': '数据来自原生 plugin-market 配置的索引源；第三方内容，安装前请确认。',
        'label.uninstallHint': '卸载会移除 profile 依赖并要求相关行停止。此操作不可撤销。',
        'label.direction': '方向',
        'label.asc': '升序',
        'label.desc': '降序',
        'label.filter': '筛选',
        'label.searchHint': '搜索插件、作者、关键词…',
        'label.allSources': '全部来源',
        'label.allCategories': '全部',
        'label.status': '安装状态',
        'sort.recommended': '智能推荐',
        'sort.relevance': '相关度',
        'sort.time': '最新发布',
        'sort.heat': '热度',
        'sort.rating': '评价',
        'sort.name': '名称',
        'sort.stars': '星标',
        'sort.downloads': '下载',
        'sort.rank': '榜单名次',
        'status.all': '全部状态',
        'status.not-installed': '未安装',
        'status.installed': '已安装',
        'status.update-available': '可更新',
        'status.different-version': '版本不同',
        'status.provided': '内置',
        'reason.category': '与你已安装的同类',
        'reason.keyword': '关键词相近',
        'reason.popular': '近期热门',
        'reason.quality': '高口碑',
        'reason.fresh': '新上架',
        'op.install': '安装',
        'op.update': '更新',
        'op.uninstall': '卸载',
        'op.toggle': '切换状态',
        'phase.starting': '准备',
        'phase.resolving': '解析',
        'phase.installing': '安装',
        'phase.removing': '移除',
        'phase.updating': '更新',
        'phase.toggling': '切换中',
        'phase.verifying': '校验',
        'phase.done': '完成',
        'msg.installStarted': '已开始安装 {name}@{version}',
        'msg.updateStarted': '已开始更新 {name} → v{version}',
        'msg.uninstallStarted': '已开始卸载 {name}',
        'msg.enableStarted': '正在启用 {name}',
        'msg.disableStarted': '正在停用 {name}',
        'msg.enabledDone': '{name} 已启用',
        'msg.disabledDone': '{name} 已停用',
        'msg.installDone': '{name} 安装完成',
        'msg.updateDone': '{name} 更新完成',
        'msg.uninstallDone': '{name} 已卸载',
        'msg.failed': '操作失败：{message}',
        'msg.restart': '需要重启 DSH 后生效。',
        'msg.cancelled': '操作已取消',
        'msg.tooLate': '操作已进入不可取消阶段',
        'msg.loadFailed': '读取失败：{message}',
        'msg.refreshed': '已同步最新索引',
        'msg.syncing': '正在后台同步索引…',
        'error.title': '无法读取插件市场',
      },
      en: {
        'nav.title': 'Plugin Market',
        'panel.title': 'Plugin Market Pro',
        'panel.subtitle': 'Browse the configured DSH plugin market indexes as cards with search, sorting and recommendations; install, update and uninstall.',
        'tab.discover': 'Discover',
        'tab.manage': 'Manage',
        'tab.local': 'Local plugins',
        'action.refresh': 'Sync',
        'action.refreshing': 'Syncing…',
        'action.retry': 'Retry',
        'action.enable': 'Enable',
        'action.disable': 'Disable',
        'action.install': 'Install',
        'action.installed': 'Installed',
        'action.update': 'Update',
        'action.updateTo': 'Update to v{version}',
        'action.uninstall': 'Uninstall',
        'action.details': 'Details',
        'action.close': 'Close',
        'action.cancel': 'Cancel',
        'action.confirm': 'Confirm',
        'action.confirmInstall': 'Install',
        'action.confirmUpdate': 'Update',
        'action.confirmUninstall': 'Uninstall',
        'action.allowAndRetry': 'Allow and retry',
        'action.clear': 'Clear',
        'action.prev': 'Previous',
        'action.next': 'Next',
        'action.cancelOperation': 'Cancel operation',
        'label.source': 'Source',
        'label.dataUrl': 'Data URL',
        'label.category': 'Category',
        'label.labels': 'Labels',
        'label.quality': 'Quality',
        'label.heat': 'Heat',
        'label.stars': 'Stars',
        'label.downloads': 'Downloads',
        'label.installedVersion': 'Installed v{version}',
        'label.versionCount': '{count} versions',
        'label.total': '{total} results',
        'label.perPage': 'Per page',
        'label.noSources': 'No index source configured',
        'label.noSourcesHint': 'Add an index source under the native Plugins → Discover tab, then press Sync here.',
        'label.empty': 'No matching plugins',
        'label.emptyHint': 'Try another keyword, source or filter.',
        'label.syncedAt': 'Synced {time}',
        'label.syncingSources': 'Syncing {done}/{total} sources…',
        'label.sources': '{count} sources',
        'label.entries': '{count} entries',
        'label.hideInstalled': 'Hide installed',
        'label.onlyCompatible': 'Compatible only',
        'label.recommend': 'Recommended for you',
        'label.recommendBasis': 'Based on installed plugins and popularity',
        'label.manageTitle': 'Installed plugins',
        'label.pluginDetail': 'Plugin details',
        'label.rows': 'Plugin rows',
        'label.overrides': 'Overridden rows',
        'label.availability': 'Availability',
        'label.noRows': 'No declared rows',
        'label.marketInfo': 'Market info',
        'label.enableState': 'Enabled',
        'label.manageSubtitle': 'Inspect versions, refresh updates and uninstall',
        'label.updateAvailable': 'Update available',
        'label.upToDate': 'Up to date',
        'label.localLink': 'Local link',
        'label.self': 'This plugin',
        'label.builtin': 'Built in',
        'label.enabled': 'Enabled',
        'label.disabled': 'Disabled',
        'label.readOnly': 'Protected',
        'label.error': 'Error',
        'label.checkedAt': 'Versions checked {time}',
        'label.refreshVersions': 'Refresh versions',
        'label.refreshingVersions': 'Checking versions…',
        'label.registryVersions': 'new registry versions',
        'label.marketVersion': 'Market latest v{version}',
        'label.noUpdates': 'No updates',
        'label.installedCount': '{count} installed',
        'label.updatesCount': '{count} updatable',
        'label.opRunning': '{kind} in progress…',
        'label.opNeedsApproval': 'Build scripts need approval',
        'label.opDone': 'Done',
        'label.opFailed': 'Failed',
        'label.opCancelled': 'Cancelled',
        'label.elapsed': '{seconds}s elapsed',
        'label.pendingBuilds': 'Build scripts awaiting approval',
        'label.pendingBuildsHint': 'pnpm blocked these dependency scripts. Approve only when you trust the plugin and its source.',
        'label.trust': 'Third-party content — review the source and permissions before installing.',
        'label.readme': 'Plugin description',
        'label.aiReview': 'AI review',
        'label.localReview': 'Local review',
        'label.aiLoading': 'AI is reading the description…',
        'label.aiUnavailable': 'AI unavailable',
        'label.strengths': 'Strengths',
        'label.risks': 'Risks',
        'label.verdict': 'Verdict',
        'label.alternatives': 'Alternatives',
        'label.alternativesNone': 'No close alternatives found',
        'label.noReadme': 'The source has no description document',
        'label.aiModel': 'Model',
        'label.audience': 'Audience',
        'label.purpose': 'Purpose',
        'label.reviewSource': 'Based on',
        'label.sourceMarket': 'Market source',
        'label.sourceBundle': 'Local bundle',
        'label.rawReview': 'Raw AI output',
        'msg.readmeFailed': 'Read description failed: {message}',
        'msg.aiFailed': 'AI review failed: {message}',
        'msg.alternativesFailed': 'Read alternatives failed: {message}',
        'ai.note.non-json': 'The model did not return structured JSON; showing the local review.',
        'ai.note.timeout': 'AI timed out; showing the local review.',
        'ai.note.llm-error': 'AI call failed; showing the local review.',        'label.installedHint': 'Already installed in this profile; update or uninstall it in Manage before switching versions.',
        'label.replacesLink': 'This plugin is a local link/path build. Updating replaces it with the market or registry version.',
        'label.qualityHint': 'Quality combines install verification, security verdict, stars, downloads and maintenance. It is not a user rating.',
        'label.sourceCount': '+{count} sources',
        'label.versionList': 'Versions',
        'label.version': 'Version',
        'badge.latest': 'latest',
        'badge.exempted': 'exempted',
        'label.footer': 'Data comes from the index sources configured for the native plugin market; third-party content.',
        'label.uninstallHint': 'Uninstalling removes the profile dependency and stops its rows. This cannot be undone.',
        'label.direction': 'Direction',
        'label.asc': 'Ascending',
        'label.desc': 'Descending',
        'label.filter': 'Filter',
        'label.searchHint': 'Search plugins, authors, keywords…',
        'label.allSources': 'All sources',
        'label.allCategories': 'All',
        'label.status': 'Status',
        'sort.recommended': 'Recommended',
        'sort.relevance': 'Relevance',
        'sort.time': 'Newest',
        'sort.heat': 'Heat',
        'sort.rating': 'Quality',
        'sort.name': 'Name',
        'sort.stars': 'Stars',
        'sort.downloads': 'Downloads',
        'sort.rank': 'Leaderboard rank',
        'status.all': 'Any status',
        'status.not-installed': 'Not installed',
        'status.installed': 'Installed',
        'status.update-available': 'Update available',
        'status.different-version': 'Different version',
        'status.provided': 'Provided by DSH',
        'reason.category': 'Same category as your plugins',
        'reason.keyword': 'Similar keywords',
        'reason.popular': 'Popular now',
        'reason.quality': 'Highly rated',
        'reason.fresh': 'Recently published',
        'op.install': 'Install',
        'op.update': 'Update',
        'op.uninstall': 'Uninstall',
        'op.toggle': 'Toggle',
        'phase.starting': 'Starting',
        'phase.resolving': 'Resolving',
        'phase.installing': 'Installing',
        'phase.removing': 'Removing',
        'phase.updating': 'Updating',
        'phase.toggling': 'Toggling',
        'phase.verifying': 'Verifying',
        'phase.done': 'Done',
        'msg.installStarted': 'Installing {name}@{version}',
        'msg.updateStarted': 'Updating {name} → v{version}',
        'msg.uninstallStarted': 'Uninstalling {name}',
        'msg.enableStarted': 'Enabling {name}',
        'msg.disableStarted': 'Disabling {name}',
        'msg.enabledDone': '{name} enabled',
        'msg.disabledDone': '{name} disabled',
        'msg.installDone': '{name} installed',
        'msg.updateDone': '{name} updated',
        'msg.uninstallDone': '{name} uninstalled',
        'msg.failed': 'Operation failed: {message}',
        'msg.restart': 'Restart DSH to apply.',
        'msg.cancelled': 'Operation cancelled',
        'msg.tooLate': 'Operation reached a non-cancellable phase',
        'msg.loadFailed': 'Read failed: {message}',
        'msg.refreshed': 'Indexes synced',
        'msg.syncing': 'Syncing indexes in the background…',
        'error.title': 'Could not read the plugin market',
      },
    }

    function detectLanguage() {
      try {
        const saved = window.localStorage.getItem(LANG_STORAGE)
        if (saved === 'zh' || saved === 'en') return saved
      } catch {
        /* storage unavailable */
      }
      try {
        if (String(document.documentElement.lang || '').toLowerCase().startsWith('zh')) return 'zh'
      } catch {
        /* no document */
      }
      return 'en'
    }

    function makeT(language) {
      return function translate(key, variables) {
        const table = DICT[language] || DICT.en
        let text = table[key] ?? DICT.en[key] ?? key
        if (variables !== undefined && variables !== null) {
          for (const [name, value] of Object.entries(variables)) {
            text = text.split(`{${name}}`).join(String(value))
          }
        }
        return text
      }
    }

    function localize(text, language) {
      if (text === null || typeof text !== 'object') return ''
      return text[language] ?? text.en ?? Object.values(text)[0] ?? ''
    }

    function formatNumber(value, language) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      try {
        return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value)
      } catch {
        return String(value)
      }
    }

    function formatDate(seconds, language) {
      if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '—'
      try {
        return new Date(seconds * 1000).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      } catch {
        return '—'
      }
    }

    function formatTime(milliseconds, language) {
      if (typeof milliseconds !== 'number' || milliseconds <= 0) return '—'
      try {
        return new Date(milliseconds).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      } catch {
        return '—'
      }
    }

    function hostOf(url) {
      try {
        return new URL(url).host
      } catch {
        return url
      }
    }

    function defaultSortDirection(key, meta) {
      const declared = meta && meta.sortKeys ? meta.sortKeys[key] : null
      if (declared && (declared.order === 'asc' || declared.order === 'desc')) return declared.order
      if (key === 'name' || key === 'rank') return 'asc'
      return 'desc'
    }

    function scoreClass(score) {
      if (score >= 80) return 'pmp-score-good'
      if (score >= 60) return 'pmp-score-mid'
      return 'pmp-score-low'
    }

    async function request(path, body, signal) {
      let response
      try {
        response = await fetch(ROUTE + path, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body ?? {}),
          signal,
        })
      } catch (error) {
        if (error && error.name === 'AbortError') throw error
        throw new Error(error && error.message ? error.message : 'network error')
      }
      let payload = null
      try {
        payload = await response.json()
      } catch {
        /* not JSON */
      }
      if (!response.ok || payload === null || payload.ok === false) {
        const message = payload && payload.error && payload.error.message
          ? payload.error.message
          : `HTTP ${response.status}`
        const error = new Error(message)
        error.code = payload && payload.error ? payload.error.code : undefined
        error.details = payload && payload.error ? payload.error.details : undefined
        error.status = response.status
        throw error
      }
      return payload
    }

    /* ------------------------------------------------------------------ */
    /* Small presentational pieces                                        */
    /* ------------------------------------------------------------------ */

    function PluginIcon(props) {
      const [failed, setFailed] = React.useState(false)
      const item = props.item
      const source = failed || !item.icon ? null : item.icon
      if (source !== null) {
        return h('img', {
          className: 'pmp-icon',
          src: source,
          alt: '',
          loading: 'lazy',
          referrerPolicy: 'no-referrer',
          onError: () => setFailed(true),
        })
      }
      const letter = (localize(item.title, props.language) || item.name || '?').replace(/^@/u, '').slice(0, 1).toUpperCase()
      return h('span', { className: 'pmp-icon pmp-icon-fallback', 'aria-hidden': true }, letter)
    }

    function Badge(props) {
      return h('span', { className: `pmp-badge ${props.tone ? `pmp-badge-${props.tone}` : ''}` }, props.children)
    }

    function labelTitle(meta, id, language) {
      const declaration = meta && meta.labels ? meta.labels[id] : null
      return declaration ? localize(declaration.title, language) || id : id
    }

    function categoryTitle(meta, id, language) {
      const declaration = meta && meta.categories ? meta.categories[id] : null
      return declaration ? localize(declaration.title, language) || id : id
    }

    function sortTitle(meta, key, t, language) {
      const declaration = meta && meta.sortKeys ? meta.sortKeys[key] : null
      if (declaration) return localize(declaration.title, language) || key
      return t(`sort.${key}`)
    }

    function StatusBadge(props) {
      const tone = props.status === 'installed' ? 'done'
        : props.status === 'update-available' ? 'warn'
          : props.status === 'provided' ? 'muted'
            : props.status === 'different-version' ? 'muted' : 'info'
      return h(Badge, { tone }, props.t('status.' + props.status))
    }

    function ScoreChip(props) {
      return h(
        'span',
        {
          className: `pmp-score ${scoreClass(props.score)}`,
          title: props.title ?? '',
        },
        String(props.score ?? '—'),
      )
    }

    function SourceLine(props) {
      const item = props.item
      const title = localize(item.sourceTitle, props.language) || hostOf(item.sourceUrl)
      const extra = Array.isArray(item.otherSources) && item.otherSources.length > 0
        ? h('span', { className: 'pmp-badge pmp-badge-muted' }, props.t('label.sourceCount', { count: item.otherSources.length }))
        : null
      return h(
        'div',
        { className: 'pmp-source' },
        h('span', { className: 'pmp-source-name', title: title }, h('span', { className: 'pmp-source-dot' }), title),
        extra,
        h('span', { className: 'pmp-url', title: item.sourceUrl }, item.sourceUrl),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Card                                                               */
    /* ------------------------------------------------------------------ */

    function CardView(props) {
      const item = props.item
      const t = props.t
      const language = props.language
      const meta = props.meta
      const status = item.installStatus
      const labels = (item.labels || []).slice(0, 4)
      const category = item.category ? h(Badge, { tone: 'category' }, categoryTitle(meta, item.category, language)) : null
      const version = item.version || item.latestVersion
      const compatible = item.defaultVersion !== null && item.defaultVersion !== undefined
      const canInstall = status === 'not-installed' && compatible
      const canUpdate = status === 'update-available'
      const primary = status === 'installed' || status === 'provided'
        ? h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', disabled: true }, t('action.installed'))
        : canUpdate
          ? h('button', {
              type: 'button',
              className: 'pmp-btn pmp-btn-primary pmp-btn-sm',
              onClick: () => props.onUpdate(item),
            }, t('action.update'))
          : status === 'different-version'
            ? h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', disabled: true }, t('status.different-version'))
            : h('button', {
              type: 'button',
              className: 'pmp-btn pmp-btn-primary pmp-btn-sm',
              disabled: !canInstall,
              title: compatible ? '' : t('status.different-version'),
              onClick: () => props.onInstall(item),
            }, t('action.install'))
      return h(
        'article',
        { className: 'pmp-card' },
        h(
          'div',
          { className: 'pmp-card-head' },
          h(PluginIcon, { item, language }),
          h(
            'div',
            { className: 'pmp-card-titles' },
            h('h3', { className: 'pmp-card-title', title: localize(item.title, language) || item.name }, localize(item.title, language) || item.name),
            h(
              'div',
              { className: 'pmp-card-meta' },
              h('span', { title: item.author || '' }, item.author || '—'),
              h('span', { className: 'pmp-dot' }, '·'),
              h('span', null, `v${version}`),
              item.publishedAt ? h('span', { className: 'pmp-dot' }, '·') : null,
              item.publishedAt ? h('span', null, formatDate(item.publishedAt, language)) : null,
            ),
          ),
          h(ScoreChip, { score: item.quality, title: t('label.qualityHint') }),
        ),
        h('p', { className: 'pmp-desc' }, localize(item.description, language) || ''),
        h(
          'div',
          { className: 'pmp-badges' },
          category,
          labels.map((id) => h(Badge, { key: id }, labelTitle(meta, id, language))),
          item.anyCompatible === false ? h(Badge, { tone: 'danger' }, t('status.different-version')) : null,
        ),
        h(
          'div',
          { className: 'pmp-stats' },
          item.stars !== null && item.stars !== undefined
            ? h('span', { className: 'pmp-stat', title: t('label.stars') }, `★ ${formatNumber(item.stars, language)}`)
            : null,
          item.downloads !== null && item.downloads !== undefined
            ? h('span', { className: 'pmp-stat', title: t('label.downloads') }, `↓ ${formatNumber(item.downloads, language)}`)
            : null,
          h('span', { className: 'pmp-stat', title: t('label.heat') }, `🔥 ${item.heat ?? 0}`),
          h('span', { className: 'pmp-stat', title: t('label.versionCount', { count: item.versionCount }) }, `v${version}`),
        ),
        h(SourceLine, { item, language, t }),
        h(
          'div',
          { className: 'pmp-card-actions' },
          h(
            'div',
            { className: 'pmp-card-status' },
            h(StatusBadge, { status, t }),
            item.installedVersion ? h('span', { className: 'pmp-installed-version' }, t('label.installedVersion', { version: item.installedVersion })) : null,
          ),
          h(
            'div',
            { className: 'pmp-card-buttons' },
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => props.onDetails(item) }, t('action.details')),
            primary,
          ),
        ),
      )
    }

    function CardSkeleton() {
      return h(
        'div',
        { className: 'pmp-card pmp-card-skeleton', 'aria-hidden': true },
        h('div', { className: 'pmp-skeleton-line pmp-skeleton-title' }),
        h('div', { className: 'pmp-skeleton-line' }),
        h('div', { className: 'pmp-skeleton-line pmp-skeleton-short' }),
        h('div', { className: 'pmp-skeleton-line pmp-skeleton-block' }),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Recommendation strip                                               */
    /* ------------------------------------------------------------------ */

    function RecoStrip(props) {
      if (!props.items || props.items.length === 0) return null
      const t = props.t
      return h(
        'section',
        { className: 'pmp-reco' },
        h(
          'div',
          { className: 'pmp-reco-head' },
          h('h2', { className: 'pmp-section-title' }, t('label.recommend')),
          h('span', { className: 'pmp-reco-basis' }, t('label.recommendBasis')),
        ),
        h(
          'div',
          { className: 'pmp-reco-track' },
          props.items.map((item) => {
            const reason = item.reason ? t(`reason.${item.reason.type}`) : null
            return h(
              'button',
              {
                key: item.key,
                type: 'button',
                className: 'pmp-reco-card',
                onClick: () => props.onDetails(item),
              },
              h(
                'div',
                { className: 'pmp-reco-top' },
                h(PluginIcon, { item, language: props.language }),
                h('span', { className: 'pmp-reco-title' }, localize(item.title, props.language) || item.name),
                h(ScoreChip, { score: item.quality, title: t('label.qualityHint') }),
              ),
              h('p', { className: 'pmp-reco-desc' }, localize(item.description, props.language) || ''),
              h('span', { className: 'pmp-reco-source', title: item.sourceUrl },
                `${localize(item.sourceTitle, props.language) || hostOf(item.sourceUrl)} · ${item.sourceUrl}`),
              reason ? h('span', { className: 'pmp-reco-reason' }, reason) : null,
            )
          }),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Toolbar                                                            */
    /* ------------------------------------------------------------------ */

    function LabelsMenu(props) {
      const [open, setOpen] = React.useState(false)
      const wrapRef = React.useRef(null)
      React.useEffect(() => {
        if (!open) return undefined
        const onDown = (event) => {
          if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
      }, [open])
      const selected = props.selected
      return h(
        'div',
        { className: 'pmp-labels', ref: wrapRef },
        h(
          'button',
          {
            type: 'button',
            className: 'pmp-btn pmp-btn-ghost pmp-btn-sm' + (selected.length > 0 ? ' pmp-btn-active' : ''),
            onClick: () => setOpen(!open),
            'aria-expanded': open,
          },
          `${props.t('label.labels')}${selected.length > 0 ? ` (${selected.length})` : ''}`,
        ),
        open
          ? h(
              'div',
              { className: 'pmp-popover' },
              h(
                'div',
                { className: 'pmp-popover-head' },
                h('span', null, props.t('label.labels')),
                h(
                  'button',
                  { type: 'button', className: 'pmp-mini-link', onClick: () => props.onChange([]) },
                  props.t('action.clear'),
                ),
              ),
              props.options.length === 0
                ? h('div', { className: 'pmp-popover-empty' }, '—')
                : props.options.map((option) => h(
                    'label',
                    { key: option.id, className: 'pmp-check pmp-popover-row' },
                    h('input', {
                      type: 'checkbox',
                      checked: selected.includes(option.id),
                      onChange: (event) => {
                        const next = event.target.checked
                          ? [...selected, option.id]
                          : selected.filter((id) => id !== option.id)
                        props.onChange(next)
                      },
                    }),
                    h('span', null, option.title),
                  )),
              h(
                'div',
                { className: 'pmp-popover-foot' },
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: () => setOpen(false) }, props.t('action.confirm')),
              ),
            )
          : null,
      )
    }

    function Toolbar(props) {
      const t = props.t
      const language = props.language
      const meta = props.meta
      const filters = props.filters
      const sources = props.sources
      const categoryOptions = Object.keys(meta.categories || {}).sort((left, right) =>
        categoryTitle(meta, left, language).localeCompare(categoryTitle(meta, right, language)))
      const labelOptions = Object.keys(meta.labels || {}).sort((left, right) =>
        labelTitle(meta, left, language).localeCompare(labelTitle(meta, right, language)))
        .map((id) => ({ id, title: labelTitle(meta, id, language) }))
      const sortKeys = [...new Set([
        ...BASE_SORTS,
        ...Object.keys(meta.sortKeys || {}),
      ])]
      return h(
        'div',
        { className: 'pmp-toolbar' },
        h(
          'div',
          { className: 'pmp-toolbar-row' },
          h(
            'div',
            { className: 'pmp-search' },
            h('span', { className: 'pmp-search-icon', 'aria-hidden': true }, '⌕'),
            h('input', {
              type: 'search',
              value: props.text,
              placeholder: t('label.searchHint'),
              onChange: (event) => props.onText(event.target.value),
              'aria-label': t('label.filter'),
            }),
            props.text !== ''
              ? h('button', { type: 'button', className: 'pmp-mini-link', onClick: () => props.onText('') }, t('action.clear'))
              : null,
          ),
          h(
            'select',
            {
              className: 'pmp-select pmp-source-select',
              value: filters.source,
              onChange: (event) => props.onFilter({ source: event.target.value, page: 1 }),
              'aria-label': t('label.source'),
            },
            h('option', { value: 'all' }, t('label.allSources')),
            sources.map((source) => h(
              'option',
              { key: source.url, value: source.url, title: source.url },
              `${localize(source.title, language) || hostOf(source.url)}${source.error ? ' ⚠' : ''} — ${hostOf(source.url)}`,
            )),
          ),
          h(
            'select',
            {
              className: 'pmp-select',
              value: filters.sortKey,
              onChange: (event) => props.onFilter({
                sortKey: event.target.value,
                sortDir: defaultSortDirection(event.target.value, meta),
                page: 1,
              }),
              'aria-label': t('sort.recommended'),
            },
            sortKeys.map((key) => h('option', { key, value: key }, sortTitle(meta, key, t, language))),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pmp-btn pmp-btn-ghost pmp-btn-sm pmp-dir',
              title: `${t('label.direction')}: ${filters.sortDir === 'asc' ? t('label.asc') : t('label.desc')}`,
              onClick: () => props.onFilter({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc', page: 1 }),
            },
            filters.sortDir === 'asc' ? '↑' : '↓',
          ),
          h(
            'select',
            {
              className: 'pmp-select',
              value: filters.status,
              onChange: (event) => props.onFilter({ status: event.target.value, page: 1 }),
              'aria-label': t('label.status'),
            },
            ['all', 'not-installed', 'installed', 'update-available'].map((value) =>
              h('option', { key: value, value }, t('status.' + value))),
          ),
          h(LabelsMenu, {
            t,
            selected: filters.labels,
            options: labelOptions,
            onChange: (labels) => props.onFilter({ labels, page: 1 }),
          }),
        ),
        h(
          'div',
          { className: 'pmp-toolbar-row pmp-toolbar-row-secondary' },
          h(
            'div',
            { className: 'pmp-pills', role: 'tablist', 'aria-label': t('label.category') },
            h(
              'button',
              {
                type: 'button',
                role: 'tab',
                'aria-selected': filters.category === '',
                className: 'pmp-pill' + (filters.category === '' ? ' pmp-pill-active' : ''),
                onClick: () => props.onFilter({ category: '', page: 1 }),
              },
              t('label.allCategories'),
            ),
            categoryOptions.map((id) => h(
              'button',
              {
                key: id,
                type: 'button',
                role: 'tab',
                'aria-selected': filters.category === id,
                className: 'pmp-pill' + (filters.category === id ? ' pmp-pill-active' : ''),
                onClick: () => props.onFilter({ category: id, page: 1 }),
              },
              categoryTitle(meta, id, language),
            )),
          ),
          h(
            'div',
            { className: 'pmp-toggles' },
            h(
              'label',
              { className: 'pmp-check' },
              h('input', {
                type: 'checkbox',
                checked: filters.hideInstalled,
                onChange: (event) => props.onFilter({ hideInstalled: event.target.checked, page: 1 }),
              }),
              h('span', null, t('label.hideInstalled')),
            ),
            h(
              'label',
              { className: 'pmp-check' },
              h('input', {
                type: 'checkbox',
                checked: filters.onlyCompatible,
                onChange: (event) => props.onFilter({ onlyCompatible: event.target.checked, page: 1 }),
              }),
              h('span', null, t('label.onlyCompatible')),
            ),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Pagination                                                         */
    /* ------------------------------------------------------------------ */

    function pageWindow(page, pages) {
      const values = new Set([1, pages, page - 1, page, page + 1])
      if (page <= 3) [2, 3, 4].forEach((value) => values.add(value))
      if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((value) => values.add(value))
      return [...values].filter((value) => value >= 1 && value <= pages).sort((left, right) => left - right)
    }

    function Pagination(props) {
      const t = props.t
      if (!props.total) return null
      const window = pageWindow(props.page, props.pages)
      let previous = null
      return h(
        'div',
        { className: 'pmp-pagebar' },
        h('span', { className: 'pmp-page-total' }, t('label.total', { total: props.total })),
        h(
          'div',
          { className: 'pmp-pages' },
          h(
            'button',
            {
              type: 'button',
              className: 'pmp-page',
              disabled: props.page <= 1,
              'aria-label': t('action.prev'),
              onClick: () => props.onPage(props.page - 1),
            },
            '‹',
          ),
          window.map((value) => {
            const gap = previous !== null && value - previous > 1
            previous = value
            return h(
              React.Fragment,
              { key: `page-${value}` },
              gap ? h('span', { className: 'pmp-page-gap' }, '…') : null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'pmp-page' + (value === props.page ? ' pmp-page-active' : ''),
                  'aria-current': value === props.page ? 'page' : undefined,
                  onClick: () => props.onPage(value),
                },
                String(value),
              ),
            )
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'pmp-page',
              disabled: props.page >= props.pages,
              'aria-label': t('action.next'),
              onClick: () => props.onPage(props.page + 1),
            },
            '›',
          ),
        ),
        h(
          'label',
          { className: 'pmp-page-size' },
          t('label.perPage'),
          h(
            'select',
            {
              className: 'pmp-select pmp-select-sm',
              value: props.pageSize,
              onChange: (event) => props.onPageSize(Number(event.target.value)),
            },
            PAGE_SIZES.map((size) => h('option', { key: size, value: size }, String(size))),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Modals                                                             */
    /* ------------------------------------------------------------------ */

    function Backdrop(props) {
      React.useEffect(() => {
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
          document.body.style.overflow = previous
        }
      }, [])
      return h(
        'div',
        {
          className: 'pmp-backdrop',
          onClick: (event) => {
            if (event.target === event.currentTarget && props.onClose) props.onClose()
          },
        },
        props.children,
      )
    }

    function useEscape(active, onEscape) {
      React.useEffect(() => {
        if (!active) return undefined
        const handler = (event) => {
          if (event.key === 'Escape') onEscape()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
      }, [active, onEscape])
    }

    function ConfirmDialog(props) {
      const t = props.t
      const language = props.language
      const confirm = props.confirm
      useEscape(true, props.onClose)
      const isUninstall = confirm.kind === 'uninstall'
      const isUpdate = confirm.kind === 'update'
      const title = isUninstall ? t('action.confirmUninstall') : isUpdate ? t('action.confirmUpdate') : t('action.confirmInstall')
      const primaryClass = isUninstall ? 'pmp-btn pmp-btn-danger' : 'pmp-btn pmp-btn-primary'
      return h(
        Backdrop,
        { onClose: props.onClose },
        h(
          'div',
          { className: 'pmp-modal pmp-modal-sm', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
          h(
            'div',
            { className: 'pmp-modal-head' },
            h('h2', null, title),
            h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose, 'aria-label': t('action.close') }, '×'),
          ),
          h(
            'div',
            { className: 'pmp-modal-body' },
            h(
              'div',
              { className: 'pmp-confirm-target' },
              h(PluginIcon, { item: confirm.item ?? { title: { en: confirm.name }, name: confirm.name }, language }),
              h(
                'div',
                null,
                h('div', { className: 'pmp-confirm-name' }, confirm.name),
                confirm.version ? h('div', { className: 'pmp-mono' }, `v${confirm.version}`) : null,
                isUpdate ? h('div', { className: 'pmp-muted' }, `v${confirm.fromVersion} → v${confirm.version}`) : null,
              ),
            ),
            confirm.sourceUrl ? h('div', { className: 'pmp-field-row' }, h('span', null, t('label.dataUrl')), h('code', { className: 'pmp-code' }, confirm.sourceUrl)) : null,
            isUninstall ? h('p', { className: 'pmp-warn' }, t('label.uninstallHint')) : null,
            confirm.replacesLink ? h('p', { className: 'pmp-warn' }, t('label.replacesLink')) : null,
            !isUninstall ? h('p', { className: 'pmp-muted' }, t('label.trust')) : null,
          ),
          h(
            'div',
            { className: 'pmp-modal-foot' },
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost', onClick: props.onClose }, t('action.cancel')),
            h(
              'button',
              {
                type: 'button',
                className: primaryClass,
                onClick: () => props.onConfirm(confirm),
              },
              title,
            ),
          ),
        ),
      )
    }

    function VersionRow(props) {
      const version = props.version
      const t = props.t
      const language = props.language
      const tags = []
      if (version.isDefault) tags.push(h(Badge, { key: 'default', tone: 'brand' }, t('sort.recommended')))
      if (version.isLatest) tags.push(h(Badge, { key: 'latest' }, t('badge.latest')))
      if (version.isInstalled) tags.push(h(Badge, { key: 'installed', tone: 'done' }, t('status.installed')))
      if (version.compatible === false) tags.push(h(Badge, { key: 'incompatible', tone: 'danger' }, t('status.different-version')))
      if (version.exempted) tags.push(h(Badge, { key: 'exempted', tone: 'warn' }, t('badge.exempted')))
      if (version.compatibilityUnknown) tags.push(h(Badge, { key: 'unknown', tone: 'muted' }, '?'))
      return h(
        'div',
        { className: 'pmp-version-row' + (props.selected ? ' pmp-version-selected' : '') },
        h(
          'button',
          {
            type: 'button',
            className: 'pmp-version-pick',
            onClick: props.onSelect,
            'aria-pressed': props.selected,
          },
          h('span', { className: 'pmp-radio' + (props.selected ? ' pmp-radio-on' : '') }),
          h('span', { className: 'pmp-mono' }, `v${version.version}`),
        ),
        h('span', { className: 'pmp-muted pmp-version-date' }, formatDate(version.publishedAt, language)),
        h('span', { className: 'pmp-badges pmp-version-tags' }, tags),
        h(
          'button',
          {
            type: 'button',
            className: 'pmp-btn pmp-btn-ghost pmp-btn-sm',
            disabled: version.compatible === false || version.isInstalled || props.installed === true,
            onClick: () => props.onInstall(version.version),
          },
          t('action.install'),
        ),
      )
    }

    function inlineMarkdown(text, keyPrefix) {
      const nodes = []
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\))/g
      let cursor = 0
      let match
      let index = 0
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
        const token = match[0]
        const key = `${keyPrefix}-${index++}`
        if (token.startsWith('**')) {
          nodes.push(h('strong', { key }, token.slice(2, -2)))
        } else if (token.startsWith('`')) {
          nodes.push(h('code', { key, className: 'pmp-md-code' }, token.slice(1, -1)))
        } else if (token.startsWith('![')) {
          nodes.push(h('span', { key, className: 'pmp-md-image' }, `🖼 ${match[2] || 'image'}`))
        } else {
          const href = match[5]
          if (/^https?:\/\//iu.test(href)) {
            nodes.push(h('a', { key, className: 'pmp-link', href, target: '_blank', rel: 'noreferrer' }, match[4]))
          } else {
            nodes.push(match[4])
          }
        }
        cursor = match.index + token.length
      }
      if (cursor < text.length) nodes.push(text.slice(cursor))
      return nodes
    }

    function MarkdownText(props) {
      const text = typeof props.text === 'string' ? props.text : ''
      if (text.trim() === '') return null
      const lines = text.replace(/\r\n?/gu, '\n').split('\n')
      const blocks = []
      let index = 0
      while (index < lines.length) {
        const line = lines[index]
        if (line.trim() === '') {
          index += 1
          continue
        }
        if (line.startsWith('```')) {
          const code = []
          index += 1
          while (index < lines.length && !lines[index].startsWith('```')) {
            code.push(lines[index])
            index += 1
          }
          index += 1
          blocks.push(h('pre', { key: `code-${index}`, className: 'pmp-md-pre' }, h('code', null, code.join('\n'))))
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/u.exec(line)
        if (heading !== null) {
          const level = Math.min(6, heading[1].length + 2)
          blocks.push(h(`h${level}`, { key: `h-${index}`, className: 'pmp-md-heading' }, inlineMarkdown(heading[2], `h-${index}`)))
          index += 1
          continue
        }
        if (/^---+$/u.test(line.trim())) {
          blocks.push(h('hr', { key: `hr-${index}`, className: 'pmp-md-hr' }))
          index += 1
          continue
        }
        if (/^\s*[-*]\s+/u.test(line) || /^\s*\d+\.\s+/u.test(line)) {
          const ordered = /^\s*\d+\.\s+/u.test(line)
          const items = []
          while (index < lines.length && (/^\s*[-*]\s+/u.test(lines[index]) || /^\s*\d+\.\s+/u.test(lines[index]))) {
            items.push(h('li', { key: `li-${index}` }, inlineMarkdown(lines[index].replace(/^\s*(?:[-*]|\d+\.)\s+/u, ''), `li-${index}`)))
            index += 1
          }
          blocks.push(h(ordered ? 'ol' : 'ul', { key: `list-${index}`, className: 'pmp-md-list' }, items))
          continue
        }
        if (/^>\s?/u.test(line)) {
          const quote = []
          while (index < lines.length && /^>\s?/u.test(lines[index])) {
            quote.push(lines[index].replace(/^>\s?/u, ''))
            index += 1
          }
          blocks.push(h('blockquote', { key: `quote-${index}`, className: 'pmp-md-quote' }, quote.join(' ')))
          continue
        }
        const paragraph = [line]
        index += 1
        while (index < lines.length && lines[index].trim() !== ''
          && !/^#{1,6}\s+/u.test(lines[index]) && !lines[index].startsWith('```')
          && !/^\s*[-*]\s+/u.test(lines[index]) && !/^\s*\d+\.\s+/u.test(lines[index])
          && !/^>\s?/u.test(lines[index]) && !/^---+$/u.test(lines[index].trim())) {
          paragraph.push(lines[index])
          index += 1
        }
        blocks.push(h('p', { key: `p-${index}`, className: 'pmp-md-p' }, inlineMarkdown(paragraph.join(' '), `p-${index}`)))
      }
      return h('div', { className: 'pmp-md' }, blocks)
    }

    function usePreviewData(item, language, versionOverride = null) {
      const [readme, setReadme] = React.useState({ status: 'loading', data: null, error: null })
      const [ai, setAi] = React.useState({ status: 'loading', data: null, error: null })
      const [alternatives, setAlternatives] = React.useState({ status: 'loading', data: null, error: null })
      const sequence = React.useRef(0)
      const version = versionOverride ?? item?.version ?? ''
      const key = item === null || item === undefined
        ? ''
        : `${item.name}|${item.sourceUrl ?? ''}|${item.market?.sourceUrl ?? ''}|${version}|${language}`
      const load = React.useCallback(async () => {
        if (item === null || item === undefined) return
        const current = ++sequence.current
        setReadme({ status: 'loading', data: null, error: null })
        setAi({ status: 'loading', data: null, error: null })
        setAlternatives({ status: 'loading', data: null, error: null })
        const base = {
          name: item.name,
          sourceUrl: item.sourceUrl ?? item.market?.sourceUrl ?? undefined,
          version: version === '' ? undefined : version,
          lang: language,
        }
        request('/readme', base, typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(35_000) : undefined).then((data) => {
          if (sequence.current === current) setReadme({ status: 'ready', data, error: null })
        }).catch((error) => {
          if (sequence.current === current) setReadme({ status: 'error', data: null, error: error.message })
        })
        request('/ai', base, typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(45_000) : undefined).then((data) => {
          if (sequence.current === current) setAi({ status: 'ready', data, error: null })
        }).catch((error) => {
          if (sequence.current === current) setAi({ status: 'error', data: null, error: error.message })
        })
        request('/alternatives', base, typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15_000) : undefined).then((data) => {
          if (sequence.current === current) setAlternatives({ status: 'ready', data, error: null })
        }).catch((error) => {
          if (sequence.current === current) setAlternatives({ status: 'error', data: null, error: error.message })
        })
      }, [key])
      React.useEffect(() => {
        void load()
      }, [load])
      return { readme, ai, alternatives, reload: load }
    }

    function ReadmeSection(props) {
      const t = props.t
      const state = props.state
      const source = state.status === 'ready' && state.data
        ? (state.data.source === 'bundle' ? t('label.sourceBundle') : state.data.source === 'market' ? t('label.sourceMarket') : null)
        : null
      return h(
        'section',
        { className: 'pmp-readme-section' },
        h(
          'div',
          { className: 'pmp-section-head' },
          h('h3', { className: 'pmp-section-title' }, t('label.readme')),
          source ? h(Badge, { tone: 'muted' }, source) : null,
        ),
        state.status === 'loading'
          ? h('div', { className: 'pmp-readme-loading' },
              h('div', { className: 'pmp-skeleton-line' }),
              h('div', { className: 'pmp-skeleton-line pmp-skeleton-short' }),
              h('div', { className: 'pmp-skeleton-line' }))
          : state.status === 'error'
            ? h('div', { className: 'pmp-readme-error' },
                h('span', null, t('msg.readmeFailed', { message: state.error || '' })),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: props.onRetry }, t('action.retry')))
            : state.data?.status === 'found'
              ? h('div', { className: 'pmp-readme-body' }, h(MarkdownText, { text: state.data.markdown }))
              : h('p', { className: 'pmp-muted pmp-readme-empty' }, t('label.noReadme')),
      )
    }

    function AiReviewPanel(props) {
      const t = props.t
      const state = props.state
      const review = state.status === 'ready' ? state.data?.review : null
      return h(
        'aside',
        { className: 'pmp-ai-panel' },
        h(
          'div',
          { className: 'pmp-ai-head' },
          h('h3', { className: 'pmp-section-title' }, t('label.aiReview')),
          review ? h(Badge, { tone: review.ai === true ? 'brand' : 'muted' }, review.ai === true ? 'AI' : t('label.localReview')) : null,
        ),
        state.status === 'loading'
          ? h('div', { className: 'pmp-ai-loading' },
              h('div', { className: 'pmp-ai-pulse' }),
              h('p', { className: 'pmp-muted' }, t('label.aiLoading')),
              h('div', { className: 'pmp-skeleton-line' }),
              h('div', { className: 'pmp-skeleton-line pmp-skeleton-short' }))
          : state.status === 'error'
            ? h('div', { className: 'pmp-ai-error' },
                h('p', { className: 'pmp-warn' }, t('msg.aiFailed', { message: state.error || '' })),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: props.onRetry }, t('action.retry')))
            : review
              ? h(
                  'div',
                  { className: 'pmp-ai-body' },
                  h(
                    'div',
                    { className: 'pmp-ai-score-row' },
                    typeof review.score === 'number' ? h(ScoreChip, { score: review.score }) : null,
                    review.verdict ? h('strong', { className: 'pmp-ai-verdict' }, review.verdict) : null,
                  ),
                  h('p', { className: 'pmp-ai-summary' }, review.summary),
                  review.purpose ? h('p', { className: 'pmp-ai-line' }, h('span', null, t('label.purpose')), review.purpose) : null,
                  review.audience ? h('p', { className: 'pmp-ai-line' }, h('span', null, t('label.audience')), review.audience) : null,
                  review.strengths?.length
                    ? h('div', { className: 'pmp-ai-list' },
                        h('h4', null, t('label.strengths')),
                        h('ul', null, review.strengths.map((value, index) => h('li', { key: `s-${index}` }, value))))
                    : null,
                  review.risks?.length
                    ? h('div', { className: 'pmp-ai-list pmp-ai-risks' },
                        h('h4', null, t('label.risks')),
                        h('ul', null, review.risks.map((value, index) => h('li', { key: `r-${index}` }, value))))
                    : null,
                  review.tags?.length
                    ? h('div', { className: 'pmp-badges pmp-ai-tags' }, review.tags.map((tag) => h(Badge, { key: tag }, tag)))
                    : null,
                  review.raw ? h('div', { className: 'pmp-ai-raw' }, h('h4', null, t('label.rawReview')), h('pre', null, review.raw)) : null,
                  review.aiNoteCode
                    ? h('p', { className: 'pmp-muted pmp-ai-note' }, t(`ai.note.${review.aiNoteCode}`))
                    : review.aiNote ? h('p', { className: 'pmp-muted pmp-ai-note' }, review.aiNote) : null,
                  review.ai === true && review.model ? h('p', { className: 'pmp-muted pmp-ai-model' }, `${t('label.aiModel')}: ${review.model}`) : null,
                )
              : h('p', { className: 'pmp-muted' }, t('label.aiUnavailable')),
      )
    }

    function AlternativesSection(props) {
      const t = props.t
      const state = props.state
      const items = state.status === 'ready' ? state.data?.items ?? [] : []
      return h(
        'section',
        { className: 'pmp-alternatives' },
        h(
          'div',
          { className: 'pmp-section-head' },
          h('h3', { className: 'pmp-section-title' }, t('label.alternatives')),
        ),
        state.status === 'loading'
          ? h('div', { className: 'pmp-alt-track' }, Array.from({ length: 3 }, (_, index) => h(CardSkeleton, { key: index })))
          : state.status === 'error'
            ? h('div', { className: 'pmp-readme-error' },
                h('span', null, t('msg.alternativesFailed', { message: state.error || '' })),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: props.onRetry }, t('action.retry')))
            : items.length === 0
              ? h('p', { className: 'pmp-muted' }, t('label.alternativesNone'))
              : h(
                  'div',
                  { className: 'pmp-alt-track' },
                  items.map((item) => h(
                    'button',
                    {
                      key: item.key,
                      type: 'button',
                      className: 'pmp-alt-card',
                      onClick: () => props.onOpen(item),
                    },
                    h(
                      'div',
                      { className: 'pmp-alt-top' },
                      h(PluginIcon, { item, language: props.language }),
                      h('span', { className: 'pmp-alt-title' }, localize(item.title, props.language) || item.name),
                      h(ScoreChip, { score: item.quality }),
                    ),
                    h('p', { className: 'pmp-alt-desc' }, localize(item.description, props.language) || ''),
                    h('div', { className: 'pmp-alt-meta' },
                      item.reason ? h(Badge, { tone: 'muted' }, t(`reason.${item.reason.type}`)) : null,
                      h('span', { className: 'pmp-url', title: item.sourceUrl }, item.sourceUrl)),
                  )),
                ),
      )
    }

    function DetailModal(props) {
      const t = props.t
      const language = props.language
      const meta = props.meta
      const state = props.state
      const [selected, setSelected] = React.useState(null)
      useEscape(true, props.onClose)
      React.useEffect(() => {
        if (state.status === 'ready' && state.item) {
          const item = state.item
          setSelected(item.defaultVersion ?? item.version ?? null)
        }
      }, [state.status, state.item])
      const item = state.status === 'ready' ? state.item : null
      const preview = usePreviewData(item, language, selected)
      return h(
        Backdrop,
        { onClose: props.onClose },
        h(
          'div',
          { className: 'pmp-modal pmp-modal-lg', role: 'dialog', 'aria-modal': 'true', 'aria-label': item ? localize(item.title, language) : t('action.details') },
          h(
            'div',
            { className: 'pmp-modal-head' },
            h('h2', null, t('action.details')),
            h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose, 'aria-label': t('action.close') }, '×'),
          ),
          state.status === 'loading'
            ? h('div', { className: 'pmp-modal-body' }, h('div', { className: 'pmp-skeleton-line pmp-skeleton-title' }), h('div', { className: 'pmp-skeleton-line' }))
            : state.status === 'error'
              ? h(
                  'div',
                  { className: 'pmp-modal-body pmp-error' },
                  h('p', null, t('msg.loadFailed', { message: state.error || '' })),
                  h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: props.onRetry }, t('action.retry')),
                )
              : h(
                  React.Fragment,
                  null,
                  h(
                    'div',
                    { className: 'pmp-modal-body pmp-detail-body' },
                    h(
                      'div',
                      { className: 'pmp-detail-layout' },
                    h(
                      'div',
                      { className: 'pmp-detail-main' },
                    h(
                      'div',
                      { className: 'pmp-detail-head' },
                      h(PluginIcon, { item, language }),
                      h(
                        'div',
                        { className: 'pmp-detail-titles' },
                        h('h3', null, localize(item.title, language) || item.name),
                        h('div', { className: 'pmp-mono pmp-muted' }, item.name),
                        h('div', { className: 'pmp-muted' }, [item.author, `v${item.version}`, formatDate(item.publishedAt, language)].filter(Boolean).join(' · ')),
                      ),
                      h(ScoreChip, { score: item.quality, title: t('label.qualityHint') }),
                    ),
                    h('p', { className: 'pmp-detail-desc' }, localize(item.description, language) || ''),
                    h(
                      'div',
                      { className: 'pmp-badges' },
                      item.category ? h(Badge, { tone: 'category' }, categoryTitle(meta, item.category, language)) : null,
                      (item.labels || []).map((id) => h(Badge, { key: id }, labelTitle(meta, id, language))),
                    ),
                    h(
                      'div',
                      { className: 'pmp-facts' },
                      h('div', { className: 'pmp-fact' }, h('span', null, t('label.stars')), h('strong', null, formatNumber(item.stars, language))),
                      h('div', { className: 'pmp-fact' }, h('span', null, t('label.downloads')), h('strong', null, formatNumber(item.downloads, language))),
                      h('div', { className: 'pmp-fact' }, h('span', null, t('label.heat')), h('strong', null, String(item.heat))),
                      h('div', { className: 'pmp-fact' }, h('span', null, t('label.quality')), h('strong', null, String(item.quality))),
                    ),
                    h(
                      'div',
                      { className: 'pmp-field-row' },
                      h('span', null, t('label.source')),
                      h('a', { className: 'pmp-code pmp-link', href: item.sourceUrl, target: '_blank', rel: 'noreferrer' }, item.sourceUrl),
                    ),
                    item.homepage || item.repository
                      ? h(
                          'div',
                          { className: 'pmp-field-row' },
                          h('span', null, 'Home'),
                          h(
                            'span',
                            { className: 'pmp-links' },
                            item.homepage ? h('a', { className: 'pmp-link', href: item.homepage, target: '_blank', rel: 'noreferrer' }, item.homepage) : null,
                            item.repository?.url ? h('a', { className: 'pmp-link', href: item.repository.url, target: '_blank', rel: 'noreferrer' }, item.repository.url) : null,
                          ),
                        )
                      : null,
                    item.qualityBreakdown
                      ? h(
                          'details',
                          { className: 'pmp-breakdown' },
                          h('summary', null, t('label.qualityHint')),
                          h(
                            'div',
                            { className: 'pmp-breakdown-grid' },
                            Object.entries(item.qualityBreakdown).map(([key, value]) => h(
                              'span',
                              { key },
                              h('span', { className: 'pmp-muted' }, key),
                              h('strong', null, String(value)),
                            )),
                          ),
                        )
                      : null,
                    h(ReadmeSection, {
                      state: preview.readme,
                      onRetry: preview.reload,
                      t,
                    }),
                    h('h3', { className: 'pmp-section-title pmp-versions-title' }, t('label.versionList')),
                    h(
                      'div',
                      { className: 'pmp-versions' },
                      item.versions.map((version) => h(VersionRow, {
                        key: version.version,
                        version,
                        selected: version.version === selected,
                        installed: item.installStatus !== 'not-installed',
                        t,
                        language,
                        onSelect: () => setSelected(version.version),
                        onInstall: (v) => props.onInstall(item, v),
                      })),
                    ),
                    ),
                    h('div', { className: 'pmp-detail-side' },
                      h(AiReviewPanel, { state: preview.ai, onRetry: preview.reload, t }),
                      h(AlternativesSection, {
                        state: preview.alternatives,
                        onRetry: preview.reload,
                        onOpen: props.onOpenAlternative,
                        t,
                        language,
                      }),
                    ),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'pmp-modal-foot' },
                    h('span', { className: 'pmp-muted' }, item.installStatus === 'not-installed' ? t('label.trust') : t('label.installedHint')),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'pmp-btn pmp-btn-primary',
                        disabled: item.installStatus !== 'not-installed'
                          || !selected
                          || !item.versions.some((version) => version.version === selected && version.compatible !== false),
                        onClick: () => props.onInstall(item, selected),
                      },
                      selected ? t('action.install') + ` v${selected}` : t('action.install'),
                    ),
                  ),
                ),
        ),
      )
    }

    function ApprovalDialog(props) {
      const t = props.t
      const operation = props.operation
      useEscape(true, props.onClose)
      return h(
        Backdrop,
        { onClose: props.onClose },
        h(
          'div',
          { className: 'pmp-modal pmp-modal-sm', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('label.pendingBuilds') },
          h(
            'div',
            { className: 'pmp-modal-head' },
            h('h2', null, t('label.pendingBuilds')),
            h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose, 'aria-label': t('action.close') }, '×'),
          ),
          h(
            'div',
            { className: 'pmp-modal-body' },
            h('p', { className: 'pmp-warn' }, t('label.pendingBuildsHint')),
            h(
              'ul',
              { className: 'pmp-builds' },
              (operation.pendingBuilds || []).map((name) => h('li', { key: name }, h('code', { className: 'pmp-code' }, name))),
            ),
            operation.error ? h('p', { className: 'pmp-muted' }, operation.error.message) : null,
          ),
          h(
            'div',
            { className: 'pmp-modal-foot' },
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost', onClick: props.onClose }, t('action.cancel')),
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary', onClick: props.onApprove }, t('action.allowAndRetry')),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Operation overlay and toast                                        */
    /* ------------------------------------------------------------------ */

    function operationKindLabel(t, operation) {
      if (operation.kind === 'toggle') return operation.target?.enabled ? t('action.enable') : t('action.disable')
      return t('op.' + operation.kind)
    }

    function OperationBar(props) {
      const t = props.t
      const operation = props.operation
      if (!operation) return null
      const running = operation.status === 'running'
      const kind = operationKindLabel(t, operation)
      const phase = t('phase.' + (operation.phase || 'starting'))
      const target = operation.target || {}
      const elapsed = Math.max(0, Math.round(((operation.finishedAt || Date.now()) - operation.startedAt) / 1000))
      const statusTone = operation.status === 'failed' ? 'pmp-op-failed'
        : operation.status === 'done' ? 'pmp-op-done'
          : operation.status === 'cancelled' ? 'pmp-op-muted'
            : operation.status === 'needs-approval' ? 'pmp-op-warn' : ''
      return h(
        'div',
        { className: `pmp-op ${statusTone}` },
        h(
          'div',
          { className: 'pmp-op-head' },
          h('span', { className: 'pmp-op-spinner' + (running ? ' pmp-op-spin' : '') }),
          h(
            'div',
            { className: 'pmp-op-text' },
            h('strong', null, running ? t('label.opRunning', { kind }) : operation.status === 'done' ? t('label.opDone') : operation.status === 'cancelled' ? t('label.opCancelled') : operation.status === 'needs-approval' ? t('label.opNeedsApproval') : t('label.opFailed')),
            h('span', null, `${target.name || ''}${target.version ? `@${target.version}` : ''} · ${phase} · ${t('label.elapsed', { seconds: elapsed })}`),
          ),
          operation.status === 'needs-approval'
            ? h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: props.onApprove }, t('action.allowAndRetry'))
            : running && (operation.kind === 'install' || operation.kind === 'update')
              ? h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: props.onCancel }, t('action.cancelOperation'))
              : h('button', { type: 'button', className: 'pmp-close', onClick: props.onDismiss, 'aria-label': t('action.close') }, '×'),
        ),
        running ? h('div', { className: 'pmp-op-bar' }, h('span', null)) : null,
        operation.error ? h('div', { className: 'pmp-op-error' }, operation.error.message) : null,
      )
    }

    function Toast(props) {
      if (!props.toast) return null
      return h(
        'div',
        { className: `pmp-toast pmp-toast-${props.toast.tone || 'info'}`, role: 'status' },
        h('span', null, props.toast.message),
        props.toast.action
          ? h('button', { type: 'button', className: 'pmp-mini-link', onClick: props.toast.action.onClick }, props.toast.action.label)
          : null,
      )
    }

    /* ------------------------------------------------------------------ */
    /* Manage tab                                                         */
    /* ------------------------------------------------------------------ */

    function ManageRow(props) {
      const t = props.t
      const language = props.language
      const item = props.item
      const market = item.market
      const update = item.update
      const title = localize(item.title, language) || item.name
      const sourceLabel = item.source || '—'
      const sourceSignature = item.signature === 'link' || item.signature === 'path' ? t('label.localLink') : item.signature
      const statusTone = update ? 'warn' : item.error ? 'danger' : 'done'
      const statusText = update ? t('label.updateAvailable') : item.error ? t('label.error') : t('label.upToDate')
      const toggleDisabled = item.self || Boolean(item.readOnlyReason)
      return h(
        'div',
        {
          className: 'pmp-manage-row pmp-manage-row-click',
          role: 'button',
          tabIndex: 0,
          onClick: () => props.onOpen(item),
          onKeyDown: (event) => {
            // Keyboard events from the switch/buttons inside the row must not open the dialog.
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              props.onOpen(item)
            }
          },
        },
        h(
          'div',
          { className: 'pmp-manage-main' },
          h(
            'div',
            { className: 'pmp-manage-title' },
            h('strong', { className: 'pmp-manage-name', title }, title),
            title !== item.name ? h('code', { className: 'pmp-manage-pkg' }, item.name) : null,
            item.self ? h(Badge, { tone: 'brand' }, t('label.self')) : null,
            item.official ? h(Badge, { tone: 'muted' }, t('label.builtin')) : null,
            h(Badge, null, `v${item.version ?? '?'}`),
            h(Badge, { tone: item.enabled ? 'done' : 'muted' }, item.enabled ? t('label.enabled') : t('label.disabled')),
            h(Badge, { tone: statusTone }, statusText),
          ),
          h(
            'div',
            { className: 'pmp-manage-meta' },
            h('span', { className: 'pmp-muted' }, `${t('label.source')}: ${sourceSignature}`),
            h('code', { className: 'pmp-code pmp-manage-source', title: sourceLabel }, sourceLabel),
            market ? h(
              'span',
              { className: 'pmp-manage-market' },
              h('span', { className: 'pmp-muted' }, t('label.marketVersion', { version: market.latestCompatible ?? market.latestVersion })),
              h('span', { className: 'pmp-url', title: market.sourceUrl }, market.sourceUrl),
            ) : null,
          ),
          item.registry && item.registry.status === 'listed' && item.registry.versions.length > 0
            ? h(
                'div',
                { className: 'pmp-manage-registry' },
                h('span', { className: 'pmp-muted' }, `${item.registry.versions.length} ${t('label.registryVersions')}`),
                item.registry.versions.slice(0, 4).map((version) => h(Badge, { key: version.version, tone: version.incompatible ? 'danger' : 'info' }, `v${version.version}`)),
              )
            : null,
          item.registry && item.registry.status === 'refused'
            ? h('div', { className: 'pmp-muted pmp-manage-note' }, `${item.registry.problem}: ${item.registry.reason}`)
            : null,
          item.error ? h('div', { className: 'pmp-error-line' }, item.error.message || item.error.code) : null,
          item.readOnlyReason ? h('div', { className: 'pmp-muted pmp-manage-note' }, `${t('label.readOnly')}: ${item.readOnlyReason}`) : null,
          update && update.replacesLocalLink ? h('div', { className: 'pmp-warn pmp-manage-note' }, t('label.replacesLink')) : null,
        ),
        h(
          'div',
          { className: 'pmp-manage-actions' },
          h(
            'span',
            { className: 'pmp-switch-wrap' },
            h('button', {
              type: 'button',
              role: 'switch',
              'aria-checked': item.enabled,
              'aria-label': t('label.enableState'),
              className: 'pmp-switch' + (item.enabled ? ' pmp-switch-on' : ''),
              disabled: toggleDisabled || Boolean(props.toggleBusy),
              title: toggleDisabled
                ? (item.self ? t('label.self') : item.readOnlyReason || '')
                : item.enabled ? t('action.disable') : t('action.enable'),
              onClick: (event) => {
                event.stopPropagation()
                if (!toggleDisabled) props.onToggle(item, !item.enabled)
              },
            }, h('span', { className: 'pmp-switch-thumb' })),
            h('span', { className: 'pmp-muted' }, item.enabled ? t('label.enabled') : t('label.disabled')),
          ),
          update
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'pmp-btn pmp-btn-primary pmp-btn-sm',
                  onClick: (event) => {
                    event.stopPropagation()
                    props.onUpdate(item)
                  },
                },
                t('action.updateTo', { version: update.version }),
              )
            : h('span', { className: 'pmp-muted' }, t('label.noUpdates')),
          h(
            'button',
            {
              type: 'button',
              className: 'pmp-btn pmp-btn-danger pmp-btn-sm',
              disabled: !item.removable || item.self,
              title: item.self ? t('label.self') : item.readOnlyReason || '',
              onClick: (event) => {
                event.stopPropagation()
                props.onUninstall(item)
              },
            },
            t('action.uninstall'),
          ),
          h('span', { className: 'pmp-chevron', 'aria-hidden': true }, '›'),
        ),
      )
    }

    function InstalledDetailModal(props) {
      const t = props.t
      const language = props.language
      const item = props.item
      const market = item.market
      const update = item.update
      const title = localize(item.title, language) || item.name
      const toggleDisabled = item.self || Boolean(item.readOnlyReason)
      const preview = usePreviewData(item, language)
      useEscape(true, props.onClose)
      return h(
        Backdrop,
        { onClose: props.onClose },
        h(
          'div',
          { className: 'pmp-modal pmp-modal-lg', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('label.pluginDetail') },
          h(
            'div',
            { className: 'pmp-modal-head' },
            h('h2', null, t('label.pluginDetail')),
            h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose, 'aria-label': t('action.close') }, '×'),
          ),
          h(
            'div',
            { className: 'pmp-modal-body pmp-detail-body' },
            h(
              'div',
              { className: 'pmp-detail-layout' },
            h(
              'div',
              { className: 'pmp-detail-main' },
            h(
              'div',
              { className: 'pmp-detail-head' },
              h(PluginIcon, { item, language }),
              h(
                'div',
                { className: 'pmp-detail-titles' },
                h('h3', null, title),
                h('div', { className: 'pmp-mono pmp-muted' }, item.name),
                h(
                  'div',
                  { className: 'pmp-muted' },
                  [`v${item.version ?? '?'}`, item.signature === 'link' || item.signature === 'path' ? t('label.localLink') : item.signature]
                    .filter(Boolean).join(' · '),
                ),
              ),
              h(
                'div',
                { className: 'pmp-badges' },
                h(Badge, { tone: item.enabled ? 'done' : 'muted' }, item.enabled ? t('label.enabled') : t('label.disabled')),
                item.self ? h(Badge, { tone: 'brand' }, t('label.self')) : null,
                item.official ? h(Badge, { tone: 'muted' }, t('label.builtin')) : null,
              ),
            ),
            item.description ? h('p', { className: 'pmp-detail-desc' }, localize(item.description, language)) : null,
            h(
              'div',
              { className: 'pmp-facts' },
              h('div', { className: 'pmp-fact' }, h('span', null, t('label.version') || 'Version'), h('strong', null, `v${item.version ?? '?'}`)),
              h('div', { className: 'pmp-fact' }, h('span', null, t('label.availability')), h('strong', null, item.availability ?? '—')),
              h('div', { className: 'pmp-fact' }, h('span', null, t('label.rows')), h('strong', null, String(item.rows?.length ?? 0))),
              h('div', { className: 'pmp-fact' }, h('span', null, t('label.overrides')), h('strong', null, String(item.overrides?.length ?? 0))),
            ),
            h(
              'div',
              { className: 'pmp-field-row' },
              h('span', null, t('label.source')),
              h('code', { className: 'pmp-code' }, item.source || '—'),
            ),
            market ? h(
              'div',
              { className: 'pmp-field-row' },
              h('span', null, t('label.marketInfo')),
              h('span', { className: 'pmp-links' },
                h('span', { className: 'pmp-muted' }, t('label.marketVersion', { version: market.latestCompatible ?? market.latestVersion })),
                h('a', { className: 'pmp-link', href: market.sourceUrl, target: '_blank', rel: 'noreferrer' }, market.sourceUrl),
              ),
            ) : null,
            item.registry && item.registry.status === 'listed' && item.registry.versions.length > 0
              ? h(
                  'div',
                  { className: 'pmp-field-row' },
                  h('span', null, t('label.registryVersions')),
                  h('span', { className: 'pmp-badges' }, item.registry.versions.slice(0, 12).map((version) =>
                    h(Badge, { key: version.version, tone: version.incompatible ? 'danger' : 'info' }, `v${version.version}`))),
                )
              : null,
            item.readOnlyReason ? h('p', { className: 'pmp-warn' }, `${t('label.readOnly')}: ${item.readOnlyReason}`) : null,
            item.error ? h('p', { className: 'pmp-error-line' }, item.error.message || item.error.code) : null,
            h(ReadmeSection, {
              state: preview.readme,
              onRetry: preview.reload,
              t,
            }),
            h('h3', { className: 'pmp-section-title pmp-versions-title' }, t('label.rows')),
            item.rows && item.rows.length > 0
              ? h(
                  'div',
                  { className: 'pmp-detail-rows' },
                  item.rows.map((row, index) => h(
                    'div',
                    { key: row.rowId ?? `${row.moduleName ?? 'row'}-${index}`, className: 'pmp-detail-row' },
                    h('span', { className: 'pmp-detail-row-title' }, localize(row.title, language) || row.moduleName || row.rowId || '—'),
                    h('span', { className: 'pmp-detail-row-meta' },
                      [row.moduleName, row.rowId ? `#${row.rowId}` : null].filter(Boolean).join(' · ')),
                  )),
                )
              : h('p', { className: 'pmp-muted' }, t('label.noRows')),
            item.overrides && item.overrides.length > 0
              ? h(
                  React.Fragment,
                  null,
                  h('h3', { className: 'pmp-section-title pmp-versions-title' }, t('label.overrides')),
                  h('div', { className: 'pmp-badges' }, item.overrides.map((rowId) => h('code', { key: rowId, className: 'pmp-code' }, rowId))),
                )
              : null,
            ),
            h('div', { className: 'pmp-detail-side' },
              h(AiReviewPanel, { state: preview.ai, onRetry: preview.reload, t }),
              h(AlternativesSection, {
                state: preview.alternatives,
                onRetry: preview.reload,
                onOpen: props.onOpenAlternative,
                t,
                language,
              }),
            ),
            ),
          ),
          h(
            'div',
            { className: 'pmp-modal-foot' },
            h(
              'span',
              { className: 'pmp-switch-wrap' },
              h('button', {
                type: 'button',
                role: 'switch',
                'aria-checked': item.enabled,
                'aria-label': t('label.enableState'),
                className: 'pmp-switch' + (item.enabled ? ' pmp-switch-on' : ''),
                disabled: toggleDisabled,
                onClick: () => {
                  if (!toggleDisabled) {
                    props.onToggle(item, !item.enabled)
                    props.onClose()
                  }
                },
              }, h('span', { className: 'pmp-switch-thumb' })),
              h('span', { className: 'pmp-muted' }, item.enabled ? t('label.enabled') : t('label.disabled')),
            ),
            h(
              'div',
              { className: 'pmp-modal-actions' },
              update
                ? h('button', {
                    type: 'button',
                    className: 'pmp-btn pmp-btn-primary',
                    onClick: () => {
                      props.onUpdate(item)
                      props.onClose()
                    },
                  }, t('action.updateTo', { version: update.version }))
                : null,
              h('button', {
                type: 'button',
                className: 'pmp-btn pmp-btn-danger',
                disabled: !item.removable || item.self,
                title: item.self ? t('label.self') : item.readOnlyReason || '',
                onClick: () => {
                  props.onUninstall(item)
                  props.onClose()
                },
              }, t('action.uninstall')),
              h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost', onClick: props.onClose }, t('action.close')),
            ),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Panel                                                              */
    /* ------------------------------------------------------------------ */

    const INITIAL_FILTERS = {
      source: 'all',
      text: '',
      category: '',
      labels: [],
      sortKey: 'recommended',
      sortDir: 'desc',
      page: 1,
      pageSize: 24,
      hideInstalled: false,
      onlyCompatible: false,
      status: 'all',
    }

    function localLabel(language, zh, en) {
      return language === 'zh' ? zh : en
    }

    function copyText(text) {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          void navigator.clipboard.writeText(text)
          return true
        }
      } catch {
        /* fall through */
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
        return true
      } catch {
        return false
      }
    }

    function gitBadge(text, tone) {
      return h(Badge, { tone: tone ?? 'muted' }, text)
    }

    function LocalPluginCard(props) {
      const plugin = props.plugin
      const language = props.language
      const git = plugin.git ?? {}
      const title = plugin.title || plugin.name
      const repo = git.remoteGithub?.url || plugin.repository || ''
      const dirty = Number(git.dirty ?? 0) > 0
      return h(
        'div',
        { className: 'pmp-local-card' },
        h(
          'div',
          { className: 'pmp-local-card-main', role: 'button', tabIndex: 0, onClick: props.onOpen, onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onOpen() } } },
          h('div', { className: 'pmp-local-avatar' }, (title || plugin.name).slice(0, 1).toUpperCase()),
          h(
            'div',
            { className: 'pmp-local-card-body' },
            h('div', { className: 'pmp-local-title-row' },
              h('strong', { className: 'pmp-local-title' }, title),
              h('span', { className: 'pmp-mono pmp-muted' }, plugin.name),
            ),
            h('p', { className: 'pmp-local-desc' }, plugin.description || localLabel(language, '暂无描述', 'No description')),
            h('div', { className: 'pmp-local-badges' },
              h(Badge, { tone: 'brand' }, `v${plugin.version}`),
              git.branch ? h(Badge, { tone: 'muted' }, git.branch) : null,
              dirty ? h(Badge, { tone: 'warn' }, localLabel(language, '有未提交改动', 'Uncommitted changes')) : null,
              repo ? h(Badge, { tone: 'done' }, localLabel(language, 'GitHub 已连接', 'GitHub linked')) : h(Badge, { tone: 'muted' }, localLabel(language, '未连接 GitHub', 'No GitHub remote')),
              plugin.private ? h(Badge, { tone: 'warn' }, 'private') : null,
            ),
            h('div', { className: 'pmp-local-root', title: plugin.root }, plugin.root),
          ),
        ),
        h(
          'div',
          { className: 'pmp-local-card-actions' },
          h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: props.onOpen }, localLabel(language, '管理', 'Manage')),
          repo ? h('a', { className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', href: repo, target: '_blank', rel: 'noreferrer' }, 'GitHub') : null,
          h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: props.onPublish }, localLabel(language, '发布', 'Publish')),
        ),
      )
    }

    function LocalWorkbench(props) {
      const t = props.t
      const language = props.language
      const onToast = props.onToast
      const [data, setData] = React.useState({ status: 'loading', data: null, error: null })
      const [selected, setSelected] = React.useState(null)
      const [settings, setSettings] = React.useState(null)
      const [upload, setUpload] = React.useState(null)
      const [publish, setPublish] = React.useState(null)
      const sequence = React.useRef(0)

      const load = React.useCallback(async (selectRoot) => {
        const current = ++sequence.current
        setData((previous) => ({ status: previous.data === null ? 'loading' : 'refreshing', data: previous.data, error: null }))
        try {
          const payload = await request('/publisher/overview', {})
          if (sequence.current !== current) return
          setData({ status: 'ready', data: payload, error: null })
          if (selectRoot) {
            const match = (payload.plugins ?? []).find((plugin) => plugin.root === selectRoot)
            if (match) setSelected(match)
          }
        } catch (error) {
          if (sequence.current !== current) return
          setData((previous) => ({ status: previous.data === null ? 'error' : 'ready', data: previous.data, error: error.message }))
          onToast(t('msg.loadFailed', { message: error.message }), 'error')
        }
      }, [onToast, t])

      React.useEffect(() => {
        void load()
      }, [load])

      const overview = data.data
      const plugins = overview?.plugins ?? []
      const gitHub = overview?.github ?? { hasToken: false, owner: '' }
      const markets = overview?.markets ?? []

      const body = (() => {
        if (data.status === 'loading' && overview === null) {
          return h('div', { className: 'pmp-local-list' }, h(CardSkeleton, null), h(CardSkeleton, null))
        }
        if (data.status === 'error' && overview === null) {
          return h('div', { className: 'pmp-empty' },
            h('p', null, t('msg.loadFailed', { message: data.error || '' })),
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: () => void load() }, t('action.retry')))
        }
        if (plugins.length === 0) {
          return h('div', { className: 'pmp-empty pmp-local-empty' },
            h('h3', null, localLabel(language, '还没有发现本地插件', 'No local plugins yet')),
            h('p', null, localLabel(language,
              '本地插件会从 DSH profile 的 link:/file: 依赖自动发现。你也可以在发布设置里添加目录。',
              'Local plugins are discovered from link:/file: dependencies in DSH profiles. You can add a directory in settings.')),
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: () => setSettings({}) }, localLabel(language, '添加本地目录', 'Add local directory')))
        }
        return h('div', { className: 'pmp-local-list' }, plugins.map((plugin) => h(LocalPluginCard, {
          key: plugin.root,
          plugin,
          language,
          onOpen: () => setSelected(plugin),
          onPublish: () => setPublish({ plugin, marketId: null }),
        })))
      })()

      return h(
        'div',
        { className: 'pmp-body pmp-local-page' },
        h(
          'div',
          { className: 'pmp-manage-head' },
          h('div', null,
            h('h2', { className: 'pmp-section-title' }, localLabel(language, '本地插件', 'Local plugins')),
            h('p', { className: 'pmp-sub' }, localLabel(language,
              '管理自己创建的插件：版本与 tag、GitHub 上传与状态、发布到插件市场索引。',
              'Manage your own plugins: versions and tags, GitHub upload and status, and publishing to market indexes.')),
            h('div', { className: 'pmp-head-meta' },
              h('span', null, `${localLabel(language, '本地插件', 'Plugins')} ${plugins.length}`),
              h('span', { className: 'pmp-dot' }, '·'),
              h('span', null, gitHub.hasToken ? localLabel(language, 'GitHub 凭据已配置', 'GitHub credentials ready') : localLabel(language, 'GitHub 凭据未配置', 'GitHub credentials missing')),
              h('span', { className: 'pmp-dot' }, '·'),
              h('span', null, `${localLabel(language, '可发布市场', 'Publishable markets')} ${markets.length}`),
            ),
          ),
          h('div', { className: 'pmp-manage-actions' },
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', disabled: data.status === 'refreshing', onClick: () => void load() }, data.status === 'refreshing' ? t('action.refreshing') : t('action.refresh')),
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => setSettings({}) }, localLabel(language, '发布设置', 'Publishing settings')),
          ),
        ),
        data.error ? h('p', { className: 'pmp-warn pmp-local-error' }, t('msg.loadFailed', { message: data.error })) : null,
        body,
        selected ? h(LocalDetailModal, {
          plugin: selected,
          overview,
          t,
          language,
          onClose: () => setSelected(null),
          onRefresh: async (root) => { await load(root) },
          onSettings: () => setSettings({}),
          onUpload: () => setUpload(selected),
          onPublish: (marketId) => setPublish({ plugin: selected, marketId: marketId ?? null }),
          onToast,
        }) : null,
        settings ? h(PublisherSettingsModal, {
          overview,
          t,
          language,
          onClose: () => setSettings(null),
          onSaved: async () => { await load() },
          onToast,
        }) : null,
        upload ? h(LocalUploadModal, {
          plugin: upload,
          overview,
          t,
          language,
          onClose: () => setUpload(null),
          onDone: async () => { await load(upload.root) },
          onToast,
        }) : null,
        publish ? h(LocalPublishModal, {
          plugin: publish.plugin,
          initialMarketId: publish.marketId,
          overview,
          t,
          language,
          onClose: () => setPublish(null),
          onSettings: () => { setPublish(null); setSettings({}) },
          onToast,
        }) : null,
      )
    }

    function LocalDetailModal(props) {
      const plugin = props.plugin
      const overview = props.overview
      const t = props.t
      const language = props.language
      const [version, setVersion] = React.useState(plugin.version)
      const [tag, setTag] = React.useState(true)
      const [message, setMessage] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [status, setStatus] = React.useState({ status: 'idle', data: null, error: null })
      useEscape(true, props.onClose)

      React.useEffect(() => {
        setVersion(plugin.version)
        setTag(true)
        setMessage('')
        setStatus({ status: 'idle', data: null, error: null })
      }, [plugin.root, plugin.version])

      React.useEffect(() => {
        if (!plugin.git?.remoteGithub) return undefined
        let cancelled = false
        setStatus({ status: 'loading', data: null, error: null })
        request('/publisher/github/status', { root: plugin.root }).then((data) => {
          if (!cancelled) setStatus({ status: 'ready', data, error: null })
        }).catch((error) => {
          if (!cancelled) setStatus({ status: 'ready', data: null, error: error.message })
        })
        return () => { cancelled = true }
      }, [plugin.root, plugin.git?.remoteGithub])

      const saveVersion = async () => {
        setBusy(true)
        try {
          await request('/publisher/version', { root: plugin.root, version, tag, message: message || undefined })
          props.onToast(localLabel(language, `版本已保存为 v${version}${tag ? ' 并创建 tag' : ''}`, `Version saved as v${version}${tag ? ' with tag' : ''}`), 'success')
          await props.onRefresh(plugin.root)
        } catch (error) {
          props.onToast(error.message, 'error')
        } finally {
          setBusy(false)
        }
      }

      const addSource = async (source) => {
        try {
          await request('/publisher/markets', { market: { name: typeof source.title === 'string' ? source.title : source.title?.zh || source.title?.en || source.url, indexUrl: source.url } })
          props.onToast(localLabel(language, '已加入可发布市场列表', 'Added to publishable markets'), 'success')
          await props.onRefresh(plugin.root)
        } catch (error) {
          props.onToast(error.message, 'error')
        }
      }

      const git = plugin.git ?? {}
      const repo = git.remoteGithub?.url || plugin.repository || ''
      const api = status.data?.api
      const tags = (git.tags ?? []).slice(0, 12)
      const dshSourceNodes = (overview?.dshSources ?? []).map((source) => h('div', { key: source.url, className: 'pmp-local-source-row' },
        h('div', null,
          h('strong', null, typeof source.title === 'string' ? source.title : source.title?.zh || source.title?.en || source.url),
          h('div', { className: 'pmp-url' }, source.url)),
        source.configured
          ? h(Badge, { tone: 'done' }, localLabel(language, '已在发布列表', 'configured'))
          : h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => void addSource(source) }, localLabel(language, '加入发布列表', 'Add to publish list'))))

      return h(Backdrop, { onClose: props.onClose },
        h('div', { className: 'pmp-modal pmp-modal-lg', role: 'dialog', 'aria-modal': 'true', 'aria-label': plugin.name },
          h('div', { className: 'pmp-modal-head' },
            h('h2', null, localLabel(language, '本地插件详情', 'Local plugin')),
            h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose, 'aria-label': t('action.close') }, '×')),
          h('div', { className: 'pmp-modal-body pmp-local-detail' },
            h('div', { className: 'pmp-detail-head pmp-local-head' },
              h('div', { className: 'pmp-local-avatar pmp-local-avatar-lg' }, (plugin.title || plugin.name).slice(0, 1).toUpperCase()),
              h('div', { className: 'pmp-detail-titles' },
                h('h3', null, plugin.title || plugin.name),
                h('div', { className: 'pmp-mono pmp-muted' }, plugin.name),
                h('div', { className: 'pmp-muted' }, [`v${plugin.version}`, plugin.author, plugin.license].filter(Boolean).join(' · '))),
              h('div', { className: 'pmp-badges' },
                h(Badge, { tone: 'brand' }, `v${plugin.version}`),
                git.branch ? h(Badge, { tone: 'muted' }, git.branch) : null,
                git.dirty > 0 ? h(Badge, { tone: 'warn' }, localLabel(language, '未提交改动', 'Uncommitted')) : h(Badge, { tone: 'done' }, localLabel(language, '工作区干净', 'Clean')))),
            h('p', { className: 'pmp-detail-desc' }, plugin.description || localLabel(language, '暂无描述', 'No description')),
            git.repoRoot && git.repoRoot !== plugin.root ? h('p', { className: 'pmp-warn pmp-local-hint' }, localLabel(language, '插件位于 monorepo 子目录；为避免提交/推送整个外层仓库，GitHub 上传会被拒绝，请在独立仓库中操作。', 'Plugin is a monorepo subdirectory; GitHub upload is refused to avoid committing/pushing the outer repository. Use a standalone repository.')) : null,
            h('div', { className: 'pmp-field-row' }, h('span', null, localLabel(language, '目录', 'Directory')), h('code', { className: 'pmp-code pmp-local-path' }, plugin.root)),
            h('div', { className: 'pmp-section-head' },
              h('h3', { className: 'pmp-section-title' }, localLabel(language, '版本维护', 'Version')),
              tags.length > 0 ? h('div', { className: 'pmp-badges' }, tags.map((name) => h(Badge, { key: name, tone: 'muted' }, name))) : null),

            h('div', { className: 'pmp-local-form-row' },
              h('label', { className: 'pmp-field' },
                h('span', null, localLabel(language, '版本号', 'Version')),
                h('input', { className: 'pmp-input', value: version, onChange: (event) => setVersion(event.target.value), placeholder: '1.2.3' })),
              h('label', { className: 'pmp-field pmp-check' },
                h('input', { type: 'checkbox', checked: tag, onChange: (event) => setTag(event.target.checked) }),
                h('span', null, localLabel(language, '提交 package.json 并创建 tag', 'Commit package.json and tag'))),
              h('label', { className: 'pmp-field pmp-field-grow' },
                h('span', null, localLabel(language, '提交信息', 'Commit message')),
                h('input', { className: 'pmp-input', value: message, onChange: (event) => setMessage(event.target.value), placeholder: localLabel(language, '可选', 'optional') })),
              h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', disabled: busy, onClick: () => void saveVersion() }, busy ? '…' : localLabel(language, '保存版本', 'Save version'))),
            h('p', { className: 'pmp-muted pmp-local-hint' }, localLabel(language,
              '保存只改 package.json；勾选后会在当前分支提交并打 tag，但不会自动 push。',
              'Saving only updates package.json; the checkbox commits and tags locally, but never pushes.')),

            h('div', { className: 'pmp-section-head' },
              h('h3', { className: 'pmp-section-title' }, 'GitHub'),
              repo ? h('a', { className: 'pmp-link', href: repo, target: '_blank', rel: 'noreferrer' }, localLabel(language, '打开 GitHub', 'Open GitHub')) : null),
            h('div', { className: 'pmp-facts' },
              h('div', { className: 'pmp-fact' }, h('span', null, localLabel(language, '远程仓库', 'Remote')), h('strong', { className: 'pmp-local-fact-value' }, git.remote || localLabel(language, '未配置', 'none'))),
              h('div', { className: 'pmp-fact' }, h('span', null, localLabel(language, '分支', 'Branch')), h('strong', null, git.branch || '—')),
              h('div', { className: 'pmp-fact' }, h('span', null, localLabel(language, '领先/落后', 'Ahead / behind')), h('strong', null, `${git.ahead ?? '—'} / ${git.behind ?? '—'}`)),
              h('div', { className: 'pmp-fact' }, h('span', null, localLabel(language, '最后提交', 'Last commit')), h('strong', { className: 'pmp-local-fact-value' }, git.lastCommit ? `${git.lastCommit.sha.slice(0, 7)} ${git.lastCommit.message}` : '—'))),
            status.status === 'loading' ? h('p', { className: 'pmp-muted' }, localLabel(language, '读取 GitHub 状态…', 'Reading GitHub status…')) : null,
            status.error ? h('p', { className: 'pmp-warn' }, status.error) : null,
            api && !api.error ? h('div', { className: 'pmp-badges' },
              h(Badge, { tone: 'muted' }, api.private ? 'private' : 'public'),
              api.defaultBranch ? h(Badge, { tone: 'muted' }, `${localLabel(language, '默认分支', 'default')} ${api.defaultBranch}`) : null,
              typeof api.stars === 'number' ? h(Badge, { tone: 'muted' }, `★ ${api.stars}`) : null,
              typeof api.issues === 'number' ? h(Badge, { tone: 'muted' }, `${api.issues} issues`) : null) : null,
            h('div', { className: 'pmp-local-actions' },
              h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: props.onUpload }, localLabel(language, repo ? '推送到 GitHub' : '上传到 GitHub', repo ? 'Push to GitHub' : 'Upload to GitHub')),
              h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: props.onSettings }, localLabel(language, 'GitHub / 市场配置', 'GitHub / market settings'))),

            h('div', { className: 'pmp-section-head' },
              h('h3', { className: 'pmp-section-title' }, localLabel(language, '发布到插件市场', 'Publish to markets')),
              h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => props.onPublish() }, localLabel(language, '生成 / 发布', 'Build / publish'))),
            h('p', { className: 'pmp-muted pmp-local-hint' }, localLabel(language,
              'DSH 的“上架”是一个静态 JSON 索引：GitHub 仓库 + index.json。配置市场仓库后可直接提交；否则生成条目手动合并。',
              'A DSH market is a static JSON index (GitHub repo + index.json). Configure the repo to commit automatically, or generate an entry to merge manually.')),
            (overview?.markets ?? []).length === 0
              ? h('p', { className: 'pmp-muted' }, localLabel(language, '还没有可发布市场。可在设置中添加，或把已添加的 DSH 索引加入列表。', 'No publishable market yet. Add one in settings, or add a configured DSH source to the list.'))
              : h('div', { className: 'pmp-local-market-list' }, (overview.markets ?? []).map((market) => h('div', { key: market.id, className: 'pmp-local-market-row' },
                  h('div', null,
                    h('strong', null, market.name),
                    h('div', { className: 'pmp-url' }, market.indexUrl),
                    h('div', { className: 'pmp-muted' }, market.repo ? `${market.repo.owner}/${market.repo.name}:${market.repo.path} @ ${market.repo.branch}` : localLabel(language, '只读 / 需手动合并', 'read-only / manual merge'))),
                  h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => props.onPublish(market.id) }, localLabel(language, '发布到此处', 'Publish here'))))),
            dshSourceNodes.length > 0
              ? h('div', null,
                  h('h4', { className: 'pmp-local-subhead' }, localLabel(language, 'DSH 已添加的索引', 'DSH index sources')),
                  h('div', { className: 'pmp-local-source-list' }, dshSourceNodes))
              : null,
          ),
          h('div', { className: 'pmp-modal-foot' },
            h('span', { className: 'pmp-muted' }, localLabel(language, '本地操作不会 force-push，也不会自动执行 npm publish。', 'Local actions never force-push and never run npm publish automatically.')),
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: props.onClose }, t('action.close')))),
      )
    }

    function LocalUploadModal(props) {
      const plugin = props.plugin
      const overview = props.overview
      const t = props.t
      const language = props.language
      const hasRemote = Boolean(plugin.git?.remote)
      const [owner, setOwner] = React.useState(overview?.github?.owner || plugin.git?.remoteGithub?.owner || '')
      const [repoName, setRepoName] = React.useState(plugin.git?.remoteGithub?.name || plugin.name.split('/').pop() || '')
      const [privateRepo, setPrivateRepo] = React.useState(true)
      const [initialize, setInitialize] = React.useState(!plugin.git?.isRepo)
      const [commit, setCommit] = React.useState(false)
      const [commitMessage, setCommitMessage] = React.useState('')
      const [pushTags, setPushTags] = React.useState(true)
      const [busy, setBusy] = React.useState(false)
      const [result, setResult] = React.useState(null)
      const [error, setError] = React.useState('')
      useEscape(true, props.onClose)
      const submit = async () => {
        setBusy(true); setError('')
        try {
          const data = await request('/publisher/github/push', {
            root: plugin.root,
            createRepo: !hasRemote,
            owner: owner || undefined,
            repoName: repoName || undefined,
            private: privateRepo,
            initialize,
            commit,
            commitMessage: commitMessage || undefined,
            pushTags,
          })
          setResult(data)
          props.onToast(localLabel(language, '已推送到 GitHub', 'Pushed to GitHub'), 'success')
          await props.onDone()
        } catch (err) {
          setError(err.message)
        } finally {
          setBusy(false)
        }
      }
      return h(Backdrop, { onClose: props.onClose },
        h('div', { className: 'pmp-modal pmp-modal-sm', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'GitHub' },
          h('div', { className: 'pmp-modal-head' }, h('h2', null, localLabel(language, '上传到 GitHub', 'Upload to GitHub')), h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose }, '×')),
          h('div', { className: 'pmp-modal-body' },
            h('p', { className: 'pmp-muted' }, localLabel(language, '会把当前分支 push 到 origin，不会 force-push。未提交的改动不会上传。', 'Pushes the current branch to origin; no force-push. Uncommitted changes are not uploaded.')),
            !overview?.github?.hasToken ? h('p', { className: 'pmp-warn' }, localLabel(language, '还没有 GitHub Token。若系统 git 已有凭据仍可尝试；否则请先在发布设置中补充。', 'No GitHub token configured. If system git already has credentials this may still work; otherwise add one in settings.')) : null,
            plugin.git?.repoRoot && plugin.git.repoRoot !== plugin.root ? h('p', { className: 'pmp-warn' }, localLabel(language, '该插件位于 monorepo 子目录，上传会被拒绝；请使用独立仓库。', 'This plugin is a monorepo subdirectory; upload is refused. Use a standalone repository.')) : null,
            !plugin.git?.isRepo ? h('label', { className: 'pmp-field pmp-check' }, h('input', { type: 'checkbox', checked: initialize, onChange: (e) => setInitialize(e.target.checked) }), h('span', null, localLabel(language, '初始化 git 仓库并提交（会生成 .gitignore，仍会提交当前目录其余文件）', 'Initialize a git repository and commit (creates .gitignore; other files in this directory are committed)'))) : null,
            hasRemote ? h('div', { className: 'pmp-field-row' }, h('span', null, localLabel(language, '远程仓库', 'Remote')), h('code', { className: 'pmp-code' }, plugin.git.remote)) : h(React.Fragment, null,
              h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, 'GitHub 用户/组织', 'GitHub owner')), h('input', { className: 'pmp-input', value: owner, onChange: (e) => setOwner(e.target.value) })),
              h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '仓库名', 'Repository')), h('input', { className: 'pmp-input', value: repoName, onChange: (e) => setRepoName(e.target.value) })),
              h('label', { className: 'pmp-field pmp-check' }, h('input', { type: 'checkbox', checked: privateRepo, onChange: (e) => setPrivateRepo(e.target.checked) }), h('span', null, localLabel(language, '私有仓库', 'Private repository')))),
            h('label', { className: 'pmp-field pmp-check' }, h('input', { type: 'checkbox', checked: commit, onChange: (e) => setCommit(e.target.checked) }), h('span', null, localLabel(language, '先提交当前所有改动', 'Commit all current changes first'))),
            commit ? h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '提交信息', 'Commit message')), h('input', { className: 'pmp-input', value: commitMessage, onChange: (e) => setCommitMessage(e.target.value), placeholder: 'chore: update plugin' })) : null,
            h('label', { className: 'pmp-field pmp-check' }, h('input', { type: 'checkbox', checked: pushTags, onChange: (e) => setPushTags(e.target.checked) }), h('span', null, localLabel(language, '同时推送 tags', 'Push tags too'))),
            error ? h('p', { className: 'pmp-warn' }, error) : null,
            result ? h('p', { className: 'pmp-success' }, localLabel(language, `完成：${result.branch} @ ${String(result.commit).slice(0, 7)}`, `Done: ${result.branch} @ ${String(result.commit).slice(0, 7)}`)) : null,
            result?.htmlUrl ? h('a', { className: 'pmp-link', href: result.htmlUrl, target: '_blank', rel: 'noreferrer' }, result.htmlUrl) : null,
          ),
          h('div', { className: 'pmp-modal-foot' },
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost', onClick: props.onClose }, t('action.cancel')),
            h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary', disabled: busy, onClick: () => void submit() }, busy ? '…' : localLabel(language, '开始上传', 'Upload')))))
    }

    function PublisherSettingsModal(props) {
      const overview = props.overview
      const t = props.t
      const language = props.language
      const [owner, setOwner] = React.useState(overview?.github?.owner || '')
      const [apiBase, setApiBase] = React.useState(overview?.github?.apiBase || 'https://api.github.com')
      const [token, setToken] = React.useState('')
      const [form, setForm] = React.useState({ id: '', name: '', indexUrl: '', repoOwner: '', repoName: '', branch: 'main', path: 'index.json', token: '', clearRepo: false })
      const [rootInput, setRootInput] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState('')
      useEscape(true, props.onClose)

      const saveGithub = async () => {
        setBusy(true); setMessage('')
        try {
          await request('/publisher/config', { owner, apiBase, ...(token === '' ? {} : { token }) })
          setMessage(localLabel(language, 'GitHub 配置已保存', 'GitHub settings saved'))
          setToken('')
          await props.onSaved()
        } catch (error) { setMessage(error.message) } finally { setBusy(false) }
      }
      const clearGithubToken = async () => {
        setBusy(true); setMessage('')
        try {
          await request('/publisher/config', { clearToken: true })
          setMessage(localLabel(language, '已清除保存的 Token', 'Saved token cleared'))
          await props.onSaved()
        } catch (error) { setMessage(error.message) } finally { setBusy(false) }
      }
      const resetMarket = () => setForm({ id: '', name: '', indexUrl: '', repoOwner: '', repoName: '', branch: 'main', path: 'index.json', token: '', clearRepo: false })
      const useSource = (source) => setForm({
        id: '',
        name: typeof source.title === 'string' ? source.title : source.title?.zh || source.title?.en || source.url,
        indexUrl: source.url,
        repoOwner: '', repoName: '', branch: 'main', path: 'index.json', token: '', clearRepo: false,
      })
      const saveMarket = async () => {
        setBusy(true); setMessage('')
        try {
          const repo = form.repoOwner || form.repoName
            ? { owner: form.repoOwner, name: form.repoName, branch: form.branch || 'main', path: form.path || 'index.json' }
            : undefined
          await request('/publisher/markets', { market: {
            id: form.id || undefined,
            name: form.name || undefined,
            indexUrl: form.indexUrl,
            ...(repo ? { repo } : {}),
            ...(form.clearRepo ? { clearRepo: true } : {}),
            ...(form.token === '' ? {} : { token: form.token }),
          } })
          setMessage(localLabel(language, '市场配置已保存', 'Market saved'))
          resetMarket()
          await props.onSaved()
        } catch (error) { setMessage(error.message) } finally { setBusy(false) }
      }
      const removeMarket = async (id) => {
        try {
          await request('/publisher/markets', { action: 'remove', id })
          await props.onSaved()
        } catch (error) { setMessage(error.message) }
      }
      const addRoot = async () => {
        setBusy(true); setMessage('')
        try {
          await request('/publisher/roots', { add: rootInput })
          setRootInput('')
          await props.onSaved()
        } catch (error) { setMessage(error.message) } finally { setBusy(false) }
      }
      const removeRoot = async (root) => {
        try {
          await request('/publisher/roots', { remove: root })
          await props.onSaved()
        } catch (error) { setMessage(error.message) }
      }
      return h(Backdrop, { onClose: props.onClose },
        h('div', { className: 'pmp-modal pmp-modal-lg', role: 'dialog', 'aria-modal': 'true', 'aria-label': localLabel(language, '发布设置', 'Publishing settings') },
          h('div', { className: 'pmp-modal-head' }, h('h2', null, localLabel(language, 'GitHub 与插件市场配置', 'GitHub and market settings')), h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose }, '×')),
          h('div', { className: 'pmp-modal-body pmp-local-settings' },
            h('section', null,
              h('h3', { className: 'pmp-section-title' }, 'GitHub'),
              h('p', { className: 'pmp-muted' }, localLabel(language, '默认会尝试环境变量 GITHUB_TOKEN / GH_TOKEN、DSH 配置的 GitHub MCP 凭据、gh auth token、git config github.user。DSH 的 Token 只显示来源，不会回显；可补充个人 PAT 覆盖。', 'Defaults try GITHUB_TOKEN / GH_TOKEN, DSH’s configured GitHub MCP credential, gh auth token, and git config github.user. DSH’s token is never echoed; add a PAT to override.')),
              h('div', { className: 'pmp-local-form-row' },
                h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, 'GitHub 用户/组织', 'Owner')), h('input', { className: 'pmp-input', value: owner, onChange: (e) => setOwner(e.target.value) })),
                h('label', { className: 'pmp-field pmp-field-grow' }, h('span', null, localLabel(language, 'API 地址', 'API base')), h('input', { className: 'pmp-input', value: apiBase, onChange: (e) => setApiBase(e.target.value) })),
                h('label', { className: 'pmp-field pmp-field-grow' }, h('span', null, localLabel(language, 'Token', 'Token')), h('input', { className: 'pmp-input', type: 'password', value: token, placeholder: overview?.github?.hasToken ? localLabel(language, '已配置，留空保持不变', 'configured; blank keeps it') : 'ghp_…', onChange: (e) => setToken(e.target.value) })),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', disabled: busy, onClick: () => void saveGithub() }, localLabel(language, '保存 GitHub', 'Save GitHub'))),
              h('div', { className: 'pmp-local-actions' },
                h('p', { className: 'pmp-muted' }, `${localLabel(language, '凭据来源', 'Token source')}: ${overview?.github?.tokenSource || 'none'}`),
                overview?.github?.hasToken ? h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => void clearGithubToken() }, localLabel(language, '清除保存的 Token', 'Clear saved token')) : null)),

            h('section', null,
              h('h3', { className: 'pmp-section-title' }, localLabel(language, '可发布市场', 'Publishable markets')),
              (overview?.markets ?? []).length === 0 ? h('p', { className: 'pmp-muted' }, localLabel(language, '还没有配置市场。', 'No market configured.')) : null,
              (overview?.markets ?? []).map((market) => h('div', { key: market.id, className: 'pmp-local-market-row' },
                h('div', null, h('strong', null, market.name), h('div', { className: 'pmp-url' }, market.indexUrl), h('div', { className: 'pmp-muted' }, market.repo ? `${market.repo.owner}/${market.repo.name}:${market.repo.path} @ ${market.repo.branch}` : localLabel(language, '只读 / 手动合并', 'read-only / manual'))),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => void removeMarket(market.id) }, localLabel(language, '移除', 'Remove')))),
              h('div', { className: 'pmp-local-source-list' },
                (overview?.dshSources ?? []).map((source) => h('button', { key: source.url, type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => useSource(source) },
                  `${localLabel(language, '带入', 'Use')} ${typeof source.title === 'string' ? source.title : source.title?.zh || source.url}`))),
              h('div', { className: 'pmp-local-form-row' },
                h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '名称', 'Name')), h('input', { className: 'pmp-input', value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })),
                h('label', { className: 'pmp-field pmp-field-grow' }, h('span', null, localLabel(language, '索引 URL', 'Index URL')), h('input', { className: 'pmp-input', value: form.indexUrl, onChange: (e) => setForm({ ...form, indexUrl: e.target.value }), placeholder: 'https://…/index.json' }))),
              h('div', { className: 'pmp-local-form-row' },
                h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '仓库 owner', 'Repo owner')), h('input', { className: 'pmp-input', value: form.repoOwner, onChange: (e) => setForm({ ...form, repoOwner: e.target.value }) })),
                h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '仓库名', 'Repo name')), h('input', { className: 'pmp-input', value: form.repoName, onChange: (e) => setForm({ ...form, repoName: e.target.value }) })),
                h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '分支', 'Branch')), h('input', { className: 'pmp-input', value: form.branch, onChange: (e) => setForm({ ...form, branch: e.target.value }) })),
                h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '索引路径', 'Path')), h('input', { className: 'pmp-input', value: form.path, onChange: (e) => setForm({ ...form, path: e.target.value }) })),
                h('label', { className: 'pmp-field pmp-field-grow' }, h('span', null, localLabel(language, '市场专用 Token（可选）', 'Market token (optional)')), h('input', { className: 'pmp-input', type: 'password', value: form.token, onChange: (e) => setForm({ ...form, token: e.target.value }) })),
                h('label', { className: 'pmp-field pmp-check' }, h('input', { type: 'checkbox', checked: form.clearRepo, onChange: (e) => setForm({ ...form, clearRepo: e.target.checked }) }), h('span', null, localLabel(language, '清除已配置仓库', 'Clear configured repo'))),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', disabled: busy, onClick: () => void saveMarket() }, localLabel(language, '保存市场', 'Save market'))),
              h('p', { className: 'pmp-muted' }, localLabel(language,
                '只填 URL = 只读市场（生成条目手动合并）；填写 repo owner/name/branch/path 后可直接提交 index.json。',
                'URL only = read-only (manual merge); fill repo owner/name/branch/path for automatic index.json commits.'))),

            h('section', null,
              h('h3', { className: 'pmp-section-title' }, localLabel(language, '本地目录', 'Local roots')),
              h('div', { className: 'pmp-local-source-list' }, (overview?.localRoots ?? []).map((root) => h('div', { key: root, className: 'pmp-local-source-row' },
                h('code', { className: 'pmp-code pmp-local-path' }, root),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => void removeRoot(root) }, localLabel(language, '移除', 'Remove'))))),
              h('div', { className: 'pmp-local-form-row' },
                h('input', { className: 'pmp-input pmp-field-grow', value: rootInput, onChange: (e) => setRootInput(e.target.value), placeholder: '/path/to/plugin' }),
                h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', disabled: busy || rootInput.trim() === '', onClick: () => void addRoot() }, localLabel(language, '添加目录', 'Add directory')))),
            message ? h('p', { className: 'pmp-warn' }, message) : null,
          ),
          h('div', { className: 'pmp-modal-foot' }, h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost', onClick: props.onClose }, t('action.close')))),
      )
    }

    function LocalPublishModal(props) {
      const plugin = props.plugin
      const overview = props.overview
      const t = props.t
      const language = props.language
      const markets = overview?.markets ?? []
      const initial = props.initialMarketId && markets.some((entry) => entry.id === props.initialMarketId)
        ? props.initialMarketId
        : markets[0]?.id ?? ''
      const [marketId, setMarketId] = React.useState(initial)
      const [sourceType, setSourceType] = React.useState('git')
      const [title, setTitle] = React.useState(plugin.title || '')
      const [description, setDescription] = React.useState(plugin.description || '')
      const [busy, setBusy] = React.useState(false)
      const [result, setResult] = React.useState(null)
      const [error, setError] = React.useState('')
      useEscape(true, props.onClose)
      const market = markets.find((entry) => entry.id === marketId)
      React.useEffect(() => {
        setResult(null)
        setError('')
      }, [marketId, sourceType, title, description])
      const run = async (dryRun) => {
        if (!marketId) { setError(localLabel(language, '请先在设置中添加市场', 'Add a market in settings first')); return }
        setBusy(true); setError('')
        try {
          const data = await request('/publisher/publish', {
            root: plugin.root,
            marketId,
            sourceType,
            dryRun,
            overrides: { title: title || undefined, description: description || undefined },
          })
          setResult(data)
          if (!dryRun) props.onToast(localLabel(language, '发布请求已完成', 'Publish request completed'), 'success')
        } catch (err) { setError(err.message) } finally { setBusy(false) }
      }
      const copy = (value) => {
        if (copyText(value)) props.onToast(localLabel(language, '已复制', 'Copied'), 'success')
      }
      return h(Backdrop, { onClose: props.onClose },
        h('div', { className: 'pmp-modal pmp-modal-lg', role: 'dialog', 'aria-modal': 'true', 'aria-label': localLabel(language, '发布插件', 'Publish plugin') },
          h('div', { className: 'pmp-modal-head' }, h('h2', null, localLabel(language, `发布 ${plugin.name}`, `Publish ${plugin.name}`)), h('button', { type: 'button', className: 'pmp-close', onClick: props.onClose }, '×')),
          h('div', { className: 'pmp-modal-body' },
            markets.length === 0
              ? h('div', { className: 'pmp-empty' }, h('p', null, localLabel(language, '还没有可发布市场。', 'No publishable market yet.')), h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: props.onSettings }, localLabel(language, '去配置市场', 'Configure markets')))
              : h(React.Fragment, null,
                  h('div', { className: 'pmp-local-form-row' },
                    h('label', { className: 'pmp-field pmp-field-grow' }, h('span', null, localLabel(language, '目标市场', 'Market')), h('select', { className: 'pmp-input', value: marketId, onChange: (e) => setMarketId(e.target.value) }, markets.map((entry) => h('option', { key: entry.id, value: entry.id }, entry.name)))),
                    h('label', { className: 'pmp-field' }, h('span', null, localLabel(language, '来源类型', 'Source type')), h('select', { className: 'pmp-input', value: sourceType, onChange: (e) => setSourceType(e.target.value) }, h('option', { value: 'git' }, 'git'), h('option', { value: 'npm' }, 'npm'))),
                    h('label', { className: 'pmp-field pmp-field-grow' }, h('span', null, localLabel(language, '标题', 'Title')), h('input', { className: 'pmp-input', value: title, onChange: (e) => setTitle(e.target.value) })),
                    h('label', { className: 'pmp-field pmp-field-grow' }, h('span', null, localLabel(language, '描述', 'Description')), h('input', { className: 'pmp-input', value: description, onChange: (e) => setDescription(e.target.value) }))),
                  h('div', { className: 'pmp-badges' },
                    market?.repo ? h(Badge, { tone: 'done' }, localLabel(language, '可自动提交 index.json', 'auto-commit index.json')) : h(Badge, { tone: 'muted' }, localLabel(language, '只读 / 手动合并', 'read-only / manual')),
                    sourceType === 'npm' ? h(Badge, { tone: 'warn' }, localLabel(language, '需要先 npm publish', 'run npm publish first')) : null),
                  h('div', { className: 'pmp-local-actions' },
                    h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', disabled: busy, onClick: () => void run(true) }, localLabel(language, '预览索引条目', 'Preview entry')),
                    h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', disabled: busy, onClick: () => void run(false) }, busy ? '…' : localLabel(language, '发布', 'Publish'))),
                  error ? h('p', { className: 'pmp-warn' }, error) : null,
                  result ? h('div', { className: 'pmp-publish-result' },
                    h('div', { className: 'pmp-badges' }, h(Badge, { tone: result.mode === 'committed' ? 'done' : result.mode === 'dry-run' ? 'warn' : 'muted' }, result.mode === 'committed' ? localLabel(language, '已提交', 'Committed') : result.mode === 'dry-run' ? localLabel(language, '预览', 'Preview') : localLabel(language, '手动模式', 'Manual'))),
                    result.commit ? h('a', { className: 'pmp-link', href: result.commit, target: '_blank', rel: 'noreferrer' }, result.commit) : null,
                    h('p', { className: 'pmp-muted' }, result.instructions || ''),
                    h('h4', { className: 'pmp-local-subhead' }, localLabel(language, '索引条目', 'Index entry')),
                    h('pre', { className: 'pmp-json' }, JSON.stringify(result.entry, null, 2)),
                    h('div', { className: 'pmp-local-actions' },
                      h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => copy(JSON.stringify(result.entry, null, 2)) }, localLabel(language, '复制条目', 'Copy entry')),
                      result.index ? h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost pmp-btn-sm', onClick: () => copy(JSON.stringify(result.index, null, 2)) }, localLabel(language, '复制完整索引', 'Copy full index')) : null),
                    result.warnings?.length ? h('ul', { className: 'pmp-local-warnings' }, result.warnings.map((warning, index) => h('li', { key: index }, warning))) : null) : null,
                ),
          ),
          h('div', { className: 'pmp-modal-foot' }, h('button', { type: 'button', className: 'pmp-btn pmp-btn-ghost', onClick: props.onClose }, t('action.close')))),
      )
    }

    function Panel() {
      const [language, setLanguage] = React.useState(detectLanguage)
      const t = React.useMemo(() => makeT(language), [language])
      const [tab, setTab] = React.useState('discover')
      const [snapshot, setSnapshot] = React.useState({ status: 'loading', data: null, error: null })
      const [snapshotBusy, setSnapshotBusy] = React.useState(false)
      const [textInput, setTextInput] = React.useState('')
      const [filters, setFilters] = React.useState(INITIAL_FILTERS)
      const [listing, setListing] = React.useState({ status: 'idle', data: null, error: null })
      const [detail, setDetail] = React.useState(null)
      const [installedDetail, setInstalledDetail] = React.useState(null)
      const [confirm, setConfirm] = React.useState(null)
      const [operation, setOperation] = React.useState(null)
      const [approval, setApproval] = React.useState(null)
      const [toast, setToast] = React.useState(null)
      const [manage, setManage] = React.useState({ status: 'idle', data: null, error: null, refreshing: false })
      const listAbort = React.useRef(null)
      const snapshotSeq = React.useRef(0)
      const manageSeq = React.useRef(0)
      const toastTimer = React.useRef(null)
      const settledIds = React.useRef(new Set())

      const showToast = React.useCallback((message, tone = 'info', action) => {
        setToast({ message, tone, action })
        if (toastTimer.current !== null) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 6000)
      }, [])

      React.useEffect(() => () => {
        if (toastTimer.current !== null) clearTimeout(toastTimer.current)
        if (listAbort.current !== null) listAbort.current.abort()
      }, [])

      const setLanguagePersisted = React.useCallback((next) => {
        setLanguage(next)
        try {
          window.localStorage.setItem(LANG_STORAGE, next)
        } catch {
          /* storage unavailable */
        }
      }, [])

      const loadSnapshot = React.useCallback(async (refresh) => {
        const sequence = ++snapshotSeq.current
        setSnapshotBusy(true)
        try {
          const data = await request('/snapshot', { refresh: refresh === true })
          if (sequence !== snapshotSeq.current) return null
          setSnapshot({ status: 'ready', data, error: null })
          return data
        } catch (error) {
          if (sequence !== snapshotSeq.current) return null
          if (error && error.name === 'AbortError') return null
          setSnapshot((previous) => previous.data
            ? { status: 'ready', data: previous.data, error: error.message }
            : { status: 'error', data: null, error: error.message })
          showToast(t('msg.loadFailed', { message: error.message }), 'error')
          return null
        } finally {
          if (sequence === snapshotSeq.current) setSnapshotBusy(false)
        }
      }, [showToast, t])

      const loadList = React.useCallback(async () => {
        if (listAbort.current !== null) listAbort.current.abort()
        const controller = new AbortController()
        listAbort.current = controller
        setListing((previous) => ({ status: previous.data ? 'ready' : 'loading', data: previous.data, error: null }))
        try {
          const data = await request('/list', {
            source: filters.source,
            text: filters.text,
            category: filters.category,
            labels: filters.labels,
            sort: { key: filters.sortKey, direction: filters.sortDir },
            page: filters.page,
            pageSize: filters.pageSize,
            hideInstalled: filters.hideInstalled,
            onlyCompatible: filters.onlyCompatible,
            status: filters.status,
          }, controller.signal)
          if (listAbort.current !== controller) return
          setListing({ status: 'ready', data, error: null })
        } catch (error) {
          if (error && error.name === 'AbortError') return
          if (listAbort.current !== controller) return
          setListing((previous) => ({ status: previous.data ? 'ready' : 'error', data: previous.data, error: error.message }))
        } finally {
          if (listAbort.current === controller) listAbort.current = null
        }
      }, [filters])

      const loadManage = React.useCallback(async (refresh) => {
        const sequence = ++manageSeq.current
        setManage((previous) => ({
          ...previous,
          status: previous.data === null ? 'loading' : previous.status,
          refreshing: refresh === true,
          error: null,
        }))
        try {
          const data = await request('/installed', { refresh: refresh === true })
          if (sequence !== manageSeq.current) return null
          setManage({ status: 'ready', data, error: null, refreshing: false })
          return data
        } catch (error) {
          if (sequence !== manageSeq.current) return null
          setManage((previous) => ({
            ...previous,
            status: previous.data === null ? 'error' : 'ready',
            refreshing: false,
            error: error.message,
          }))
          showToast(t('msg.loadFailed', { message: error.message }), 'error')
          return null
        }
      }, [showToast, t])

      React.useEffect(() => {
        void loadSnapshot(false)
      }, [loadSnapshot])

      React.useEffect(() => {
        if (snapshot.status !== 'ready' || snapshot.data?.loading !== true) return undefined
        let active = true
        const timer = setInterval(async () => {
          const sequence = snapshotSeq.current
          try {
            const data = await request('/snapshot', { refresh: false })
            // A manual Sync may have started while this poll was in flight.
            if (active && sequence === snapshotSeq.current) setSnapshot({ status: 'ready', data, error: null })
          } catch {
            /* keep the current partial catalog */
          }
        }, 800)
        return () => {
          active = false
          clearInterval(timer)
        }
      }, [snapshot.status, snapshot.data?.loading])

      const wasLoadingRef = React.useRef(false)
      React.useEffect(() => {
        const loading = snapshot.data?.loading === true
        if (wasLoadingRef.current && !loading) {
          void loadList()
          if (tab === 'manage') void loadManage(false)
        }
        wasLoadingRef.current = loading
      }, [snapshot.data?.loading, loadList, loadManage, tab])

      React.useEffect(() => {
        const timer = setTimeout(() => {
          setFilters((previous) => (previous.text === textInput ? previous : { ...previous, text: textInput, page: 1 }))
        }, 300)
        return () => clearTimeout(timer)
      }, [textInput])

      React.useEffect(() => {
        if (snapshot.status !== 'ready') return
        void loadList()
      }, [filters, snapshot.status, loadList])

      React.useEffect(() => {
        if (tab === 'manage' && snapshot.status === 'ready') {
          void loadManage(false)
        }
      }, [tab, snapshot.status, loadManage])

      const onFilter = React.useCallback((patch) => {
        setFilters((previous) => ({ ...previous, ...patch }))
      }, [])

      const refreshEverything = React.useCallback(async () => {
        const data = await loadSnapshot(true)
        if (data === null) return
        showToast(data.loading === true ? t('msg.syncing') : t('msg.refreshed'), data.loading === true ? 'info' : 'success')
        setFilters((previous) => {
          const known = Array.isArray(data.sources) && data.sources.some((source) => source.url === previous.source)
          return previous.source !== 'all' && !known ? { ...previous, source: 'all', page: 1 } : previous
        })
        void loadList()
        if (tab === 'manage') void loadManage(true)
      }, [loadList, loadManage, loadSnapshot, showToast, t, tab])

      const trackOperation = React.useCallback((next) => {
        settledIds.current.delete(next.id)
        setOperation(next)
        if (next.status === 'needs-approval') setApproval(next)
      }, [])

      React.useEffect(() => {
        if (operation === null || operation.status !== 'running') return undefined
        let active = true
        const timer = setInterval(async () => {
          try {
            const payload = await request('/operation', { id: operation.id })
            if (!active) return
            setOperation(payload.operation)
          } catch (error) {
            if (!active) return
            if (error.code === 'operation-not-found') setOperation(null)
          }
        }, 1200)
        return () => {
          active = false
          clearInterval(timer)
        }
      }, [operation?.id, operation?.status])

      React.useEffect(() => {
        if (operation === null || operation.status === 'running') return
        const id = operation.id
        if (settledIds.current.has(id)) return
        settledIds.current.add(id)
        if (operation.status === 'needs-approval') {
          setApproval(operation)
          return
        }
        if (operation.status === 'done') {
          const name = operation.target?.name || ''
          if (operation.kind === 'install') showToast(t('msg.installDone', { name }) + (operation.restartRequired ? ` ${t('msg.restart')}` : ''), 'success')
          else if (operation.kind === 'update') showToast(t('msg.updateDone', { name }) + (operation.restartRequired ? ` ${t('msg.restart')}` : ''), 'success')
          else if (operation.kind === 'toggle') showToast(t(operation.target?.enabled ? 'msg.enabledDone' : 'msg.disabledDone', { name }) + (operation.restartRequired ? ` ${t('msg.restart')}` : ''), 'success')
          else showToast(t('msg.uninstallDone', { name }), 'success')
          void loadSnapshot(false)
          void loadList()
          if (tab === 'manage') void loadManage(false)
        } else if (operation.status === 'cancelled') {
          showToast(t('msg.cancelled'), 'info')
        } else if (operation.status === 'failed') {
          showToast(t('msg.failed', { message: operation.error?.message || '' }), 'error')
        }
      }, [operation, loadList, loadManage, loadSnapshot, showToast, t, tab])

      const runAction = React.useCallback(async (path, body, message) => {
        try {
          const payload = await request(path, body)
          trackOperation(payload.operation)
          showToast(message, 'info')
          setConfirm(null)
        } catch (error) {
          showToast(t('msg.failed', { message: error.message }), 'error')
          setConfirm(null)
        }
      }, [showToast, t, trackOperation])

      const doInstall = React.useCallback((item, version, approvedBuilds) => {
        const selectedVersion = version ?? item.defaultVersion ?? item.version
        return runAction('/install', {
          name: item.name,
          version: selectedVersion,
          sourceUrl: item.sourceUrl,
          ...(approvedBuilds === undefined ? {} : { approvedBuilds }),
        }, t('msg.installStarted', { name: item.name, version: selectedVersion }))
      }, [runAction, t])

      const doUpdate = React.useCallback((item, version) => {
        return runAction('/update', {
          name: item.name,
          ...(version === undefined ? {} : { version }),
          ...(item.market?.sourceUrl === undefined ? {} : { sourceUrl: item.market.sourceUrl }),
        }, t('msg.updateStarted', { name: item.name, version: version ?? item.update?.version ?? '' }))
      }, [runAction, t])

      const doUninstall = React.useCallback((name) => {
        return runAction('/uninstall', { name }, t('msg.uninstallStarted', { name }))
      }, [runAction, t])

      const doToggle = React.useCallback((item, enabled) => {
        return runAction('/toggle', { name: item.name, enabled },
          t(enabled ? 'msg.enableStarted' : 'msg.disableStarted', { name: item.name }))
      }, [runAction, t])

      const confirmAction = React.useCallback((payload) => {
        if (payload.kind === 'install') void doInstall(payload.item ?? { name: payload.name, sourceUrl: payload.sourceUrl, defaultVersion: payload.version }, payload.version)
        else if (payload.kind === 'update') void doUpdate(payload.item ?? { name: payload.name, update: { version: payload.version, sourceUrl: payload.sourceUrl } }, payload.version)
        else void doUninstall(payload.name)
      }, [doInstall, doUninstall, doUpdate])

      const cancelOperation = React.useCallback(async () => {
        if (operation === null) return
        try {
          const outcome = await request('/cancel', { id: operation.id })
          showToast(outcome.outcome === 'cancelled' ? t('msg.cancelled') : t('msg.tooLate'), outcome.outcome === 'cancelled' ? 'info' : 'error')
        } catch (error) {
          showToast(t('msg.failed', { message: error.message }), 'error')
        }
      }, [operation, showToast, t])

      const approvePending = React.useCallback(() => {
        if (approval === null) return
        const target = approval.target || {}
        const pending = approval.pendingBuilds || []
        setApproval(null)
        if (approval.kind === 'update') {
          void runAction('/update', {
            name: target.name,
            version: target.version,
            approvedBuilds: pending,
          }, t('msg.updateStarted', { name: target.name, version: target.version }))
          return
        }
        void runAction('/install', {
          name: target.name,
          version: target.version,
          sourceUrl: target.sourceUrl,
          approvedBuilds: pending,
        }, t('msg.installStarted', { name: target.name, version: target.version }))
      }, [approval, runAction, t])

      const openDetail = React.useCallback(async (item) => {
        setDetail({ status: 'loading', item: null, error: null, name: item.name, sourceUrl: item.sourceUrl })
        try {
          const payload = await request('/detail', { name: item.name, sourceUrl: item.sourceUrl })
          setDetail({ status: 'ready', item: payload.item, error: null })
        } catch (error) {
          setDetail({ status: 'error', item: null, error: error.message, name: item.name, sourceUrl: item.sourceUrl })
        }
      }, [])

      const data = snapshot.data
      const meta = data?.meta ?? { categories: {}, labels: {}, sortKeys: {} }
      const sources = data?.sources ?? []
      const recommend = data?.recommend?.items ?? []
      const showReco = tab === 'discover'
        && snapshot.status === 'ready'
        && snapshot.data?.loading !== true
        && filters.text === ''
        && filters.category === ''
        && filters.labels.length === 0
        && filters.page === 1
        && filters.source === 'all'
        && recommend.length > 0

      const header = h(
        'header',
        { className: 'pmp-head' },
        h(
          'div',
          { className: 'pmp-head-text' },
          h('h1', { className: 'pmp-title' }, t('panel.title')),
          h('p', { className: 'pmp-sub' }, t('panel.subtitle')),
          data
            ? h(
                'div',
                { className: 'pmp-head-meta' },
                h('span', null, t('label.sources', { count: sources.length })),
                h('span', { className: 'pmp-dot' }, '·'),
                h('span', null, t('label.entries', { count: data.stats?.entries ?? 0 })),
                h('span', { className: 'pmp-dot' }, '·'),
                data.loading === true
                  ? h('span', { className: 'pmp-sync' }, (data.progress?.total ?? 0) > 0
                      && (data.progress?.done ?? 0) >= (data.progress?.total ?? 0)
                    ? t('msg.syncing')
                    : t('label.syncingSources', {
                        done: data.progress?.done ?? 0,
                        total: data.progress?.total ?? sources.length,
                      }))
                  : h('span', null, t('label.syncedAt', { time: formatTime(data.syncedAt, language) })),
                data.sourceMode === 'service' ? null : h('span', { className: 'pmp-badge pmp-badge-warn' }, data.sourceMode === 'config' ? 'config' : 'none'),
              )
            : null,
        ),
        h(
          'div',
          { className: 'pmp-head-actions' },
          h('button', {
            type: 'button',
            className: 'pmp-lang',
            onClick: () => setLanguagePersisted(language === 'zh' ? 'en' : 'zh'),
            title: language === 'zh' ? 'English' : '中文',
          }, language === 'zh' ? 'EN' : '中'),
          h(
            'button',
            {
              type: 'button',
              className: 'pmp-btn pmp-btn-primary pmp-btn-sm',
              disabled: snapshotBusy,
              onClick: () => void refreshEverything(),
            },
            snapshotBusy ? t('action.refreshing') : t('action.refresh'),
          ),
        ),
      )

      const tabs = h(
        'div',
        { className: 'pmp-tabs', role: 'tablist' },
        h('button', {
          type: 'button',
          role: 'tab',
          'aria-selected': tab === 'discover',
          className: 'pmp-tab' + (tab === 'discover' ? ' pmp-tab-active' : ''),
          onClick: () => setTab('discover'),
        }, t('tab.discover'), data ? h('span', { className: 'pmp-tab-count' }, String(data.stats?.unique ?? data.stats?.entries ?? 0)) : null),
        h('button', {
          type: 'button',
          role: 'tab',
          'aria-selected': tab === 'manage',
          className: 'pmp-tab' + (tab === 'manage' ? ' pmp-tab-active' : ''),
          onClick: () => setTab('manage'),
        }, t('tab.manage'), data ? h('span', { className: 'pmp-tab-count' }, String(data.installed?.count ?? 0)) : null),
        h('button', {
          type: 'button',
          role: 'tab',
          'aria-selected': tab === 'local',
          className: 'pmp-tab' + (tab === 'local' ? ' pmp-tab-active' : ''),
          onClick: () => setTab('local'),
        }, t('tab.local')),
      )

      let body
      if (tab === 'local') {
        body = h(LocalWorkbench, { t, language, onToast: showToast })
      } else if (snapshot.status === 'loading') {
        body = h(
          'div',
          { className: 'pmp-body' },
          h(
            'div',
            { className: 'pmp-grid' },
            Array.from({ length: 6 }, (_, index) => h(CardSkeleton, { key: index })),
          ),
        )
      } else if (snapshot.status === 'error' && data === null) {
        body = h(
          'div',
          { className: 'pmp-body pmp-empty' },
          h('h2', null, t('error.title')),
          h('p', null, snapshot.error || ''),
          h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary', onClick: () => void loadSnapshot(false) }, t('action.retry')),
        )
      } else if (sources.length === 0) {
        body = h(
          'div',
          { className: 'pmp-body pmp-empty' },
          h('h2', null, t('label.noSources')),
          h('p', null, t('label.noSourcesHint')),
          h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary', onClick: () => void refreshEverything() }, t('action.refresh')),
        )
      } else if (tab === 'manage') {
        const items = manage.data?.items ?? []
        const updates = manage.data?.counts?.updates ?? 0
        body = h(
          'div',
          { className: 'pmp-body' },
          h(
            'div',
            { className: 'pmp-manage-head' },
            h(
              'div',
              null,
              h('h2', { className: 'pmp-section-title' }, t('label.manageTitle')),
              h('p', { className: 'pmp-sub' }, t('label.manageSubtitle')),
              manage.data
                ? h(
                    'div',
                    { className: 'pmp-head-meta' },
                    h('span', null, t('label.installedCount', { count: items.length })),
                    h('span', { className: 'pmp-dot' }, '·'),
                    h('span', null, t('label.updatesCount', { count: updates })),
                    h('span', { className: 'pmp-dot' }, '·'),
                    h('span', null, t('label.checkedAt', { time: formatTime(manage.data.checkedAt, language) })),
                  )
                : null,
            ),
            h(
              'div',
              { className: 'pmp-manage-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'pmp-btn pmp-btn-ghost pmp-btn-sm',
                  disabled: manage.refreshing,
                  onClick: () => void loadManage(true),
                },
                manage.refreshing ? t('label.refreshingVersions') : t('label.refreshVersions'),
              ),
            ),
          ),
          manage.status === 'loading' && manage.data === null
            ? h('div', { className: 'pmp-manage-list' }, h(CardSkeleton, null), h(CardSkeleton, null))
            : manage.error && manage.data === null
              ? h(
                  'div',
                  { className: 'pmp-empty' },
                  h('p', null, t('msg.loadFailed', { message: manage.error })),
                  h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: () => void loadManage(false) }, t('action.retry')),
                )
              : h(
                  'div',
                  { className: 'pmp-manage-list' },
                  items.length === 0
                    ? h('div', { className: 'pmp-empty' }, h('p', null, t('label.empty')))
                    : items.map((item) => h(ManageRow, {
                        key: item.name,
                        item,
                        t,
                        language,
                        toggleBusy: operation !== null && operation.kind === 'toggle' && operation.status === 'running',
                        onOpen: (row) => setInstalledDetail(row),
                        onToggle: (row, enabled) => void doToggle(row, enabled),
                        onUpdate: (row) => setConfirm({
                          kind: 'update',
                          item: { name: row.name, update: row.update, market: row.market },
                          name: row.name,
                          version: row.update.version,
                          fromVersion: row.version,
                          sourceUrl: row.update.replacesLocalLink ? row.market?.sourceUrl : row.update.registry,
                          replacesLink: row.update.replacesLocalLink,
                        }),
                        onUninstall: (row) => setConfirm({ kind: 'uninstall', name: row.name }),
                      })),
                ),
        )
      } else {
        const listData = listing.data
        body = h(
          'div',
          { className: 'pmp-body' },
          h(Toolbar, {
            t,
            language,
            meta,
            sources,
            filters,
            text: textInput,
            onText: (value) => setTextInput(value),
            onFilter,
          }),
          showReco
            ? h(RecoStrip, { items: recommend, t, language, onDetails: openDetail })
            : null,
          listing.status === 'loading' || (snapshot.data?.loading === true && (listData?.items?.length ?? 0) === 0)
            ? h('div', { className: 'pmp-grid' }, Array.from({ length: 6 }, (_, index) => h(CardSkeleton, { key: index })))
            : listing.status === 'error'
              ? h(
                  'div',
                  { className: 'pmp-empty' },
                  h('p', null, t('msg.loadFailed', { message: listing.error || '' })),
                  h('button', { type: 'button', className: 'pmp-btn pmp-btn-primary pmp-btn-sm', onClick: () => void loadList() }, t('action.retry')),
                )
              : listData !== null && listData.items.length === 0
                ? h('div', { className: 'pmp-empty' }, h('h2', null, t('label.empty')), h('p', null, t('label.emptyHint')))
                : h(
                    'div',
                    { className: 'pmp-grid' },
                    (listData?.items ?? []).map((item) => h(CardView, {
                      key: item.key,
                      item,
                      meta,
                      t,
                      language,
                      onInstall: (row) => setConfirm({ kind: 'install', item: row, name: row.name, version: row.defaultVersion ?? row.version, sourceUrl: row.sourceUrl }),
                      onUpdate: (row) => setConfirm({ kind: 'update', item: row, name: row.name, version: row.defaultVersion ?? row.version, fromVersion: row.installedVersion, sourceUrl: row.sourceUrl }),
                      onDetails: openDetail,
                    })),
                  ),
          listData ? h(Pagination, {
            t,
            page: listData.page,
            pages: listData.pages,
            total: listData.total,
            pageSize: listData.pageSize,
            onPage: (page) => onFilter({ page }),
            onPageSize: (pageSize) => onFilter({ pageSize, page: 1 }),
          }) : null,
          h('p', { className: 'pmp-footer' }, t('label.footer')),
        )
      }

      const progressPercent = data && data.progress && Number(data.progress.total) > 0
        ? Math.min(100, Math.round((Number(data.progress.done) / Number(data.progress.total)) * 100))
        : 0
      return h(
        'div',
        { className: 'pmp' },
        h('style', null, CSS),
        header,
        tabs,
        data?.loading === true
          ? h('div', { className: 'pmp-progress', role: 'progressbar', 'aria-valuenow': progressPercent, 'aria-valuemin': 0, 'aria-valuemax': 100 },
              h('span', { style: { width: `${progressPercent}%` } }))
          : null,
        body,
        h(OperationBar, {
          t,
          operation,
          onCancel: () => void cancelOperation(),
          onApprove: () => setApproval(operation),
          onDismiss: () => setOperation(null),
        }),
        h(Toast, { toast }),
        confirm ? h(ConfirmDialog, {
          t,
          language,
          confirm,
          onClose: () => setConfirm(null),
          onConfirm: confirmAction,
        }) : null,
        detail ? h(DetailModal, {
          t,
          language,
          meta,
          state: detail,
          onClose: () => setDetail(null),
          onRetry: () => {
            if (detail && detail.name) {
              const synthetic = { name: detail.name, sourceUrl: detail.sourceUrl }
              setDetail(null)
              void openDetail(synthetic)
            }
          },
          onInstall: (item, version) => {
            setDetail(null)
            setConfirm({ kind: 'install', item, name: item.name, version, sourceUrl: item.sourceUrl })
          },
          onOpenAlternative: (item) => {
            void openDetail(item)
          },
        }) : null,
        installedDetail ? h(InstalledDetailModal, {
          t,
          language,
          item: installedDetail,
          onClose: () => setInstalledDetail(null),
          onToggle: (row, enabled) => void doToggle(row, enabled),
          onUpdate: (row) => setConfirm({
            kind: 'update',
            item: { name: row.name, update: row.update, market: row.market },
            name: row.name,
            version: row.update?.version,
            fromVersion: row.version,
            sourceUrl: row.update?.replacesLocalLink ? row.market?.sourceUrl : row.update?.registry,
            replacesLink: row.update?.replacesLocalLink,
          }),
          onUninstall: (row) => setConfirm({ kind: 'uninstall', name: row.name }),
          onOpenAlternative: (item) => {
            setInstalledDetail(null)
            void openDetail(item)
          },
        }) : null,
        approval ? h(ApprovalDialog, {
          t,
          operation: approval,
          onClose: () => setApproval(null),
          onApprove: approvePending,
        }) : null,
      )
    }

    function SidebarEntryIcon(props) {
      const size = (props && props.size) || 16
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          focusable: 'false',
        },
        h('rect', { x: 3.2, y: 4, width: 17.6, height: 16, rx: 4, opacity: 0.55 }),
        h('path', { d: 'M3.6 9h16.8M7 4V2.8M17 4V2.8' }),
        h('path', { d: 'M8.2 13h4.2M8.2 16.6h6.6' }),
        h('circle', { cx: 17, cy: 14, r: 2.2 }),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                             */
    /* ------------------------------------------------------------------ */

    const CSS = `
.pmp{box-sizing:border-box;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.45}
.pmp *{box-sizing:border-box}
.pmp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:calc(18px + var(--dsh-frame-top-clearance,0px)) 22px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.pmp-title{margin:0;font-size:18px;font-weight:650}
.pmp-sub{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.pmp-sync{color:var(--dsw-alias-brand-primary);font-weight:600}
.pmp-progress{flex:none;height:2px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.pmp-progress span{display:block;height:100%;background:var(--dsw-alias-brand-primary);transition:width .25s ease}
.pmp-head-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:7px;color:var(--dsw-alias-label-secondary);font-size:11px}
.pmp-head-actions{display:flex;align-items:center;gap:8px;flex:none}
.pmp-lang{height:28px;min-width:34px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.pmp-lang:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.pmp-tabs{display:flex;gap:4px;padding:0 22px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.pmp-tab{position:relative;height:38px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.pmp-tab:hover{color:var(--dsw-alias-label-primary)}
.pmp-tab-active{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}
.pmp-tab-count{min-width:18px;height:17px;padding:0 5px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;justify-content:center}
.pmp-body{flex:1;min-height:0;overflow:auto;padding:14px 22px 26px}
.pmp-toolbar{display:flex;flex-direction:column;gap:10px;padding:2px 0 14px}
.pmp-toolbar-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pmp-toolbar-row-secondary{justify-content:space-between}
.pmp-search{position:relative;display:flex;align-items:center;gap:6px;flex:1 1 260px;min-width:200px;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.pmp-search:focus-within{border-color:var(--dsw-alias-brand-primary)}
.pmp-search-icon{color:var(--dsw-alias-label-secondary);font-size:15px}
.pmp-search input{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px}
.pmp-search input::placeholder{color:var(--dsw-alias-label-secondary)}
.pmp-select{height:32px;max-width:280px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.pmp-source-select{max-width:300px}
.pmp-select-sm{height:26px;font-size:11px}
.pmp-dir{width:32px;padding:0;font-size:14px}
.pmp-pills{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.pmp-pill{height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer}
.pmp-pill:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.pmp-pill-active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);font-weight:600}
.pmp-toggles{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pmp-check{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:11.5px;cursor:pointer;user-select:none}
.pmp-check input{width:13px;height:13px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}
.pmp-labels{position:relative}
.pmp-btn-active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.pmp-popover{position:absolute;z-index:40;top:34px;left:0;width:250px;max-height:320px;overflow:auto;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 32px rgba(0,0,0,.18)}
.pmp-popover-head{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 8px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600}
.pmp-popover-row{padding:5px 4px;border-radius:6px}
.pmp-popover-row:hover{background:var(--dsw-alias-bg-layer-2)}
.pmp-popover-foot{display:flex;justify-content:flex-end;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l1);margin-top:4px}
.pmp-popover-empty{padding:8px;color:var(--dsw-alias-label-secondary);font-size:11px}
.pmp-btn{box-sizing:border-box;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap}
.pmp-btn:hover{border-color:var(--dsw-alias-border-l2)}
.pmp-btn:disabled{opacity:.5;cursor:default}
.pmp-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.pmp-btn-primary:hover{filter:brightness(1.05)}
.pmp-btn-ghost{background:transparent}
.pmp-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.pmp-btn-sm{height:27px;padding:0 9px;font-size:11.5px;border-radius:7px}
.pmp-mini-link{padding:0;border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11px;cursor:pointer}
.pmp-section-title{margin:0;font-size:13px;font-weight:650}
.pmp-reco{margin:0 0 16px;padding:12px 0 2px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.pmp-reco-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:9px}
.pmp-reco-basis{color:var(--dsw-alias-label-secondary);font-size:11px}
.pmp-reco-track{display:flex;gap:9px;overflow:auto;padding-bottom:12px}
.pmp-reco-card{flex:0 0 250px;display:flex;flex-direction:column;gap:5px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
.pmp-reco-card:hover{border-color:var(--dsw-alias-brand-primary)}
.pmp-reco-top{display:flex;align-items:center;gap:7px;min-width:0}
.pmp-reco-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600}
.pmp-reco-desc{margin:0;color:var(--dsw-alias-label-secondary);font-size:11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pmp-reco-source{color:var(--dsw-alias-label-secondary);font-size:9.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.pmp-reco-reason{align-self:flex-start;padding:1px 6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);font-size:10px}
.pmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;align-items:stretch}
.pmp-card{display:flex;flex-direction:column;gap:8px;min-width:0;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.pmp-card:hover{border-color:var(--dsw-alias-border-l2)}
.pmp-card-head{display:flex;align-items:flex-start;gap:9px;min-width:0}
.pmp-icon{flex:none;width:36px;height:36px;border-radius:9px;object-fit:cover;background:var(--dsw-alias-bg-layer-2)}
.pmp-icon-fallback{display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-brand-primary);font-size:15px;font-weight:700}
.pmp-card-titles{flex:1;min-width:0}
.pmp-card-title{margin:0;font-size:12.5px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pmp-card-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:2px;color:var(--dsw-alias-label-secondary);font-size:10.5px;min-width:0}
.pmp-dot{color:var(--dsw-alias-label-secondary);opacity:.6}
.pmp-score{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:22px;padding:0 6px;border-radius:7px;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
.pmp-score-good{background:rgba(34,160,90,.14);color:#1f8f50}
.pmp-score-mid{background:rgba(214,158,46,.16);color:#a5761b}
.pmp-score-low{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.pmp-desc{margin:0;color:var(--dsw-alias-label-secondary);font-size:11.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:33px}
.pmp-badges{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}
.pmp-badge{display:inline-flex;align-items:center;height:19px;padding:0 6px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;white-space:nowrap}
.pmp-badge-brand{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary)}
.pmp-badge-done{background:rgba(34,160,90,.14);color:#1f8f50}
.pmp-badge-warn{background:rgba(214,158,46,.16);color:#a5761b}
.pmp-badge-danger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}
.pmp-badge-muted{background:transparent;border:1px solid var(--dsw-alias-border-l1)}
.pmp-badge-category{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);color:var(--dsw-alias-brand-primary)}
.pmp-badge-info{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.pmp-stats{display:flex;align-items:center;gap:9px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:10.5px;font-variant-numeric:tabular-nums}
.pmp-stat{white-space:nowrap}
.pmp-source{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l1)}
.pmp-source-name{display:inline-flex;align-items:center;gap:5px;max-width:100%;color:var(--dsw-alias-label-secondary);font-size:10.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pmp-source-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.pmp-url{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.85}
.pmp-card-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:4px}
.pmp-card-status{display:flex;flex-direction:column;gap:2px;min-width:0}
.pmp-installed-version{color:var(--dsw-alias-label-secondary);font-size:10px}
.pmp-card-buttons{display:flex;align-items:center;gap:6px;flex:none}
.pmp-card-skeleton{gap:10px;min-height:190px}
.pmp-skeleton-line{height:11px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);animation:pmp-pulse 1.4s ease-in-out infinite}
.pmp-skeleton-title{width:55%;height:14px}
.pmp-skeleton-short{width:35%}
.pmp-skeleton-block{height:52px;margin-top:6px}
@keyframes pmp-pulse{0%,100%{opacity:.5}50%{opacity:1}}
.pmp-pagebar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1)}
.pmp-page-total{color:var(--dsw-alias-label-secondary);font-size:11px}
.pmp-pages{display:flex;align-items:center;gap:4px}
.pmp-page{min-width:26px;height:26px;padding:0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.pmp-page:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
.pmp-page:disabled{opacity:.4;cursor:default}
.pmp-page-active{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:600}
.pmp-page-gap{color:var(--dsw-alias-label-secondary);font-size:11px}
.pmp-page-size{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:11px}
.pmp-footer{margin:18px 0 0;color:var(--dsw-alias-label-secondary);font-size:10.5px}
.pmp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:220px;padding:30px;text-align:center;color:var(--dsw-alias-label-secondary)}
.pmp-empty h2{margin:0;color:var(--dsw-alias-label-primary);font-size:15px}
.pmp-empty p{margin:0;max-width:520px;font-size:12px}
.pmp-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.42)}
.pmp-modal{display:flex;flex-direction:column;width:100%;max-height:88vh;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 24px 60px rgba(0,0,0,.28)}
.pmp-modal-sm{max-width:460px}
.pmp-modal-lg{max-width:980px}
.pmp-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.pmp-modal-head h2{margin:0;font-size:14px;font-weight:650}
.pmp-close{width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:18px;line-height:1;cursor:pointer}
.pmp-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.pmp-modal-body{flex:1;min-height:0;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:11px}
.pmp-modal-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:11px 16px;border-top:1px solid var(--dsw-alias-border-l1)}
.pmp-field-row{display:flex;align-items:flex-start;gap:10px;font-size:11.5px;color:var(--dsw-alias-label-secondary);min-width:0}
.pmp-field-row>span:first-child{flex:none;width:72px;color:var(--dsw-alias-label-secondary)}
.pmp-code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px}
.pmp-link{color:var(--dsw-alias-brand-primary);text-decoration:none;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pmp-link:hover{text-decoration:underline}
.pmp-links{display:flex;flex-direction:column;gap:4px;min-width:0}
.pmp-muted{color:var(--dsw-alias-label-secondary);font-size:11px}
.pmp-warn{color:var(--dsw-alias-state-warn-primary);font-size:11.5px;margin:0}
.pmp-error{color:var(--dsw-alias-state-error-primary)}
.pmp-error-line{margin-top:4px;color:var(--dsw-alias-state-error-primary);font-size:11px}
.pmp-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.pmp-confirm-target{display:flex;align-items:center;gap:10px}
.pmp-confirm-name{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:600;overflow-wrap:anywhere}
.pmp-detail-body{overflow:hidden;padding:0}
.pmp-detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;height:min(760px,calc(88vh - 120px));min-height:320px;padding:14px 16px;box-sizing:border-box;align-items:stretch;overflow:hidden}
.pmp-detail-main{display:flex;flex-direction:column;gap:11px;min-width:0;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding-right:6px;scrollbar-gutter:stable}
.pmp-detail-main .pmp-readme-body{max-height:none;overflow:visible}
.pmp-detail-side{display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0;height:100%;overflow:hidden;padding-left:14px;border-left:1px solid var(--dsw-alias-border-l1)}
.pmp-detail-side .pmp-ai-panel{position:static;flex:0 1 auto;min-height:0;max-height:65%;overflow-y:auto;overscroll-behavior:contain}
.pmp-detail-side .pmp-alternatives{flex:1 1 0;min-height:150px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px;background:var(--dsw-alias-bg-layer-1);overflow-y:auto;overscroll-behavior:contain}
.pmp-detail-side .pmp-alternatives .pmp-section-head{position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-layer-1);padding-bottom:4px}
.pmp-detail-side .pmp-alt-track{grid-template-columns:minmax(0,1fr)}
.pmp-detail-head{display:flex;align-items:flex-start;gap:11px}
.pmp-detail-titles{flex:1;min-width:0}
.pmp-detail-titles h3{margin:0;font-size:14px;font-weight:650}
.pmp-detail-desc{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.pmp-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:9px 0;border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1)}
.pmp-fact{display:flex;flex-direction:column;gap:2px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.pmp-fact strong{font-size:13px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.pmp-breakdown{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:7px 9px;font-size:11px}
.pmp-breakdown summary{cursor:pointer;color:var(--dsw-alias-label-secondary)}
.pmp-breakdown-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}
.pmp-breakdown-grid span{display:flex;flex-direction:column;gap:1px;font-size:10px}
.pmp-versions-title{margin-top:6px}
.pmp-versions{display:flex;flex-direction:column;gap:5px}
.pmp-version-row{display:flex;align-items:center;gap:9px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;flex-wrap:wrap}
.pmp-version-selected{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,transparent)}
.pmp-version-pick{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;cursor:pointer;padding:0}
.pmp-radio{width:11px;height:11px;border-radius:50%;border:1.5px solid var(--dsw-alias-border-l2)}
.pmp-radio-on{border-color:var(--dsw-alias-brand-primary);background:radial-gradient(circle at center,var(--dsw-alias-brand-primary) 0 45%,transparent 48%)}
.pmp-version-date{flex:none}
.pmp-version-tags{flex:1;justify-content:flex-end}
.pmp-builds{margin:0;padding-left:18px;font-size:12px}
.pmp-detail-rows{display:flex;flex-direction:column;gap:4px}
.pmp-detail-row{display:flex;flex-direction:column;gap:1px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1)}
.pmp-detail-row-title{font-size:11.5px;color:var(--dsw-alias-label-primary)}
.pmp-detail-row-meta{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.pmp-modal-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pmp-op{position:fixed;right:22px;bottom:20px;z-index:70;width:340px;max-width:calc(100vw - 44px);padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 14px 40px rgba(0,0,0,.26);color:var(--dsw-alias-label-primary)}
.pmp-op-head{display:flex;align-items:flex-start;gap:8px}
.pmp-op-spinner{flex:none;width:13px;height:13px;margin-top:2px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary)}
.pmp-op-spin{animation:pmp-spin .9s linear infinite}
@keyframes pmp-spin{to{transform:rotate(360deg)}}
.pmp-op-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.pmp-op-text strong{font-size:12px;color:var(--dsw-alias-label-primary)}
.pmp-op-bar{height:3px;margin-top:8px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.pmp-op-bar span{display:block;height:100%;width:38%;border-radius:2px;background:var(--dsw-alias-brand-primary);animation:pmp-slide 1.2s ease-in-out infinite}
@keyframes pmp-slide{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}
.pmp-op-done .pmp-op-spinner,.pmp-op-failed .pmp-op-spinner,.pmp-op-warn .pmp-op-spinner,.pmp-op-muted .pmp-op-spinner{border-top-color:transparent;border-color:var(--dsw-alias-border-l2)}
.pmp-op-failed{border-color:var(--dsw-alias-state-error-primary)}
.pmp-op-warn{border-color:var(--dsw-alias-state-warn-primary)}
.pmp-op-error{margin-top:7px;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-state-error-primary);font-size:10.5px;overflow-wrap:anywhere}
.pmp-toast{position:fixed;left:50%;bottom:24px;z-index:90;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:min(560px,calc(100vw - 40px));padding:9px 13px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:11.5px;box-shadow:0 10px 30px rgba(0,0,0,.22)}
.pmp-toast-error{border-color:var(--dsw-alias-state-error-primary)}
.pmp-toast-success{border-color:rgba(34,160,90,.5)}
.pmp-manage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.pmp-manage-actions{display:flex;align-items:center;gap:7px;flex:none;flex-wrap:wrap}
.pmp-switch-wrap{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.pmp-switch{position:relative;flex:none;width:34px;height:18px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;transition:background .16s ease,border-color .16s ease}
.pmp-switch:disabled{opacity:.45;cursor:default}
.pmp-switch-thumb{position:absolute;top:1.5px;left:2px;width:13px;height:13px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:left .16s ease,background .16s ease}
.pmp-switch-on{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.pmp-switch-on .pmp-switch-thumb{left:17px;background:var(--dsw-alias-bg-base)}
.pmp-manage-list{display:flex;flex-direction:column;gap:8px}
.pmp-manage-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:11px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);flex-wrap:wrap}
.pmp-manage-row:hover{border-color:var(--dsw-alias-border-l2)}
.pmp-manage-row-click{cursor:pointer}
.pmp-manage-row-click:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.pmp-manage-main{flex:1;min-width:240px;display:flex;flex-direction:column;gap:5px}
.pmp-manage-title{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:11.5px}
.pmp-manage-title strong{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;overflow-wrap:anywhere}
.pmp-manage-title strong.pmp-manage-name{font-family:inherit;font-size:12.5px;font-weight:650}
.pmp-manage-pkg{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.pmp-chevron{flex:none;align-self:center;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:1;opacity:.7}
.pmp-manage-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.pmp-manage-source{max-width:420px}
.pmp-manage-market{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.pmp-manage-registry{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.pmp-manage-note{display:block;font-size:10.5px}
.pmp-readme-section{display:flex;flex-direction:column;gap:7px;padding-top:9px;border-top:1px solid var(--dsw-alias-border-l1)}
.pmp-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.pmp-readme-body{max-height:340px;overflow:auto;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-primary)}
.pmp-readme-loading{display:flex;flex-direction:column;gap:7px;padding:6px 0}
.pmp-readme-error{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--dsw-alias-state-error-primary);font-size:11px}
.pmp-readme-empty{margin:0}
.pmp-md{display:flex;flex-direction:column;gap:7px}
.pmp-md-heading{margin:4px 0 0;font-size:13px;font-weight:650;color:var(--dsw-alias-label-primary)}
.pmp-md-p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.pmp-md-list{margin:0;padding-left:19px;display:flex;flex-direction:column;gap:3px}
.pmp-md-pre{margin:0;padding:8px 10px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:10.5px;max-height:200px}
.pmp-md-code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px}
.pmp-md-quote{margin:0;padding:4px 10px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.pmp-md-hr{border:0;border-top:1px solid var(--dsw-alias-border-l1);margin:3px 0;width:100%}
.pmp-md-image{color:var(--dsw-alias-label-secondary);font-size:10.5px}
.pmp-ai-panel{display:flex;flex-direction:column;gap:9px;padding:11px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);position:sticky;top:0}
.pmp-ai-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.pmp-ai-body{display:flex;flex-direction:column;gap:8px}
.pmp-ai-score-row{display:flex;align-items:center;gap:8px}
.pmp-ai-verdict{font-size:12px;color:var(--dsw-alias-label-primary)}
.pmp-ai-summary{margin:0;font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-primary)}
.pmp-ai-line{margin:0;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
.pmp-ai-line>span:first-child{display:inline-block;min-width:34px;color:var(--dsw-alias-label-secondary);font-weight:600}
.pmp-ai-list{display:flex;flex-direction:column;gap:4px}
.pmp-ai-list h4{margin:0;font-size:10.5px;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em}
.pmp-ai-list ul{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:3px;font-size:11px}
.pmp-ai-risks ul{color:var(--dsw-alias-state-warn-primary)}
.pmp-ai-tags{margin-top:2px}
.pmp-ai-loading{display:flex;flex-direction:column;gap:7px}
.pmp-ai-pulse{width:26px;height:26px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);animation:pmp-spin .9s linear infinite}
.pmp-ai-error{display:flex;flex-direction:column;gap:6px}
.pmp-ai-raw pre{margin:4px 0 0;max-height:160px;overflow:auto;white-space:pre-wrap;font-size:10.5px}
.pmp-ai-note{margin:0;font-size:10px}
.pmp-ai-model{margin:0;font-size:10px}
.pmp-alternatives{display:flex;flex-direction:column;gap:7px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}
.pmp-alt-track{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.pmp-alt-card{display:flex;flex-direction:column;gap:5px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;min-width:0}
.pmp-alt-card:hover{border-color:var(--dsw-alias-brand-primary)}
.pmp-alt-top{display:flex;align-items:center;gap:6px;min-width:0}
.pmp-alt-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;font-weight:600}
.pmp-alt-desc{margin:0;color:var(--dsw-alias-label-secondary);font-size:10.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pmp-alt-meta{display:flex;flex-direction:column;gap:2px;min-width:0}
.pmp-local-list{grid-template-columns:minmax(0,1fr)}
.pmp-local-card{flex-direction:column}
.pmp-local-card-actions{flex-direction:row;justify-content:flex-end}

.pmp-local-page{display:flex;flex-direction:column;gap:12px}
.pmp-local-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:10px}
.pmp-local-card{display:flex;align-items:stretch;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);min-width:0}
.pmp-local-card-main{display:flex;align-items:flex-start;gap:9px;min-width:0;flex:1;cursor:pointer}
.pmp-local-card-main:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:7px}
.pmp-local-avatar{flex:none;width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);font-weight:650;font-size:15px}
.pmp-local-avatar-lg{width:42px;height:42px;font-size:18px}
.pmp-local-card-body{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1}
.pmp-local-title-row{display:flex;align-items:baseline;gap:7px;min-width:0;flex-wrap:wrap}
.pmp-local-title{font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pmp-local-desc{margin:0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pmp-local-badges{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.pmp-local-root{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pmp-local-card-actions{display:flex;flex-direction:column;gap:4px;justify-content:center;flex:none}
.pmp-local-head{align-items:center}
.pmp-local-path{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom}
.pmp-local-detail{display:flex;flex-direction:column;gap:10px}
.pmp-local-form-row{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}
.pmp-field{display:flex;flex-direction:column;gap:4px;font-size:10.5px;color:var(--dsw-alias-label-secondary);min-width:110px}
.pmp-field-grow{flex:1;min-width:170px}
.pmp-field.pmp-check{flex-direction:row;align-items:center;gap:6px;min-width:0;font-size:11px;color:var(--dsw-alias-label-primary)}
.pmp-input{height:29px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;min-width:0}
.pmp-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:0}
.pmp-local-hint{margin:0;font-size:10.5px;line-height:1.5}
.pmp-local-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.pmp-local-market-list{display:flex;flex-direction:column;gap:6px}
.pmp-local-market-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:11px;min-width:0}
.pmp-local-market-row>div{min-width:0}
.pmp-local-source-list{display:flex;flex-direction:column;gap:5px}
.pmp-local-source-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;font-size:11px;min-width:0}
.pmp-local-source-row>div{min-width:0}
.pmp-local-settings{display:flex;flex-direction:column;gap:14px}
.pmp-local-settings section{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}
.pmp-local-settings section:first-child{padding-top:0;border-top:0}
.pmp-local-subhead{margin:4px 0 0;font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:600}
.pmp-json{margin:0;padding:9px 10px;max-height:260px;overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:10.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
.pmp-publish-result{display:flex;flex-direction:column;gap:7px;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1)}
.pmp-local-warnings{margin:0;padding-left:18px;color:var(--dsw-alias-state-warn-primary);font-size:10.5px}
.pmp-success{color:var(--dsw-alias-state-success-primary);font-size:11px}
.pmp-local-fact-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:100%}
.pmp-local-error{margin:0}
@media (max-width:900px){
.pmp-detail-body{overflow:auto}
.pmp-detail-layout{grid-template-columns:minmax(0,1fr);height:auto;overflow:visible}
.pmp-detail-main{overflow:visible;padding-right:0}
.pmp-detail-side{height:auto;min-height:0;border-left:0;padding-left:0}
.pmp-detail-side .pmp-ai-panel{max-height:none;overflow:visible}
.pmp-detail-side .pmp-alternatives{flex:none;max-height:360px}
.pmp-ai-panel{position:static}
.pmp-head{padding:14px 14px 10px}
.pmp-tabs{padding:0 14px}
.pmp-body{padding:12px 14px 22px}
.pmp-grid{grid-template-columns:minmax(0,1fr)}
.pmp-facts,.pmp-breakdown-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.pmp-op{right:12px;bottom:12px;width:min(340px,calc(100vw - 24px))}
}
`

    return {
      inject: ['slots', 'sessions', 'remote'],
      apply(ctx) {
        try {
          const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined
          if (locale && typeof locale.register === 'function') {
            try {
              locale.register(NS, DICT)
            } catch {
              try {
                locale.register(NS, 'zh', DICT.zh)
                locale.register(NS, 'en', DICT.en)
              } catch {
                /* keep the document-language fallback */
              }
            }
          }
        } catch {
          /* keep the document-language fallback */
        }
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_KEY }, Panel))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_KEY,
            order: ENTRY_ORDER,
            label: () => {
              try {
                const language = detectLanguage()
                return DICT[language]['nav.title']
              } catch {
                return DICT.zh['nav.title']
              }
            },
            locale: NS,
          },
          SidebarEntryIcon,
        ))

        // DSH 0.2.2-rc.1 compatibility guard.
        // Switching the main Session disposes the previous Host Session and emits
        // `api-session/removed`. The default Client handler keeps the resident instance
        // and marks it `removed`, which both prunes the sidebar row and permanently
        // disables that Session's composer. Replace the handler for persisted Sessions:
        // drop the stale instance so the next open builds a fresh one, and re-pull the
        // Host baseline instead of pruning the row.
        try {
          ctx.effect(() => {
            const sessions = ctx.sessions
            let timer = null
            const refreshSoon = () => {
              if (timer !== null) clearTimeout(timer)
              timer = setTimeout(() => {
                timer = null
                try {
                  const pending = sessions !== undefined && typeof sessions.refresh === 'function'
                    ? sessions.refresh()
                    : null
                  if (pending !== null && typeof pending.catch === 'function') pending.catch(() => {})
                } catch {
                  /* the guard must never break the panel */
                }
              }, 120)
            }

            let restoreRemoval = null
            try {
              if (sessions !== undefined && typeof sessions.handleSessionRemoved === 'function' && sessions.__pmpRemovalGuard !== true) {
                const original = sessions.handleSessionRemoved
                const guarded = (sessionId) => {
                  let summary = null
                  try {
                    summary = sessions.list?.getSnapshot?.().byId?.[sessionId] ?? null
                  } catch {
                    /* keep the default path when the list is unreadable */
                  }
                  if (summary !== null && summary.origin !== 'subagent') {
                    try {
                      const instance = sessions.manager?.sessions?.get?.(sessionId)
                      if (instance !== undefined) {
                        const dropping = sessions.manager.drop(sessionId, instance)
                        if (dropping !== undefined && typeof dropping.catch === 'function') dropping.catch(() => {})
                      }
                    } catch {
                      /* a failed drop still leaves the refreshed row usable on reload */
                    }
                    refreshSoon()
                    return
                  }
                  return original.call(sessions, sessionId)
                }
                sessions.handleSessionRemoved = guarded
                sessions.__pmpRemovalGuard = true
                restoreRemoval = () => {
                  try {
                    if (sessions.handleSessionRemoved === guarded) sessions.handleSessionRemoved = original
                  } catch {
                    /* service frozen or context inactive */
                  }
                  try {
                    sessions.__pmpRemovalGuard = false
                  } catch {
                    /* service frozen */
                  }
                }
              }
            } catch {
              /* patching is best effort */
            }

            let off = null
            try {
              const remote = ctx.remote ?? (typeof ctx.get === 'function' ? ctx.get('remote') : undefined)
              if (remote !== undefined && typeof remote.$on === 'function') {
                off = remote.$on('api-session/removed', refreshSoon)
              }
            } catch {
              /* remote unavailable: leave the list untouched */
            }

            // Repair instances already poisoned before this guard loaded (e.g. a hot reload).
            try {
              const residents = sessions?.manager?.sessions
              if (residents instanceof Map) {
                for (const [residentId, instance] of residents) {
                  if (instance?.removed !== true) continue
                  const dropping = sessions.manager.drop(residentId, instance)
                  if (dropping !== undefined && typeof dropping.catch === 'function') dropping.catch(() => {})
                }
              }
            } catch {
              /* best effort: a page reload still rebuilds every instance */
            }
            refreshSoon()
            return () => {
              if (timer !== null) clearTimeout(timer)
              try {
                if (typeof off === 'function') off()
              } catch {
                /* remote already disposed */
              }
              try {
                if (restoreRemoval !== null) restoreRemoval()
              } catch {
                /* best effort */
              }
            }
          }, 'plugin-market-pro: session-removal-guard')
        } catch {
          /* effect unavailable: keep the panel usable */
        }
      },
    }
  },
})
