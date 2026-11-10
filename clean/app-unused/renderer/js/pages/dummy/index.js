export function getTemplate() {
  return `<div id="dummy-page"><h1>Dummy Page</h1></div>`;
}

export function init() {
  console.log("Dummy page initialized successfully!");
}

export function cleanup() {
  console.log("Dummy page cleaned up!");
}
