import { useRef, useState } from 'react'
import { formatCurrency } from '../utils/format'

const WIDTH = 640
const HEIGHT = 200
const PAD_X = 12
const PAD_TOP = 20
const PAD_BOTTOM = 30

export default function RevenueChart({ data }) {
  const svgRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(null)

  if (!data || data.length === 0) return null

  const values = data.map((point) => Number(point?.total) || 0)
  const max = Math.max(1, ...values)
  const n = values.length
  const plotW = WIDTH - PAD_X * 2
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM

  const coords = values.map((value, i) => ({
    x: n === 1 ? WIDTH / 2 : PAD_X + (i / (n - 1)) * plotW,
    y: PAD_TOP + plotH - (value / max) * plotH,
  }))

  function smoothPath() {
    if (n === 0) return ''
    let d = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 0; i < n - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const p3 = coords[Math.min(n - 1, i + 2)]
      const c1x = p1.x + (p2.x - p0.x) / 6
      const c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6
      const c2y = p2.y - (p3.y - p1.y) / 6
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    }
    return d
  }

  const linePath = smoothPath()
  const areaPath =
    n > 0
      ? `${linePath} L ${coords[n - 1].x.toFixed(2)} ${PAD_TOP + plotH} L ${coords[0].x.toFixed(2)} ${PAD_TOP + plotH} Z`
      : ''

  const gridlines = [0, 0.5, 1].map((fraction) => ({
    y: PAD_TOP + plotH - fraction * plotH,
    label: formatCurrency(max * fraction),
  }))

  function handleMove(event) {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH
    const index = Math.round(((x - PAD_X) / plotW) * (n - 1))
    setActiveIndex(Math.min(Math.max(index, 0), n - 1))
  }

  const active = activeIndex === null ? null : coords[activeIndex]

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-44 w-full md:h-52"
        role="img"
        aria-label="Revenue chart for the last 7 days"
        onMouseMove={handleMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridlines.map((line) => (
          <g key={line.y}>
            <line
              x1={PAD_X}
              y1={line.y}
              x2={WIDTH - PAD_X}
              y2={line.y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={WIDTH - PAD_X - 4}
              y={line.y - 5}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
            >
              {line.label}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="url(#revenue-fill)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {active && (
          <line
            x1={active.x}
            y1={PAD_TOP}
            x2={active.x}
            y2={PAD_TOP + plotH}
            stroke="#16a34a"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {coords.map((coord, i) => (
          <g key={data[i].date}>
            <circle
              cx={coord.x}
              cy={coord.y}
              r={activeIndex === i ? 5 : 3.5}
              fill={activeIndex === i ? '#16a34a' : '#ffffff'}
              stroke="#16a34a"
              strokeWidth="2"
            />
            <text
              x={coord.x}
              y={HEIGHT - 9}
              textAnchor="middle"
              fontSize="10.5"
              fill={activeIndex === i ? '#0f172a' : '#94a3b8'}
              fontWeight={activeIndex === i ? 600 : 400}
            >
              {i === n - 1
                ? 'Today'
                : new Date(`${data[i].date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                  })}
            </text>
          </g>
        ))}
      </svg>

      {active && activeIndex !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-sm border border-border bg-surface px-3 py-1.5 text-center shadow-sm"
          style={{
            left: `${(active.x / WIDTH) * 100}%`,
            top: `${(active.y / HEIGHT) * 100}%`,
          }}
        >
          <div className="text-[11px] whitespace-nowrap text-secondary">
            {new Date(`${data[activeIndex].date}T00:00:00`).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
            })}
          </div>
          <div className="text-[13px] font-semibold whitespace-nowrap text-text">
            {formatCurrency(values[activeIndex])}
          </div>
        </div>
      )}
    </div>
  )
}