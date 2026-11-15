import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Chip,
  ConfirmProvider,
  DataTable,
  Disclosure,
  EmptyState,
  IconButton,
  KeyValue,
  Meter,
  Modal,
  ScreenHeader,
  Section,
  SegmentedControl,
  Select,
  Sheet,
  Slider,
  Sparkline,
  Stat,
  Stepper,
  Tabs,
  ToastProvider,
  Toggle,
  Tooltip,
  useConfirm,
  useToast,
} from './index'

const TABS = [
  { value: 'a', label: 'Floor' },
  { value: 'b', label: 'Stock', badge: 3 },
  { value: 'c', label: 'Staff' },
] as const

const ROWS = [
  { name: 'Cans', qty: 120, price: 1.25 },
  { name: 'Produce', qty: 48, price: 2.4 },
  { name: 'Dairy', qty: 9, price: 3.1 },
]

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section title={title}>
      <div className="gk-gallery__row">{children}</div>
    </Section>
  )
}

function Gallery() {
  const confirm = useConfirm()
  const toast = useToast()
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a')
  const [seg, setSeg] = useState<'1' | '2' | '3'>('2')
  const [on, setOn] = useState(true)
  const [n, setN] = useState(3)
  const [pick, setPick] = useState<'x' | 'y'>('x')
  const [vol, setVol] = useState(0.4)
  const [sheet, setSheet] = useState(false)
  const [modal, setModal] = useState(false)
  const [taps, setTaps] = useState(0)
  const [flash, setFlash] = useState(0)

  return (
    <div className="gk-gallery">
      <ScreenHeader
        title="Kit"
        purpose="Every shared control in its key states."
        stats={<Stat label="Cash" value="$12.4k" rate="+$32/s" delta={flash} flashKey={flash} title="Flashes on change" />}
        actions={<Button size="sm" onClick={() => setFlash((f) => (f >= 0 ? -1 : 1) * (Math.abs(f) + 1))}>Flash</Button>}
      />

      <Row title="Button tones">
        <Button tone="primary">Primary · spend</Button>
        <Button tone="free">Free · verb</Button>
        <Button tone="secondary">Secondary</Button>
        <Button tone="ghost">Ghost · dismiss</Button>
        <Button tone="danger">Danger</Button>
      </Row>
      <Row title="Button sizes / states">
        <Button tone="primary" size="sm">Small</Button>
        <Button tone="primary" size="lg" icon="★" cost="$250">Hire</Button>
        <Button tone="primary" cost="$9,999" affordable={false}>Too much</Button>
        <Button tone="primary" loading>Saving</Button>
        <Button tone="primary" progress={0.45} cost="$800">Saving up</Button>
        <Button tone="secondary" disabled>Disabled</Button>
        <Button hold onClick={() => setTaps((t) => t + 1)}>Hold me · {taps}</Button>
        <IconButton aria-label="Settings" icon="⚙" />
        <IconButton aria-label="Add" icon="+" tone="primary" />
      </Row>

      <Section title="Cards">
        <div className="gk-gallery__grid">
          <Card header="Default" footer={<Button size="sm" tone="primary" cost="$40">Buy</Button>}>A plain card.</Card>
          <Card state="affordable" header="Affordable">You can buy this.</Card>
          <Card state="suggested" header="Suggested">Best next move.</Card>
          <Card state="new" header="New">Just unlocked.</Card>
          <Card state="locked" header="Locked">Needs Era 2.</Card>
          <Card state="maxed" header="Maxed">Nothing left.</Card>
        </div>
      </Section>

      <Row title="Meters">
        <div style={{ flex: '1 1 160px' }}>
          <Meter value={0.6} label="Shelf" eta="1m 20s" />
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <Meter value={0.9} tone="success" label="Trust" />
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <Meter value={0.2} tone="danger" label="Spoilage" />
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <Meter value={0.5} tone="warn" label="Queue" />
        </div>
        <Meter variant="ring" value={0.7} tone="accent" />
        <Meter variant="ring" value={0.35} tone="warn" eta="42s" size={56} />
      </Row>

      <Row title="Tabs / segmented">
        <Tabs options={[...TABS]} value={tab} onChange={setTab} aria-label="Demo tabs" />
        <SegmentedControl
          options={[
            { value: '1', label: '×1' },
            { value: '2', label: '×10' },
            { value: '3', label: 'Max' },
          ]}
          value={seg}
          onChange={setSeg}
          aria-label="Buy amount"
        />
      </Row>

      <Row title="Chips / badges">
        <Chip selected onClick={() => undefined}>Selected</Chip>
        <Chip onClick={() => undefined}>Plain</Chip>
        <Chip onRemove={() => undefined}>Removable</Chip>
        <Badge>3</Badge>
        <Badge tone="tag">New</Badge>
        <Badge tone="success">OK</Badge>
        <Badge tone="warn">!</Badge>
        <Badge tone="danger">9</Badge>
        <Badge tone="info">i</Badge>
        <Badge dot />
      </Row>

      <Row title="Inputs">
        <Toggle checked={on} onChange={setOn}>Auto-restock</Toggle>
        <Stepper value={n} onChange={setN} min={0} max={20} label="Staff" />
        <Select
          value={pick}
          onChange={setPick}
          options={[
            { value: 'x', label: 'Cheapest' },
            { value: 'y', label: 'Fastest' },
          ]}
          aria-label="Policy"
        />
        <div style={{ flex: '1 1 220px' }}>
          <Slider label="Price" value={vol} onChange={setVol} format={(v) => `${Math.round(v * 100)}%`} />
        </div>
        <Tooltip content="Explanations live in tooltips, not in the layout.">What is this?</Tooltip>
      </Row>

      <Section title="Data" count={3}>
        <KeyValue
          items={[
            { label: 'Revenue', value: '$32/s' },
            { label: 'Costs', value: '$11/s', tone: 'danger' },
            { label: 'Margin', value: '66%', tone: 'success' },
          ]}
        />
        <DataTable
          caption="Stock"
          rows={ROWS}
          rowKey={(r) => r.name}
          maxHeight={160}
          columns={[
            { key: 'n', header: 'Item', render: (r) => r.name },
            { key: 'q', header: 'Qty', align: 'end', render: (r) => r.qty },
            { key: 'p', header: 'Price', align: 'end', render: (r) => `$${r.price.toFixed(2)}` },
          ]}
        />
        <Sparkline values={[3, 4, 3, 6, 7, 6, 9]} label="Income" />
      </Section>

      <Disclosure title="Disclosure" count={2} defaultOpen>
        Collapsible content, count badge on the right of the title.
      </Disclosure>

      <Row title="Overlays">
        <Button onClick={() => setSheet(true)}>Sheet</Button>
        <Button onClick={() => setModal(true)}>Modal</Button>
        <Button
          tone="danger"
          onClick={async () => {
            const ok = await confirm({ title: 'Sell the store?', body: 'This cannot be undone.', tone: 'danger', confirmLabel: 'Sell' })
            toast.push(ok ? 'Confirmed' : 'Cancelled', { tone: ok ? 'success' : 'info' })
          }}
        >
          Confirm
        </Button>
        <Button onClick={() => toast.push('Saved', { tone: 'success' })}>Toast</Button>
      </Row>

      <EmptyState icon="🧺" title="No staff yet" body="Hire a cashier to start ringing up baskets." action={<Button tone="primary" size="sm">Hire</Button>} />

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Sheet" footer={<Button tone="primary" onClick={() => setSheet(false)}>Done</Button>}>
        Bottom sheet on phones, side drawer on desktop.
      </Sheet>
      <Modal open={modal} onClose={() => setModal(false)} title="Modal" footer={<Button onClick={() => setModal(false)}>Close</Button>}>
        Centered dialog. Esc or tap outside to close.
      </Modal>
    </div>
  )
}

/** DevMode > Kit: every kit component in key states. */
export function KitGallery() {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <Gallery />
      </ToastProvider>
    </ConfirmProvider>
  )
}
