/**
 * Phase D — Avatar v3 safeDispose
 * three.js 리소스(geometry/material/texture/object3D 트리)를 안전하게 해제.
 * Context Lost / 언마운트 시 메모리 누수 0.
 */
import type { Object3D, Material, Texture, BufferGeometry } from "three";

function disposeMaterial(mat: Material | Material[] | null | undefined) {
  if (!mat) return;
  if (Array.isArray(mat)) { mat.forEach(disposeMaterial); return; }
  try {
    // dispose all texture-bearing uniforms / maps
    for (const k of Object.keys(mat) as Array<keyof Material>) {
      const v = (mat as unknown as Record<string, unknown>)[k as string];
      if (v && (v as Texture).isTexture) {
        try { (v as Texture).dispose(); } catch { /* swallow */ }
      }
    }
    mat.dispose();
  } catch { /* swallow */ }
}

export function safeDispose(root: Object3D | null | undefined): void {
  if (!root) return;
  try {
    root.traverse((obj) => {
      const m = obj as unknown as { geometry?: BufferGeometry; material?: Material | Material[] };
      if (m.geometry) { try { m.geometry.dispose(); } catch { /* swallow */ } }
      if (m.material) disposeMaterial(m.material);
    });
    root.parent?.remove(root);
  } catch { /* swallow */ }
}
