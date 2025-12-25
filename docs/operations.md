# FiberSteel Studio 操作说明

## BOM（物料清单）导出
- 导出格式
  - Excel：生成 `.xls`（HTML表格，Excel可直接打开）
  - PDF：生成 `.html` 并自动触发打印对话框，选择“另存为 PDF”
- 导出内容
  - 零件编号、名称、规格、数量、单位、备注
- 分页与批量导出
  - 在 3D 设计工作台右侧“BOM导出”设置分页大小
  - 后端按分页拆分为多文件并提供下载链接
- 历史记录
  - 访问“查看历史”，也可通过 API `/api/bom/history` 查询
- 前端入口
  - Designer 页面 “BOM导出”区：导出 Excel / PDF、查看历史
- 后端 API
  - `POST /api/bom/export/excel` `{ items: BomItem[], pageSize?: number }`
  - `POST /api/bom/export/pdf` `{ items: BomItem[], pageSize?: number }`
  - `GET /api/bom/history`
  - `GET /api/exports/:name` 下载生成文件

## 型材位置移动与修改
- 交互
  - 鼠标选择实例并拖拽（XZ 平面）
  - 右侧参数面板输入选中索引与偏移 X/Y/Z
  - 撤销/重做按钮
- 自动保存
  - 鼠标松开或坐标输入后自动调用 `/api/positions/save` 持久化
- 关联关系
  - 保存数据包含组标识与实例索引，便于与 BOM 项关联
- 后端 API
  - `GET /api/positions` 获取全部位置
  - `POST /api/positions/save` 保存单个实例位置

## 操作日志
- 前端所有导出与位置修改会写入日志
- 后端 API
  - `GET /api/logs`
  - `POST /api/logs/write` `{ type, message, data }`

## 测试
- 位置与 BOM 接口测试
  - `api/tests/bom.test.ts`
  - `api/tests/positions.test.ts`
- 运行
  - `npx tsx api/tests/bom.test.ts`
  - `npx tsx api/tests/positions.test.ts`

