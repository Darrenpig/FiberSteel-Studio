import { Card } from 'antd'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function Home() {
  return (
    <div className={cn('grid h-[calc(100vh-16px)] grid-cols-3 gap-4 p-4')}>
      <Card title="3D设计工作台" extra={<Link to="/designer">进入</Link>}>
        支持国标方管（默认20×20）在线3D构建，网格显示与交互。
      </Card>
      <Card title="CAD绘图板" extra={<Link to="/cad">进入</Link>}>
        平面CAD绘图，网格捕捉，便于标注与图层管理。
      </Card>
      <Card title="参数化建模" extra={<Link to="/parametric">进入</Link>}>
        快速配置方管与玻纤板参数，可应用到3D与CAD。
      </Card>
    </div>
  )
}
