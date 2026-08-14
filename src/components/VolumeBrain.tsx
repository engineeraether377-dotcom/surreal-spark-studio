import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VolumeData = { data: Uint8Array; size: [number, number, number] };

function makeDemoVolume(size = 96): VolumeData {
  const data = new Uint8Array(size * size * size);
  const c = (size - 1) / 2;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const X = (x - c) / c, Y = (y - c) / c, Z = (z - c) / c;
    const outer = X * X / 0.86 + Y * Y / 0.72 + Z * Z / 0.82;
    const fold = 0.09 * Math.sin(Y * 31 + Z * 4) + 0.065 * Math.sin(Y * 47 - Z * 6) + 0.04 * Math.sin((Y + Z) * 63);
    const hemi = Math.abs(X) > 0.055;
    const vent = (X / 0.17) ** 2 + ((Y + 0.02) / 0.28) ** 2 + ((Z + 0.04) / 0.25) ** 2 < 1;
    let v = outer < 1 + fold && hemi ? 0.25 + Math.max(0, 1 - outer) * 0.75 : 0;
    if (vent) v *= 0.08;
    const deep = Math.exp(-((X * X) / .18 + ((Y + .05) ** 2) / .2 + ((Z + .03) ** 2) / .25));
    v = Math.min(1, v + deep * .15);
    data[x + size * (y + size * z)] = Math.round(v * 255);
  }
  return { data, size: [size, size, size] };
}

function rgbaSlice(volume: VolumeData, z: number, threshold: number, boost: number) {
  const [nx, ny, nz] = volume.size;
  const out = new Uint8Array(nx * ny * 4);
  const z0 = Math.max(0, Math.min(nz - 1, z));
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const q = volume.data[x + nx * (y + ny * z0)] / 255;
      // Medical-display style transfer function: background transparent,
      // soft tissue luminous, dense structures slightly brighter.
      const soft = Math.max(0, Math.min(1, (q - threshold) / Math.max(0.001, 0.34 - threshold)));
      const dense = Math.max(0, Math.min(1, (q - 0.42) / 0.48));
      const alpha = Math.round(Math.min(210, (soft * (46 + dense * 72) * boost)));
      const i = (x + nx * y) * 4;
      const lum = Math.round(90 + 135 * soft + 30 * dense);
      out[i] = Math.min(255, Math.round(lum * 0.42));
      out[i + 1] = Math.min(255, Math.round(lum * 0.88));
      out[i + 2] = Math.min(255, Math.round(lum * 1.0));
      out[i + 3] = alpha;
    }
  }
  return out;
}

export function VolumeBrain({
  volume,
  mode,
  onReady,
}: {
  volume?: VolumeData;
  mode: string;
  onReady?: (ok: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let scene: THREE.Scene | undefined;
    let camera: THREE.PerspectiveCamera | undefined;
    let group: THREE.Group | undefined;
    let raf = 0;
    let alive = true;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    } catch {
      onReady?.(false);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
    camera.position.set(0, 0, 4.1);

    const data = volume ?? makeDemoVolume();
    const [nx, ny, nz] = data.size;
    const sliceCount = Math.min(88, Math.max(48, nz));
    const step = (nz - 1) / (sliceCount - 1);
    const threshold = mode === "TRACTS" ? 0.075 : mode === "EEG" ? 0.14 : 0.09;
    const boost = mode === "TRACTS" ? 1.45 : 1.0;

    group = new THREE.Group();
    group.scale.set(1.18, 1.02, 1.12);
    group.rotation.set(-0.12, 0.38, 0);
    scene.add(group);

    const materials: THREE.MeshBasicMaterial[] = [];
    const geometries: THREE.PlaneGeometry[] = [];
    const textures: THREE.DataTexture[] = [];

    for (let i = 0; i < sliceCount; i++) {
      const zi = Math.round(i * step);
      const pixels = rgbaSlice(data, zi, threshold, boost);
      const tex = new THREE.DataTexture(pixels, nx, ny, THREE.RGBAFormat, THREE.UnsignedByteType);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.unpackAlignment = 1;
      tex.needsUpdate = true;
      textures.push(tex);

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });
      materials.push(mat);

      const geo = new THREE.PlaneGeometry(2.0, 1.82);
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = (i / (sliceCount - 1) - 0.5) * 1.82;
      group.add(mesh);
    }

    // Thin orientation frame makes the volume read as a scientific instrument
    // rather than a flat image.
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.04, 1.86, 1.86)),
      new THREE.LineBasicMaterial({ color: 0x58dff4, transparent: true, opacity: 0.12 })
    );
    group.add(frame);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer!.domElement.style.cursor = "grabbing"; renderer!.domElement.setPointerCapture?.(e.pointerId); };
    const up = () => { dragging = false; if (renderer) renderer.domElement.style.cursor = "grab"; };
    const move = (e: PointerEvent) => {
      if (!dragging || !group) return;
      group.rotation.y += (e.clientX - lastX) * 0.006;
      group.rotation.x += (e.clientY - lastY) * 0.004;
      lastX = e.clientX; lastY = e.clientY;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!camera) return;
      camera.position.z = Math.max(2.5, Math.min(6.2, camera.position.z + e.deltaY * 0.0025));
    };

    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("pointerleave", up);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const resize = () => {
      if (!renderer || !camera) return;
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      if (!alive || !renderer || !scene || !camera || !group) return;
      const dt = clock.getDelta();
      if (!dragging) group.rotation.y += dt * 0.035;
      const pulse = 0.68 + Math.sin(clock.elapsedTime * 1.4) * 0.035;
      for (let i = 0; i < materials.length; i++) materials[i].opacity = pulse + (i / materials.length) * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();
    onReady?.(true);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer?.domElement.removeEventListener("pointerdown", down);
      renderer?.domElement.removeEventListener("pointerup", up);
      renderer?.domElement.removeEventListener("pointercancel", up);
      renderer?.domElement.removeEventListener("pointerleave", up);
      renderer?.domElement.removeEventListener("pointermove", move);
      renderer?.domElement.removeEventListener("wheel", wheel);
      textures.forEach(t => t.dispose());
      materials.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      frame.geometry.dispose();
      (frame.material as THREE.Material).dispose();
      renderer?.dispose();
      el.replaceChildren();
    };
  }, [volume, mode, onReady]);

  return <div ref={host} className="absolute inset-0 h-full w-full" />;
}
