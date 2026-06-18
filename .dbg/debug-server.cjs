const http = require("http");
const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), ".dbg");
const logFile = path.join(outDir, "trae-debug-log-vehicle-save-supabase.ndjson");

fs.mkdirSync(outDir, { recursive: true });
try {
  fs.unlinkSync(logFile);
} catch {}

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(body);
};

http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    if (req.method === "POST" && req.url === "/event") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          fs.appendFileSync(logFile, `${JSON.stringify(payload)}\n`);
        } catch {}
        send(res, 200, JSON.stringify({ ok: true }));
      });
      return;
    }

    if (req.method === "GET" && req.url === "/logs") {
      const text = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : "";
      send(res, 200, text, "text/plain");
      return;
    }

    send(res, 200, "ok", "text/plain");
  })
  .listen(7777, "127.0.0.1", () => {
    process.stdout.write("debug server listening on http://127.0.0.1:7777\n");
  });
