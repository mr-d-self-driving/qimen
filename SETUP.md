# 新设备开发环境搭建

## 1. 拉代码 & 安装依赖

```bash
git clone <repo-url>
cd qimen
npm install
```

## 2. 创建 Worker 本地密钥文件

在项目根目录创建 `worker/.dev.vars`（此文件被 gitignore，不会提交）：

```
GEMINI_API_KEY=你的密钥
SUPABASE_SERVICE_KEY=你的密钥
```

密钥从 Cloudflare Workers 控制台 → Secrets 查看，或向项目负责人索取。

## 3. 启动前端开发服务

```bash
npm run dev
```

## 4. 启动 Worker 本地服务（需要 wrangler）

```bash
cd worker
npx wrangler dev
```

## 5. 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 前端开发服务器 |
| `npm run build` | 构建生产包 |
| `npm test` | 运行测试 |
| `git push origin main` | 推送到主分支 |

## 被 gitignore 的本地文件（换设备需手动补）

| 文件 | 说明 |
|------|------|
| `worker/.dev.vars` | Worker 本地密钥，必须手动创建 |
| `node_modules/` | 依赖，`npm install` 生成 |
| `dist/` | 构建产物，`npm run build` 生成 |
