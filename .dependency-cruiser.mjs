/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Un ciclo entre módulos hace imposible razonar sobre el estado.",
      from: {},
      to: { circular: true },
    },
    {
      name: "tauri-only-through-ipc",
      severity: "error",
      comment:
        "Solo src/shared/ipc/ importa @tauri-apps/* o @crabnebula/*. El resto usa los envoltorios tipados.",
      from: { path: "^src/", pathNot: "^src/shared/ipc/" },
      to: { path: "node_modules/.*(@tauri-apps|@crabnebula)" },
    },
    {
      name: "features-are-isolated",
      severity: "error",
      comment: "Una feature solo importa de sí misma y de src/shared/*.",
      from: { path: "^src/features/([^/]+)/" },
      to: { path: "^src/features/([^/]+)/", pathNot: "^src/features/$1/" },
    },
    {
      name: "shared-does-not-import-features",
      severity: "error",
      comment: "src/shared/* no puede depender de una feature.",
      from: { path: "^src/shared/" },
      to: { path: "^src/features/" },
    },
    {
      name: "no-next-server-apis",
      severity: "error",
      comment: "El export estático prohíbe las APIs de servidor de Next.js.",
      from: { path: "^src/" },
      to: { path: "node_modules/.*next/(server|headers)" },
    },
    {
      name: "no-framer-motion",
      severity: "error",
      comment: "La librería de animación del proyecto es motion/react.",
      from: { path: "^src/" },
      to: { path: "node_modules/.*/framer-motion/" },
    },
    {
      name: "no-web-filesystem",
      severity: "error",
      comment: "La web nunca toca el sistema de ficheros: eso vive en Rust.",
      from: { path: "^src/" },
      to: { dependencyTypes: ["core"], path: "^(fs|path|os|child_process|node:fs)$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.(ts|tsx)$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".json"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};

export default config;
