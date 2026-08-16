import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type VolumeData = {
  data: Uint8Array;
  size: [number, number, number];
};

export type VolumeOverlay = "ANATOMY" | "HEATMAP" | "TUMOR";

type Props = {
  volume?: VolumeData;
  mask?: VolumeData;
  mode?: VolumeOverlay;
};

function percentile8(data: Uint8Array, p: number) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  const target = Math.floor(data.length * p);
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc > target) return i;
  }
  return 255;
}

function normalize(data: Uint8Array) {
  const lo = percentile8(data, 0.015);
  const hi = Math.max(lo + 1, percentile8(data, 0.995));
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const q = Math.max(0, Math.min(255, ((data[i] - lo) * 255) / (hi - lo)));
    out[i] = q < 3 ? 0 : Math.round(q);
  }
  return out;
}

function heat(q: number) {
  if (q < 0.18) return [18, 32, 110];
  if (q < 0.45) {
    const t = (q - 0.18) / 0.27;
    return [18, Math.round(55 + 190 * t), Math.round(220 + 25 * t)];
  }
  if (q < 0.72) {
    const t = (q - 0.45) / 0.27;
    return [Math.round(25 + 230 * t), Math.round(245 - 105 * t), Math.round(245 - 220 * t)];
  }
  const t = (q - 0.72) / 0.28;
  return [255, Math.round(140 - 105 * t), Math.round(25 - 20 * t)];
}

function makeSliceTexture(
  normalized: Uint8Array,
  mask: Uint8Array | undefined,
  size: [number, number, number],
  z: number,
  mode: VolumeOverlay,
) {
  const [nx, ny, nz] = size;
  const canvas = document.createElement("canvas");
  const S = Math.min(192, Math.max(96, nx));
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  const image = ctx.createImageData(S, S);
  const idx = (x: number, y: number) => normalized[x + nx * (y + ny * z)] / 255;
  const mid = nz > 1 ? z / (nz - 1) : 0.5;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const x = Math.min(nx - 1, Math.round((px / (S - 1)) * (nx - 1)));
      const y = Math.min(ny - 1, Math.round(((S - 1 - py) / (S - 1)) * (ny - 1)));
      const q = idx(x, y);
      const m = mask ? mask[x + nx * (y + ny * z)] / 255 : 0;
      const p = (py * S + px) * 4;
      let r = 125, g = 205, b = 225;
      let a = 0;

      // Transparent air/background; soft tissue gets a luminous volumetric density.
      if (q > 0.035) {
        if (mode === "HEATMAP" || mode === "TUMOR") {
          [r, g, b] = heat(q);
          a = Math.min(225, 20 + q * 190);
        } else {
          const tone = Math.round(80 + Math.pow(q, 0.48) * 170);
          r = Math.min(255, Math.round(tone * 0.54));
          g = Math.min(255, Math.round(tone * 0.86));
          b = Math.min(255, tone);
          a = Math.min(205, 10 + q * 180);
        }
      }

      // Mask is deliberately unmistakable rather than a nearly invisible overlay.
      if (mask && m > 0.16) {
        r = 255;
        g = Math.round(35 + 45 * (1 - m));
        b = 35;
        a = Math.max(a, 225);
      }

      // Slight anatomical depth modulation across the stack.
      a = Math.round(a * (0.86 + 0.14 * Math.sin(mid * Math.PI)));
      image.data[p] = r;
      image.data[p + 1] = g;
      image.data[p + 2] = b;
      image.data[p + 3] = a;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function makeOutline() {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.13 });
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.05, 1.05, 0.9));
  group.add(new THREE.LineSegments(geo, material));
  return group;
}

export function VolumeBrain({ volume, mask, mode = "ANATOMY" }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [slice, setSlice] = useState(64);
  const [sliceMode, setSliceMode] = useState(false);
  const normalized = useMemo(() => (volume ? normalize(volume.data) : null), [volume]);

  useEffect(() => {
    if (volume) setSlice(Math.floor((volume.size[2] - 1) / 2));
  }, [volume]);

  useEffect(() => {
    const el = host.current;
    if (!el || !volume || !normalized) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x010405, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
    const target = new THREE.Vector3(0, 0, 0);
    let yaw = 0.28;
    let pitch = -0.05;
    let zoom = 2.25;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let raf = 0;
    let alive = true;

    const updateCamera = () => {
      const cp = Math.cos(pitch);
      camera.position.set(Math.sin(yaw) * cp * zoom, Math.sin(pitch) * zoom, Math.cos(yaw) * cp * zoom);
      camera.lookAt(target);
    };
    updateCamera();

    const [nx, ny, nz] = volume.size;
    const step = nz > 96 ? 2 : 1;
    const planes: { mesh: THREE.Mesh; texture: THREE.CanvasTexture; z: number }[] = [];
    const planeGeo = new THREE.PlaneGeometry(0.94, 0.94);
    const maskMatches = mask && mask.size.join("x") === volume.size.join("x") ? mask.data : undefined;

    for (let z = 0; z < nz; z += step) {
      const texture = makeSliceTexture(normalized, maskMatches, volume.size, z, mode);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        opacity: 0.70,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(planeGeo, material);
      mesh.position.z = ((z / Math.max(1, nz - 1)) - 0.5) * 0.78;
      mesh.userData.sliceIndex = z;
      scene.add(mesh);
      planes.push({ mesh, texture, z });
    }

    // Give the stack a subtle spatial scaffold like a research workstation viewport.
    const outline = makeOutline();
    scene.add(outline);
    const grid = new THREE.GridHelper(1.6, 16, 0x1b5660, 0x0b282d);
    grid.position.y = -0.58;
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.22;
    scene.add(grid);

    const slicePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.97, 0.97),
      new THREE.MeshBasicMaterial({ color: 0x57e9ff, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false }),
    );
    scene.add(slicePlane);

    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.style.cursor = "grabbing"; };
    const up = () => { dragging = false; renderer.domElement.style.cursor = "grab"; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.006;
      pitch += (e.clientY - lastY) * 0.004;
      pitch = Math.max(-1.05, Math.min(1.05, pitch));
      updateCamera();
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom = Math.max(1.35, Math.min(3.5, zoom + e.deltaY * 0.002));
      updateCamera();
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerleave", up);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const animate = () => {
      if (!alive) return;
      if (!dragging) yaw += 0.0009;
      updateCamera();
      const maxSlice = nz - 1;
      for (const item of planes) {
        const distance = Math.abs(item.z - slice);
        const selected = distance < Math.max(1, step * 1.2);
        const mat = item.mesh.material as THREE.MeshBasicMaterial;
        if (sliceMode) {
          item.mesh.visible = selected;
          mat.opacity = selected ? 1 : 0;
        } else {
          item.mesh.visible = true;
          mat.opacity = selected ? 0.98 : 0.58;
        }
      }
      slicePlane.position.z = ((slice / Math.max(1, maxSlice)) - 0.5) * 0.78;
      slicePlane.visible = sliceMode;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerleave", up);
      renderer.domElement.removeEventListener("wheel", wheel);
      for (const item of planes) {
        item.texture.dispose();
        (item.mesh.material as THREE.Material).dispose();
      }
      planeGeo.dispose();
      (slicePlane.geometry as THREE.BufferGeometry).dispose();
      (slicePlane.material as THREE.Material).dispose();
      outline.traverse(o => {
        const m = o as THREE.LineSegments;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
      grid.geometry.dispose();
      gridMat.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [volume, normalized, mask, mode, slice, sliceMode]);

  const maxSlice = Math.max(1, (volume?.size[2] ?? 128) - 1);
  const slicePercent = Math.round((slice / maxSlice) * 100);

  return (
    <div ref={host} className="absolute inset-0 min-h-0 min-w-0 overflow-hidden">
      {volume && (
        <>
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-cyan-200/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
            <div className="font-mono text-[7px] tracking-[.22em] text-cyan-100/55">3D VOLUME / {mode}</div>
            <div className="mt-1 font-mono text-[6px] tracking-[.15em] text-white/25">{volume.size.join(" × ")} VOXELS · SLICE {slice + 1}/{maxSlice + 1}</div>
          </div>
          <div className="absolute bottom-3 left-1/2 z-20 w-[min(78%,560px)] -translate-x-1/2 rounded-xl border border-cyan-200/15 bg-[#020608]/88 px-4 py-3 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[6px] tracking-[.18em] text-white/35">
              <span>SLICE NAVIGATION · AXIAL</span>
              <span className="text-cyan-100/70">Z {slice + 1} / {maxSlice + 1} · {slicePercent}%</span>
            </div>
            <input
              aria-label="MRI slice position"
              type="range"
              min={0}
              max={maxSlice}
              value={slice}
              onChange={e => setSlice(Number(e.target.value))}
              className="w-full accent-cyan-300"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[6px] text-white/25">INFERIOR</span>
              <button
                onClick={() => setSliceMode(v => !v)}
                className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[6px] tracking-[.14em] text-white/55 transition hover:border-cyan-200/30 hover:text-cyan-100"
              >
                {sliceMode ? "FULL VOLUME" : "ISOLATE SLICE"}
              </button>
              <span className="font-mono text-[6px] text-white/25">SUPERIOR</span>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-white/10 bg-black/35 px-2.5 py-1.5 font-mono text-[6px] tracking-[.14em] text-white/30 backdrop-blur-sm">
            DRAG TO ROTATE · SCROLL TO ZOOM
          </div>
        </>
      )}
    </div>
  );
}
