# OfferBox · 投递旅程

一个专注于招聘投递流程管理的极简网页应用。它提供灵动的列表视图与沉浸式展开卡片，帮助你随时掌握投递、面试与 Offer 的关键节点。所有数据都会持久化保存在本地 JSON 文件中，可在网页界面里进行增删改查。

## ✨ 特性概览
- **苹果风格的轻盈设计**：淡蓝与淡紫的渐变背景、玻璃拟态卡片与细腻动效，突出重点信息。
- **列表 + 聚焦卡片双视图**：列表中浏览关键信息，点击可弹出带背景虚化的详情卡片进行深度复盘。
- **可交互流程箭头**：头部的箭头流程组件支持点击更新当前阶段，并与状态实时联动。
- **Markdown 纪要面板**：详情卡片提供固定高度、可滚动的 Markdown 备注区，用于记录面试纪要与准备要点。
- **持久化存储**：数据保存在 `server/data/applications.json`，支持完整的增删改查。

## 🚀 如何运行
> 环境要求：Node.js ≥ 16。项目不依赖任何第三方 npm 包，因此无需额外安装。

```bash
# 1. （可选）安装依赖，会生成 package-lock.json
npm install

# 2. 启动本地服务
npm start
```

服务默认运行在 [http://localhost:3000](http://localhost:3000)。首次打开会看到示例数据，你可以直接在界面内新增、编辑或删除记录，所有改动都会写入本地 JSON 文件。

## 🗂️ 项目结构
```
public/               # 前端静态资源（HTML/CSS/JS）
server/index.js       # 内置 HTTP 服务与 REST API
server/data/*.json    # 持久化数据文件
```

## 🔧 可选自定义
- **投递阶段**：在新增/编辑表单中输入以逗号分隔的自定义阶段，流程组件会自动渲染箭头并支持点击更新进度。
- **备注格式**：备注框完全支持 Markdown，可直接粘贴你的准备清单或会议纪要。
- **数据备份**：如需备份或迁移数据，可直接拷贝 `server/data/applications.json` 文件。

## 📝 API 速览
应用对前端开放的 REST 接口如下（同源调用即可）：
- `GET /api/applications`：获取全部记录
- `POST /api/applications`：新增记录
- `PATCH /api/applications/:id`：更新记录（部分字段即可）
- `DELETE /api/applications/:id`：删除记录

祝你顺利拿下心仪的 Offer！
