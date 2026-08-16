import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VolumeData = {
  data: Uint8Array;
  size: [number, number, number];
};

export type VolumeOverlay = "ANATOMY" | "HEATMAP" | "TUMOR";

function makeDemoVolume(size = 128): VolumeData {
  const data = new Uint8Array(size * size * size);
  const c = (size - 1) / 2;

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const X = (x - c) / c;
        const Y = (y - c) / c;
        const Z = (z - c) / c;
        const shell = X * X / 0.88 + Y * Y / 0.76 + Z * Z / 0.82;
        const folds =
          0.055 * Math.sin(Y * 34 + Z * 5) +
          0.035 * Math.sin(Y * 57 - Z * 7) +
          0.022 * Math.sin((Y + Z) * 74);
        const hemi = Math.abs(X) > 0.045;
        let v = shell < 1 + folds && hemi ? 0.08 + Math.max(0, 1 - shell) * 0.84 : 0;
        const vent =
          (X / 0.18) ** 2 + ((Y + 0.02) / 0.27) ** 2 + ((Z + 0.02) / 0.25) ** 2 < 1;
        if (vent) v *= 0.12;
        const deep = Math.exp(
          -(X * X / 0.25 + (Y + 0.03) ** 2 / 0.25 + (Z + 0.02) ** 2 / 0.3),
        );
        v = Math.min(1, v + deep * 0.13);
        data[x + size * (y + size * z)] = Math.round(v * 255);
      }
    }
  }

  return { data, size: [size, size, size] };
}

function makeTexture(data: Uint8Array, size: [number, number, number]) {
  const texture = new THREE.Data3DTexture(data, size[0], size[1], size[2]);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.unpackAlignment = 1;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const VERTEX = `#version 300 es
in vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out vec3 vPosition;
void main() {
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uVolume;
uniform sampler3D uMask;
uniform float uHasMask;
uniform int uMode;
uniform float uThreshold;
uniform float uDensity;
uniform vec3 uCamera;
in vec3 vPosition;
out vec4 outColor;

vec2 intersectBox(vec3 ro, vec3 rd) {
  vec3 boxMin = vec3(-0.5);
  vec3 boxMax = vec3(0.5);
  vec3 inv = 1.0 / rd;
  vec3 t0 = (boxMin - ro) * inv;
  vec3 t1 = (boxMax - ro) * inv;
  vec3 lo = min(t0, t1);
  vec3 hi = max(t0, t1);
  return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

vec3 heat(float q) {
  q = clamp(q, 0.0, 1.0);
  vec3 c0 = vec3(0.02, 0.08, 0.35);
  vec3 c1 = vec3(0.00, 0.82, 1.00);
  vec3 c2 = vec3(0.98, 0.91, 0.05);
  vec3 c3 = vec3(1.00, 0.04, 0.02);
  if (q < 0.33) return mix(c0, c1, q / 0.33);
  if (q < 0.70) return mix(c1, c2, (q - 0.33) / 0.37);
  return mix(c2, c3, (q - 0.70) / 0.30);
}

void main() {
  vec3 ro = uCamera;
  vec3 rd = normalize(vPosition - ro);
  vec2 hit = intersectBox(ro, rd);
  if (hit.x > hit.y) discard;
  float t = max(hit.x, 0.0);
  float endT = hit.y;
  float stepSize = 0.0065;
  vec4 accumulated = vec4(0.0);

  for (int i = 0; i < 230; i++) {
    if (t > endT || accumulated.a > 0.985) break;
    vec3 p = ro + rd * t;
    vec3 uv = p + vec3(0.5);
    float q = texture(uVolume, uv).r;
    float mask = texture(uMask, uv).r;
    float tissue = smoothstep(0.035, 0.12, q);
    float edge = smoothstep(0.10, 0.30, q);
    float interior = 1.0 - smoothstep(0.62, 0.94, q);
    vec3 color = vec3(0.18, 0.72, 0.92);
    float alpha = tissue * (0.035 + edge * 0.055) * uDensity;

    if (uMode == 1) {
      color = heat(q);
      alpha = tissue * (0.045 + q * 0.07) * uDensity;
    }

    if (uMode == 2) {
      float candidate = smoothstep(uThreshold, uThreshold + 0.08, q) * smoothstep(0.02, 0.10, q);
      color = mix(vec3(0.10, 0.64, 0.90), heat(candidate), candidate);
      alpha = tissue * 0.032 * uDensity + candidate * 0.20 * uDensity;
    }

    alpha *= mix(0.58, 1.0, interior);

    if (uHasMask > 0.5 && mask > 0.18) {
      color = mix(color, vec3(1.0, 0.08, 0.06), 0.94);
      alpha = max(alpha, 0.26 * uDensity);
    }

    accumulated.rgb += (1.0 - accumulated.a) * alpha * color;
    accumulated.a += (1.0 - accumulated.a) * alpha;
    t += stepSize;
  }

  if (accumulated.a < 0.008) discard;
  outColor = vec4(accumulated.rgb, accumulated.a);
}`;

export function VolumeBrain({
  volume,
  mask,
  mode = "ANATOMY",
}: {
  volume?: VolumeData;
  mask?: VolumeData;
  mode?: VolumeOverlay;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const data = volume ?? makeDemoVolume();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }

    if (!renderer.capabilities.isWebGL2) {
      renderer.dispose();
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "display:block;width:100%;height:100%;object-fit:contain;background:#000";
      el.replaceChildren(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const [nx, ny, nz] = data.size;
      const draw = () => {
        const w = Math.max(1, el.clientWidth);
        const h = Math.max(1, el.clientHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const image = ctx.createImageData(Math.floor(w), Math.floor(h));
        const z = Math.floor(nz * 0.52);
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const x = Math.round((px / Math.max(1, w - 1)) * (nx - 1));
            const y = Math.round((1 - py / Math.max(1, h - 1)) * (ny - 1));
            const q = data.data[x + nx * (y + ny * z)] / 255;
            const tissue = Math.max(0, Math.min(1, (q - 0.025) / 0.18));
            const p = (py * Math.floor(w) + px) * 4;
            const g = Math.round(Math.pow(q, 0.58) * 255);
            image.data[p] = g;
            image.data[p + 1] = g;
            image.data[p + 2] = g;
            image.data[p + 3] = tissue > 0.01 ? 255 : 0;
          }
        }
        ctx.clearRect(0, 0, w, h);
        ctx.putImageData(image, 0, 0);
      };
      const observer = new ResizeObserver(draw);
      observer.observe(el);
      draw();
      return () => { observer.disconnect(); el.replaceChildren(); };
    }

    let raf = 0;
    let alive = true;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 20);
    const distance = { value: 2.35 };
    let yaw = 0.34;
    let pitch = -0.08;

    const updateCamera = () => {
      const cp = Math.cos(pitch);
      camera.position.set(
        Math.sin(yaw) * cp * distance.value,
        Math.sin(pitch) * distance.value,
        Math.cos(yaw) * cp * distance.value,
      );
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
    };
    updateCamera();

    const volumeTexture = makeTexture(data.data, data.size);
    const emptyMask: VolumeData = { data: new Uint8Array(data.size[0] * data.size[1] * data.size[2]), size: data.size };
    const maskTexture = makeTexture(mask?.data ?? emptyMask.data, mask?.size ?? emptyMask.size);

    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uVolume: { value: volumeTexture },
        uMask: { value: maskTexture },
        uHasMask: { value: mask ? 1 : 0 },
        uMode: { value: mode === "HEATMAP" ? 1 : mode === "TUMOR" ? 2 : 0 },
        uThreshold: { value: 0.72 },
        uDensity: { value: 1.15 },
        uCamera: { value: camera.position.clone() },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    scene.add(cube);

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.015, 1.015, 1.015)),
      new THREE.LineBasicMaterial({ color: 0x6be7f7, transparent: true, opacity: 0.16 }),
    );
    scene.add(frame);

    const grid = new THREE.GridHelper(1.7, 16, 0x16414a, 0x092027);
    grid.position.y = -0.61;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    scene.add(grid);

    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const down = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const up = () => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      yaw += (event.clientX - lastX) * 0.007;
      pitch += (event.clientY - lastY) * 0.005;
      pitch = Math.max(-1.15, Math.min(1.15, pitch));
      updateCamera();
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      distance.value = Math.max(1.45, Math.min(4.2, distance.value + event.deltaY * 0.0025));
      updateCamera();
    };

    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerleave", up);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const clock = new THREE.Clock();
    const animate = () => {
      if (!alive) return;
      const dt = clock.getDelta();
      if (!dragging) {
        yaw += dt * 0.045;
        updateCamera();
      }
      material.uniforms.uCamera.value.copy(camera.position);
      material.uniforms.uDensity.value = 1.10 + Math.sin(clock.elapsedTime * 1.25) * 0.035;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerleave", up);
      renderer.domElement.removeEventListener("wheel", wheel);
      volumeTexture.dispose();
      maskTexture.dispose();
      material.dispose();
      cube.geometry.dispose();
      frame.geometry.dispose();
      (frame.material as THREE.Material).dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [volume, mask, mode]);

  return <div ref={host} className="absolute inset-0 h-full w-full overflow-hidden" aria-label="Interactive 3D MRI volume" />;
}
