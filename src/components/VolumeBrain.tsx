import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VolumeData = { data: Uint8Array; size: [number, number, number] };

function makeDemoVolume(size = 96): VolumeData {
  const data = new Uint8Array(size * size * size);
  const c = (size - 1) / 2;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const X = (x - c) / c, Y = (y - c) / c, Z = (z - c) / c;
    const hemi = Math.abs(X) > 0.055;
    const outer = (X * X / 0.86 + Y * Y / 0.72 + Z * Z / 0.82);
    const fold = 0.10 * Math.sin(Y * 31 + Z * 4) + 0.07 * Math.sin(Y * 47 - Z * 6) + 0.05 * Math.sin((Y + Z) * 71);
    const vent = ((X / 0.17) ** 2 + ((Y + 0.02) / 0.28) ** 2 + ((Z + 0.04) / 0.25) ** 2) < 1;
    let v = outer < 1 + fold && hemi ? 0.32 + Math.max(0, 1 - outer) * 0.58 : 0;
    if (vent) v *= 0.12;
    const deep = Math.exp(-((X * X) / .18 + ((Y + .05) ** 2) / .2 + ((Z + .03) ** 2) / .25));
    v = Math.min(1, v + deep * .12);
    data[x + size * (y + size * z)] = Math.round(v * 255);
  }
  return { data, size: [size, size, size] };
}

const VERT = `#version 300 es
in vec3 position;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
out vec3 vPos;
void main(){ vPos=position*.5+.5; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FRAG = `#version 300 es
precision highp float; precision highp sampler3D;
in vec3 vPos; out vec4 outColor;
uniform sampler3D uVolume; uniform vec3 uCamera; uniform float uThreshold; uniform float uGain;
vec2 hitBox(vec3 ro, vec3 rd){ vec3 b0=vec3(0.), b1=vec3(1.); vec3 inv=1./rd; vec3 t0=(b0-ro)*inv, t1=(b1-ro)*inv; vec3 lo=min(t0,t1), hi=max(t0,t1); return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z)); }
void main(){ vec3 ro=uCamera, rd=normalize(vPos-ro); vec2 hit=hitBox(ro,rd); float t=max(hit.x,0.); float end=hit.y; if(end<=t) discard; vec4 acc=vec4(0.); for(int i=0;i<110;i++){ if(t>end || acc.a>.96) break; vec3 p=ro+rd*t; float d=texture(uVolume,p).r; float edge=1.-smoothstep(.0,.08,min(min(p.x,1.-p.x),min(min(p.y,1.-p.y),min(p.z,1.-p.z)))); float a=smoothstep(uThreshold,.82,d)*.075; a*=1.-edge*.55; vec3 col=mix(vec3(.08,.72,1.),vec3(.68,.18,1.),smoothstep(.45,.95,d)); col+=vec3(.15,.8,.8)*d; acc.rgb+=(1.-acc.a)*col*a; acc.a+=(1.-acc.a)*a; t+=.0105; } if(acc.a<.012) discard; outColor=acc; }`;

export function VolumeBrain({ volume, mode, onReady }: { volume?: VolumeData; mode: string; onReady?: (ok:boolean)=>void }) {
  const host=useRef<HTMLDivElement>(null); const state=useRef<{scene:THREE.Scene;camera:THREE.PerspectiveCamera;renderer:THREE.WebGLRenderer;mesh:THREE.Mesh;frame:number}|null>(null);
  useEffect(()=>{
    const el=host.current; if(!el)return; const data=volume ?? makeDemoVolume();
    let renderer:THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}); } catch { onReady?.(false); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(el.clientWidth,el.clientHeight); el.innerHTML=""; el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(34,el.clientWidth/el.clientHeight,.01,20); camera.position.set(.5,.5,2.15);
    const tex=new THREE.Data3DTexture(data.data,data.size[0],data.size[1],data.size[2]); tex.format=THREE.RedFormat; tex.type=THREE.UnsignedByteType; tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter; tex.wrapS=tex.wrapT=tex.wrapR=THREE.ClampToEdgeWrapping; tex.unpackAlignment=1; tex.needsUpdate=true;
    const mat=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthWrite:false,uniforms:{uVolume:{value:tex},uCamera:{value:new THREE.Vector3(.5,.5,2.15)},uThreshold:{value:.16},uGain:{value:1}}});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.55,1.75),mat); mesh.position.set(0,0,0); scene.add(mesh); mesh.rotation.set(-.08,.42,0);
    const pointer={x:0,y:0}; let dragging=false,last={x:0,y:0};
    const down=(e:PointerEvent)=>{dragging=true;last={x:e.clientX,y:e.clientY};}; const up=()=>dragging=false; const move=(e:PointerEvent)=>{pointer.x=e.clientX;pointer.y=e.clientY;if(dragging){mesh.rotation.y+=(e.clientX-last.x)*.006;mesh.rotation.x+=(e.clientY-last.y)*.004;last={x:e.clientX,y:e.clientY}}};
    renderer.domElement.addEventListener("pointerdown",down); renderer.domElement.addEventListener("pointerup",up); renderer.domElement.addEventListener("pointerleave",up); renderer.domElement.addEventListener("pointermove",move);
    const resize=()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix()}; window.addEventListener("resize",resize);
    const clock=new THREE.Clock(); let frame=0; const animate=()=>{const dt=clock.getDelta(); if(!dragging)mesh.rotation.y+=dt*.06; const cam=mat.uniforms.uCamera.value as THREE.Vector3; cam.set(.5,.5,2.15); mat.uniforms.uThreshold.value=mode==="TRACTS"?.12:mode==="EEG"?.20:.16; renderer.render(scene,camera); frame=requestAnimationFrame(animate)}; animate(); onReady?.(true); state.current={scene,camera,renderer,mesh,frame};
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointerleave",up);renderer.domElement.removeEventListener("pointermove",move);tex.dispose();mat.dispose();mesh.geometry.dispose();renderer.dispose();el.innerHTML=""};
  },[volume,mode,onReady]);
  return <div ref={host} className="absolute inset-0" />;
}
