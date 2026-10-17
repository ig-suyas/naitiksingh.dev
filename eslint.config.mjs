import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "out/**", "scripts/.cache/**"],
  },
  {
    rules: {
      // R3F props (position, args, attach…) are not real DOM attributes.
      "react/no-unknown-property": "off",
    },
  },
  {
    // three.js objects (materials, uniforms, refs to meshes) are mutated every
    // frame inside useFrame by design. The React Compiler rules assume
    // immutable render values, which doesn't apply to this imperative layer
    // (and the compiler isn't enabled for this project).
    files: ["components/canvas/**", "components/fallback/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
