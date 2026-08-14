import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VolumeData = { data: Uint8Array; size: [number, number, number] };

function makeDemoVolume(size = 96): VolumeData {
  const data = new Uint8Array(size * size * size);
  const c = (size - 1) / 2;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const X = (x - c) / c, Y = (y - c) / c, Z = (z - c) / c;
    const outer = X * X / 0.86 + Y * Y / 0.72 + Z * Z / 0.82;
    const fold = 0.10 * Math.sin(Y * 31 + Z * 4) + 0.07 * Math.sin(Y * 47 - Z * 6) + 0.05 * Math.sin((Y + Z) * 71);
    const hemi = Math.abs(X) > 0.055;
    const vent = (X / 0.17) ** 2 + ((Y + 0.02) / 0.28) ** 2 + ((Z + 0.04) / 0.25) ** 2 < 1;
    let v = outer < 1 + fold && hemi ? 0.28 + Math.max(0, 1 - outer) * 0.72 : 0;
    if (vent) v *= 0.08;
    const deep = Math.exp(-((X * X) / .18 + ((Y + .05) ** 2) / .2 + ((Z + .03) ** 2) / .25));
    v = Math.min(1, v + deep * .16);
    data[x + size * (y + size * z)] = Math.round(v * 255);
  }
  return { data, size: [size, size, size] };
}

// The previous implementation calculated the ray in texture coordinates while
// the volume cube itself was rotated in world space. That made the ray-box test
// miss the actual cube and produced a blank MRI viewport. These shaders perform
// the ray march in the cube's LOCAL coordinate system, so rotation is safe.
const VERT = `#version 300 es
in vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
out vec3 vLocalPosition;
out vec3 vWorldPosition;
void main() {
  vLocalPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec3 vLocalPosition;
in vec3 vWorldPosition;
out vec4 outColor;
uniform sampler3D uVolume;
uniform float uThreshold;
uniform float uOpacity;
uniform float uTime;

vec2 rayBox(vec3 ro, vec3 rd) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (-vec3(1.0) - ro) * inv;
  vec3 t1 = ( vec3(1.0) - ro) * inv;
  vec3 lo = min(t0, t1);
  vec3 hi = max(t0, t1);
  return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

void main() {
  vec3 ro = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vec3 target = vLocalPosition;
  vec3 rd = normalize(target - ro);
  vec2 hit = rayBox(ro, rd);
  float t = max(hit.x, 0.0);
  float endT = hit.y;
  if (endT <= t) discard;

  vec4 accum = vec4(0.0);
  const float stepSize = 0.026;

  for (int i = 0; i < 150; i++) {
    if (t > endT || accum.a > 0.985) break;
    vec3 p = ro + rd * t;
    vec3 uvw = p * 0.5 + 0.5;
    float d = texture(uVolume, uvw).r;

    // Soft tissue transfer function: suppress background while retaining
    // cortical folds and brighter internal structures.
    float tissue = smoothstep(uThreshold, 0.30, d);
    float dense = smoothstep(0.48, 0.86, d);
    float local = smoothstep(0.05, 0.30, d);
    float a = tissue * (0.060 + dense * 0.040) * uOpacity;
    a *= 0.92 + 0.08 * sin(uTime * 0.7 + p.y * 8.0);

    vec3 col = mix(vec3(0.025, 0.43, 0.78), vec3(0.34, 0.72, 1.0), local);
    col = mix(col, vec3(0.72, 0.30, 1.0), dense * 0.35);
    col *= 0.72 + d * 0.62;

    accum.rgb += (1.0 - accum.a) * col * a;
    accum.a += (1.0 - accum.a) * a;
    t += stepSize;
  }

  if (accum.a < 0.008) discard;
  outColor = accum;
}`;

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

    const data = volume ?? makeDemoVolume();
    let renderer: THREE.WebGLRenderer | undefined;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      onReady?.(false);
      return;
    }

    if (!renderer.capabilities.isWebGL2) {
      renderer.dispose();
      onReady?.(false);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(1, el.clientWidth), Math.max(1, el.clientHeight), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    el.replaceChildren(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, Math.max(1, el.clientWidth) / Math.max(1, el.clientHeight), 0.01, 30);
    camera.position.set(0, 0, 3.15);

    const tex = new THREE.Data3DTexture(data.data, data.size[0], data.size[1], data.size[2]);
    tex.format = THREE.RedFormat;
    tex.type = THREE.UnsignedByteType;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.wrapR = THREE.ClampToEdgeWrapping;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uVolume: { value: tex },
        uThreshold: { value: 0.105 },
        uOpacity: { value: 1.35 },
        uTime: { value: 0 },
      },
    });

    // A unit cube gives the shader a stable [-1,+1] local volume domain.
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(-0.10, 0.42, 0.02);
    mesh.scale.set(1.0, 0.96, 0.96);
    scene.add(mesh);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer!.domElement.setPointerCapture?.(e.pointerId);
    };
    const up = () => { dragging = false; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      mesh.rotation.y += (e.clientX - lastX) * 0.006;
      mesh.rotation.x += (e.clientY - lastY) * 0.004;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("pointerleave", up);
    renderer.domElement.addEventListener("pointermove", move);

    const resize = () => {
      if (!renderer || !el.clientWidth || !el.clientHeight) return;
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      const dt = clock.getDelta();
      material.uniforms.uTime.value += dt;
      material.uniforms.uThreshold.value = mode === "TRACTS" ? 0.075 : mode === "EEG" ? 0.14 : 0.105;
      if (!dragging) mesh.rotation.y += dt * 0.045;
      renderer!.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    animate();
    onReady?.(true);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer?.domElement.removeEventListener("pointerdown", down);
      renderer?.domElement.removeEventListener("pointerup", up);
      renderer?.domElement.removeEventListener("pointercancel", up);
      renderer?.domElement.removeEventListener("pointerleave", up);
      renderer?.domElement.removeEventListener("pointermove", move);
      tex.dispose();
      material.dispose();
      geometry.dispose();
      renderer?.dispose();
      el.replaceChildren();
    };
  }, [volume, mode, onReady]);

  return <div ref={host} className="absolute inset-0 h-full w-full" />;
}
