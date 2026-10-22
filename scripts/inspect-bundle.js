const fs = require("fs");
const p = "/var/www/focusup/.next/static/chunks/815de8986d232fb6.js";
const s = fs.readFileSync(p, "utf8");
const i = s.indexOf("focusup.base-db.com");
console.log(s.slice(Math.max(0, i - 150), i + 200));
console.log("---");
console.log("has localhost:3003", s.includes("localhost:3003"));
console.log("has redirect_to", s.includes("redirect_to") || s.includes("redirectTo"));
