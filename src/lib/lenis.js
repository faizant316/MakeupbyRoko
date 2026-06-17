let instance = null;

export function setLenis(l) { instance = l; }
export function lenisStop()  { instance?.stop(); }
export function lenisStart() { instance?.start(); }
