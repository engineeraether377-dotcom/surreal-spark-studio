import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VolumeData = { data: Uint8Array; size: [number, number, number] };
export type VolumeOverlay = "ANATOMY" | "HEATMAP" | "TUMOR";

function makeDemoVolume(size = 128): VolumeData {
  const data = new Uint8Array(size * size * size);
  const c = (size - 1) / 2;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const X = (x - c) / c, Y = (y - c) / c, Z = (z - c) / c;
    const shell = X * X / .88 + Y * Y / .76 + Z * Z / .82;
    const folds = .055 * Math.sin(Y * 34 + Z * 5) + .035 * Math.sin(Y * 57 - Z * 7) + .022 * Math.sin((Y + Z) * 74);
    const hemi = Math.abs(X) > .045;
    const vent = (X / .18) ** 2 + ((Y + .02) / .27) ** 2 + ((Z + .02) / .25) ** 2 < 1;
    let v = shell < 1 + folds && hemi ? .10 + Math.max(0, 1 - shell) * .82 : 0;
    if (vent) v *= .12;
    const deep = Math.exp(-((X * X) / .25 + ((Y + .03) ** 2) / .25 + ((Z + .02) ** 2) / .3));
    v = Math.min(1, v + deep * .13);
    data[x + size * (y + size * z)] = Math.round(v * 255);
  }
  return { data, size: [size, size, size] };
}

function makeTexture(data: Uint8Array, size: [number, number, number]) {
  const tex = new THREE.Data3DTexture(data, size[0], size[1], size[2]);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

const VERTEX = `
  in vec3 position;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  out vec3 vPosition;
  void main(){ vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const FRAGMENT = `
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

  vec2 hitBox(vec3 ro, vec3 rd){
    vec3 bmin=vec3(-0.5), bmax=vec3(0.5);
    vec3 inv=1.0/rd;
    vec3 t0=(bmin-ro)*inv, t1=(bmax-ro)*inv;
    vec3 lo=min(t0,t1), hi=max(t0,t1);
    return vec2(max(max(lo.x,lo.y),lo.z), min(min(hi.x,hi.y),hi.z));
  }

  vec3 heat(float q){
    q=clamp(q,0.0,1.0);
    vec3 blue=vec3(0.05,0.35,1.0), cyan=vec3(0.0,0.95,1.0), yellow=vec3(1.0,0.85,0.08), red=vec3(1.0,0.08,0.04);
    return q<.33?mix(blue,cyan,q/.33):q<.68?mix(cyan,yellow,(q-.33)/.35):mix(yellow,red,(q-.68)/.32);
  }

  void main(){
    vec3 ro = uCamera;
    vec3 rd = normalize(vPosition-ro);
    vec2 h=hitBox(ro,rd);
    if(h.x>h.y) discard;
    float t=max(h.x,0.0), end=h.y;
    float stepSize=.0105;
    vec4 accum=vec4(0.0);
    for(int i=0;i<150;i++){
      if(t>end || accum.a>.96) break;
      vec3 p=ro+rd*t;
      vec3 uv=p+.5;
      float q=texture(uVolume,uv).r;
      float mask=texture(uMask,uv).r;
      float tissue=smoothstep(.035,.30,q);
      float shell=smoothstep(.10,.42,q)*(1.0-smoothstep(.58,.92,q)*.35);
      float alpha=tissue*.060*uOpacity;
      vec3 col=vec3(.20,.78,.95);
      if(uMode==1){ col=heat(q); alpha=tissue*.075*uOpacity; }
      if(uMode==2){
        float candidate=smoothstep(uThreshold,uThreshold+.10,q)*smoothstep(.015,.12,q);
        vec3 tc=heat(clamp((q-uThreshold)*4.2,0.0,1.0));
        col=mix(vec3(.16,.65,.9),tc,candidate);
        alpha=(tissue*.035 + candidate*.22)*uOpacity;
      }
      if(uHasMask>.5 && mask>.20){ col=mix(col,vec3(1.0,.10,.08),.92); alpha=max(alpha,.28*uOpacity); }
      alpha*=shell;
      accum.rgb += (1.0-accum.a)*alpha*col;
      accum.a += (1.0-accum.a)*alpha;
      t+=stepSize;
    }
    if(accum.a<.012) discard;
    outColor=vec4(accum.rgb,accum.a);
  }
`;

export function VolumeBrain({ volume, mask, mode = "ANATOMY" }: { volume?: VolumeData; mask?: VolumeData; mode?: VolumeOverlay }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); } catch { return; }
    let raf = 0, alive = true, dragging = false, lastX = 0, lastY = 0;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    const data = volume ?? makeDemoVolume();
    const maskData = mask ?? { data: new Uint8Array(data.size[0] * data.size[1] * data.size[2]), size: data.size };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .05, 10);
    camera.position.set(0, 0, 2.35);
    const group = new THREE.Group(); group.rotation.set(-.08, .34, 0); scene.add(group);
    const volumeTex = makeTexture(data.data, data.size);
    const maskTex = makeTexture(maskData.data, maskData.size);
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERTEX, fragmentShader: FRAGMENT,
      uniforms: { uVolume:{value:volumeTex}, uMask:{value:maskTex}, uHasMask:{value:mask?1:0}, uMode:{value:mode==="HEATMAP"?1:mode==="TUMOR"?2:0}, uThreshold:{value:.72}, uOpacity:{value:1}, uCamera:{value:camera.position.clone()} },
      transparent:true, side:THREE.BackSide, depthWrite:false, depthTest:true, blending:THREE.AdditiveBlending,
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1,.94,1), material); group.add(cube);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02,.96,1.02)), new THREE.LineBasicMaterial({color:0x65e7f7,transparent:true,opacity:.13})); group.add(frame);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.36,.365,96), new THREE.MeshBasicMaterial({color:0x8cefff,transparent:true,opacity:.12,side:THREE.DoubleSide})); ring.rotation.x=Math.PI/2; ring.position.y=-.49; group.add(ring);

    const down=(e:PointerEvent)=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.style.cursor="grabbing";renderer.domElement.setPointerCapture?.(e.pointerId)};
    const up=()=>{dragging=false;renderer.domElement.style.cursor="grab"};
    const move=(e:PointerEvent)=>{if(!dragging)return;group.rotation.y+=(e.clientX-lastX)*.006;group.rotation.x+=(e.clientY-lastY)*.004;group.rotation.x=Math.max(-1.25,Math.min(1.25,group.rotation.x));lastX=e.clientX;lastY=e.clientY};
    const wheel=(e:WheelEvent)=>{e.preventDefault();camera.position.z=Math.max(1.55,Math.min(4.1,camera.position.z+e.deltaY*.0025))};
    renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointercancel",up);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerleave",up);renderer.domElement.addEventListener("wheel",wheel,{passive:false});
    const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
    const observer=new ResizeObserver(resize); observer.observe(el); resize();
    const clock=new THREE.Clock();
    const animate=()=>{if(!alive)return;const dt=clock.getDelta();if(!dragging)group.rotation.y+=dt*.035;material.uniforms.uCamera.value.copy(camera.position);material.uniforms.uOpacity.value=.93+Math.sin(clock.elapsedTime*1.3)*.045;renderer.render(scene,camera);raf=requestAnimationFrame(animate)}; animate();
    return()=>{alive=false;cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointercancel",up);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerleave",up);renderer.domElement.removeEventListener("wheel",wheel);volumeTex.dispose();maskTex.dispose();material.dispose();cube.geometry.dispose();frame.geometry.dispose();(frame.material as THREE.Material).dispose();ring.geometry.dispose();(ring.material as THREE.Material).dispose();renderer.dispose();el.replaceChildren()};
  }, [volume, mask, mode]);
  return <div ref={host} className="absolute inset-0 h-full w-full" />;
}
