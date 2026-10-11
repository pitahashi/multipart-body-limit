import { defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "vinext-multipart-body-limit-poc",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-10",
    compatibilityFlags: ["nodejs_compat"],
  }),
});
