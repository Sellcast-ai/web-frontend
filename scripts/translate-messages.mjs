#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SOURCE = "messages/en.json";
const TARGETS = {
  es: "es",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
  pt: "pt",
  id: "id",
  vi: "vi",
  th: "th",
};

const MANUAL_OVERRIDES = {
  "marketing.heroMock.caption": {
    ja: "この24ドルのガジェットは<highlight>3回</highlight>完売しました 👀",
  },
  "app.toasts.importSucceeded": {
    es: "Importaste {count, plural, one {# producto} other {# productos}} de tu tienda.",
    zh: "已从你的商店导入 {count, plural, one {# 件商品} other {# 件商品}}。",
    ja: "ストアから {count, plural, one {# 個の商品} other {# 個の商品}} をインポートしました。",
    ko: "스토어에서 {count, plural, one {상품 #개} other {상품 #개}}를 가져왔습니다.",
    pt: "Importou {count, plural, one {# produto} other {# produtos}} da sua loja.",
    id: "Mengimpor {count, plural, one {# produk} other {# produk}} dari toko Anda.",
    vi: "Đã nhập {count, plural, one {# sản phẩm} other {# sản phẩm}} từ cửa hàng của bạn.",
    th: "นำเข้า {count, plural, one {สินค้า # รายการ} other {สินค้า # รายการ}} จากร้านค้าของคุณแล้ว",
  },
};

const PROTECT_PATTERNS = [
  /\bLumi\b/g,
  /\bSellcast\b/g,
  /\bSeedance\b/g,
  /\bShopify\b/g,
  /\bTikTok\b/g,
  /\bAmazon\b/g,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?>/g,
  /\{[A-Za-z_][A-Za-z0-9_]*\}/g,
];

const BREAK_PREFIX = "ZXQJX";
const BREAK_SUFFIX = "XQJZ";
const MAX_CHARS = 1000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function flatten(value, prefix = "", out = []) {
  if (typeof value === "string") {
    out.push({ path: prefix, value });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function setAtPath(target, leafPath, value) {
  const parts = leafPath
    .replaceAll("[", ".")
    .replaceAll("]", "")
    .split(".")
    .filter(Boolean);
  let cursor = target;
  for (let i = 0; i < parts.length; i += 1) {
    const raw = parts[i];
    const nextRaw = parts[i + 1];
    const key = /^\d+$/.test(raw) ? Number(raw) : raw;
    if (i === parts.length - 1) {
      cursor[key] = value;
      return;
    }
    const nextIsArray = /^\d+$/.test(nextRaw);
    if (cursor[key] == null) cursor[key] = nextIsArray ? [] : {};
    cursor = cursor[key];
  }
}

function protect(value) {
  const replacements = [];
  let protectedValue = value;

  for (const pattern of PROTECT_PATTERNS) {
    protectedValue = protectedValue.replace(pattern, (match) => {
      const token = `ZXQJY${replacements.length}YQJZ`;
      replacements.push([token, match]);
      return token;
    });
  }

  return { protectedValue, replacements };
}

function restore(value, replacements) {
  let restored = value;
  for (const [token, original] of replacements) {
    const tolerantToken = token.replace(/^Z/, "[ZX]");
    restored = restored.replace(new RegExp(tolerantToken, "gi"), original);
  }
  return restored;
}

function chunks(leaves) {
  const batches = [];
  let current = [];
  let length = 0;
  for (const leaf of leaves) {
    const separator =
      current.length === 0 ? "" : `\n${BREAK_PREFIX}${current.length - 1}${BREAK_SUFFIX}\n`;
    const added = separator.length + leaf.protectedValue.length;
    if (current.length > 0 && length + added > MAX_CHARS) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(leaf);
    length += added;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function translateBatch(batch, googleLocale) {
  const q = batch
    .map((leaf, index) =>
      index === 0
        ? leaf.protectedValue
        : `${BREAK_PREFIX}${index - 1}${BREAK_SUFFIX}\n${leaf.protectedValue}`,
    )
    .join("\n");

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const raw = execFileSync(
        "curl",
        [
          "-4",
          "-sS",
          "--fail",
          "--retry",
          "2",
          "--connect-timeout",
          "10",
          "--max-time",
          "45",
          "--get",
          "https://translate.googleapis.com/translate_a/single",
          "--data-urlencode",
          "client=gtx",
          "--data-urlencode",
          "sl=en",
          "--data-urlencode",
          `tl=${googleLocale}`,
          "--data-urlencode",
          "dt=t",
          "--data-urlencode",
          `q=${q}`,
        ],
        { encoding: "utf8", maxBuffer: 1024 * 1024 * 8 },
      );
      const parsed = JSON.parse(raw);
      const translated = parsed[0].map((segment) => segment[0]).join("");
      const split = translated
        .split(new RegExp(`\\s*${BREAK_PREFIX}\\d+${BREAK_SUFFIX}\\s*`, "gi"))
        .map((part) => part.trim());
      if (split.length === batch.length) return split;
      throw new Error(`expected ${batch.length} translated records, got ${split.length}`);
    } catch (error) {
      if (attempt === 4) throw error;
      sleep(750 * attempt);
    }
  }
  throw new Error("unreachable");
}

function translateLocale(source, locale, googleLocale) {
  const leaves = flatten(source).map((leaf) => {
    const override = MANUAL_OVERRIDES[leaf.path]?.[locale];
    if (override) return { ...leaf, override };
    const { protectedValue, replacements } = protect(leaf.value);
    return { ...leaf, protectedValue, replacements };
  });

  const target = {};
  for (const leaf of leaves.filter((item) => item.override)) {
    setAtPath(target, leaf.path, leaf.override);
  }

  const generatedLeaves = leaves.filter((item) => !item.override);
  let completed = 0;
  for (const batch of chunks(generatedLeaves)) {
    const translated = translateBatch(batch, googleLocale);
    translated.forEach((value, index) => {
      const leaf = batch[index];
      setAtPath(target, leaf.path, restore(value, leaf.replacements));
    });
    completed += batch.length;
    process.stderr.write(`${locale}: ${completed}/${generatedLeaves.length}\n`);
    sleep(125);
  }

  return target;
}

const source = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const requestedLocales = process.argv.slice(2);
const selectedTargets =
  requestedLocales.length === 0
    ? TARGETS
    : Object.fromEntries(
        requestedLocales.map((locale) => {
          if (!TARGETS[locale]) throw new Error(`Unsupported locale: ${locale}`);
          return [locale, TARGETS[locale]];
        }),
      );

for (const [locale, googleLocale] of Object.entries(selectedTargets)) {
  process.stderr.write(`Translating ${locale}...\n`);
  const target = translateLocale(source, locale, googleLocale);
  const targetPath = path.join("messages", `${locale}.json`);
  fs.writeFileSync(targetPath, `${JSON.stringify(target, null, 2)}\n`);
}
