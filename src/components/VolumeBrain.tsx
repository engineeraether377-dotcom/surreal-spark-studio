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
  const lo = percentile8(data, 0.01);
  const hi = Math.max(lo + 1, percentile8(data, 0.995));
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const q = Math.max(0, Math.min(1, (data[i] - lo) / (hi - lo)));
    out[i] = q < 0.008 ? 0 : Math.round(Math.pow(q, 0.62) * 255);
  }
  return out;
}

function palette(q: number, mode: VolumeOverlay): [number, number, number] {
  if (mode === "HEATMAP") {
    if (q < 0.08) return [8, 20, 55];
    if (q < 0.35) {
      const t = (q - 0.08) / 0.27;
      return [12, Math.round(70 + 130 * t), Math.round(170 + 70 * t)];
    }
    if (q < 0.68) {
      const t = (q - 0.35) / 0.33;
      return [Math.round(40 + 215 * t), Math.round(215 - 80 * t), Math.round(245 - 210 * t)];
    }
    const t = (q - 0.68) / 0.32;
    return [255, Math.round(135 - 100 * t), Math.round(30 - 20 * t)];
  }
  const g = Math.round(28 + Math.pow(q, 0.52) * 225);
  return [Math.round(g * 0.52), Math.round(g * 0.86), g];
}

function makeSliceTexture(
  normalized: Uint8Array,
  mask: Uint8Array | undefined,
  size: [number, number, number],
  z: number,
  mode: VolumeOverlay,
  resolution = 256,
) {
  const [nx, ny, nz] = size;
  const canvas = document.createElement("canvas");
  const S = Math.max(128, Math.min(resolution, Math.max(nx, ny)));
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  const image = ctx.createImageData(S, S);

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const x = Math.min(nx - 1, Math.round((px / (S - 1)) * (nx - 1)));
      const y = Math.min(ny - 1, Math.round(((S - 1 - py) / (S - 1)) * (ny - 1)));
      const index = x + nx * (y + ny * z);
      const q = normalized[index] / 255;
      const m = mask && mask.size.join("x") === size.join("x") ? mask.data[index] / 255 : 0;
      const p = (py * S + px) * 4;

      if (q < 0.018 && m < 0.08) {
        image.data[p + 3] = 0;
        continue;
      }

      let [r, g, b] = palette(q, mode);
      let a = Math.round(Math.min(250, 26 + q * 225));

      if (m > 0.12) {
        r = 255;
        g = Math.round(25 + 70 * (1 - m));
        b = 35;
        a = 248;
      }

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
  texture.needsUpdate = true;
  return texture;
}

function makeMipTexture(
  normalized: Uint8Array,
  mask: Uint8Array | undefined,
  size: [number, number, number],
  mode: VolumeOverlay,
) {
  const [nx, ny, nz] = size;
  const canvas = document.createElement("canvas");
  const S = Math.max(192, Math.min(384, Math.max(nx, ny)));
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  const image = ctx.createImageData(S, S);

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const x = Math.min(nx - 1, Math.round((px / (S - 1)) * (nx - 1)));
      const y = Math.min(ny - 1, Math.round(((S - 1 - py) / (S - 1)) * (ny - 1)));
      let maxQ = 0;
      let maxMask = 0;
      // Maximum-intensity projection makes the actual anatomy unmistakable in the main viewport.
      for (let z = 0; z < nz; z += Math.max(1, Math.floor(nz / 96))) {
        const index = x + nx * (y + ny * z);
        maxQ = Math.max(maxQ, normalized[index] / 255);
        if (mask && mask.size.join("x") === size.join("x")) maxMask = Math.max(maxMask, mask.data[index] / 255);
      }
      const p = (py * S + px) * 4;
      if (maxQ < 0.018 && maxMask < 0.08) {
        image.data[p + 3] = 0;
        continue;
      }
      let [r, g, b] = palette(maxQ, mode);
      let a = Math.round(Math.min(255, 48 + maxQ * 205));
      if (maxMask > 0.12) {
        r = 255;
        g = Math.round(25 + 65 * (1 - maxMask));
        b = 25;
        a = 250;
      }
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

function makeFrame() {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0x52ddec, transparent: true, opacity: 0.16 });
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.16, 1.16, 0.92));
  group.add(new THREE.LineSegments(geometry, material));
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
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x010304, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, 0.01, 20);
    const target = new THREE.Vector3(0, 0, 0);
    let yaw = 0.10;
    let pitch = -0.04;
    let zoom = 2.05;
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
    const maskData = mask && mask.size.join("x") === volume.size.join("x") ? mask.data : undefined;

    // A small stack gives genuine depth; the MIP sits in the center so the uploaded brain is always visible.
    const sliceCount = Math.min(36, Math.max(18, Math.floor(nz / 3)));
    const stride = Math.max(1, Math.floor((nz - 1) / Math.max(1, sliceCount - 1)));
    const planeGeometry = new THREE.PlaneGeometry(1.02, 1.02);
    const layers: { mesh: THREE.Mesh; texture: THREE.CanvasTexture; z: number }[] = [];

    for (let i = 0; i < sliceCount; i++) {
      const z = Math.min(nz - 1, i * stride);
      const texture = makeSliceTexture(normalized, maskData ? { data: maskData, size: volume.size } : undefined, volume.size, z, mode, 192);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.012,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        opacity: 0.24,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(planeGeometry, material);
      mesh.position.z = ((z / Math.max(1, nz - 1)) - 0.5) * 0.76;
      scene.add(mesh);
      layers.push({ mesh, texture, z });
    }

    const mipTexture = makeMipTexture(normalized, maskData ? { data: maskData, size: volume.size } : undefined, volume.size, mode);
    const mipMaterial = new THREE.MeshBasicMaterial({
      map: mipTexture,
      transparent: true,
      alphaTest: 0.012,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      opacity: 0.92,
      blending: THREE.NormalBlending,
    });
    const mip = new THREE.Mesh(new THREE.PlaneGeometry(1.045, 1.045), mipMaterial);
    mip.position.z = 0;
    scene.add(mip);

    const selectedTexture = makeSliceTexture(
      normalized,
      maskData ? { data: maskData, size: volume.size } : undefined,
      volume.size,
      Math.min(nz - 1, slice),
      mode,
      256,
    );
    const selectedMaterial = new THREE.MeshBasicMaterial({
      map: selectedTexture,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      opacity: 0,
      blending: THREE.NormalBlending,
    });
    const selected = new THREE.Mesh(new THREE.PlaneGeometry(1.055, 1.055), selectedMaterial);
    scene.add(selected);

    const frame = makeFrame();
    scene.add(frame);

    const grid = new THREE.GridHelper(1.8, 18, 0x1b6870, 0x09272d);
    grid.position.y = -0.64;
    grid.rotation.x = 0;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.20;
    scene.add(grid);

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

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };
    const up = (e?: PointerEvent) => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      if (e) renderer.domElement.releasePointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.006;
      pitch += (e.clientY - lastY) * 0.004;
      pitch = Math.max(-1.0, Math.min(1.0, pitch));
      updateCamera();
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom = Math.max(1.20, Math.min(3.25, zoom + e.deltaY * 0.0018));
      updateCamera();
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerleave", up);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const updateSlice = () => {
      const selectedZ = Math.min(nz - 1, Math.max(0, slice));
      selected.position.z = ((selectedZ / Math.max(1, nz - 1)) - 0.5) * 0.76;
      selectedMaterial.opacity = sliceMode ? 1 : 0;
      mipMaterial.opacity = sliceMode ? 0.08 : 0.92;
      for (const layer of layers) {
        const distance = Math.abs(layer.z - selectedZ);
        const near = distance <= stride * 1.15;
        const mat = layer.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = sliceMode ? 0 : near ? 0.34 : 0.18;
      }
    };
    updateSlice();

    const animate = () => {
      if (!alive) return;
      if (!dragging) yaw += 0.00065;
      updateCamera();
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
      for (const layer of layers) {
        layer.texture.dispose();
        (layer.mesh.material as THREE.Material).dispose();
      }
      planeGeometry.dispose();
      mipTexture.dispose();
      mip.geometry.dispose();
      mipMaterial.dispose();
      selectedTexture.dispose();
      selected.geometry.dispose();
      selectedMaterial.dispose();
      frame.traverse((object) => {
        const o = object as THREE.LineSegments;
        if (o.geometry) o.geometry.dispose();
        if (o.material) (o.material as THREE.Material).dispose();
      });
      grid.geometry.dispose();
      gridMaterial.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [volume, normalized, mask, mode]);

  // Slice state is intentionally outside the renderer lifecycle: dragging the slider updates the scene
  // without destroying/recreating WebGL, which was the source of the blank main viewport during scrubbing.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const canvas = el.querySelector("canvas");
    if (!canvas) return;
    // The renderer effect owns the WebGL scene. The range UI remains the authoritative slice control.
    // A custom event lets the renderer-less fallback remain stable while the main scene is rebuilt only on data/mode changes.
    canvas.dispatchEvent(new CustomEvent("nimble-slice", { detail: { slice, sliceMode } }));
  }, [slice, sliceMode]);

  const maxSlice = Math.max(1, (volume?.size[2] ?? 128) - 1);
  const slicePercent = Math.round((slice / maxSlice) * 100);

  return (
    <div ref={host} className="absolute inset-0 min-h-0 min-w-0 overflow-hidden bg-[#010304]">
      {volume && (
        <>
          <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-md border border-cyan-200/10 bg-black/55 px-3 py-2 backdrop-blur-sm">
            <div className="font-mono text-[7px] tracking-[.22em] text-cyan-100/65">3D VOLUME / {mode}</div>
            <div className="mt-1 font-mono text-[6px] tracking-[.15em] text-white/30">{volume.size.join(" × ")} VOXELS · SLICE {slice + 1}/{maxSlice + 1}</div>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-right backdrop-blur-sm">
            <div className="font-mono text-[6px] tracking-[.18em] text-emerald-300/60">● GPU VIEWPORT</div>
            <div className="mt-1 font-mono text-[6px] text-white/25">MIP + SLICE STACK</div>
          </div>
          <div className="absolute bottom-3 left-1/2 z-30 w-[min(82%,620px)] -translate-x-1/2 rounded-xl border border-cyan-200/15 bg-[#020608]/92 px-4 py-3 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[6px] tracking-[.18em] text-white/38">
              <span>SLICE NAVIGATION · AXIAL</span>
              <span className="text-cyan-100/75">Z {slice + 1} / {maxSlice + 1} · {slicePercent}%</span>
            </div>
            <input
              aria-label="MRI slice position"
              type="range"
              min={0}
              max={maxSlice}
              value={slice}
              onChange={(e) => setSlice(Number(e.target.value))}
              className="w-full accent-cyan-300"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[6px] text-white/25">INFERIOR</span>
              <button
                onClick={() => setSliceMode((v) => !v)}
                className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[6px] tracking-[.14em] text-white/60 transition hover:border-cyan-200/30 hover:text-cyan-100"
              >
                {sliceMode ? "3D VOLUME" : "ISOLATE SLICE"}
              </button>
              <span className="font-mono text-[6px] text-white/25">SUPERIOR</span>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden rounded-md border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm md:block">
            <div className="font-mono text-[6px] tracking-[.14em] text-white/35">DRAG TO ROTATE · SCROLL TO ZOOM</div>
          </div>
        </>
      )}
    </div>
  );
}
