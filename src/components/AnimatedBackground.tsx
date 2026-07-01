import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
}

interface AnimatedBackgroundProps {
  orbCount?: number
  particleCount?: number
  className?: string
}

export function AnimatedBackground({
  orbCount = 5,
  particleCount = 55,
  className = '',
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])

  // Safe hex colors for canvas (oklch not supported in canvas 2D)
  const COLORS = ['#2dd4bf', '#60a5fa', '#34d399', '#fbbf24']

  const ORB_CONFIG = [
    { size: 480, x: '10%',  y: '5%',  color: 'rgba(45,212,191,0.06)',  delay: '0s',  dur: '18s' },
    { size: 360, x: '80%',  y: '15%', color: 'rgba(96,165,250,0.05)',  delay: '3s',  dur: '22s' },
    { size: 300, x: '60%',  y: '70%', color: 'rgba(45,212,191,0.05)',  delay: '6s',  dur: '16s' },
    { size: 200, x: '20%',  y: '75%', color: 'rgba(52,211,153,0.04)',  delay: '2s',  dur: '20s' },
    { size: 250, x: '45%',  y: '40%', color: 'rgba(96,165,250,0.04)',  delay: '10s', dur: '25s' },
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.15,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    const draw = () => {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const pts = particlesRef.current

      // Connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.save()
            ctx.globalAlpha = (1 - dist / 130) * 0.1
            ctx.strokeStyle = '#2dd4bf'
            ctx.lineWidth = 0.7
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      // Particles
      for (const p of pts) {
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [particleCount])

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-60" />

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
          }}
        />
      ))}
    </div>
  )
}
