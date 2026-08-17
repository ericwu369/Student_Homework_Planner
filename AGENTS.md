# AGENTS.md

小学学习管理台：家长端 `/parent`（PIN 登录）+ 孩子端 `/child`（无鉴权）。React (Vite) + Express + better-sqlite3，纯本地运行，UI 全中文。无 lint/prettier 配置，靠 tsc 严格模式。

## 命令
- `npm run dev` — 开发模式，两个进程：server（tsx watch，**:8788**）+ vite（:5173，代理 /api、/ws 到 8788）。访问 8788/5173 是开发端口。
- `npm run build` — 先 `tsc -p tsconfig.server.json` 编译 server 到 `dist-server/`，再 vite 打包到 `dist/`。**改任何 TS/CSS 后需重跑 build 才生效于生产。**
- `npm start` — 生产 `node dist-server/index.js`，**:8787**，提供 `dist/` 静态页。**不自动构建**。
- `npm test` — 单文件 `tests/api.test.ts`，node:test，临时 DB + 随机端口。**测试按文件内顺序共享状态（cookie、events），勿单跑或重排。**

## 架构
- 双编译目标：`tsconfig.json` 只管客户端（noEmit）；server 走 `tsconfig.server.json`（NodeNext）。**server 内 import 必须带 `.js` 后缀**（如 `'../db.js'`）。
- 所有路由注册在 `server/routes/index.ts`，每模块模式 `xxxRoutes(router, db, hub)`。
- 数据 `better-sqlite3` → `data/app.db`（gitignore），可用 `DB_PATH` 环境变量覆盖，WAL 模式。
- **迁移**：`server/db.ts` 的 `migrations` 数组，`schema_version` 存 settings 表。加列/建表要 append 新迁移，**不改旧的**。
- **积分模型**：homework 积分恒为 0（打卡不加分）；extracurricular 才加分。余额 = `SUM(points_ledger.amount)`。兑换：提交申请不扣分，approve 事务内扣分，reject 不扣。
- **鉴权**：家长 PIN（scrypt）+ cookie `parent_session`，会话存内存 Map，**服务重启即全部掉线**。孩子端接口全部开放。
- **实时**：WebSocket `/ws`，事件名固定：`tasks-changed`、`points-changed`、`redeem-changed`、`tiers-changed`、`extras-changed`、`settings-changed`。客户端用 `useSyncData(fetcher, events, key)` 订阅；第三个参数参与缓存键，需传参数时应传入。
- **设置**：key/value 存 settings 表（`app_name`、`nickname`）。`/api/info` **公开**；`/api/settings`、`PUT /settings/nickname` 需家长登录。

## 风格约定
- 错误响应统一 `resErr(res, status, msg)`；入参用 `util.ts` 的 `str()`/`num()` 清洗。
- 写库用 `db.transaction(() => {...})()` 包裹；事务内抛 `Object.assign(new Error(msg), { status })`，外层 catch 转 `resErr`。
- 业务校验：homework 只允许语数英三科；extracurricular 不允许带 subject。
- 学科图标在 `src/components/meta.tsx`（SUBJECT_EMOJI），颜色为 `--subj-语文/数学/英语/课外`（`src/styles/tokens.css`）。
- 样式拆分：tokens.css（变量）/base.css /parent.css /child.css。

## 环境
- 监听 `0.0.0.0`，端口 `PORT` 可配。可部署 NAS：装 Node.js 跑 `npm start`，或 Docker 化（better-sqlite3 原生模块需匹配架构）。
- git 仓库尚无任何提交（全部 untracked，默认分支 main）。
