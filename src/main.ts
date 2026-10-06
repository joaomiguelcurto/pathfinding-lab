import './style.css'
import { Grid, type Tool } from './grid'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="layout">
    <header class="toolbar">
      <div class="brand">Pathfinding Lab</div>

      <!-- TOOLS group (buttons pick the active tool) -->
      <div class="group" role="group" aria-label="Tools">
        <span class="group-label">Tools</span>
        <button class="tool is-active" data-tool="path" title="Draw a path (1)">Path</button>
        <button class="tool" data-tool="erase" title="Erase (2)">Erase</button>
        <button class="tool" data-tool="start" title="Place start (3)">Start</button>
        <button class="tool" data-tool="goal" title="Place goal (4)">Goal</button>
      </div>

      <!-- GENERATE group -->
      <div class="group" role="group" aria-label="Generate">
        <span class="group-label">Generate</span>
        <button class="action" data-generate="maze" title="Auto-generate a maze">Maze</button>
        <!-- <button class="action" data-generate="streets" title="Auto-generate a street layout">Streets</button> -->
        <!-- <button class="action" data-generate="roundabout" title="Auto-generate a roundabout">Roundabout</button> -->
      </div>

      <!-- ACTIONS group (grid size + clear) -->
      <div class="group" role="group" aria-label="Actions">
        <span class="group-label">Actions</span>
        <label class="field">
          Size
          <select data-field="size">
            <option value="20x12">20 x 12</option>
            <option value="32x20" selected>32 x 20</option>
            <option value="48x30">48 x 30</option>
            <option value="64x40">64 x 40</option>
          </select>
        </label>
        <button class="action" data-action="clear" title="Clear the path">Clear</button>
      </div>
    </header>

    <!-- grid canvas lives here -->
    <main class="stage">
      <div class="canvas-wrap" id="canvas-wrap">
        <canvas id="grid"></canvas>
      </div>
    </main>

    <!-- STATUS bar -->
    <footer class="statusbar">
      <span data-status="tool">Tool: Path</span>
      <span data-status="hover">Cell: -</span>
      <span data-status="paths">Path cells: 0 / 0</span>
      <span class="hint">Left drag to draw · Right drag to erase</span>
    </footer>
  </div>
  <div class="toast" id="toast" hidden></div>
`

// lement lookups
const canvas = document.querySelector<HTMLCanvasElement>('#grid')!
const statusTool = document.querySelector<HTMLElement>('[data-status="tool"]')!
const statusHover = document.querySelector<HTMLElement>('[data-status="hover"]')!
const statusPaths = document.querySelector<HTMLElement>('[data-status="paths"]')!
const toastEl = document.querySelector<HTMLDivElement>('#toast')!

const toolNames: Record<Tool, string> = {
  path: 'Path',
  erase: 'Erase',
  start: 'Start',
  goal: 'Goal',
}

// toast popup (used by the generate buttons until they are implemented)
let toastTimer: number | undefined

function toast(message: string): void {
  toastEl.textContent = message
  toastEl.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true
  }, 2200)
}

const grid = new Grid(canvas, 32, 20, {
  // bottom bar: path counter
  onChange: (stats) => {
    statusPaths.textContent = `Path cells: ${stats.paths} / ${stats.total}`
  },
  // bottom bar: hovered cell
  onHover: (cell) => {
    statusHover.textContent = cell ? `Cell: ${cell.x}, ${cell.y}` : 'Cell: -'
  },
})

// tools: active tool selection
function selectTool(tool: Tool): void {
  grid.tool = tool
  document.querySelectorAll<HTMLButtonElement>('.tool').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tool === tool)
  })
  statusTool.textContent = `Tool: ${toolNames[tool]}`
}

// tools: click handlers for the tool buttons (path / erase / start / goal)
document.querySelectorAll<HTMLButtonElement>('.tool').forEach((btn) => {
  btn.addEventListener('click', () => selectTool(btn.dataset.tool as Tool))
})

// tools: shortcuts
const keys: Record<string, Tool> = {
  '1': 'path',
  '2': 'erase',
  '3': 'start',
  '4': 'goal',
}

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
  const tool = keys[e.key]
  if (tool) selectTool(tool)
})

// generate: click handlers
// TODO: the whole thing... replace the toast
document.querySelectorAll<HTMLButtonElement>('[data-generate]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const kind = btn.dataset.generate
    toast(`${btn.textContent} generation is not implemented yet`)
    console.log('generate requested:', kind)
  })
})

// actions: clear
document.querySelector<HTMLButtonElement>('[data-action="clear"]')!.addEventListener('click', () => {
  grid.clear()
})

// actions: grid size selector
document.querySelector<HTMLSelectElement>('[data-field="size"]')!.addEventListener('change', (e) => {
  const [cols, rows] = (e.target as HTMLSelectElement).value.split('x').map(Number)
  grid.resize(cols, rows)
  grid.clear()
  selectTool(grid.tool)
})

// keep the grid on window resize
const resizeObserver = new ResizeObserver(() => grid.fit())
resizeObserver.observe(document.querySelector('#canvas-wrap')!)

grid.fit()
selectTool('path')
grid.clear()
