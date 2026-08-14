import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VolumeData = { data: Uint8Array; size: [number, number, number] };

function makeDemoVolume(size = 112): VolumeData {
  const data = new Uint8Array(size * size * size);
  const c = (size - 1) / 2;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const X = (x - c) / c, Y = (y - c) / c, Z = (z - c) / c;
    const shell = X * X / .88 + Y * Y / .76 + Z * Z / .82;
    const folds = .055 * Math.sin(Y * 34 + Z * 5) + .035 * Math.sin(Y * 57 - Z * 7) + .022 * Math.sin((Y + Z) * 74);
    const hemi = Math.abs(X) > .045;
    const vent = (X / .18) ** 2 + ((Y + .02) / .27) ** 2 + ((Z + .02) / .25) ** 2 < 1;
    let v = shell < 1 + folds && hemi ? .12 + Math.max(0, 1 - shell) * .78 : 0;
    if (vent) v *= .16;
    const deep = Math.exp(-((X * X) / .25 + ((Y + .03) ** 2) / .25 + ((Z + .02) ** 2) / .3));
    v = Math.min(1, v + deep * .12);
    data[x + size * (y + size * z)] = Math.round(v * 255);
  }
  return { data, size: [size, size, size] };
}

function rgbaSlice(volume: VolumeData, z: number) {
  const [nx, ny, nz] = volume.size;
  const out = new Uint8Array(nx * ny * 4);
  const z0 = Math.max(0, Math.min(nz - 1, z));
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const q = volume.data[x + nx * (y + ny * z0)] / 255;
    // Soft-tissue transfer curve. It deliberately avoids a hard threshold,
    // which makes cortical boundaries look blocky when a volume is downsampled.
    const tissue = Math.max(0, Math.min(1, (q - .045) / .55));
    const smooth = tissue * tissue * (3 - 2 * tissue);
    const dense = Math.max(0, Math.min(1, (q - .42) / .48));
    const alpha = Math.round(255 * (0.018 + smooth * .055 + dense * .035));
    const lum = Math.round(62 + smooth * 158 + dense * 30);
    const i = (x + nx * y) * 4;
    out[i] = Math.min(255, Math.round(lum * .28));
    out[i + 1] = Math.min(255, Math.round(lum * .78));
    out[i + 2] = Math.min(255, Math.round(lum * .96));
    out[i + 3] = alpha;
  }
  return out;
}

export function VolumeBrain({ volume, mode }: { volume?: VolumeData; mode: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let raf = 0;
    let alive = true;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, .01, 20);
    camera.position.set(0, 0, 4.35);
    const group = new THREE.Group();
    group.rotation.set(-.06, .36, 0);
    scene.add(group);

    const data = volume ?? makeDemoVolume();
    const [nx, ny, nz] = data.size;
    const sliceCount = Math.min(120, Math.max(72, nz));
    const step = (nz - 1) / (sliceCount - 1);
    const scaleY = ny / Math.max(1, nx);
    const scaleZ = .96;
    const textures: THREE.DataTexture[] = [];
    const materials: THREE.MeshBasicMaterial[] = [];
    const geometries: THREE.PlaneGeometry[] = [];

    for (let i = 0; i < sliceCount; i++) {
      const pixels = rgbaSlice(data, Math.round(i * step));
      const tex = new THREE.DataTexture(pixels, nx, ny, THREE.RGBAFormat, THREE.UnsignedByteType);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.unpackAlignment = 1;
      tex.needsUpdate = true;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: mode === "TRACTS" ? .92 : .86, depthWrite: false, depthTest: true, side: THREE.DoubleSide, blending: THREE.NormalBlending });
      const geo = new THREE.PlaneGeometry(2.16, 2.16 * scaleY);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = (i / (sliceCount - 1) - .5) * 1.72 * scaleZ;
      group.add(mesh);
      textures.push(tex); materials.push(mat); geometries.push(geo);
    }

    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 2.2 * scaleY, 1.76)), new THREE.LineBasicMaterial({ color: 0x5fe5f5, transparent: true, opacity: .08 }));
    group.add(frame);

    let dragging = false, lastX = 0, lastY = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer!.domElement.style.cursor = "grabbing"; renderer!.domElement.setPointerCapture?.(e.pointerId); };
    const up = () => { dragging = false; if (renderer) renderer.domElement.style.cursor = "grab"; };
    const move = (e: PointerEvent) => { if (!dragging) return; group.rotation.y += (e.clientX - lastX) * .0055; group.rotation.x += (e.clientY - lastY) * .0035; lastX = e.clientX; lastY = e.clientY; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); camera.position.z = Math.max(2.7, Math.min(6, camera.position.z + e.deltaY * .0022)); };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("pointerleave", up);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const resize = () => { const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight); renderer!.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    const clock = new THREE.Clock();
    const animate = () => { if (!alive) return; const dt = clock.getDelta(); if (!dragging) group.rotation.y += dt * .025; const pulse = .82 + Math.sin(clock.elapsedTime * 1.1) * .035; materials.forEach(m => { m.opacity = pulse; }); renderer!.render(scene, camera); raf = requestAnimationFrame(animate); };
    animate();

    return () => { alive = false; cancelAnimationFrame(raf); observer.disconnect(); renderer!.domElement.removeEventListener("pointerdown", down); renderer!.domElement.removeEventListener("pointerup", up); renderer!.domElement.removeEventListener("pointercancel", up); renderer!.domElement.removeEventListener("pointerleave", up); renderer!.domElement.removeEventListener("pointermove", move); renderer!.domElement.removeEventListener("wheel", wheel); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); frame.geometry.dispose(); (frame.material as THREE.Material).dispose(); renderer!.dispose(); el.replaceChildren(); };
  }, [volume, mode]);

  return <div ref={host} className="absolute inset-0 h-full w-full" />;
}
