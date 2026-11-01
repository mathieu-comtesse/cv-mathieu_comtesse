// Exporte les vignettes 840 x 600 (WebP, fond transparent) de figures/<nom>.html vers assets/figures/<nom>-light.webp.
// node figures/export-thumbs.mjs [nom ...]   (Chromium + Playwright + Pillow requis)
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, "..");
// Pose choisie pour chaque machine : une action en cours, jamais la scène vide.
const POSES = { cerfa: "window.__fig.at(3.4)", vm: "window.__fig.at(546.6)", gares: "window.__fig.at(0.6)", finance: "window.__fig.at(205, 0.8)", suivi: "window.__fig.at(0.4)", vre: "window.__fig.at(2, 4)", moteur: "window.__fig.at(1, 9)", pp: "window.__fig.at(60, 0.45)", powerbi: "window.__fig.at(619)" };
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(POSES);
const browser = await chromium.launch();
for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(join(HERE, name + ".html")).href);
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: "html,body,.iso-page,.iso-plate,.iso-figure{background:transparent!important;border:0!important;box-shadow:none!important}.iso-plate-corner,.iso-plate-title,.iso-keys,.iso-caption,figcaption{display:none!important}" });
  await page.evaluate(POSES[name]);
  await page.waitForTimeout(1400);
  const tmp = `/tmp/thumb-${name}.png`;
  await page.locator(".iso-stage svg").first().screenshot({ path: tmp, omitBackground: true });
  execFileSync("python3", ["-c", `
from PIL import Image
im = Image.open(${JSON.stringify(tmp)}).convert("RGBA")
bb = im.getbbox(); im = im.crop(bb)
W, H, pad = 840, 600, 28
s = min((W - 2 * pad) / im.width, (H - 2 * pad) / im.height)
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
out.alpha_composite(im, ((W - im.width) // 2, (H - im.height) // 2))
out.save(${JSON.stringify(join(ROOT, "assets/figures", name + "-light.webp"))}, quality=90, method=6)
`]);
  console.log("wrote assets/figures/" + name + "-light.webp");
  await page.close();
}
await browser.close();
