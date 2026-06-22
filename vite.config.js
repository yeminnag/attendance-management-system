import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { runManageStudentAuth } from "./api/manage-student-auth.js";

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            try {
                const raw = Buffer.concat(chunks).toString();
                resolve(raw ? JSON.parse(raw) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}

function studentAuthApiPlugin() {
    return {
        name: "student-auth-api",
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = req.url?.split("?")[0];
                if (url !== "/api/manage-student-auth" || req.method !== "POST") {
                    return next();
                }

                const env = loadEnv(server.config.mode, process.cwd(), "");

                try {
                    const body = await readRequestBody(req);
                    const result = await runManageStudentAuth({
                        method: req.method,
                        body,
                        authorization: req.headers.authorization,
                        env,
                    });

                    res.statusCode = result.status;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(result.body));
                } catch (error) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: error.message ?? "Internal server error" }));
                }
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), studentAuthApiPlugin()],
    resolve: {
        alias: { "@": "/src" },
    },
    server: {
        port: 3200,
        proxy: {
            "/api/odpt": {
                target: "https://api.odpt.org",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/odpt/, "/api/v4"),
            },
            "/api/heartrails": {
                target: "https://express.heartrails.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/heartrails/, "/api/json"),
            },
        },
    },
});
