'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { login, initializeUsers } from '@/lib/auth'
import { useLoading } from '@/contexts/LoadingContext'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'

/**
 * Amtariksha — Space/Infinity vibe
 * Warp update per request:
 * 1) Streaks **radiate from the logo** (warp origin locked to logo center)
 * 2) Slower "cruise" speed; **spike only on submit**
 */

// --- Warp starfield (streaking "warp speed" stars) ---
function WarpField({ warp = 0.25, origin = { x: 0, y: 0 } }: { warp?: number; origin?: { x: number; y: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    interface Star {
      x: number
      y: number
      z: number
      px: number
      py: number
    }

    const state: { stars: Star[]; count: number; color: string } = {
      stars: [],
      count: 480,
      color: 'rgba(255,255,255,0.9)',
    }

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const seed = () => {
      const rect = canvas.getBoundingClientRect()
      const makeStar = (): Star => ({
        x: (Math.random() - 0.5) * rect.width * 2.2,
        y: (Math.random() - 0.5) * rect.height * 2.2,
        z: Math.random() * 1 + 0.2, // depth 0..1
        px: 0,
        py: 0,
      })
      state.stars = Array.from({ length: state.count }, makeStar)
    }

    let last = performance.now()
    const loop = (t: number) => {
      const rect = canvas.getBoundingClientRect()
      const cx = origin.x - rect.left // origin locked to logo center
      const cy = origin.y - rect.top
      const dt = Math.min(0.033, (t - last) / 1000)
      last = t

      ctx.fillStyle = 'rgba(2,6,23,0.6)' // slate-950 w/ alpha
      ctx.fillRect(0, 0, rect.width, rect.height)

      // slower cruise; warp prop scales speed
      const baseSpeed = 0.7 // reduced base for subtle cruise
      const speed = baseSpeed * (warp <= 0 ? 0.001 : warp)
      const focal = 420 // perspective

      ctx.strokeStyle = state.color

      for (let i = 0; i < state.stars.length; i++) {
        const s = state.stars[i]
        s.z -= dt * speed
        if (s.z <= 0.01) {
          // reset far away
          s.x = (Math.random() - 0.5) * rect.width * 2.2
          s.y = (Math.random() - 0.5) * rect.height * 2.2
          s.z = 1.0
          s.px = cx
          s.py = cy
        }

        const scale = focal / (focal * s.z)
        const sx = cx + s.x * scale
        const sy = cy + s.y * scale

        const dx = sx - s.px
        const dy = sy - s.py
        const lw = Math.min(3.2, 0.35 + (1 - s.z) * 2.6 * (0.4 + warp))
        ctx.lineWidth = lw
        ctx.globalAlpha = Math.min(1, 0.22 + (1 - s.z) * 0.85)
        ctx.beginPath()
        ctx.moveTo(s.px, s.py)
        ctx.lineTo(sx, sy)
        ctx.stroke()

        s.px = sx
        s.py = sy
      }

      ctx.globalAlpha = 1
      raf.current = requestAnimationFrame(loop)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    raf.current = requestAnimationFrame(loop)

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      ro.disconnect()
    }
  }, [warp, prefersReducedMotion, origin.x, origin.y])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
}

// --- Gooey Gradient (SVG metaballs following the cursor) ---
function GooeyGradient({ mouse }: { mouse: { x: any; y: any } }) {
  const prefersReducedMotion = useReducedMotion()
  const x = useSpring(mouse.x, { stiffness: 80, damping: 20, mass: 0.4 })
  const y = useSpring(mouse.y, { stiffness: 80, damping: 20, mass: 0.4 })

  // Transform to percentage strings
  const px = useTransform(x, (v) => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1
    return `${(v / width) * 100}%`
  })
  const py = useTransform(y, (v) => {
    const height = typeof window !== 'undefined' ? window.innerHeight : 1
    return `${(v / height) * 100}%`
  })

  // Second ball transforms
  const px2 = useTransform(x, (v) => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1
    return `${(Math.min(v + 160, width) / width) * 100}%`
  })
  const py2 = useTransform(y, (v) => {
    const height = typeof window !== 'undefined' ? window.innerHeight : 1
    return `${(Math.max(v - 140, 0) / height) * 100}%`
  })

  if (prefersReducedMotion) return null
  return (
    <svg className="absolute inset-0 w-full h-full" aria-hidden>
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -8" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
        <radialGradient id="ballA" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </radialGradient>
        <radialGradient id="ballB" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f472b6" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="#0b1220" />
      <g filter="url(#goo)">
        <motion.circle r="16%" fill="url(#ballA)" style={{ cx: px, cy: py, opacity: 0.5 }} />
        <motion.circle
          r="14%"
          fill="url(#ballB)"
          style={{
            cx: px2,
            cy: py2,
            opacity: 0.45,
          }}
        />
      </g>
      <radialGradient id="vignette" cx="50%" cy="50%">
        <stop offset="50%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
      </radialGradient>
      <rect width="100%" height="100%" fill="url(#vignette)" />
    </svg>
  )
}

// --- Particle Field (sparkles) ---
function ParticleField({ enabled = true }: { enabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || prefersReducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      size: number
      hue: number
    }

    let particles: Particle[] = []

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const burst = (x: number, y: number, n = 10) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 0.6 + Math.random() * 2.2
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, size: 1 + Math.random() * 2, hue: 230 + Math.random() * 140 })
      }
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      burst(e.clientX - rect.left, e.clientY - rect.top, 2)
    }

    const step = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.fillStyle = 'rgba(2, 6, 23, 0.1)'
      ctx.fillRect(0, 0, rect.width, rect.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vx *= 0.985
        p.vy = p.vy * 0.985 + 0.02
        p.x += p.vx
        p.y += p.vy
        p.life *= 0.975

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14)
        grd.addColorStop(0, `hsla(${p.hue}, 95%, 70%, ${0.9 * p.life})`)
        grd.addColorStop(1, `hsla(${p.hue}, 95%, 70%, 0)`)
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3 + p.size, 0, Math.PI * 2)
        ctx.fill()

        if (p.life < 0.05) particles.splice(i, 1)
      }

      rafRef.current = requestAnimationFrame(step)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    window.addEventListener('mousemove', onMove, { passive: true })
    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      particles = []
    }
  }, [enabled, prefersReducedMotion])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
}

// --- Magnetic button + click ripple ---
function MagneticButton({ children, className = '', onClick, disabled }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; disabled?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 300, damping: 30 })
  const y = useSpring(my, { stiffness: 300, damping: 30 })
  const [ripples, setRipples] = useState<Array<{ id: string; x: number; y: number }>>([])

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mx.set((e.clientX - rect.left - rect.width / 2) * 0.2)
    my.set((e.clientY - rect.top - rect.height / 2) * 0.2)
  }
  const handleMouseLeave = () => {
    mx.set(0)
    my.set(0)
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Math.random().toString(36).slice(2)
    setRipples((r) => [...r, { id, x, y }])
    setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 600)
    onClick?.(e)
  }

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled}
      type="submit"
      className={`relative overflow-hidden rounded-xl px-5 py-3 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition ${className}`}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40"
          style={{ left: r.x, top: r.y, width: 12, height: 12, animation: 'ripple 600ms ease-out forwards' }}
        />
      ))}
      <style jsx>{`
        @keyframes ripple {
          from {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          to {
            transform: translate(-50%, -50%) scale(22);
            opacity: 0;
          }
        }
      `}</style>
    </motion.button>
  )
}

export default function LoginForm() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()
  const prefersReducedMotion = useReducedMotion()

  // Mouse tracking values for background
  const mouse = { x: useMotionValue(0), y: useMotionValue(0) }
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.x.set(e.clientX)
      mouse.y.set(e.clientY)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Warp: slower cruise baseline, spike only on submit
  const [warpPulse, setWarpPulse] = useState(0) // 0..1 extra
  useEffect(() => {
    if (!warpPulse) return
    const id = setTimeout(() => setWarpPulse(0), 1100)
    return () => clearTimeout(id)
  }, [warpPulse])

  const warpLevel = prefersReducedMotion ? 0 : 0.22 + warpPulse * 1.1 // cruise ~0.22, spike ~1.32

  // Tie warp origin to the brand logo center
  const logoRef = useRef<HTMLDivElement>(null)
  const [warpOrigin, setWarpOrigin] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const calc = () => {
      const r = logoRef.current?.getBoundingClientRect()
      if (r) setWarpOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    calc()
    const ro = new ResizeObserver(calc)
    if (logoRef.current) ro.observe(logoRef.current)
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc)
    }
  }, [])

  // Initialize users on component mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeUsers()
      } catch (error) {
        console.error('Failed to initialize users:', error)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setWarpPulse(1) // ENGAGE WARP SPEED!
    showGlobalLoading('Signing in...')

    try {
      const success = await login(employeeId, password)

      if (success) {
        router.push('/dashboard')
      } else {
        setError('Invalid Employee ID or Password')
      }
    } catch {
      setError('An error occurred during login')
    } finally {
      setIsLoading(false)
      hideGlobalLoading()
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-950 text-white flex items-center justify-center px-4">
      {/* Warp stars at back, radiating from logo */}
      <WarpField warp={warpLevel} origin={warpOrigin} />

      {/* Gooey gradient layer */}
      <GooeyGradient mouse={mouse} />

      {/* Sparkle particles */}
      <ParticleField enabled />

      {/* Card */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 blur" aria-hidden />
        <div className="relative rounded-2xl bg-gray-900/90 backdrop-blur-xl shadow-2xl p-8">
          {/* Brand Logo */}
          <div className="mb-8 flex flex-col items-center justify-center select-none">
            {/* Logo Image with Hover Animation */}
            <motion.div
              ref={logoRef}
              className="mb-3"
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Image
                src="/images/logos/amtariksha_icon.png"
                alt="Amtariksha Logo"
                width={80}
                height={80}
                className="object-contain drop-shadow-2xl"
              />
            </motion.div>
            {/* Brand Name */}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
                Amtariksha
              </span>
            </h1>
            <p className="text-sm md:text-base text-white/70">space • infinity</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}

            {/* Employee ID */}
            <div className="relative">
              <input
                type="text"
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="peer w-full px-3 pt-5 pb-2 placeholder-transparent bg-transparent border-b-2 border-white/30 focus:border-indigo-400 focus:outline-none"
                placeholder="Employee ID"
                autoComplete="username"
                aria-invalid={!!error && !employeeId}
              />
              <label
                htmlFor="employeeId"
                className="absolute left-3 text-white/70 transition-all duration-300 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:text-sm peer-focus:text-indigo-300"
              >
                Employee ID
              </label>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full pr-12 px-3 pt-5 pb-2 placeholder-transparent bg-transparent border-b-2 border-white/30 focus:border-indigo-400 focus:outline-none"
                placeholder="Password"
                autoComplete="current-password"
                aria-invalid={!!error && !password}
              />
              <label
                htmlFor="password"
                className="absolute left-3 text-white/70 transition-all duration-300 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:text-sm peer-focus:text-indigo-300"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-white/80 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Magnetic Login Button with Warp Effect */}
            <MagneticButton className="w-full" disabled={isLoading}>
              {isLoading ? 'Engaging warp…' : 'Enter'}
            </MagneticButton>

            {/* Helper Text */}
            <div className="text-center text-sm text-white/80">
              <p>Use your Employee ID (e.g., AM-0001) to login</p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
