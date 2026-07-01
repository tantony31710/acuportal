import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
  pulse: number
  pulseSpeed: number
}

interface ShootingStar {
  x: number
  y: number
  len: number
  speed: number
  angle: number
  opacity: number
  active: boolean
  timer: number
  delay: number
}

interface AnimatedBackgroundProps {
  orbCount?: number
  particleCount?: number
  className?: string
}

const COLORS = ['#2dd4bf', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa']

const ORB_CONFIG = [
  { size: 520, x: '8%',   y: '4%',   color: 'rgba(45,212,191,0.07)',  delay: '0s',   dur: '20s' },
  { size: 380, x: '82%',  y: '12%',  color: 'rgba(96,165,250,0.055)', delay: '3s',   dur: '24s' },
  { size: 320, x: '62%',  y: '72%',  color: 'rgba(45,212,191,0.05)',  delay: '6s',   dur: '18s' },
  { size: 220, x: '18%',  y: '78%',  color: 'rgba(52,211,153,0.045)', delay: '2s',   dur: '22s' },
  { size: 270, x: '44%',  y: '38%',  color: 'rgba(167,139,250,0.04)', delay: '10s',  dur: '28s' },
]

export function AnimatedBackground({
  orbCount = 5,
  particleCount = 70,
  className = '',
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<ShootingStar[]>([])
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // Re-init particles on resize so they fill new dimensions
      initParticles()
    }

    const initParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * (canvas.width || 1920),
        y: Math.random() * (canvas.height || 1080),
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 0.4,
        opacity: Math.random() * 0.45 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.012,
      }))

      // Shooting star pool
      starsRef.current = Array.from({ length: 6 }, (_, i) => ({
        x: 0, y: 0, len: 80 + Math.random() * 120,
        speed: 6 + Math.random() * 8,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
        opacity: 0, active: false,
        timer: 0, delay: i * 3000 + Math.random() * 8000,
      }))
    }

    resize()
    window.addEventListener('resize', resize)

    let lastTime = 0
    const draw = (timestamp: number) => {
      if (!canvas || !ctx) return
      const dt = Math.min(timestamp - lastTime, 50)
      lastTime = timestamp
      timeRef.current += dt

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const pts = particlesRef.current

      // ── Connections ──────────────────────────────────────────────
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            ctx.save()
            ctx.globalAlpha = (1 - dist / 140) * 0.12
            const grad = ctx.createLinearGradient(pts[i].x, pts[i].y, pts[j].x, pts[j].y)
            grad.addColorStop(0, pts[i].color)
            grad.addColorStop(1, pts[j].color)
            ctx.strokeStyle = grad
            ctx.lineWidth = 0.7
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      // ── Particles with pulse ──────────────────────────────────────
      for (const p of pts) {
        p.pulse += p.pulseSpeed
        const r = p.radius * (0.85 + 0.15 * Math.sin(p.pulse))
        ctx.save()
        ctx.globalAlpha = p.opacity * (0.75 + 0.25 * Math.sin(p.pulse))
        // glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4)
        grd.addColorStop(0, p.color)
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2)
        ctx.fill()
        // core dot
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0)            p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0)            p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
      }

      // ── Shooting stars ────────────────────────────────────────────
      for (const s of starsRef.current) {
        s.delay -= dt
        if (s.delay > 0) continue

        if (!s.active) {
          // Reset and activate
          s.x = Math.random() * canvas.width * 0.7
          s.y = Math.random() * canvas.height * 0.3
          s.opacity = 0.9
          s.timer = 0
          s.active = true
          s.delay = 4000 + Math.random() * 10000
        }

        if (s.active) {
          s.x += Math.cos(s.angle) * s.speed
          s.y += Math.sin(s.angle) * s.speed
          s.timer += dt
          s.opacity = Math.max(0, 0.9 - s.timer / 500)

          ctx.save()
          ctx.globalAlpha = s.opacity
          const tailX = s.x - Math.cos(s.angle) * s.len
          const tailY = s.y - Math.sin(s.angle) * s.len
          const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y)
          grad.addColorStop(0, 'transparent')
          grad.addColorStop(1, '#e0f2fe')
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(tailX, tailY)
          ctx.lineTo(s.x, s.y)
          ctx.stroke()
          ctx.restore()

          if (s.opacity <= 0 || s.x > canvas.width * 1.2 || s.y > canvas.height * 1.2) {
            s.active = false
          }
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [particleCount])

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-70" />

      {/* Nebula orbs */}
      {ORB_CONFIG.slice(0, orbCount).map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl animate-float-slow"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
            animationDelay: orb.delay,
            animationDuration: orb.dur,
            transform: 'translate(-50%, -50%)',
            willChange: 'transform',
          }}
        />
      ))}

      {/* Extra inner glow layer for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 15% 50%, rgba(45,212,191,0.03) 0%, transparent 70%),' +
            'radial-gradient(ellipse 60% 40% at 85% 50%, rgba(96,165,250,0.03) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
