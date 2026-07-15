import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pngPath = resolve(root, "public/favicon.png");
const teacherIco = resolve(root, "public/favicon.ico");
const studentIco = resolve(root, "../student-attendance-portal/public/favicon.ico");

const buf = await pngToIco(pngPath);
writeFileSync(teacherIco, buf);
writeFileSync(studentIco, buf);
console.log(`Wrote favicon.ico (${buf.length} bytes) to both apps`);
