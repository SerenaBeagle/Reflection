# Reflection

Reflection 是一个以日记、陪伴式聊天和用户画像为核心的情绪陪伴应用，当前 Web 端基于 Next.js、Supabase 和 OpenAI 构建。

## 当前分层

为了方便后续迁移到 iOS，项目已经开始按「前端 / 后端 / 共享契约」分开：

- `src/app`
  Next.js 页面、路由和 API 入口
- `src/components`
  Web 前端 UI 组件
- `src/frontend`
  前端接口调用层，负责和后端 API 交互
- `src/backend`
  后端服务逻辑，例如 OpenAI 调用和业务编排
- `src/shared`
  前后端共用的接口契约和请求/响应类型
- `src/lib`
  通用工具、Supabase 客户端、聚合逻辑
- `supabase`
  数据表、RLS、Storage 相关 SQL

## 现在的后端入口

- `src/backend/services/chat-service.ts`
  聊天和图片识别相关的 OpenAI 调用逻辑
- `src/backend/services/portrait-service.ts`
  用户画像和月度汇报生成逻辑

当前 `src/app/api/*` 只是薄适配层。这样以后如果你要：

- 拆成独立 Node 后端
- 迁移到 Supabase Edge Functions
- 给 iOS/Android 共用同一套接口

都会更容易。

## iOS 迁移建议

后续做 iOS 时，推荐方案是：

1. 新建 Expo / React Native 前端
2. 继续复用当前 Supabase 项目和数据库结构
3. 复用 `src/shared` 的接口契约
4. 逐步把 `src/backend/services` 搬到独立后端或 Edge Functions

这样你不用重做数据库和业务规则，只需要换前端实现。

## 主要功能

- 注册 / 登录 / 退出
- AI 陪伴聊天
- 图片上传与识图回复
- 日记模式
- 日历查看
- 用户画像与月度汇报
- 相册总览

## 本地开发

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`

## 类型检查

```bash
npx tsc --noEmit
```

## 部署环境变量

在 Vercel 或其他部署平台中配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_TRANSCRIPTION_MODEL`
- `OPENAI_REALTIME_MODEL`
- `OPENAI_REALTIME_VOICE`

### 可选：切换 AI 后端入口

默认前端走 Next.js API 路由。

如果后续要切到 Supabase Edge Functions，可以增加：

- `NEXT_PUBLIC_BACKEND_TARGET=edge`

当前支持切换的入口：

- `chat`
- `profile-portrait`
