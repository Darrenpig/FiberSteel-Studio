# FiberSteel Studio

一个面向型材布置与工艺设计的 3D 交互工作台，支持阵列布置、轴向对齐、精准旋转、对象捕捉、组合视图与触控板优化等特性。

## 技术栈
- 前端：`React 18`、`TypeScript`、`Ant Design`、`TailwindCSS`
- 三维：`Three.js`（`OrbitControls`、`TransformControls`、`Box3`/`Vector3`、`STLExporter` 等）
- 路由：`react-router-dom 7`
- 状态：`zustand`
- 构建：`Vite 6`（`@vitejs/plugin-react`、`vite-tsconfig-paths`）
- 后端：`Express`（ESM，`nodemon + tsx` 本地开发），支持 `Vercel Serverless`

## 快速开始
- 前置依赖：`Node.js 18+`、`npm`
- 安装依赖：`npm install`
- 启动开发：`npm run dev`
- 构建产物：`npm run build`（前端 `vite build` + 类型检查 `tsc -b`）
- 预览静态构建：`npm run preview`
- 接口健康检查：`GET /api/health`

## 使用教程

### 1. 3D 设计器 (Designer)
- **基本操作**：
  - **旋转视角**：左键拖动背景
  - **平移视角**：右键拖动背景
  - **缩放**：滚轮滚动
- **对象交互**：
  - **选择**：单击选中物体，左上角显示选中物体的坐标信息。
  - **右键菜单/双击**：双击物体或右键单击可呼出快捷菜单（剪切、复制、粘贴、删除、锁定等）。
  - **快捷键**：
    - `T`：切换移动模式 (Translate)
    - `R`：切换旋转模式 (Rotate)
    - `P`：打开属性面板 (Properties)
    - `L`：锁定/解锁当前物体 (Lock)
    - `Del`：删除选中物体
    - `Ctrl+C/V`：复制/粘贴
- **多选模式**：按住 `Shift` 或 `Ctrl` 点击可多选，支持批量移动。

### 2. 二维绘图 (CAD)
- **绘图工具**：左侧工具栏选择矩形、圆形、直线等进行绘制。
- **阵列孔生成**：
  1. 选中一个矩形。
  2. 在右侧“阵列孔参数”面板设置间距和孔径标准 (M3/M4)。
  3. 点击“在选中矩形内生成阵列”，系统将自动计算行列数并填充圆孔。

### 3. 全局功能
- **语言切换**：顶部导航栏右侧支持中/英文切换。
- **参数化配置**：在“参数化建模”页面可预设方管、玻纤板的全局默认尺寸。

## 核心特性
- 选择与轴旋转
  - 空格按当前轴旋转 `+90°`
  - `Shift+Space` 循环切轴（`Y → X → Z → Y`）
  - 面板 `AxisSelector`（RGB）直观切换轴
- 拖动与轴锁定
  - 拖动参考坐标轴固定在起点，便于相对位移感知
  - 按住 `Shift` 时沿对象重心轴（本地 Z）滑动，自动收回到轴线
  - 点击坐标轴进入“沿该轴拖动”模式，视图不再旋转/平移
- 旋转增强
  - 自由角度：`TransformControls` 旋转手柄
  - 吸附旋转：开关与步长（°），支持 15/30/45/90 等
  - 精确输入：`RX/RY/RZ (°)` 面板数值输入，实时写回实例
- Rhino 风格工具
  - `CPlane`：`World XY / YZ / ZX / Object` 构造移动平面
  - `Ortho`：未锁轴时自动正交（沿距基点更近轴移动）
  - `Osnap`：`End / Mid` 端点与中点吸附
- HUD 坐标轴
  - 右上角固定渲染（含 X/Y/Z 文字符号与高对比背景），随视角同步
- 组合视图
  - 四视口：`Top / Front / Right / Perspective`，一键切换
  - 右下透视视图独立渲染 HUD 坐标轴
- 格点吸附
  - 按 `snapSize`（mm）量化世界坐标到最近格点；支持 Shift 投影后再吸附
- 触控板模式
  - 阻尼、速度、手势与 `zoomToCursor` 优化；双指缩放+平移更自然

## 键鼠与触控速查
- 旋转轴：空格旋转 90°；`Shift+Space` 切轴
- 轴拖动：点击坐标轴后左键拖动仅沿该轴；视图不变
- 插入预览：移动时 `Shift` 沿重心轴；`Ortho` 自动正交
- 吸附：`Osnap End/Mid` 捕捉对象；`格点吸附` 对齐世界格点
- 触控：单指旋转、双指缩放+平移；缩放围绕光标

## 面板配置项（部分）
- `AxisSelector`：当前旋转轴
- `RX/RY/RZ (°)`：三轴角度输入
- `旋转吸附`：开关与步长（°）
- `CPlane/Ortho/Osnap`：构造平面、正交约束与对象捕捉
- `吸附步长`、`锁点`、`格点吸附`
- `触控板`：启用触控优化

## 开发说明
- 主要文件
  - 交互与 UI：`src/pages/Designer.tsx`
  - 状态存储：`src/store/modeling.ts`
- 重要实现片段（参考）
  - 轴旋转与切换：键盘事件（Space/Shift+Space）
  - 拖动参考轴与轴拖动：指针命中与投影计算
  - HUD 坐标轴：独立场景+裁剪视口渲染
  - 组合视图：四视口 `setViewport/setScissor`
  - 旋转吸附与数值输入：与 `TransformControls` 同步

## 路线图
- 更多 Osnap：`Perp / Center / Quad / Near`
- 视口标签与边框、独立控制器（按光标所在视区响应）
- Gumball 操作器与轴向约束手柄增强
- 导出管线与工艺参数联动

如需按你的工作流进一步调整默认行为（步长、吸附阈值、视图布局等），欢迎提出，我会快速迭代优化。

## 架构概览
- 单仓库前后端一体：前端 React+Vite，后端 Express 提供计算/BOM/位置/日志服务
- 代理打通：开发态通过 Vite 将 `/api` 代理到 `http://localhost:3001`，生产态后端静态托管 `dist`
- 轻量持久化：以 JSON 文件存储操作日志与位置数据，便于本地快速验证与调试

## 状态模块化
- `store/modeling.ts`：几何参数、实例偏移/旋转、锁定、孔位、撤销/重做
- `store/interaction.ts`：交互态（轴锁定、交互基点、吸附步长、求解点）
- `store/insert.ts`：插入态（插入模式、插入基点、吸附步长、锁点、已插入列表）
- 页面使用示例：在 `Designer.tsx` 分别从 `useInteractionStore` 与 `useInsertStore` 读取与更新对应状态，提升边界清晰度

## 目录结构（简要）
- `src/`
  - `main.tsx`、`App.tsx`：入口与路由
  - `pages/Designer.tsx`：三维场景与交互核心
  - `components/designer/*`：工具栏、面板、上下文菜单、价格面板等
  - `store/modeling.ts`：`zustand` 状态中心（参数、交互、撤销/重做）
  - `lib/*`：属性计算、下载与工具函数
- `api/`
  - `app.ts`、`server.ts`：后端入口与静态托管
  - `routes/*.ts`：计算、BOM、位置与日志路由
- `vite.config.ts`、`tsconfig.json`、`eslint.config.js`：构建与规范

## 接口与数据
- `GET /api/health`：健康检查
- `POST /api/modeling/calc`：型材参数计算
- `POST /api/bom/export`：BOM 导出（Excel/HTML）
- `GET/POST /api/positions`：实例位置持久化
- `GET/POST /api/logs`：操作日志读写

## 代码规范与注释
- 组件：以函数组件与显式 Props 类型为主，必要处添加 JSDoc 注释（示例见 `ViewportToolbar.tsx`）
- 状态：集中在 `store/modeling.ts`，动作以 `set*`/`toggle*`/`undo`/`redo` 统一命名
- 工具：共用 `lib/utils.ts` 的 `cn` 合并类名；严禁输出或记录敏感信息

## 已完成的小优化
- 统一视口工具栏图标：使用 `lucide-react` 的 `Box` 代替无效 `Cube` 导致的浏览器模块导出错误
- 为 `ViewportToolbar` 增加注释说明组件职责与关键交互
- 将“参数化建模”表单集成到 `CAD` 页面右侧工具栏，支持在同一工作流内配置方管与玻纤板参数
