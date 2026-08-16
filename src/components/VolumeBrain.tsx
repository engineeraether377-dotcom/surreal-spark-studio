import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VolumeData = {
  data: Uint8Array;
  size: [number, number, number];
};

export type VolumeOverlay = "ANATOMY" | "HEATMAP" | "TUMOR";

function percentile8(data: Uint8Array, p: number) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  const target = Math.max(0, Math.min(data.length - 1, Math.floor(data.length * p)));
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc > target) return i;
  }
  return 255;
}

function normalizeForRendering(data: Uint8Array) {
  const low = percentile8(data, 0.02);
  const high = Math.max(low + 1, percentile8(data, 0.995));
  const out = new Uint8Array(data.length);
  const scale = 255 / (high - low);
  for (let i = 0; i < data.length; i++) {
    const q = Math.max(0, Math.min(255, (data[i] - low) * scale));
    out[i] = q < 3 ? 0 : Math.round(q);
  }
  return out;
}

function makeTexture(volume: VolumeData) {
  const normalized = normalizeForRendering(volume.data);
  const [nx, ny, nz] = volume.size;
  const texture = new THREE.Data3DTexture(normalized, nx, ny, nz);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

function makeEmptyMask(size: [number, number, number]) {
  return new Uint8Array(size[0] * size[1] * size[2]);
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
uniform float uOpacity;
uniform vec3 uCamera;

in vec3 vPosition;
out vec4 outColor;

vec2 rayBox(vec3 ro, vec3 rd) {
  vec3 mn = vec3(-0.5);
  vec3 mx = vec3(0.5);
  vec3 inv = 1.0 / rd;
  vec3 a = (mn - ro) * inv;
  vec3 b = (mx - ro) * inv;
  vec3 lo = min(a, b);
  vec3 hi = max(a, b);
  return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

vec3 heat(float q) {
  q = clamp(q, 0.0, 1.0);
  vec3 c0 = vec3(0.02, 0.03, 0.20);
  vec3 c1 = vec3(0.00, 0.78, 1.00);
  vec3 c2 = vec3(0.95, 0.88, 0.08);
  vec3 c3 = vec3(1.00, 0.05, 0.015);
  if (q < 0.34) return mix(c0, c1, q / 0.34);
  if (q < 0.72) return mix(c1, c2, (q - 0.34) / 0.38);
  return mix(c2, c3, (q - 0.72) / 0.28);
}

void main() {
  vec3 ro = uCamera;
  vec3 rd = normalize(vPosition - ro);
  vec2 hit = rayBox(ro, rd);
  if (hit.x > hit.y) discard;

  float t = max(hit.x, 0.0);
  float endT = hit.y;
  float stepSize = 0.0048;
  vec4 accum = vec4(0.0);

  for (int i = 0; i < 300; i++) {
    if (t > endT || accum.a > 0.985) break;

    vec3 p = ro + rd * t;
    vec3 uv = p + vec3(0.5);
    float q = texture(uVolume, uv).r;
    float mask = texture(uMask, uv).r;

    float tissue = smoothstep(0.025, 0.085, q);
    float shell = smoothstep(0.08, 0.32, q);
    float core = 1.0 - smoothstep(0.58, 0.92, q);
    float edge = smoothstep(0.10, 0.22, q) * (1.0 - smoothstep(0.55, 0.88, q));

    vec3 color = vec3(0.25, 0.88, 1.0);
    float alpha = tissue * (0.025 + shell * 0.055 + edge * 0.035) * uOpacity;

    if (uMode == 1) {
      color = heat(q);
      alpha = tissue * (0.035 + q * 0.075) * uOpacity;
    }

    if (uMode == 2) {
      float candidate = smoothstep(uThreshold, uThreshold + 0.10, q);
      color = mix(vec3(0.10, 0.68, 1.0), heat(candidate), candidate);
      alpha = tissue * 0.025 * uOpacity + candidate * 0.18 * uOpacity;
    }

    alpha *= mix(0.70, 1.0, core);

    if (uHasMask > 0.5 && mask > 0.18) {
      color = mix(color, vec3(1.0, 0.04, 0.025), 0.94);
      alpha = max(alpha, 0.32 * uOpacity);
    }

    accum.rgb += (1.0 - accum.a) * color * alpha;
    accum.a += (1.0 - accum.a) * alpha;
    t += stepSize;
  }

  if (accum.a < 0.006) discard;
  outColor = vec4(accum.rgb, accum.a);
}`;

function drawFallback(el: HTMLDivElement, volume: VolumeData) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%;background:radial-gradient(circle,#07141a,#020405)";
  el.replaceChildren(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => undefined;
  const [nx, ny, nz] = volume.size;
  const draw = () => {
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.min(w, h);
    const ox = (w - size) / 2;
    const oy = (h - size) / 2;
    const image = ctx.createImageData(Math.floor(size), Math.floor(size));
    const z = Math.floor(nz * 0.5);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = Math.round((px / Math.max(1, size - 1)) * (nx - 1));
        const y = Math.round((1 - py / Math.max(1, size - 1)) * (ny - 1));
        const q = volume.data[x + nx * (y + ny * z)] / 255;
        const tissue = Math.max(0, Math.min(1, (q - 0.02) / 0.18));
        const p = (py * Math.floor(size) + px) * 4;
        const g = Math.round(Math.pow(q, 0.48) * 245);
        image.data[p] = Math.round(g * 0.55);
        image.data[p + 1] = g;
        image.data[p + 2] = Math.min(255, g + 20);
        image.data[p + 3] = tissue > 0.01 ? 245 : 0;
      }
    }
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(image, ox, oy);
  };
  const observer = new ResizeObserver(draw);
  observer.observe(el);
  draw();
  return () => observer.disconnect();
}

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

    const data = volume;
    if (!data || data.data.length === 0) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return drawFallback(el, data);
    }

    if (!renderer.capabilities.isWebGL2) {
      renderer.dispose();
      return drawFallback(el, data);
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x020405, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
    const distance = { value: 2.15 };
    let yaw = 0.35;
    let pitch = -0.10;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let raf = 0;
    let alive = true;

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

    const volumeTexture = makeTexture(data);
    const maskData = mask && mask.size.join("x") === data.size.join("x") ? mask : { data: makeEmptyMask(data.size), size: data.size };
    const maskTexture = makeTexture(maskData);

    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uVolume: { value: volumeTexture },
        uMask: { value: maskTexture },
        uHasMask: { value: mask ? 1 : 0 },
        uMode: { value: mode === "HEATMAP" ? 1 : mode === "TUMOR" ? 2 : 0 },
        uThreshold: { value: 0.62 },
        uOpacity: { value: 1.0 },
        uCamera: { value: camera.position.clone() },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    });

    const brain = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.92), material);
    scene.add(brain);

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.94, 0.94, 0.94)),
      new THREE.LineBasicMaterial({ color: 0x6be7f7, transparent: true, opacity: 0.13 }),
    );
    scene.add(frame);

    const grid = new THREE.GridHelper(1.65, 18, 0x17444d, 0x0a2228);
    grid.position.y = -0.57;
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
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
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
      yaw += (event.clientX - lastX) * 0.006;
      pitch += (event.clientY - lastY) * 0.0045;
      pitch = Math.max(-1.12, Math.min(1.12, pitch));
      updateCamera();
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      distance.value = Math.max(1.35, Math.min(3.6, distance.value + event.deltaY * 0.0022));
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
        yaw += dt * 0.035;
        updateCamera();
      }
      material.uniforms.uCamera.value.copy(camera.position);
      material.uniforms.uOpacity.value = 0.98 + Math.sin(clock.elapsedTime * 1.2) * 0.025;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerleave", up);
      renderer.domElement.removeEventListener("wheel", wheel);
      volumeTexture.dispose();
      maskTexture.dispose();
      material.dispose();
      brain.geometry.dispose();
      frame.geometry.dispose();
      (frame.material as THREE.Material).dispose();
      grid.geometry.dispose();
      gridMaterial.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [volume, mask, mode]);

  return <div ref={host} className="absolute inset-0 min-h-0 min-w-0 overflow-hidden" aria-label="Interactive 3D neuroimaging volume" />;
}
