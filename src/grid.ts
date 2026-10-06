export type Tool = 'path' | 'erase' | 'start' | 'goal'

export interface GridHooks {
  onChange: (stats: GridStats) => void
  onHover: (cell: { x: number; y: number } | null) => void
}

export interface GridStats {
  paths: number
  total: number
}

const EMPTY = 0
const PATH = 1

const COLORS = {
  bg: '#f6efdf',
  grid: '#e4dac4',
  border: '#cbbfa4',
  path: '#b5824f',
  start: '#4f9d69',
  goal: '#d0605d',
  hover: 'rgba(61, 54, 39, 0.7)',
}

export class Grid {
  readonly canvas: HTMLCanvasElement
  cols: number
  rows: number
  cells: Uint8Array
  start: number
  goal: number
  tool: Tool = 'path'

  private ctx: CanvasRenderingContext2D
  private hooks: GridHooks
  private cellSize = 20
  private painting = false
  private paintValue: number = PATH
  private hoverIndex: number | null = null

  constructor(canvas: HTMLCanvasElement, cols: number, rows: number, hooks: GridHooks) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.cols = cols
    this.rows = rows
    this.cells = new Uint8Array(cols * rows)
    this.hooks = hooks
    this.start = this.index(1, Math.floor(rows / 2))
    this.goal = this.index(cols - 2, Math.floor(rows / 2))
    this.bindPointer()
  }

  index(x: number, y: number): number {
    return y * this.cols + x
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows
  }

  countPaths(): number {
    let n = 0
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === PATH) n++
    return n
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.cells = new Uint8Array(cols * rows)
    this.start = this.index(1, Math.floor(rows / 2))
    this.goal = this.index(cols - 2, Math.floor(rows / 2))
    this.fit()
    this.emit()
  }

  clear(): void {
    this.cells.fill(EMPTY)
    this.emit()
    this.draw()
  }

  setPath(x: number, y: number, value: number): void {
    if (!this.inBounds(x, y)) return
    const i = this.index(x, y)
    if (i === this.start || i === this.goal) return
    if (this.cells[i] === value) return
    this.cells[i] = value
  }

  setStart(x: number, y: number): void {
    if (!this.inBounds(x, y)) return
    const i = this.index(x, y)
    this.start = i
  }

  setGoal(x: number, y: number): void {
    if (!this.inBounds(x, y)) return
    const i = this.index(x, y)
    this.goal = i
  }

  fit(): void {
    const parent = this.canvas.parentElement
    if (!parent) return
    const byWidth = parent.clientWidth / this.cols
    const byHeight = parent.clientHeight / this.rows
    const size = Math.max(6, Math.floor(Math.min(byWidth, byHeight)))
    this.cellSize = size
    this.draw()
  }

  draw(): void {
    const dpr = window.devicePixelRatio || 1
    const s = this.cellSize
    const width = this.cols * s
    const height = this.rows * s

    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr
      this.canvas.height = height * dpr
      this.canvas.style.width = `${width}px`
      this.canvas.style.height = `${height}px`
    }

    const ctx = this.ctx
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // background
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, width, height)

    // grid lines
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 1; x < this.cols; x++) {
      ctx.moveTo(x * s + 0.5, 0)
      ctx.lineTo(x * s + 0.5, height)
    }
    for (let y = 1; y < this.rows; y++) {
      ctx.moveTo(0, y * s + 0.5)
      ctx.lineTo(width, y * s + 0.5)
    }
    ctx.stroke()

    // path trail + start/goal markers + hover highlight + border
    this.drawTrail(s)
    this.drawMarker(this.start, COLORS.start, s)
    this.drawMarker(this.goal, COLORS.goal, s)

    if (this.hoverIndex !== null && this.hoverIndex >= 0 && this.hoverIndex < this.cells.length) {
      const hx = this.hoverIndex % this.cols
      const hy = Math.floor(this.hoverIndex / this.cols)
      ctx.strokeStyle = COLORS.hover
      ctx.lineWidth = 2
      ctx.strokeRect(hx * s + 1, hy * s + 1, s - 2, s - 2)
    }

    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1)
  }

  private drawTrail(s: number): void {
    const ctx = this.ctx
    const lineWidth = Math.max(3, s * 0.5)

    ctx.strokeStyle = COLORS.path
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const pairs: Array<[number, number]> = []
    const dots: number[] = []
    const isMarker = (i: number): boolean => i === this.start || i === this.goal
    const isTrail = (i: number): boolean => i >= 0 && (this.cells[i] === PATH || isMarker(i))

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = this.index(x, y)
        if (!isTrail(i)) continue
        const right = x + 1 < this.cols ? this.index(x + 1, y) : -1
        const down = y + 1 < this.rows ? this.index(x, y + 1) : -1
        const rightPath = isTrail(right)
        const downPath = isTrail(down)
        if (rightPath) pairs.push([i, right])
        if (downPath) pairs.push([i, down])
        if (!rightPath && !downPath && !isMarker(i)) {
          const upPath = y > 0 && isTrail(this.index(x, y - 1))
          const leftPath = x > 0 && isTrail(this.index(x - 1, y))
          if (!upPath && !leftPath) dots.push(i)
        }
      }
    }

    ctx.beginPath()
    for (const [a, b] of pairs) {
      const ax = (a % this.cols) * s + s / 2
      const ay = Math.floor(a / this.cols) * s + s / 2
      const bx = (b % this.cols) * s + s / 2
      const by = Math.floor(b / this.cols) * s + s / 2
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
    }
    ctx.stroke()

    ctx.fillStyle = COLORS.path
    for (const i of dots) {
      const cx = (i % this.cols) * s + s / 2
      const cy = Math.floor(i / this.cols) * s + s / 2
      ctx.beginPath()
      ctx.arc(cx, cy, lineWidth / 2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
  }

  private drawMarker(index: number, color: string, s: number): void {
    const ctx = this.ctx
    const cx = (index % this.cols) * s + s / 2
    const cy = Math.floor(index / this.cols) * s + s / 2
    const r = Math.max(4, s * 0.34)

    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#fffdf7'
    ctx.stroke()
  }

  private cellFromEvent(e: PointerEvent): number | null {
    const rect = this.canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / this.cellSize)
    const y = Math.floor((e.clientY - rect.top) / this.cellSize)
    if (!this.inBounds(x, y)) return null
    return this.index(x, y)
  }

  // tools: apply selected tool to the cell
  private apply(i: number): void {
    const x = i % this.cols
    const y = Math.floor(i / this.cols)
    if (this.tool === 'path') this.setPath(x, y, PATH) // draw path
    else if (this.tool === 'erase') this.setPath(x, y, EMPTY) // erase path
    else if (this.tool === 'start') this.setStart(x, y) // place start
    else if (this.tool === 'goal') this.setGoal(x, y) // place goal
  }

  // pointer handling: left click paints with the active tool, right click erases
  private bindPointer(): void {
    const canvas = this.canvas

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return
      const i = this.cellFromEvent(e)
      if (i === null) return
      canvas.setPointerCapture(e.pointerId)
      this.painting = true
      this.paintValue = e.button === 2 || this.tool === 'erase' ? EMPTY : PATH
      this.apply(i)
      this.draw()
      this.emit()
      e.preventDefault()
    })

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const i = this.cellFromEvent(e)
      this.hoverIndex = i
      this.hooks.onHover(i === null ? null : { x: i % this.cols, y: Math.floor(i / this.cols) })
      if (this.painting && i !== null && (this.tool === 'path' || this.tool === 'erase')) {
        this.setPath(i % this.cols, Math.floor(i / this.cols), this.paintValue)
        this.emit()
      }
      this.draw()
    })

    const stop = (e: PointerEvent) => {
      if (!this.painting) return
      this.painting = false
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      this.emit()
    }
    canvas.addEventListener('pointerup', stop)
    canvas.addEventListener('pointercancel', stop)

    canvas.addEventListener('pointerleave', () => {
      this.hoverIndex = null
      this.hooks.onHover(null)
      this.draw()
    })

    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private emit(): void {
    this.hooks.onChange({ paths: this.countPaths(), total: this.cells.length })
  }
}
