# Reflection — AI Diary App (Frontend Prototype)

## 项目简介

Reflection 是一个以 Next.js 14、TypeScript、Tailwind CSS、shadcn/ui 和 lucide-react 打造的移动优先、情感温暖的 AI 日记应用前端原型。它模拟了与 AI 好友的微信式聊天体验，专为年轻用户打造，注重隐私与情感陪伴。

## 技术栈
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react

## 目录结构

```
src/
	app/
		(auth)/         # 登录、注册页
		(main)/         # 主应用区
			chat/         # 聊天页
			calendar/     # 日历页
			insights/     # 情感洞察页
			profile/      # 个人/设置页
			summary/      # 首页/摘要页
	components/       # 可复用 UI 组件
	features/         # 业务功能模块
	mock/             # Mock 数据
	types/            # TypeScript 类型
```

## 页面/功能
- 登录/注册
- 聊天（AI 多模式、日记输入、气泡、输入框、模式选择、打字指示等）
- 摘要/首页（本周总结、情绪、人物/主题标签、亮点等）
- 日历（情绪色点、日记摘要卡片）
- 情感洞察（趋势、情绪 pill、图表、主题等）
- 个人/设置（昵称、AI 偏好、主题、隐私、导出等）

## 组件
- ChatBubble
- ChatInput
- ModeSelector
- DiaryTextArea
- SummaryCard
- EmotionBadge
- CalendarDayCell
- InsightCard
- BottomNav
- SidebarNav
- AppHeader

## Mock 数据
- 用户、消息、日记、摘要、情绪趋势等，见 `src/mock/`

## 设计风格
- 移动优先，圆角卡片，柔和阴影，暖色/中性色，极简，安全私密，现代女性友好

## 如何连接 Supabase + AI 后端？
- 你可以将 mock 数据替换为 API 请求（如 `fetch('/api/messages')`），并用 React Query/SWR 管理数据。
- 用户登录/注册可对接 Supabase Auth。
- 聊天/日记/情绪等可通过 Supabase 数据库存储。
- AI 回复可通过调用自定义 API 路由（如 `/api/ai-reply`），后端可集成 OpenAI/Claude 等大模型。
- 组件和 hooks 已按“可插拔”方式设计，便于后续对接。

## 启动项目
```bash
npm install
npm run dev
```

---

> 本项目为前端原型，所有数据均为 mock，欢迎二次开发！
