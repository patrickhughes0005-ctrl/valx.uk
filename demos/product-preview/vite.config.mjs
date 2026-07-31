import { resolve } from "node:path";

export default {
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        customer: resolve(import.meta.dirname, "customer/index.html"),
        detailer: resolve(import.meta.dirname, "detailer/index.html"),
        admin: resolve(import.meta.dirname, "admin/index.html")
      }
    }
  }
};
