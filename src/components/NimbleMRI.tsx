import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

const MRI_B64 = `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`;

function decodeBase64Gzip(input: string) {
  const bin = atob(input);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

function Volume({ mode }: { mode: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const [data, setData] = useState<Uint8Array | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    let alive = true;
    decodeBase64Gzip(MRI_B64).then((buffer) => alive && setData(new Uint8Array(buffer))).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    camera.position.set(0, 0.05, 2.65);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.045;
    mesh.current.rotation.x = Math.sin(performance.now() * 0.00018) * 0.045;
    if (material.current) {
      material.current.uniforms.uMode.value = mode === "circuit" ? 1 : mode === "signal" ? 2 : mode === "nano" ? 3 : 0;
      material.current.uniforms.uTime.value += delta;
    }
  });

  const texture = useMemo(() => {
    if (!data) return null;
    const t = new THREE.Data3DTexture(data, 48, 48, 48);
    t.format = THREE.RedFormat;
    t.type = THREE.UnsignedByteType;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
    return t;
  }, [data]);

  if (!texture) return null;

  const vertex = `
    varying vec3 vPos;
    void main(){
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;
  const fragment = `
    precision highp float;
    precision highp sampler3D;
    uniform sampler3D uVolume;
    uniform float uTime;
    uniform float uMode;
    varying vec3 vPos;
    const int STEPS = 88;
    vec2 hitBox(vec3 ro, vec3 rd){
      vec3 inv = 1.0 / rd;
      vec3 t0 = (-0.5 - ro) * inv;
      vec3 t1 = ( 0.5 - ro) * inv;
      vec3 mn = min(t0,t1); vec3 mx=max(t0,t1);
      float a=max(max(mn.x,mn.y),mn.z); float b=min(min(mx.x,mx.y),mx.z);
      return vec2(a,b);
    }
    float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
    vec3 palette(float x){
      return mix(vec3(0.10,0.42,0.68), vec3(0.32,0.78,1.0), smoothstep(.25,.8,x));
    }
    void main(){
      vec3 ro = cameraPosition;
      vec3 rd = normalize(vPos - ro);
      vec2 hit = hitBox(ro,rd);
      if(hit.y <= max(hit.x,0.0)) discard;
      float t = max(hit.x,0.0);
      float dt = (hit.y-t)/float(STEPS);
      vec4 acc=vec4(0.0);
      for(int i=0;i<STEPS;i++){
        vec3 p=ro+rd*(t+dt*float(i));
        vec3 uv=p+0.5;
        float d=texture(uVolume,uv).r;
        float tissue=smoothstep(.22,.62,d);
        float alpha=tissue*0.075;
        if(uMode==1.0){
          float g=abs(dFdx(d))+abs(dFdy(d));
          alpha += smoothstep(.025,.11,g)*.22;
        }
        vec3 col=palette(d);
        if(uMode==2.0){
          float wave=0.5+0.5*sin((uv.x+uv.y+uv.z)*38.0-uTime*2.8);
          col=mix(col,vec3(.22,.92,1.0),smoothstep(.72,.98,wave));
          alpha += smoothstep(.84,.99,wave)*.035;
        }
        if(uMode==3.0){
          vec3 q=uv*48.0;
          float n=hash(floor(q*1.7)+floor(uTime*0.7));
          float agent=step(.996,n);
          col=mix(col,vec3(.65,.25,1.0),agent);
          alpha += agent*.22;
        }
        acc.rgb += (1.0-acc.a)*col*alpha;
        acc.a += (1.0-acc.a)*alpha;
        if(acc.a>.96) break;
      }
      if(acc.a<.015) discard;
      gl_FragColor=vec4(acc.rgb,acc.a);
    }
  `;

  return <mesh ref={mesh} scale={[1.42,1.42,1.42]}>
    <boxGeometry args={[1,1,1]} />
    <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} side={THREE.BackSide} uniforms={{uVolume:{value:texture},uTime:{value:0},uMode:{value:0}}} />
  </mesh>;
}

export function NimbleMRI(){
  const [mode,setMode]=useState("anatomy");
  const modes=["anatomy","circuit","signal","nano"];
  return <section className="relative overflow-hidden bg-[#05070b] text-white" style={{minHeight:"calc(100svh - 72px)"}}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(40,120,190,.13),transparent_38%),radial-gradient(circle_at_70%_30%,rgba(120,55,220,.10),transparent_34%)]" />
    <div className="relative mx-auto grid min-h-[calc(100svh-72px)] max-w-[1500px] lg:grid-cols-[1fr_360px]">
      <div className="relative min-h-[680px]">
        <Canvas camera={{position:[0,0,2.65],fov:34,near:.01,far:20}} gl={{antialias:true,alpha:true}} dpr={[1,1.75]}>
          <color attach="background" args={["#05070b"]}/>
          <Volume mode={mode}/>
        </Canvas>
        <div className="pointer-events-none absolute left-8 top-8 text-[10px] uppercase tracking-[.28em] text-white/45">NIMBLE / MRI-DERIVED VOLUME</div>
        <div className="pointer-events-none absolute bottom-8 left-8 flex gap-5 text-[9px] uppercase tracking-[.2em] text-white/35"><span>STRUCTURAL MRI</span><span>48³ WEB VOLUME</span><span>SIMULATION LAYER</span></div>
      </div>
      <aside className="border-l border-white/10 bg-black/20 p-7 backdrop-blur-xl lg:mt-10 lg:mb-10 lg:rounded-l-2xl">
        <div className="text-[10px] uppercase tracking-[.25em] text-cyan-300/70">Cognivance Labs / Instrument Programme</div>
        <h1 className="mt-4 text-3xl font-medium tracking-[-.03em]">NIMBLE</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">MRI-derived anatomical visualization with computational overlays for the research interface.</p>
        <div className="mt-8 space-y-2">
          {modes.map((m)=><button key={m} onClick={()=>setMode(m)} className={`flex w-full items-center justify-between border px-4 py-3 text-left text-xs uppercase tracking-[.18em] transition ${mode===m?"border-cyan-300/60 bg-cyan-300/10 text-white":"border-white/10 text-white/45 hover:border-white/25"}`}><span>{m}</span><span className="text-[9px]">{mode===m?"ACTIVE":"VIEW"}</span></button>)}
        </div>
        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="text-[9px] uppercase tracking-[.2em] text-white/35">Visualization stack</div>
          <div className="mt-4 space-y-3 text-xs text-white/60"><div className="flex justify-between"><span>Source</span><span className="text-white/85">T1w MRI</span></div><div className="flex justify-between"><span>Volume</span><span className="text-white/85">48 × 48 × 48</span></div><div className="flex justify-between"><span>Render</span><span className="text-white/85">WebGL volume</span></div><div className="flex justify-between"><span>Mode</span><span className="text-cyan-200">{mode}</span></div></div>
        </div>
        <div className="mt-10 rounded-xl border border-white/10 bg-white/[.025] p-4 text-[10px] leading-5 text-white/38">The circuit, signal and nanorobot layers are simulated visualization layers for demonstration; they are not presented as measured neural activity.</div>
      </aside>
    </div>
  </section>;
}
