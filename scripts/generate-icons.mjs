import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  for (const [name, background, stroke, width] of [
    ["icon", "#2798EE", "#FFFFFF", 82],
    ["android-foreground", "transparent", "#FFFFFF", 60],
    ["android-monochrome", "transparent", "#000000", 60],
  ]) {
    const path =
      name === "icon"
        ? "M 277 523 L 441 687 L 757 355"
        : "M 335 523 L 457 645 L 689 413";
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}</style><svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${background}"/><path d="${path}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    );
    await page.screenshot({ path: `assets/${name}.png`, omitBackground: true });
  }
  await page.setViewportSize({ width: 64, height: 64 });
  await page.setContent(
    '<style>html,body{margin:0;background:transparent}</style><svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="15" fill="#2798EE"/><path d="M 17 33 L 28 43 L 47 23" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );
  await page.screenshot({ path: "assets/favicon.png", omitBackground: true });
} finally {
  await browser.close();
}
