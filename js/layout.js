// Adjustable split view; independent of the problem and solver state.
'use strict';
(() => {
  const workspace = document.querySelector('.workspace');
  const panel = document.querySelector('#input-panel');
  const handle = document.querySelector('#panel-resizer');
  const desktop = window.matchMedia('(min-width: 851px)');
  let preferredWidth = null,
    drag = null;
  const bounds = () => ({
    min: 300,
    max: Math.max(300, Math.min(800, workspace.clientWidth - 408)),
  });
  function update() {
    if (!desktop.matches) {
      stopDrag();
      return;
    }
    const { min, max } = bounds();
    if (preferredWidth !== null)
      workspace.style.setProperty(
        '--sidebar-width',
        Math.max(min, Math.min(max, preferredWidth)) + 'px'
      );
    const width = Math.round(panel.getBoundingClientRect().width);
    handle.setAttribute('aria-valuemin', min);
    handle.setAttribute('aria-valuemax', max);
    handle.setAttribute('aria-valuenow', width);
    handle.setAttribute('aria-valuetext', width + ' pixel');
  }
  function setWidth(width) {
    const { min, max } = bounds();
    preferredWidth = Math.max(min, Math.min(max, width));
    update();
  }
  function reset() {
    preferredWidth = null;
    workspace.style.removeProperty('--sidebar-width');
    update();
  }
  function stopDrag() {
    const current = drag;
    drag = null;
    document.body.classList.remove('resizing-panels');
    if (current && handle.hasPointerCapture(current.id)) handle.releasePointerCapture(current.id);
  }
  handle.addEventListener('pointerdown', (e) => {
    if (!desktop.matches || e.button !== 0 || drag) return;
    e.preventDefault();
    handle.focus();
    drag = { id: e.pointerId, x: e.clientX, width: panel.getBoundingClientRect().width };
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing-panels');
  });
  handle.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) setWidth(drag.width + e.clientX - drag.x);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    handle.addEventListener(type, (e) => {
      if (drag && e.pointerId === drag.id) stopDrag();
    });
  window.addEventListener('blur', stopDrag);
  handle.addEventListener('dblclick', reset);
  handle.addEventListener('keydown', (e) => {
    if (!desktop.matches) return;
    const width = panel.getBoundingClientRect().width,
      step = e.shiftKey ? 40 : 10;
    if (e.key === 'ArrowLeft') setWidth(width - step);
    else if (e.key === 'ArrowRight') setWidth(width + step);
    else if (e.key === 'Home') setWidth(bounds().min);
    else if (e.key === 'End') setWidth(bounds().max);
    else if (e.key === 'Enter') reset();
    else return;
    e.preventDefault();
  });
  window.addEventListener('resize', update);
  update();
})();
