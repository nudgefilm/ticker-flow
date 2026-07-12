import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 어드민 전용 스코어링/순위 로직(TOP30 스크리너)이 사용자 노출 코드에 실수로
  // 섞여 들어가는 사고(TOP30 순위 표기 재발)를 빌드 단계에서 막는다. 반대
  // 방향(어드민 쪽에서 공용 유틸을 가져다 쓰는 것)은 제한하지 않는다.
  //
  // no-restricted-imports는 import 문자열 자체를 매칭하므로, 이 코드베이스가
  // 관례적으로 크로스-디렉터리 import에 "@/..." alias만 쓰고(상대경로는 같은
  // 폴더 내부 파일 간에만 씀) 상대경로를 alias 대신 쓰는 경우가 없다는 전제
  // 하에서만 유효하다 — eslint-plugin-boundaries(실제 파일 경로 기준 리졸브)
  // 대신 이 방식을 택한 이유.
  //
  // 허용 목록(반대로 이 로직을 가져다 써도 되는 곳)에는 사용자 지시에 있던
  // src/app/admin/**, src/app/api/admin/** 외에, 실제로 이 로직을 실행해야만
  // 하는 두 크론 라우트(/api/collect/top30, /api/collect/top30-outcomes)와,
  // 어드민 전용 파일들이 서로를 참조하는 경로(scoring.ts→weights.ts,
  // top30.ts→version.ts/outcomes/config.ts 등)를 추가했다 — 이 예외가 없으면
  // 시스템이 스스로를 막아 빌드가 실패한다.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/app/admin/**",
      "src/app/api/admin/**",
      "src/app/api/collect/top30/**",
      "src/app/api/collect/top30-outcomes/**",
      "src/lib/collect/scoring.ts",
      "src/lib/collect/top30.ts",
      "src/lib/collect/top30-outcomes.ts",
      "src/lib/scoring/**",
      "src/lib/outcomes/**",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "@/lib/collect",
            message: "어드민 전용 스코어링 로직(scoring/top30)을 함께 export하는 배럴(index.ts)입니다. 필요한 개별 모듈을 직접 import하세요.",
          },
          {
            name: "@/lib/collect/scoring",
            message: "스코어링 엔진은 어드민 전용입니다(src/app/admin 하위 또는 /api/collect/top30 라우트에서만 사용 가능).",
          },
          {
            name: "@/lib/collect/top30",
            message: "TOP30 선정 로직은 어드민 전용입니다(src/app/admin 하위 또는 /api/collect/top30 라우트에서만 사용 가능).",
          },
          {
            name: "@/lib/collect/top30-outcomes",
            message: "TOP30 성과 추적 로직은 어드민 전용입니다(src/app/admin 하위 또는 /api/collect/top30-outcomes 라우트에서만 사용 가능).",
          },
        ],
        patterns: [
          {
            group: ["@/lib/scoring/*", "@/lib/outcomes/*"],
            message: "스코어링 가중치·모델 버전·성과추적 설정은 어드민 전용입니다.",
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
