'use strict';
(function (root) {
  // A pointer gesture owns its movement until release. Its compatibility click
  // must never perform the same step a second time (including delayed iOS clicks).
  function bindDirection(button, { step, enabled, canRepeat = () => true, delay = 380, repeat = 110, timers = root }) {
    let pointer = null, pending, ticking, handledPointer = false;
    function stop() {
      timers.clearTimeout(pending); timers.clearInterval(ticking); pointer = null;
    }
    button.addEventListener('pointerdown', event => {
      if (!enabled() || (event.button != null && event.button !== 0)) return;
      event.preventDefault(); stop();
      pointer = event.pointerId; handledPointer = true;
      button.setPointerCapture?.(pointer);
      step();
      pending = timers.setTimeout(() => {
        if (!enabled() || !canRepeat()) { stop(); return; }
        step();
        ticking = timers.setInterval(() => {
          if (!enabled() || !canRepeat()) { stop(); return; }
          step();
        }, repeat);
      }, delay);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => { if (event.pointerId === pointer) stop(); });
    }
    button.addEventListener('click', event => {
      if (enabled() && handledPointer && (event.detail > 0 || event.pointerType)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, true);
    return stop;
  }
  const api = { bindDirection };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BunnyInput = api;
})(typeof window !== 'undefined' ? window : globalThis);
