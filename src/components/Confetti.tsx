import { useEffect, useRef } from 'react'

export function Confetti({ active, onDone }: { active: boolean; onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = (canvas.width = canvas.offsetWidth || 800)
    const H = (canvas.height = canvas.offsetHeight || 600)
    const colors = ['#ff5252', '#ffffff', '#ffd60a', '#4f8ff7', '#31c48d', '#ff6f7e', '#f6a700']
    const parts = Array.from({ length: 170 }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.4,
      w: 6 + Math.random() * 9,
      h: 9 + Math.random() * 11,
      vy: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 1.6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.18,
      color: colors[(Math.random() * colors.length) | 0],
    }))
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const dt = (t - t0) / 1000
      ctx.clearRect(0, 0, W, H)
      parts.forEach((p) => {
        p.y += p.vy * dt * 60
        p.x += p.vx * dt * 60
        p.rot += p.vr * dt * 60
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      if (t - t0 < 3400) {
        raf = requestAnimationFrame(tick)
      } else {
        onDone?.()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, onDone])

  if (!active) return null
  return <canvas ref={ref} className="confetti" />
}