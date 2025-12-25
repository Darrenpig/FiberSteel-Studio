import { useModelingStore } from '@/store/modeling'
import { Card, Form, InputNumber, Select, Button, message } from 'antd'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export default function Parametric() {
  const squareTube = useModelingStore((s) => s.squareTube)
  const fiberBoard = useModelingStore((s) => s.fiberBoard)
  const setSquareTube = useModelingStore((s) => s.setSquareTube)
  const setFiberBoard = useModelingStore((s) => s.setFiberBoard)
  const nav = useNavigate()

  return (
    <div className={cn('grid h-[calc(100vh-16px)] grid-cols-12 gap-2 p-2')}>
      <Card title="方管参数" className="col-span-6 h-full overflow-auto">
        <Form layout="vertical">
          <Form.Item label="宽度 (mm)">
            <InputNumber
              value={squareTube.width}
              min={5}
              max={200}
              onChange={(v) => setSquareTube({ width: Number(v) })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="高度 (mm)">
            <InputNumber
              value={squareTube.height}
              min={5}
              max={200}
              onChange={(v) => setSquareTube({ height: Number(v) })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="壁厚 (mm)">
            <InputNumber
              value={squareTube.thickness}
              min={1}
              max={10}
              step={0.5}
              onChange={(v) => setSquareTube({ thickness: Number(v) })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="长度 (mm)">
            <InputNumber
              value={squareTube.length}
              min={50}
              max={5000}
              step={10}
              onChange={(v) => setSquareTube({ length: Number(v) })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="材料">
            <Select
              value={squareTube.material}
              options={[
                { label: 'Q235', value: 'Q235' },
                { label: 'Q345', value: 'Q345' },
              ]}
              onChange={(v) => setSquareTube({ material: v })}
            />
          </Form.Item>
          <Form.Item label="标准">
            <Select
              value={squareTube.standard}
              options={[
                { label: 'GB/T 6728-2017', value: 'GB/T 6728-2017' },
                { label: 'GB/T 700-2006', value: 'GB/T 700-2006' },
              ]}
              onChange={(v) => setSquareTube({ standard: v })}
            />
          </Form.Item>
          <Button
            type="primary"
            onClick={() => {
              message.success('已应用方管参数')
              nav('/designer')
            }}
          >
            应用到3D设计
          </Button>
        </Form>
      </Card>

      <Card title="玻纤板参数" className="col-span-6 h-full overflow-auto">
        <Form layout="vertical">
          <Form.Item label="板宽度 (mm)">
            <InputNumber
              value={fiberBoard.width}
              min={100}
              max={4000}
              onChange={(v) => setFiberBoard({ width: Number(v) })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="板高度 (mm)">
            <InputNumber
              value={fiberBoard.height}
              min={100}
              max={4000}
              onChange={(v) => setFiberBoard({ height: Number(v) })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="厚度 (mm)">
            <InputNumber
              value={fiberBoard.thickness}
              min={1}
              max={50}
              step={0.5}
              onChange={(v) => setFiberBoard({ thickness: Number(v) })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="纤维类型">
            <Select
              value={fiberBoard.fiberType}
              options={[
                { label: 'E-glass', value: 'E-glass' },
                { label: 'S-glass', value: 'S-glass' },
              ]}
              onChange={(v) => setFiberBoard({ fiberType: v })}
            />
          </Form.Item>
          <Form.Item label="树脂类型">
            <Select
              value={fiberBoard.resinType}
              options={[
                { label: 'epoxy', value: 'epoxy' },
                { label: 'polyester', value: 'polyester' },
              ]}
              onChange={(v) => setFiberBoard({ resinType: v })}
            />
          </Form.Item>
          <Button
            type="primary"
            onClick={() => {
              message.success('已应用玻纤板参数')
              nav('/cad')
            }}
          >
            应用到CAD绘图
          </Button>
        </Form>
      </Card>
    </div>
  )
}

