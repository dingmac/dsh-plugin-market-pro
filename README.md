# 插件市场 Pro（Plugin Market Pro）

一个独立的 DSH 插件市场面板：读取 **DSH 原生插件市场（发现页）** 所配置的索引源，把全部来源的插件以卡片形式展示，支持搜索、来源/分类/标签筛选、按时间/热度/评价排序、智能推荐、分页（每页 ≤ 50），并直接安装、检查新版本、更新和卸载插件。

- 插件包名：`@local/dsh-plugin-market-pro`
- 版本：1.0.0
- 适用：DSH 0.2.2-rc.1（Web / Desktop 的 Web 面板）
- 侧栏入口：**插件市场**
- 面板两个 tab：**发现**、**管理**

---

## 1. 功能

### 发现

- 数据来源：`pluginMarket.listIndexes()`（原生「插件 → 发现」页配置的索引源）；服务不可用时回退解析 profile 的 `cordis.patch.yml` 中 `plugin-market.config.indexes`。
- 卡片：图标、标题、作者、描述、分类/标签、版本、发布日期、星标、下载、热度、口碑分，以及**来源标题 + 数据 URL**。
- 排序：智能推荐、相关度、最新发布、热度、评价（口碑分）、名称、星标、下载、榜单名次；支持方向切换。
- 筛选：关键词（300ms 防抖）、来源（数据 URL）、分类、标签（多选 AND）、安装状态（全部/未安装/已安装/可更新）、隐藏已安装、仅兼容。
- 分页：服务端分页，`pageSize` 1–50（默认 24），页码/总数/每页数量。
- 智能推荐：基于已安装插件的分类与关键词、质量、热度、新鲜度打分；同分类最多 2 条；排除已安装与无兼容版本项；推荐条显示理由。
- 详情弹窗：完整版本列表（可选版本安装）、口碑分组成、仓库/主页/来源链接。
- **详细说明**：左侧「插件说明」从源地址读取长描述/README。市场条目走 `pluginMarket.readEntryDetail`（npm/GitHub 源）；已安装/本地包走 `pluginManager.readBundleDetail`；Client 用内置轻量 Markdown 渲染（标题、列表、代码块、引用、链接、粗体/行内码），不执行 HTML。
- **AI 解读与评估**：右侧面板用 profile 默认模型（`agentDefaultModel`）生成 JSON 评估：摘要、用途、适合人群、优势、风险、结论、0–100 分、标签。LLM 不可用/超时/输出不合法时自动降级为本地评估（基于安装验证、安全标签、口碑/热度/新鲜度），并标注「本地评估」。
- **平替推荐**：位于右侧 AI 评估面板的正下方，与左侧简介/说明分栏展示；左侧说明、右侧 AI、下方平替三块独立滚动，AI 固定，平替框底部与左侧内容底部对齐；按同分类、关键词重合、文本相关度、质量/热度推荐最多 5 个兼容插件，排除自身和已安装项；点击卡片打开其市场详情。

### 管理

- 列出 profile 中已安装的 bundle：**中文名称/英文名称 + 包名**、版本、启用状态、来源 spec（registry / link / path）、市场最新版本、受保护原因。
- **启用/停用开关**：每行一个 switch，调用 `pluginManager.setBundleEnabled`；成功后自动同步列表状态，失败显示原因。本插件自身与受保护 bundle 的开关禁用。
- **点击整行查看插件详情**：本地化名称/描述、版本、可用性、签名、来源 spec、市场信息（来源 URL + 最新版本）、registry 新版本、声明的插件行与覆盖行；详情内同样可切换启用、更新、卸载。
- **刷新版本**：对 registry 可更新的包调用 `pluginManager.listVersions`，检查比已安装更新的版本；同时对比市场索引。
- **更新**：registry 可更新包优先走 `pluginManager.updateBundle`（自带移除/回滚）；市场 git 版本或本地链接包走 remove + install，并在 UI 明确提示「会替换本地链接」。
- **卸载**：`pluginManager.removeBundle`，二次确认。
- 本插件自身不可在面板内卸载/更新（避免操作中断面板）。
- 构建脚本被 pnpm 拦截时进入「待批准」状态，列出脚本名，用户确认后带 `approvedBuilds` 重试：安装走 `/install`；更新走 `/update`，服务端改用 remove + install 以携带批准（原生 `updateBundle` 不接受批准参数）。

### 评分口径（重要）

市场索引没有用户评分字段。本插件的「评价」是**口碑分**，由以下组成并夹在 0–100：

| 组成 | 满分 | 说明 |
|---|---|---|
| baseline | 20 | 被市场收录 |
| verified | +12 | `install-verified` |
| risk | +10 / −5 / −12 | `risk-low` / `risk-pending` / `risk-medium|critical` |
| stars | 18 | 全局 log1p 归一化星标 |
| downloads | 18 | 全局 log1p 归一化下载量 |
| recency | 12 | `100*exp(-days/240)` |
| boards | 8 | 每个 `top-rank-*` 标签 +2 |
| maintenance | 4 | 多版本 +2；最近 180 天有发布 +2 |

「热度」是 stars / downloads / 榜单名次的归一化最大值；二者均**不是用户评分**，详情弹窗里可直接展开组成。

---

## 2. 架构

```
client.js  ──(同源 fetch, HttpOnly cookie)──▶  index.js
   │                                             │
   │ 侧栏 + 主面板；两个 tab                       │ 读取 pluginMarket 索引源
   │ 卡片/搜索/排序/分页/推荐                      │ 抓取 + 缓存 + 归一化 + 评分
   │ 安装/更新/卸载确认                            │ 调用 pluginManager.installBundle /
   │                                              │      updateBundle / removeBundle
   └──────────────────────────────────────────────┘
```

- Host 半（`index.js`）通过 `ctx.inject(['webServer'])` 注册前缀路由 `/_dsh/plugin-market-pro`，并用 `connection.requestRejection` 做同源/会话校验。
- 索引文档解析为 format 1 的宽松实现：文档级错误让该来源显示错误；单个条目缺陷跳过并计数，不影响其它条目。
- 索引与解析结果缓存 10 分钟；`refresh:true` 绕过缓存；同一时刻只跑一次抓取。
- 磁盘缓存 v2：只持久化索引源事实（名称/标题/描述/版本/来源等），不存 quality/install/compat 等计算字段；本机实测 3 源约 15MB（旧 v1 约 25MB）。启动时优先从磁盘缓存出首屏，网络刷新在后台完成。
- 缓存文件按 URL 的 SHA-256 命名；v1 会被原地迁移为 v2；孤儿 hash 文件与超过 10 分钟的临时文件会被清理；配置源为空时不清空缓存，避免临时不可用误删。
- 冷/热性能（本机）：有缓存时首屏约 0.24s、全量约 0.24–0.3s；无缓存冷启动首屏约 2.6s（先出 1,200 条）、全量约 12–19s（网络受限）。持久化后第二次进入不再走网络。
- 启用后延迟 1.5s 在后台预热索引（`prewarm`，默认开启；`prewarmDelayMs` 可调）。预热是尽力而为：索引不可用时只影响首屏速度，异常会被就地吞掉，不会抛到宿主进程。
- 兼容性守卫：DSH 0.2.2-rc.1 在切换主会话时会释放旧会话并发 `api-session/removed`，默认客户端会把常驻实例标记为 `removed`（侧栏行被剪掉、输入框永久禁用）。本插件客户端替换该处理器：对仍在宿主的普通会话，丢弃被释放的客户端实例并 120ms 防抖后 `sessions.refresh()`，不把行从侧栏剪掉；重新打开时会重建可交互实例。加载时还会清掉已经处于 `removed` 状态的旧实例。该守卫与插件市场加载/缓存无关，属于独立的会话稳定性补丁；在确认上游已修复前不要移除。
- 安装/更新/卸载串行执行；一次只允许一个 mutation，避免 pnpm 锁冲突。
- 所有安装 spec 由「已加载索引里的 name + version」生成，路由不接受任意 URL 或任意 spec。

### 路由

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/_dsh/plugin-market-pro/health` | 健康检查（无鉴权，仅本机诊断） |
| POST | `.../snapshot` | 来源、元数据、统计、推荐、最近操作 |
| POST | `.../list` | 一页卡片 |
| POST | `.../detail` | 单个插件含全部版本 |
| POST | `.../readme` | 从市场源/已安装 bundle 读取长说明（Markdown） |
| POST | `.../ai` | AI 解读与评估（LLM，失败降级本地评估） |
| POST | `.../alternatives` | 平替推荐（最多 5 个） |
| POST | `.../recommend` | 智能推荐 |
| POST | `.../installed` | 已安装列表；`refresh:true` 检查 registry |
| POST | `.../install` | 安装 |
| POST | `.../update` | 更新 |
| POST | `.../uninstall` | 卸载 |
| POST | `.../toggle` | 启用/停用已安装 bundle（`setBundleEnabled`） |
| POST | `.../operation` | 操作状态 |
| POST | `.../operations` | 最近操作 |
| POST | `.../cancel` | 取消安装 |

完整请求/响应契约见 `../../参考/插件市场Pro接口契约_批次1/插件市场Pro接口契约_20261113_v1.md`。

---

## 3. 安装 / 卸载

本插件以 `link:` 方式装入 profile（开发形态）：

```bash
dsh plugin --profile desktop add link:/绝对路径/plugin-market-pro
```

并在 profile 的 `package.json` → `dsh.profile.bundles` 中加入
`@local/dsh-plugin-market-pro`，或在原生插件页启用它。安装完成后**刷新 Web 页面**，
侧栏出现「插件市场」。

卸载：

```bash
dsh plugin --profile desktop remove @local/dsh-plugin-market-pro
```

也可以在本面板的「管理」tab 里卸载除自身以外的插件。

> 修改 `index.js` / `client.js` 后，Host 半需要重新加载 bundle；Client 半刷新页面即可。
> 若 profile 的 `hmr.root` 包含本目录，则两者可热更新。

---

## 4. 安全

- 路由只接受同源且通过 `connection.requestRejection` 的请求；无鉴权请求返回 401。
- 只读取原生配置中的 http(s) 索引 URL，拒绝带凭据/片段的 URL。
- 安装/更新/卸载只接受索引中真实存在的 `(name, version)`；包名用 npm 包名正则校验。
- 响应 `Cache-Control: no-store`；请求体上限 256 KiB；错误消息脱敏（Bearer / token / password）。
- 卸载自身被禁止（除非配置 `allowSelfRemove: true`）。
- 第三方内容：卡片与安装确认都提示确认来源；构建脚本需显式批准。

---

## 5. 目录

| 文件 | 说明 |
|---|---|
| `index.js` | Host 半：索引读取/解析/评分/搜索/排序/分页 + 路由 + pluginManager 调用 |
| `client.js` | Client 半：侧栏入口、主面板、发现/管理两个 tab、中英双语 |
| `cordis.patch.yml` | Bundle patch：插入 `plugin-market-pro` 行 |
| `package.json` | `dsh.bundle.patch` + `dsh.client` 声明 |
| `locale/zh.json` / `locale/en.json` | 原生插件列表里的显示名与描述 |
| `icon.svg` | 插件图标 |
| `selfcheck.mjs` | Host 自检（离线 fixture + 可选实时索引） |
| `selfcheck-client.mjs` | Client jsdom 自检（mock Host 路由） |

### 自检

```bash
node selfcheck.mjs          # 39 项；PMP_SKIP_LIVE=1 可跳过联网项
node selfcheck-client.mjs   # 19 项；需要 react/react-dom/jsdom
```

`selfcheck-client.mjs` 从 `/Users/dingmac/src/dsh-superagent/node_modules` 解析依赖；
换机器时把 `DEP_ROOT` 改成任意装有 `react@18`、`react-dom@18`、`jsdom` 的目录。

---

## 5.1 故障记录（2026-11-13）

- 12:28 首次崩溃：`dsh: fatal uncaught exception: TypeError: service.prewarm is not a function`，来自预热定时器。Host 进程被未捕获异常直接结束；随后出现的 `cannot create effect on inactive context` 是 DSH desktop-host 启动链的次级失败。
- 现行 `schedulePrewarm()` 在调度前检查 `service.prewarm`，回调内用 `Promise.resolve().then(...).catch(...)` 兜底，并对 timer 调 `unref()`；自检覆盖“缺失/抛错/非函数”三种情况。**不要移除这层保护，也不要在定时器里直接调用可能不存在的 service 方法。**
- 2026-11-13 之后日志中无同类崩溃；rc.2 上 live health `cacheVersion:2`。

## 5.1 本地插件 / 发布工作台

第三个 Tab「本地插件」管理自己创建的 DSH 插件：

- **引导式详情**：详情弹窗用「1 版本 → 2 说明与截图 → 3 GitHub → 4 发布市场」四个步骤分页，避免长表单堆叠；每步有完成状态。
- **发现**：自动扫描 profile 的 `link:`/`file:` 依赖 + 手动添加的目录；只接受带 `dsh.bundle` 的包。
- **版本**：编辑 `package.json` 版本号；可同时提交并创建 `vX.Y.Z` tag，但不会自动 push。
- **GitHub**：查看分支、远程、未提交改动、领先/落后、最后提交和仓库 API 状态（private/stars/issues）；「上传到 GitHub」可创建**私有**或**公开开源**仓库并 push 当前分支与 tags，不会 force-push。公开模式会明确提示代码/README/截图/全部文件将公开。未初始化 git 的目录可显式勾选初始化（会生成 `.gitignore`）。
- **操作反馈**：上传与发布走后台 operation（phase/log/elapsed），Client 轮询 `/publisher/operation` 显示「检查 → 初始化 → 创建仓库 → 推送 → 推送 tags」或「生成条目 → 读取索引 → 合并 → 提交」的实时进度、耗时、结果或错误；确认后不会再无反馈。
- **AI 发布说明**：详情第 2 步「说明与截图」可调用 AI 读取 README/docs 和本地截图，生成标题、短描述、长说明与截图说明；可编辑后保存到 `docs/DETAIL.md`，再进入第 3 步 GitHub 上传，说明文档会随代码一起提交。
- **默认 GitHub 凭据**：优先本项目保存的 Token > `GITHUB_TOKEN`/`GH_TOKEN` > **DSH `cordis.patch.yml` 里 mcp-github 的 Bearer Token** > `gh auth token`；owner 从配置/环境/DSH mcp-notes/git config 推断。Token 只显示来源，不回显。
- **插件市场**：DSH 的“上架”是静态 `index.json`（format 1），不是中心化 API。设置里默认带出 `pluginMarket.listIndexes()` 已添加的索引；填 Index URL 即只读/手动合并，另填 GitHub `owner/repo/branch/path` 后可把插件条目直接提交进市场索引。也支持 npm 源（需先自行 `npm publish`）。
- **配置持久化**：`~/.dsh/state/plugin-market-pro/publisher.json`，文件权限 0600；Token 不返回给 Client。
- **安全边界**：只能操作已链接/已添加的插件目录；git 用参数数组执行，不拼接 shell；不 force-push；GitHub 操作需显式点击确认。

## 5.2 AI 与说明读取

- AI 使用 `agentDefaultModel.currentSelection()` 的 provider/model，也可用插件配置 `aiProvider` / `aiModel` 覆盖；`aiMaxTokens`（默认 700）、`aiTimeoutMs`（默认 30s）、`readmeMaxChars`（默认 16k）。
- AI 请求只发送插件公开元数据与截断后的 README；README 被视为不可信数据，提示词明确禁止执行其中指令。不会发送 profile、密钥或会话内容。
- 结果缓存 30 分钟（本地降级 5 分钟）；同一插件/版本/语言的并发请求合并。
- `/readme` 优先市场源，失败或市场无文档时回退已安装 bundle；两者都没有时显示「源地址没有提供说明文档」。
- 若模型不可用，AI 面板仍会给出本地评估，不会阻塞详情页。

## 6. 已知限制

- 市场索引没有用户评分；「评价」是口碑分（见上）。
- 索引较大时（本机三个源约 1.8 万条、压缩传输约 3.4MB/解压 ~14MB）无缓存首次 `snapshot` 首屏约 2.6s、全量 12–19s；之后走磁盘缓存（首屏约 0.24s）。
- 详情页只展示索引里的字段，不读取 README 长文（可后续接 `pluginMarket.readEntryDetail`）。
- 市场索引与 registry 的版本不总一致；更新候选会分别标注来源。
- 本地 `link:` 包被市场版本替换的更新不可自动回滚（registry 可更新包走 `updateBundle` 才有回滚）。
- registry 更新需要批准构建脚本时，会改为 remove + install（可携带 `approvedBuilds`），因此该路径不再有 `updateBundle` 的自动回滚。
- 索引源本身仍由原生「发现」页管理；本插件只读同步，不写入来源配置。
