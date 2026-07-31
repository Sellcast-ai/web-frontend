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
  // Machine reads "comm." as communication and "MoM" as "Mom" (same bug class
  // as the "Ship -> boat" incident) - these money-surface keys are hand-set.
  "app.productCard.commissionShort": {
    es: "{rate} com.",
    zh: "佣金 {rate}",
    ja: "手数料 {rate}",
    ko: "수수료 {rate}",
    pt: "{rate} com.",
    id: "Komisi {rate}",
    vi: "Hoa hồng {rate}",
    th: "ค่าคอม {rate}",
  },
  "app.productDetail.mom": {
    es: "{percent} intermensual",
    zh: "环比 {percent}",
    ja: "前月比 {percent}",
    ko: "전월 대비 {percent}",
    pt: "{percent} intermensal",
    id: "{percent} vs bulan lalu",
    vi: "{percent} so với tháng trước",
    th: "{percent} เทียบกับเดือนก่อน",
  },
  // Regenerations are metered (1 credit each, same monthly allowance) - the
  // machine seed promised them free. Hand-set so a regen never reopens the lie.
  "marketing.pricing.faq.a1": {
    es: "1 crédito = 1 segundo de video terminado. Un video de 20 segundos usa 20 créditos; uno de 30 segundos usa 30. Tú eliges la duración, así que el costo de cada render está claro antes de empezar.",
    zh: "1 积分 = 1 秒成品视频。20 秒的视频消耗 20 积分，30 秒的消耗 30 积分。时长由你决定，每次渲染的花费在开始前就一目了然。",
    ja: "1クレジット = 完成ビデオ1秒分。20秒のビデオなら20クレジット、30秒なら30クレジットです。長さは自分で選べるので、レンダリングの費用は開始前に常に明確です。",
    ko: "1크레딧 = 완성된 영상 1초. 20초 영상은 20크레딧, 30초 영상은 30크레딧을 사용합니다. 길이를 직접 선택하므로 렌더링 비용은 시작하기 전에 항상 명확합니다.",
    pt: "1 crédito = 1 segundo de vídeo finalizado. Um vídeo de 20 segundos usa 20 créditos; um de 30 segundos usa 30. Você escolhe a duração, então o custo de cada render fica claro antes de começar.",
    id: "1 kredit = 1 detik video jadi. Video 20 detik memakai 20 kredit; yang 30 detik memakai 30. Anda memilih durasinya, jadi biaya setiap render selalu jelas sebelum dimulai.",
    vi: "1 tín dụng = 1 giây video hoàn chỉnh. Video 20 giây tốn 20 tín dụng; video 30 giây tốn 30. Bạn tự chọn độ dài, nên chi phí mỗi lần render luôn rõ ràng trước khi bắt đầu.",
    th: "1 เครดิต = วิดีโอสำเร็จ 1 วินาที วิดีโอ 20 วินาทีใช้ 20 เครดิต ส่วน 30 วินาทีใช้ 30 เครดิต คุณเลือกความยาวเอง จึงรู้ต้นทุนของการเรนเดอร์แต่ละครั้งก่อนเริ่มเสมอ",
  },
  "marketing.pricing.faq.a2": {
    es: "Sí: 1 crédito por regeneración. Volver a generar una toma durante la revisión se descuenta del mismo saldo mensual que tu render final.",
    zh: "需要。每重新生成一个镜头消耗 1 积分，与最终渲染共用同一份月度额度。",
    ja: "はい、1回につき1クレジットです。レビュー中のショットの再生成は、最終レンダリングと同じ月間クレジットから消費されます。",
    ko: "네, 재생성 1회당 1크레딧이 사용됩니다. 검토 중 숏을 다시 생성하면 최종 렌더링과 같은 월간 크레딧에서 차감됩니다.",
    pt: "Sim — 1 crédito por regeneração. Refazer um take durante a revisão sai do mesmo saldo mensal do seu render final.",
    id: "Ya — 1 kredit setiap kali membuat ulang. Membuat ulang shot saat peninjauan memotong jatah bulanan yang sama dengan render final Anda.",
    vi: "Có — mỗi lần tạo lại tốn 1 tín dụng. Tạo lại một cảnh trong lúc duyệt sẽ trừ vào cùng hạn mức tín dụng hằng tháng với lần render cuối cùng của bạn.",
    th: "มี การสร้างใหม่แต่ละครั้งใช้ 1 เครดิต การสร้างช็อตใหม่ระหว่างรีวิวจะหักจากเครดิตรายเดือนก้อนเดียวกับการเรนเดอร์ขั้นสุดท้ายของคุณ",
  },
  // Same metered-regen lie lived in the hand-translated landing copy - these
  // two keys now state the 1-credit regen charge instead of "nothing is
  // charged until you sign off".
  "marketing.landing.why.review.body": {
    es: "Cada toma recibe primero un fotograma de referencia. Aprueba, ajusta o regenera hasta que te convenza — cada regeneración cuesta 1 crédito, y el render completo solo gasta créditos cuando das el visto bueno.",
    zh: "每个镜头都会先生成一张参考图。通过、微调或重新生成，直到满意为止——重新生成一次扣 1 积分，完整渲染只有在你点头之后才消耗积分。",
    ja: "すべてのショットに、まず参考フレームが付きます。納得いくまで承認・微調整・再生成できます。再生成は1回1クレジット、本番レンダリングのクレジットが減るのは、あなたがGOを出してからです。",
    ko: "모든 숏에 참조 프레임이 먼저 생성됩니다. 마음에 들 때까지 승인하고, 다듬고, 다시 생성하세요. 재생성은 1회 1크레딧이며, 전체 렌더링 크레딧은 당신이 승인한 뒤에만 소모됩니다.",
    pt: "Cada take recebe antes um frame de referência. Aprove, ajuste ou regenere até ficar do jeito certo — cada regeneração custa 1 crédito, e o render completo só queima créditos depois do seu ok.",
    id: "Setiap shot mendapat frame acuan lebih dulu. Setujui, rapikan, atau buat ulang sampai pas — setiap pembuatan ulang memakai 1 kredit, dan render penuh baru memakai kredit setelah Anda bilang jalan.",
    vi: "Mỗi cảnh có một khung hình tham chiếu trước. Duyệt, chỉnh, hoặc tạo lại đến khi ưng ý — mỗi lần tạo lại tốn 1 credit, và bản render đầy đủ chỉ bị trừ credit sau khi bạn bấm chạy.",
    th: "ทุกช็อตจะได้เฟรมอ้างอิงก่อน อนุมัติ ปรับ หรือสร้างใหม่ได้จนกว่าจะถูกใจ — สร้างใหม่ครั้งละ 1 เครดิต ส่วนการเรนเดอร์เต็มจะใช้เครดิตก็ต่อเมื่อคุณสั่งลุย",
  },
  "marketing.landing.storySteps.approve.body": {
    es: "Cada beat recibe primero un fotograma de referencia. Regenerar cuesta 1 crédito — el render completo, y su cobro, espera hasta que des tu visto bueno.",
    zh: "每个分镜先出参考图。重新生成一次扣 1 积分；完整渲染和相应的扣费，都等你确认后才开始。",
    ja: "各ビートには先に参考フレームが付きます。再生成は1回1クレジット。本番レンダリングとその課金は、あなたが承認するまで始まりません。",
    ko: "모든 비트에 참조 프레임이 먼저 생성됩니다. 재생성은 1회 1크레딧이며, 전체 렌더링과 과금은 당신이 사인하기 전까지 시작되지 않습니다.",
    pt: "Cada beat recebe antes um frame de referência. Regenerar custa 1 crédito — o render completo, e a cobrança, só acontece depois do seu ok.",
    id: "Setiap beat mendapat frame acuan lebih dulu. Membuat ulang memakai 1 kredit — render penuh, dan tagihannya, baru berjalan setelah Anda setuju.",
    vi: "Mỗi beat có khung hình tham chiếu trước. Tạo lại tốn 1 credit mỗi lần — bản render đầy đủ, và khoản phí của nó, chỉ bắt đầu sau khi bạn ký duyệt.",
    th: "ทุกบีตจะได้เฟรมอ้างอิงก่อน สร้างใหม่ครั้งละ 1 เครดิต ส่วนการเรนเดอร์เต็มและการเก็บเงินจะเริ่มก็ต่อเมื่อคุณเซ็นผ่าน",
  },
  // zh machine seed used 学分 (academic course credits) with garbled word order;
  // ko/pt/vi/id had milder word-order drift on the same money-surface string.
  "app.studio.usageSummary": {
    zh: "本月剩余 {remaining}/{limit} 积分 · 此视频将消耗 {duration} 积分",
    ko: "이번 달에는 {limit} 크레딧 중 {remaining} 크레딧이 남아 있습니다 · 이 영상은 {duration} 크레딧을 사용합니다",
    pt: "{remaining} de {limit} créditos restantes este mês · este vídeo usa {duration} créditos",
    id: "{remaining} dari {limit} kredit tersisa bulan ini · video ini menggunakan {duration} kredit",
    vi: "Còn {remaining}/{limit} tín dụng trong tháng này · video này dùng {duration} tín dụng",
  },
  // ja machine seed left these two in English while the other locales translated.
  "app.productCard.source.amazon": {
    ja: "Amazonから",
  },
  "app.productCard.source.shopify": {
    ja: "Shopifyから",
  },
  "marketing.header.startFreeMobile": {
    es: "Empieza",
    zh: "开始",
    ja: "開始",
    ko: "시작",
    pt: "Comece",
    id: "Mulai",
    vi: "Bắt đầu",
    th: "เริ่ม",
  },
  "shared.theme.label": {
    es: "Tema",
    zh: "主题",
    ja: "テーマ",
    ko: "테마",
    pt: "Tema",
    id: "Tema",
    vi: "Chủ đề",
    th: "ธีม",
  },
  "shared.theme.light": {
    es: "Claro",
    zh: "浅色",
    ja: "ライト",
    ko: "라이트",
    pt: "Claro",
    id: "Terang",
    vi: "Sáng",
    th: "สว่าง",
  },
  "shared.theme.system": {
    es: "Sistema",
    zh: "系统",
    ja: "システム",
    ko: "시스템",
    pt: "Sistema",
    id: "Sistem",
    vi: "Hệ thống",
    th: "ระบบ",
  },
  "shared.theme.dark": {
    es: "Oscuro",
    zh: "深色",
    ja: "ダーク",
    ko: "다크",
    pt: "Escuro",
    id: "Gelap",
    vi: "Tối",
    th: "มืด",
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
