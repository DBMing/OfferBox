<div align="center">

# OfferBox 🎯

### 优雅管理你的求职全流程

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/DBMing/OfferBox)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)

一个专注于招聘投递流程管理的极简网页应用
从投递简历到收获 Offer，让每个求职节点都清晰可控

[快速开始](#-快速开始) · [功能特性](#-功能特性) · [使用指南](#-使用指南) · [API 文档](#-api-文档)

</div>

---

## 📸 产品预览

**投递记录管理**
- 🎉 成功 Offer：绿金渐变 + 庆祝动画 + 闪光效果
- 📝 进行中：优雅的紫-蓝渐变色系
- 😢 已结束：灰色调 + 降低透明度，传达失败情绪

**招聘信息库**
- 收集心仪职位，优先级标记
- 五星评级：兴趣度 + 匹配度
- 一键转投递，自动同步信息

## ✨ 功能特性

### 🎨 精致的视觉设计

- **苹果风格美学**：淡蓝与淡紫的渐变背景，玻璃拟态卡片，细腻动效
- **智能状态反馈**：三种状态一目了然（成功/进行中/失败）
- **流畅动画**：闪光、脉冲、庆祝动画，提升使用愉悦感

### 📊 双核心功能模块

#### 投递记录
- ✅ 自定义流程阶段（投递 → 初筛 → 一面 → 二面 → 三面 → HR面 → Offer）
- ✅ 可交互流程进度条，点击快速更新阶段
- ✅ 四维统计面板：正在跟进/成功 Offer/已结束/最新更新
- ✅ 结束投递功能，标记失败的投递
- ✅ 网申进度按钮，快速访问投递链接
- ✅ Markdown 备注系统，记录面试要点

#### 招聘信息库
- ✅ 收集职位信息，优先级排序
- ✅ 五星评分：兴趣度 + 匹配度
- ✅ 一键网申，快速跳转
- ✅ 一键转投递，自动同步信息到投递记录

### 💾 数据隐私保护

- 🔒 **完全本地存储**：数据保存在本地 JSON 文件，不依赖云服务
- 🔒 **隐私优先**：数据文件已添加到 `.gitignore`，不会上传到 GitHub
- 🔒 **完全掌控**：你的求职数据完全属于你，随时备份和迁移

### ⚡ 技术亮点

- **零依赖**：原生 Node.js HTTP 模块，无需安装第三方包
- **轻量级**：纯前端技术栈，完全离线可用
- **高性能**：原生 JavaScript，无框架开销
- **易部署**：一行命令启动服务

## 🚀 快速开始

### 环境要求

- Node.js ≥ 16.0.0
- 支持现代浏览器（Chrome、Firefox、Safari、Edge）

### 安装

```bash
# 克隆项目
git clone https://github.com/DBMing/OfferBox.git
cd OfferBox

# （可选）安装依赖
npm install

# 启动服务
npm start
```

服务将在 [http://localhost:3000](http://localhost:3000) 启动。

### 停止服务

**方法一：终端中停止**
```bash
# 在运行终端按 Ctrl + C（Windows/Linux）或 Cmd + C（macOS）
```

**方法二：一键关闭**
```bash
# macOS/Linux
lsof -ti :3000 | xargs kill

# 或
pkill -f "node.*server/index.js"
```

## 📖 使用指南

### 投递记录管理

#### 1️⃣ 新增投递记录

1. 点击右上角 **"+ 新增投递"** 按钮
2. 填写基本信息（公司、职位、地点、薪资等）
3. 自定义流程阶段或使用默认流程
4. 选择当前所处阶段
5. 添加备注（支持 Markdown）

#### 2️⃣ 更新投递进度

**方式一：详情页流程条**
- 点击流程进度条上的任意阶段节点
- 系统自动保存进度

**方式二：编辑表单**
- 点击 "编辑" 按钮
- 在下拉框中选择新阶段

#### 3️⃣ 结束失败的投递 😢

- 点击 **"结束投递"** 按钮（详情页左上角）
- 确认后，该记录会显示为灰色调
- 统计面板自动更新

#### 4️⃣ 庆祝成功 Offer 🎉

- 将流程阶段更新到最后一个（Offer）
- 卡片自动变为绿金渐变 + 庆祝动画
- 统计面板"成功 Offer"数量 +1

### 招聘信息库管理

#### 1️⃣ 添加招聘信息

1. 切换到 **"招聘信息库"** 页面
2. 点击 **"+ 新增招聘信息"** 按钮
3. 填写职位信息和评估指标
4. 设置优先级（高/中/低）
5. 评分：兴趣度 + 匹配度（1-5星）

#### 2️⃣ 一键转为投递记录

- 点击职位卡片上的 **"投递"** 按钮
- 自动创建投递记录并同步信息
- 自动跳转到投递记录详情页

### 统计面板

**投递记录统计**
- 正在跟进：未结束且未到最后阶段
- 成功 Offer：到达最后阶段
- 已结束：手动标记为失败
- 最新更新：最近更新时间

**招聘信息统计**
- 收藏职位：总职位数
- 最新添加：最近添加时间

## 🔧 高级技巧

### 自定义流程阶段

在新增/编辑投递记录时：
- 点击 "+"添加新阶段
- 点击 "×" 删除不需要的阶段
- 支持任意数量的自定义阶段

### Markdown 备注

备注框支持完整 Markdown 语法：

```markdown
## 面试准备
- [x] 复习项目亮点
- [ ] 准备自我介绍

## 面试记录
**一面（技术面）- 2024-03-10**
- 问题：项目中的难点？
- 回答：xxx

> 面试官很看重实际项目经验
```

### 数据备份与迁移

**备份数据**
```bash
cp -r server/data/ ~/backup/offerbox-data-$(date +%Y%m%d)
```

**迁移数据**
```bash
cp ~/backup/offerbox-data-20240310/* server/data/
```

### 修改服务器端口

编辑 `server/index.js`：
```javascript
const PORT = process.env.PORT || 3000;  // 修改为你想要的端口
```

## 🗂️ 项目结构

```
OfferBox/
├── public/                   # 前端资源
│   ├── index.html           # 主页面
│   ├── app.js               # 核心逻辑
│   └── styles.css           # 样式表
├── server/
│   ├── index.js             # 服务器 + API
│   └── data/
│       ├── applications.json # 投递记录（git 忽略）
│       └── jobs.json         # 招聘信息（git 忽略）
├── .gitignore               # Git 忽略配置
├── package.json             # 项目配置
└── README.md                # 项目文档
```

## 📝 API 文档

### 投递记录 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/applications` | 获取所有投递记录 |
| POST | `/api/applications` | 创建投递记录 |
| PATCH | `/api/applications/:id` | 更新投递记录 |
| DELETE | `/api/applications/:id` | 删除投递记录 |

### 招聘信息 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/jobs` | 获取所有招聘信息 |
| POST | `/api/jobs` | 创建招聘信息 |
| PATCH | `/api/jobs/:id` | 更新招聘信息 |
| DELETE | `/api/jobs/:id` | 删除招聘信息 |
| POST | `/api/jobs/:id/apply` | 转为投递记录 |

详细 API 参数说明请参考代码注释。

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | 原生 JavaScript (ES6+)、HTML5、CSS3 |
| 后端 | Node.js 原生 HTTP 模块 |
| 数据 | JSON 文件存储 |
| 样式 | 玻璃拟态、CSS Grid、Flexbox、动画 |
| 渲染 | marked.js (Markdown) |

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 💬 反馈与支持

如果 OfferBox 对你有帮助，欢迎：

- ⭐ Star 本项目
- 🐛 [提交 Issue](https://github.com/DBMing/OfferBox/issues) 报告问题
- 💡 [提出建议](https://github.com/DBMing/OfferBox/issues)
- 🔀 贡献代码

## 🙏 致谢

感谢所有使用和支持 OfferBox 的朋友们！

---

<div align="center">

**祝你顺利拿下心仪的 Offer！** 🎉

Made with ❤️ by [DBMing](https://github.com/DBMing)

</div>
