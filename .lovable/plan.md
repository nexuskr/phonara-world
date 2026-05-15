# M1 Fix: passive touchstart/pointerdown listeners

## What
Add `{ passive: true }` to the audio-arm listeners in `src/components/slots/OlympusSlot.tsx` so iOS Safari stops warning about non-passive touch handlers and scrolling stays smooth.

## Change
At lines 183–185, merge `passive: true` into the existing options object (keep `once: true`):

```tsx
window.addEventListener("pointerdown", armAudio, { once: true, passive: true });
window.addEventListener("touchstart", armAudio, { once: true, passive: true });
window.addEventListener("click", armAudio, { once: true, passive: true });
```

The handler `armAudio` never calls `preventDefault()`, so passive is safe.

## Scope
- Single file: `src/components/slots/OlympusSlot.tsx`
- No behavior change, no other files affected.
- Cleanup `removeEventListener` calls remain unchanged.
