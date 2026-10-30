#!/usr/bin/env node
/*
  FindMeCover data build. Run from the repo root after changing plans.js:

      node tools/build-data.js

  It reads plans.js (PRICES_CHECKED, PROVIDERS, PLANS) and rewrites only the
  content between <!-- data:NAME --> and <!-- /data:NAME --> markers in:
    - index.html                       (plans-jsonld)
    - guides/boiler-cover-prices.html  (checked, stats, table, plans-jsonld)
  and regenerates llms.txt in full.
  It never touches anything outside the markers.
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://www.findmecover.co.uk/";

// ---- load plans.js ----
const src = fs.readFileSync(path.join(ROOT, "plans.js"), "utf8");
const ctx = {};
vm.runInNewContext(src + "\n;this.__d={PRICES_CHECKED, PROVIDERS, PLANS};", ctx);
const { PRICES_CHECKED, PROVIDERS, PLANS } = ctx.__d;

for (const p of PLANS) {
  if (!PROVIDERS[p.provider]) throw new Error(`plans.js: provider "${p.provider}" has no PROVIDERS entry`);
}

// ---- helpers ----
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gbp = n => "£" + n.toFixed(2);
const yr2Num = p => { const m = /£(\d+(?:\.\d+)?)/.exec(p.yr2 || ""); return m ? parseFloat(m[1]) : null; };
const label = p => `${p.provider} ${p.plan}`;
const coverType = p => (p.type === "heating" ? "Boiler and central heating" : "Boiler only");
const priced = PLANS.filter(p => typeof p.price === "number");
const providers = Object.keys(PROVIDERS).filter(name => PLANS.some(p => p.provider === name));

function replaceBlock(text, name, content, file) {
  const re = new RegExp(`(<!-- data:${name} -->)[\\s\\S]*?(<!-- /data:${name} -->)`);
  if (!re.test(text)) throw new Error(`${file}: missing <!-- data:${name} --> markers`);
  return text.replace(re, `$1${content}$2`);
}
function updateFile(rel, blocks) {
  const file = path.join(ROOT, rel);
  let text = fs.readFileSync(file, "utf8");
  for (const [name, content] of Object.entries(blocks)) text = replaceBlock(text, name, content, rel);
  fs.writeFileSync(file, text);
}

// ---- structured data ----
function jsonLd(pageUrl) {
  const items = PLANS.map((p, i) => {
    const product = {
      "@type": "Product",
      name: `${label(p)} (${p.excess})`,
      category: `${coverType(p)} cover`,
      brand: { "@type": "Brand", name: p.provider },
      description: (p.incl || []).join(". ") + ".",
      url: p.url,
    };
    if (typeof p.price === "number") {
      product.offers = {
        "@type": "Offer",
        url: p.url,
        priceCurrency: "GBP",
        price: p.price.toFixed(2),
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: p.price.toFixed(2),
          priceCurrency: "GBP",
          unitText: "per month",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
        seller: { "@type": "Organization", name: p.provider },
        availability: "https://schema.org/InStock",
        description: `Lowest published monthly price for new homeowners, checked ${PRICES_CHECKED}.` + (p.yr2 ? ` Expected year-two price ${p.yr2}.` : "") + (p.deal ? ` Offer: ${p.deal}.` : ""),
      };
    }
    return { "@type": "ListItem", position: i + 1, item: product };
  });
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `UK boiler cover plans compared (prices checked ${PRICES_CHECKED})`,
    url: pageUrl,
    numberOfItems: PLANS.length,
    itemListElement: items,
  };
  return `\n<script type="application/ld+json">${JSON.stringify(data)}</script>\n`;
}

// ---- prices page pieces ----
function statsHtml() {
  const cheapest = [...priced].sort((a, b) => a.price - b.price)[0];
  const dearest = [...priced].sort((a, b) => b.price - a.price)[0];
  const cheapestHeating = [...priced].filter(p => p.type === "heating").sort((a, b) => a.price - b.price)[0];
  const withYr2 = priced.filter(p => yr2Num(p) != null);
  const svc = PLANS.filter(p => p.service);
  const zeroEx = providers.filter(n => PLANS.some(p => p.provider === n && /£0\b/.test(p.excess)));
  const lines = [];
  if (cheapest) lines.push(`<li><strong>Cheapest boiler cover:</strong> ${esc(label(cheapest))} at <strong>${gbp(cheapest.price)} a month</strong>, with ${esc(cheapest.excess.replace(/ excess$/, " excess"))}.</li>`);
  if (cheapestHeating) lines.push(`<li><strong>Cheapest boiler and central heating cover:</strong> ${esc(label(cheapestHeating))} at <strong>${gbp(cheapestHeating.price)} a month</strong>.</li>`);
  if (cheapest && dearest && dearest !== cheapest) lines.push(`<li><strong>Price range:</strong> published prices run from ${gbp(cheapest.price)} to ${gbp(dearest.price)} a month, a difference of about £${Math.round((dearest.price - cheapest.price) * 12)} a year.</li>`);
  for (const p of withYr2) {
    const y2 = yr2Num(p), rise = Math.round((y2 / p.price - 1) * 100);
    lines.push(`<li><strong>Year-two rise:</strong> ${esc(label(p))} goes from ${gbp(p.price)} to ${gbp(y2)} a month in year two if you don't claim, a rise of <strong>${rise}%</strong> (about £${Math.round((y2 - p.price) * 12)} more over the year).</li>`);
  }
  const noYr2 = priced.length - withYr2.length;
  if (noYr2 > 0) lines.push(`<li><strong>Renewal prices are rarely published:</strong> only ${withYr2.length} of the ${priced.length} plans with a published price ${withYr2.length === 1 ? "says" : "say"} what you'll pay in year two.</li>`);
  lines.push(`<li><strong>Annual service:</strong> included as standard in ${svc.length} of the ${PLANS.length} plans we track.</li>`);
  if (zeroEx.length) lines.push(`<li><strong>£0 excess:</strong> available from ${zeroEx.map(esc).join(" and ")}.</li>`);
  return `\n    <ul class="stats">\n      ${lines.join("\n      ")}\n    </ul>\n    `;
}

function tableHtml() {
  const rows = [...PLANS]
    .sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9))
    .map(p => `        <tr><th scope="row">${esc(p.provider)}<span>${esc(p.plan)}</span></th><td>${esc(coverType(p))}</td><td>${typeof p.price === "number" ? `<strong>${gbp(p.price)}</strong>` : "Get a quote"}</td><td>${p.yr2 ? esc(p.yr2) : "Not published"}</td><td>${esc(p.excess)}</td><td>${p.service ? "Included" : "Not included"}</td><td>${p.deal ? esc(p.deal) : "None"}</td></tr>`)
    .join("\n");
  return `
    <div class="tablewrap"><table class="pricetable">
      <thead><tr><th scope="col">Plan</th><th scope="col">Covers</th><th scope="col">Year one, per month</th><th scope="col">Year two</th><th scope="col">Excess</th><th scope="col">Annual service</th><th scope="col">Current offer</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table></div>
    `;
}

// ---- llms.txt ----
function llmsTxt() {
  const planLines = [...PLANS]
    .sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9))
    .map(p => `- ${label(p)} (${coverType(p).toLowerCase()}): ${typeof p.price === "number" ? gbp(p.price) + "/month" : "price on quote"}; ${p.excess}; annual service ${p.service ? "included" : "not included"}${p.yr2 ? `; expected year-two price ${p.yr2}` : ""}${p.deal ? `; offer: ${p.deal}` : ""}. ${p.url}`)
    .join("\n");
  const guides = fs.readdirSync(path.join(ROOT, "guides"))
    .filter(f => f.endsWith(".html") && f !== "index.html")
    .sort()
    .map(f => {
      const html = fs.readFileSync(path.join(ROOT, "guides", f), "utf8");
      const h1 = (/<h1>([\s\S]*?)<\/h1>/.exec(html) || [])[1] || f;
      const desc = (/<meta name="description" content="([^"]*)"/.exec(html) || [])[1] || "";
      const un = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
      return `- [${un(h1)}](${SITE}guides/${f}): ${un(desc)}`;
    })
    .join("\n");
  return `# FindMeCover

> FindMeCover (www.findmecover.co.uk) is a UK comparison site for boiler and central heating cover. It compares plans from ${providers.length > 1 ? providers.slice(0, -1).join(", ") + " and " + providers[providers.length - 1] : providers[0]} side by side, with prices checked daily against each provider's own website. Visitors don't sign up or share details; they click through to buy directly from the provider. Run by Jacob, who has worked in the home cover industry.

Prices below were last checked on ${PRICES_CHECKED}. They are each provider's lowest published monthly price for new homeowners, including any sale. Individual quotes vary by postcode, boiler and excess. Some links on the site are affiliate links; commission never affects how plans are ordered.

## Current plans and prices (checked ${PRICES_CHECKED})

${planLines}

## Key pages

- [Compare boiler cover](${SITE}): all plans side by side, filterable by cover type and annual service, sortable by price or customer rating.
- [Boiler cover prices](${SITE}guides/boiler-cover-prices.html): every plan's year-one and year-two price, excess and offers, updated daily.
- [Boiler cover calculator](${SITE}guides/boiler-cover-calculator.html): compares two years of cover with paying for repairs yourself.
- [About FindMeCover](${SITE}about.html): who runs the site, how prices are checked, and how the site makes money.

## Guides

${guides}
`;
}

// ---- write ----
updateFile("index.html", { "plans-jsonld": jsonLd(SITE) });
updateFile("guides/boiler-cover-prices.html", {
  checked: esc(PRICES_CHECKED),
  stats: statsHtml(),
  table: tableHtml(),
  "plans-jsonld": jsonLd(SITE + "guides/boiler-cover-prices.html"),
});
fs.writeFileSync(path.join(ROOT, "llms.txt"), llmsTxt());
console.log(`Built data for ${PLANS.length} plans from ${providers.length} providers (prices checked ${PRICES_CHECKED}).`);
