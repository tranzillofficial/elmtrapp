// Test-only operational-status backend. Office/Auth fixtures continue using browser routes.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
let runtime = {
  maintenance_enabled: false,
  maintenance_until: null,
  maintenance_message: "تحديث تجريبي",
};
const mock = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/__control" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    if (body.length > 5000) {
      res.writeHead(413);
      res.end("{}");
      return;
    }
    runtime = { ...runtime, ...JSON.parse(body) };
    res.end(JSON.stringify(runtime));
    return;
  }
  if (req.url?.startsWith("/rest/v1/site_runtime")) {
    res.end(JSON.stringify([runtime]));
    return;
  }
  res.writeHead(404);
  res.end("{}");
});
await new Promise((resolve) => mock.listen(4179, "127.0.0.1", resolve));
let child;
const stop = () => {
  child?.kill("SIGTERM");
  mock.close();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
const env = { ...process.env, SUPABASE_URL: "http://127.0.0.1:4179" };
const build = spawn("npm", ["run", "build"], { stdio: "inherit", env });
child = build;
const code = await new Promise((resolve) => build.on("exit", resolve));
if (code !== 0) {
  mock.close();
  process.exit(code ?? 1);
}
child = spawn("npm", ["run", "start"], { stdio: "inherit", env });
child.on("exit", (code) => {
  mock.close();
  process.exit(code ?? 0);
});
