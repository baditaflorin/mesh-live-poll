import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-live-poll",
  description: "Live multi-option poll with bar chart, no account, mesh-synced",
  accentHex: "#5b8def",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
