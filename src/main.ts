const app = document.querySelector<HTMLDivElement>('#app')!

let clicks: number = 0

app.innerHTML = `
  <h1>Pathfinding Lab</h1>
  <p>TypeScript is running on GitHub Pages.</p>
  <button id="btn">Clicked 0 times</button>
`

const btn = document.querySelector<HTMLButtonElement>('#btn')!
btn.addEventListener('click', () => {
  clicks++
  btn.textContent = `Clicked ${clicks} times`
})