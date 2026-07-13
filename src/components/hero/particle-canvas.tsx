"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";

// 히어로 좌측 박스를 배경처럼 채우는 파티클 캔버스("TickerFlow" 워드마크).
// 이 컴포넌트는 부모(particle-section.tsx)가 만든 relative 박스를
// absolute inset-0로 꽉 채우기만 한다 — 높이/테두리/배경은 전부 부모
// 책임이다(부모가 그 위에 eyebrow/h1 텍스트를 오버레이로 겹쳐 그리기
// 때문). mode(GATHER/SCATTER)는 부모가 소유한 상태를 prop으로 받는다.

export type ParticleMode = "gather" | "scatter";

const FIELD_BG = "#0a0a0f";
const BLUE = new THREE.Color("#7db8f5");
const WHITE = new THREE.Color("#d5e6fb");

const velocityFrag = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uMouseActive;
  uniform float uRepel;
  uniform float uScatter;
  uniform vec2  uCenter;
  uniform sampler2D uHome;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 pos = texture2D( texturePosition, uv ).xy;
    vec2 vel = texture2D( textureVelocity, uv ).xy;
    vec4 homeT = texture2D( uHome, uv );
    vec2 home = homeT.xy;
    float phase = homeT.z;

    vec2 drift = vec2( sin( uTime * 0.9 + phase ), cos( uTime * 1.1 + phase ) ) * 1.7;

    vec2 fromC = home - uCenter;
    vec2 scatterT = uCenter + fromC * 2.4 + vec2( sin( phase * 12.0 ), cos( phase * 7.0 ) ) * 90.0;

    vec2 target = mix( home + drift, scatterT, uScatter );

    float pull = 0.06;

    if ( uMouseActive > 0.5 ) {
      vec2 d = pos - uMouse;
      float dist = length( d );
      if ( dist < uRepel && dist > 0.001 ) {
        float k = 1.0 - dist / uRepel;
        float force = k * k;
        vel += ( d / dist ) * force * 26.0;
        pull *= 1.0 - force * 0.85;
      }
    }

    vel += ( target - pos ) * pull;
    vel *= 0.9;

    gl_FragColor = vec4( vel, 0.0, 1.0 );
  }
`;

const positionFrag = /* glsl */ `
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 pos = texture2D( texturePosition, uv );
    vec2 vel = texture2D( textureVelocity, uv ).xy;
    pos.xy += vel;
    gl_FragColor = pos;
  }
`;

const renderVert = /* glsl */ `
  uniform sampler2D texturePosition;
  uniform float uDpr;
  attribute vec2 aRef;
  attribute vec3 aColor;
  attribute float aSize;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec2 pos = texture2D( texturePosition, aRef ).xy;
    vec4 mv = modelViewMatrix * vec4( pos, 0.0, 1.0 );
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uDpr;
  }
`;

const renderFrag = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  void main() {
    float d = length( gl_PointCoord - 0.5 ) * 2.0;
    float alpha = smoothstep( 1.0, 0.0, d );
    alpha = pow( alpha, 1.6 );
    if ( alpha <= 0.01 ) discard;
    gl_FragColor = vec4( vColor, alpha * 0.85 );
  }
`;

export function ParticleCanvas({ mode }: { mode: ParticleMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef({ left: 0, top: 0 });
  const pointerRef = useRef({ x: -9999, y: -9999, active: false });
  const modeRef = useRef<ParticleMode>(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    const { left, top } = rectRef.current;
    pointerRef.current = { x: clientX - left, y: clientY - top, active: true };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(new THREE.Color(FIELD_BG), 1);

    let gpu!: GPUComputationRenderer;
    let scene!: THREE.Scene;
    let camera!: THREE.OrthographicCamera;
    let points: THREE.Points;
    let geometry!: THREE.BufferGeometry;
    let material!: THREE.ShaderMaterial;
    let posVar!: ReturnType<GPUComputationRenderer["addVariable"]>;
    let velVar!: ReturnType<GPUComputationRenderer["addVariable"]>;
    let raf = 0;
    let disposed = false;
    let scatterCur = 0;

    function sampleText(w: number, h: number) {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d")!;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      const fontStack = '"Chakra Petch","Geist",sans-serif';
      const word = "TickerFlow";
      let fontSize = Math.min(h * 0.5, w * 0.26);
      octx.font = `700 ${fontSize}px ${fontStack}`;
      while (octx.measureText(word).width > w * 0.88 && fontSize > 8) {
        fontSize -= 2;
        octx.font = `700 ${fontSize}px ${fontStack}`;
      }
      octx.lineJoin = "round";
      octx.fillStyle = "#fff";
      octx.strokeStyle = "#fff";
      octx.lineWidth = Math.max(2, fontSize * 0.03);
      octx.strokeText(word, w / 2, h / 2);
      octx.fillText(word, w / 2, h / 2);

      const data = octx.getImageData(0, 0, w, h).data;
      const gap = w < 640 ? 1.6 : 2;
      const homes: number[] = [];
      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          const px = Math.floor(x);
          const py = Math.floor(y);
          if (data[(py * w + px) * 4 + 3] > 120) {
            homes.push(x + (Math.random() - 0.5) * gap, y + (Math.random() - 0.5) * gap);
          }
        }
      }
      return homes;
    }

    function init() {
      const rect = wrap.getBoundingClientRect();
      rectRef.current = { left: rect.left, top: rect.top };
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      const homes = sampleText(w, h);
      const n = homes.length / 2;

      const texSize = Math.ceil(Math.sqrt(n));
      const total = texSize * texSize;

      renderer.setSize(w, h, false);

      gpu = new GPUComputationRenderer(texSize, texSize, renderer);
      gpu.setDataType(THREE.FloatType);

      const posTex = gpu.createTexture();
      const velTex = gpu.createTexture();
      const homeTex = gpu.createTexture();
      const pArr = posTex.image.data as unknown as Float32Array;
      const vArr = velTex.image.data as unknown as Float32Array;
      const hArr = homeTex.image.data as unknown as Float32Array;

      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < total; i++) {
        const j = i * 4;
        if (i < n) {
          const hx = homes[i * 2];
          const hy = homes[i * 2 + 1];
          hArr[j] = hx;
          hArr[j + 1] = hy;
          hArr[j + 2] = Math.random() * Math.PI * 2;
          hArr[j + 3] = 1;
          pArr[j] = cx + (Math.random() - 0.5) * w;
          pArr[j + 1] = cy + (Math.random() - 0.5) * h;
        }
        pArr[j + 3] = 1;
        vArr[j + 3] = 1;
      }

      velVar = gpu.addVariable("textureVelocity", velocityFrag, velTex);
      posVar = gpu.addVariable("texturePosition", positionFrag, posTex);
      gpu.setVariableDependencies(velVar, [posVar, velVar]);
      gpu.setVariableDependencies(posVar, [posVar, velVar]);

      Object.assign(velVar.material.uniforms, {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(-9999, -9999) },
        uMouseActive: { value: 0 },
        uRepel: { value: 110 },
        uScatter: { value: 0 },
        uCenter: { value: new THREE.Vector2(cx, cy) },
        uHome: { value: homeTex },
      });

      const err = gpu.init();
      if (err) console.error("GPUComputationRenderer init error:", err);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(0, w, 0, h, -100, 100);
      camera.position.z = 10;

      geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(n * 3);
      const refs = new Float32Array(n * 2);
      const colors = new Float32Array(n * 3);
      const sizes = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        refs[i * 2] = ((i % texSize) + 0.5) / texSize;
        refs[i * 2 + 1] = (Math.floor(i / texSize) + 0.5) / texSize;
        const c = Math.random() < 0.1 ? WHITE : BLUE;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        sizes[i] = 1.6 + Math.random() * 1.6;
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aRef", new THREE.BufferAttribute(refs, 2));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

      material = new THREE.ShaderMaterial({
        uniforms: { texturePosition: { value: null }, uDpr: { value: dpr } },
        vertexShader: renderVert,
        fragmentShader: renderFrag,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });

      points = new THREE.Points(geometry, material);
      scene.add(points);
    }

    const clock = new THREE.Clock();

    function frame() {
      if (disposed) return;
      const vu = velVar.material.uniforms;
      vu.uTime.value = clock.getElapsedTime();
      const p = pointerRef.current;
      vu.uMouseActive.value = p.active && !reduce ? 1 : 0;
      (vu.uMouse.value as THREE.Vector2).set(p.x, p.y);
      const scatterTarget = modeRef.current === "scatter" ? 1 : 0;
      scatterCur += (scatterTarget - scatterCur) * 0.08;
      vu.uScatter.value = scatterCur;
      gpu.compute();
      material.uniforms.texturePosition.value = gpu.getCurrentRenderTarget(posVar).texture;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function renderStaticFrame() {
      for (let i = 0; i < 60; i++) gpu.compute();
      material.uniforms.texturePosition.value = gpu.getCurrentRenderTarget(posVar).texture;
      renderer.render(scene, camera);
    }

    init();
    if (reduce) {
      renderStaticFrame();
    } else {
      raf = requestAnimationFrame(frame);
    }

    if ("fonts" in document) {
      document.fonts.ready.then(() => {
        if (disposed) return;
        cancelAnimationFrame(raf);
        geometry.dispose();
        material.dispose();
        init();
        if (reduce) {
          renderStaticFrame();
        } else {
          raf = requestAnimationFrame(frame);
        }
      });
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (disposed) return;
        cancelAnimationFrame(raf);
        geometry.dispose();
        material.dispose();
        init();
        if (reduce) {
          renderStaticFrame();
        } else {
          raf = requestAnimationFrame(frame);
        }
      }, 200);
    };
    window.addEventListener("resize", onResize);

    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      rectRef.current = { left: r.left, top: r.top };
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      renderer?.dispose();
      geometry?.dispose();
      material?.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 cursor-crosshair touch-none"
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        rectRef.current = { left: r.left, top: r.top };
        updatePointer(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => updatePointer(e.clientX, e.clientY)}
      onMouseLeave={() => (pointerRef.current = { x: -9999, y: -9999, active: false })}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) updatePointer(t.clientX, t.clientY);
      }}
      onTouchEnd={() => (pointerRef.current = { x: -9999, y: -9999, active: false })}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
