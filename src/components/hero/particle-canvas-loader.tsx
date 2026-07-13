"use client";

// next/dynamic의 ssr:false는 Server Component(src/app/page.tsx)에서 직접
// 쓸 수 없고 Client Component 안에서만 허용된다 — 이 파일이 그 경계 역할을
// 한다. page.tsx는 이 파일에서 export하는 ParticleCanvas를 평범한 컴포넌트
// import처럼 그냥 가져다 쓰면 된다.
import dynamic from "next/dynamic";

export const ParticleCanvas = dynamic(
  () => import("./particle-canvas").then((m) => m.ParticleCanvas),
  { ssr: false }
);
