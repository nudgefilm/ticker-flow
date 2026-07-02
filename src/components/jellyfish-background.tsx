"use client"

import { useEffect, useRef } from "react"

type Jellyfish = {
  x: number; y: number; size: number; speed: number
  drift: number; driftSpeed: number; phase: number; pulseSpeed: number
  opacity: number; tentacleCount: number; armCount: number
}

export function JellyfishBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let width = 0, height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let jellies: Jellyfish[] = []
    let raf = 0
    let last = performance.now()

    const createJelly = (startBelow: boolean): Jellyfish => {
      const size = 26 + Math.random() * 64
      return {
        x: Math.random() * width,
        y: startBelow ? height + size + Math.random() * height : Math.random() * height,
        size,
        speed: 8 + Math.random() * 20,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 1.1 + Math.random() * 1.2,
        opacity: 0.1 + Math.random() * 0.18,
        tentacleCount: 9 + Math.floor(Math.random() * 5),
        armCount: 4 + Math.floor(Math.random() * 3),
      }
    }

    const resize = () => {
      const parent = canvas.parentElement
      width = parent?.clientWidth ?? window.innerWidth
      height = parent?.clientHeight ?? window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.max(5, Math.min(14, Math.round((width * height) / 100000)))
      jellies = Array.from({ length: count }, () => createJelly(false))
    }

    const white = (a: number) => `rgba(255, 255, 255, ${a})`

    const drawJelly = (j: Jellyfish, t: number) => {
      const pulse = Math.sin(t * j.pulseSpeed + j.phase)
      const bodyW = j.size * (1 + pulse * 0.14)
      const bodyH = j.size * (0.92 - pulse * 0.16)
      const x = j.x + Math.sin(t * j.driftSpeed + j.drift) * (j.size * 0.5)
      const y = j.y

      ctx.save()
      ctx.translate(x, y)
      ctx.filter = `blur(${Math.max(1.5, j.size * 0.05)}px)`

      const glow = ctx.createRadialGradient(0, -bodyH * 0.2, bodyW * 0.1, 0, 0, bodyW * 1.6)
      glow.addColorStop(0, white(j.opacity * 0.55))
      glow.addColorStop(0.5, white(j.opacity * 0.18))
      glow.addColorStop(1, white(0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(0, -bodyH * 0.2, bodyW * 1.6, 0, Math.PI * 2)
      ctx.fill()

      ctx.lineCap = "round"
      for (let i = 0; i < j.armCount; i++) {
        const spread = (i / (j.armCount - 1) - 0.5) * bodyW * 0.5
        const len = bodyH * (2.4 + Math.sin(t * 1.5 + i) * 0.4)
        const sway = Math.sin(t * j.pulseSpeed * 0.8 + i * 1.3 + j.phase) * (j.size * 0.28)
        const grad = ctx.createLinearGradient(spread, 0, spread + sway, len)
        grad.addColorStop(0, white(j.opacity * 1.3))
        grad.addColorStop(0.6, white(j.opacity * 0.5))
        grad.addColorStop(1, white(0))
        ctx.strokeStyle = grad
        ctx.lineWidth = Math.max(1.5, j.size * 0.09)
        ctx.beginPath()
        ctx.moveTo(spread, -bodyH * 0.1)
        ctx.bezierCurveTo(spread + sway * 0.5, len * 0.35, spread - sway * 0.6, len * 0.7, spread + sway, len)
        ctx.stroke()
      }

      ctx.lineWidth = Math.max(0.8, j.size * 0.025)
      for (let i = 0; i < j.tentacleCount; i++) {
        const tx = -bodyW / 2.2 + (i / (j.tentacleCount - 1)) * (bodyW / 1.1)
        const len = bodyH * (3.2 + Math.sin(t * 2 + i * 0.7) * 0.6)
        const sway = Math.sin(t * j.pulseSpeed + i * 0.8 + j.phase) * (j.size * 0.18)
        const grad = ctx.createLinearGradient(tx, 0, tx + sway, len)
        grad.addColorStop(0, white(j.opacity * 0.85))
        grad.addColorStop(1, white(0))
        ctx.strokeStyle = grad
        ctx.beginPath()
        ctx.moveTo(tx, bodyH * 0.02)
        ctx.quadraticCurveTo(tx + sway * 1.4, len * 0.55, tx + sway * 0.5, len)
        ctx.stroke()
      }

      const bell = ctx.createRadialGradient(0, -bodyH * 0.5, bodyW * 0.05, 0, -bodyH * 0.4, bodyW * 0.8)
      bell.addColorStop(0, white(j.opacity * 2.1))
      bell.addColorStop(0.7, white(j.opacity * 1.1))
      bell.addColorStop(1, white(j.opacity * 0.35))
      ctx.fillStyle = bell
      ctx.beginPath()
      ctx.moveTo(-bodyW / 2, 0)
      ctx.quadraticCurveTo(-bodyW / 2, -bodyH * 1.45, 0, -bodyH * 1.45)
      ctx.quadraticCurveTo(bodyW / 2, -bodyH * 1.45, bodyW / 2, 0)
      const scallops = 5
      const rimStep = bodyW / scallops
      for (let s = 0; s < scallops; s++) {
        const sx = bodyW / 2 - s * rimStep
        ctx.quadraticCurveTo(sx - rimStep * 0.5, bodyH * 0.22, sx - rimStep, 0)
      }
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = white(j.opacity * 0.9)
      ctx.lineWidth = Math.max(0.6, j.size * 0.015)
      const ribs = 4
      for (let r = 0; r <= ribs; r++) {
        const rx = (-bodyW / 2.6) + (r / ribs) * (bodyW / 1.3)
        ctx.beginPath()
        ctx.moveTo(rx * 0.5, -bodyH * 1.2)
        ctx.quadraticCurveTo(rx, -bodyH * 0.4, rx, 0)
        ctx.stroke()
      }

      ctx.fillStyle = white(j.opacity * 1.4)
      ctx.beginPath()
      ctx.ellipse(-bodyW * 0.12, -bodyH * 0.75, bodyW * 0.16, bodyH * 0.42, -0.3, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const t = now / 1000
      ctx.clearRect(0, 0, width, height)
      for (const j of jellies) {
        j.y -= j.speed * dt
        if (j.y < -j.size * 3.5) {
          Object.assign(j, createJelly(true))
          j.y = height + j.size * 2
        }
        drawJelly(j, t)
      }
      raf = requestAnimationFrame(render)
    }

    resize()
    if (prefersReduced) {
      ctx.clearRect(0, 0, width, height)
      for (const j of jellies) drawJelly(j, 0)
    } else {
      raf = requestAnimationFrame(render)
    }

    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  )
}
