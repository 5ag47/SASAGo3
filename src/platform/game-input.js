// Browser selection is disabled for the game surface. Future game drag interactions opt in.
export function installGameInputPolicy() {
  const editable = (element) =>
    element instanceof Element &&
    Boolean(element.closest('input:not([type="range"]), textarea, [contenteditable="true"]'));
  const drag = (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-game-drag="true"]'))
      event.preventDefault();
  };
  const select = (event) => {
    if (!editable(event.target)) event.preventDefault();
  };
  document.addEventListener('dragstart', drag);
  document.addEventListener('selectstart', select);
  return () => {
    document.removeEventListener('dragstart', drag);
    document.removeEventListener('selectstart', select);
  };
}
