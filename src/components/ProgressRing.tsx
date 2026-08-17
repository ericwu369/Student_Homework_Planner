export function ProgressRing({
  percent,
  size = 180,
  stroke = 15,
}: {
  percent: number
  size?: number
  stroke?: number
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.min(Math.max(percent, 0), 1))
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(255,255,255,.45)" stroke="rgba(148,163,184,.25)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="ring-fill"
          stroke="#ffd60a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-bolt">⚡</span>
        <strong>{Math.round(percent * 100)}%</strong>
        <span className="ring-label">完成进度</span>
      </div>
    </div>
  )
}