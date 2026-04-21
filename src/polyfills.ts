import { Buffer } from 'buffer';

// Must run before any other module — sets Buffer globally
// so CJS deps inside @mezo-org/passport can find it
(window as any).Buffer = Buffer;
(globalThis as any).Buffer = Buffer;
(window as any).global = window;
