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
  // Studio's capability-narrowing copy: the machine turns a two-letter badge
  // like "n/a" into a sentence, reads "Fast" in the model name as an adjective
  // to translate, and renders "Temporarily unavailable" as a speed claim. All
  // hand-set per locale on the wording that surface already uses.
  "app.studio.modes.unavailable": {
    es: "Temporalmente no disponible",
    zh: "暂时不可用",
    ja: "一時的に利用できません",
    ko: "일시적으로 사용할 수 없음",
    pt: "Temporariamente indisponível",
    id: "Sementara tidak tersedia",
    vi: "Tạm thời chưa có",
    th: "ไม่พร้อมใช้งานชั่วคราว",
  },
  "app.studio.modes.unavailableNote": {
    es: "{mode} no está disponible ahora mismo. Elige otro modo para generar.",
    zh: "{mode} 暂时不可用。请选择其他模式来生成。",
    ja: "{mode} は現在利用できません。別のモードを選んで生成してください。",
    ko: "{mode}은(는) 지금 사용할 수 없습니다. 다른 모드를 선택해 생성하세요.",
    pt: "{mode} está indisponível agora. Escolha outro modo para gerar.",
    id: "{mode} sedang tidak tersedia. Pilih mode lain untuk membuat video.",
    vi: "{mode} hiện chưa khả dụng. Hãy chọn chế độ khác để tạo video.",
    th: "{mode} ยังใช้งานไม่ได้ตอนนี้ เลือกโหมดอื่นเพื่อสร้างวิดีโอ",
  },
  "app.studio.modes.unavailableAllNote": {
    es: "Ningún modo de generación está disponible ahora mismo. Inténtalo más tarde.",
    zh: "目前没有可用的生成模式。请稍后再试。",
    ja: "現在利用できる生成モードがありません。しばらくしてからお試しください。",
    ko: "지금은 사용할 수 있는 생성 모드가 없습니다. 잠시 후 다시 시도해 주세요.",
    pt: "Nenhum modo de geração está disponível agora. Tente novamente mais tarde.",
    id: "Tidak ada mode pembuatan yang tersedia saat ini. Coba lagi nanti.",
    vi: "Hiện không có chế độ tạo video nào khả dụng. Vui lòng thử lại sau.",
    th: "ขณะนี้ไม่มีโหมดสร้างวิดีโอที่ใช้งานได้ กรุณาลองใหม่ภายหลัง",
  },
  "app.studio.models.seedance20Fast.label": {
    es: "Seedance 2.0 Fast",
    zh: "Seedance 2.0 Fast",
    ja: "Seedance 2.0 Fast",
    ko: "Seedance 2.0 Fast",
    pt: "Seedance 2.0 Fast",
    id: "Seedance 2.0 Fast",
    vi: "Seedance 2.0 Fast",
    th: "Seedance 2.0 Fast",
  },
  "app.studio.models.seedance20Fast.blurb": {
    es: "Más rápido · hasta 720p",
    zh: "更快 · 最高 720p",
    ja: "高速・最大720p",
    ko: "더 빠름 · 최대 720p",
    pt: "Mais rápido · até 720p",
    id: "Lebih cepat · hingga 720p",
    vi: "Nhanh hơn · lên tới 720p",
    th: "เร็วขึ้น · สูงถึง 720p",
  },
  "app.studio.optionUnavailable.title": {
    es: "No disponible con este modo",
    zh: "此模式不支持",
    ja: "このモードでは利用できません",
    ko: "이 모드에서는 사용할 수 없음",
    pt: "Não disponível neste modo",
    id: "Tidak tersedia untuk mode ini",
    vi: "Không khả dụng ở chế độ này",
    th: "ไม่รองรับในโหมดนี้",
  },
  "app.studio.optionUnavailable.badge": {
    es: "n/d",
    zh: "不适用",
    ja: "対象外",
    ko: "미지원",
    pt: "n/d",
    id: "n/a",
    vi: "n/a",
    th: "ไม่รองรับ",
  },
  // The one toast standing in for the backend's untranslated credit-refusal
  // prose - the machine reads "credits" as academic credits and "render" as a
  // drawing verb, so every locale is hand-set on the unit noun it already uses.
  "app.toasts.outOfCredits": {
    es: "No tienes créditos suficientes para este render.",
    zh: "积分不足，无法完成这次渲染。",
    ja: "このレンダリングに必要なクレジットが足りません。",
    ko: "이 렌더링에 필요한 크레딧이 부족합니다.",
    pt: "Créditos insuficientes para este render.",
    id: "Kredit tidak cukup untuk render ini.",
    vi: "Không đủ tín dụng cho lần render này.",
    th: "เครดิตไม่พอสำหรับการเรนเดอร์ครั้งนี้",
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
  // Regenerations are metered (1 credit each, same credit balance) - the
  // machine seed promised them free. Hand-set so a regen never reopens the lie.
  "marketing.pricing.faq.a2": {
    es: "Sí: 1 crédito por regeneración. Volver a generar una toma durante la revisión se descuenta del mismo saldo de créditos que tu render final.",
    zh: "需要。每重新生成一个镜头消耗 1 积分，与最终渲染共用同一份积分余额。",
    ja: "はい、1回につき1クレジットです。レビュー中のショットの再生成は、最終レンダリングと同じクレジット残高から消費されます。",
    ko: "네, 재생성 1회당 1크레딧이 사용됩니다. 검토 중 숏을 다시 생성하면 최종 렌더링과 같은 크레딧 잔액에서 차감됩니다.",
    pt: "Sim — 1 crédito por regeneração. Refazer um take durante a revisão sai do mesmo saldo de créditos do seu render final.",
    id: "Ya — 1 kredit setiap kali membuat ulang. Membuat ulang shot saat peninjauan memotong saldo kredit yang sama dengan render final Anda.",
    vi: "Có — mỗi lần tạo lại tốn 1 tín dụng. Tạo lại một cảnh trong lúc duyệt sẽ trừ vào cùng số dư tín dụng với lần render cuối cùng của bạn.",
    th: "มี การสร้างใหม่แต่ละครั้งใช้ 1 เครดิต การสร้างช็อตใหม่ระหว่างรีวิวจะหักจากยอดเครดิตก้อนเดียวกับการเรนเดอร์ขั้นสุดท้ายของคุณ",
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
    vi: "Mỗi cảnh có một khung hình tham chiếu trước. Duyệt, chỉnh, hoặc tạo lại đến khi ưng ý — mỗi lần tạo lại tốn 1 tín dụng, và bản render đầy đủ chỉ bị trừ tín dụng sau khi bạn bấm chạy.",
    th: "ทุกช็อตจะได้เฟรมอ้างอิงก่อน อนุมัติ ปรับ หรือสร้างใหม่ได้จนกว่าจะถูกใจ — สร้างใหม่ครั้งละ 1 เครดิต ส่วนการเรนเดอร์เต็มจะใช้เครดิตก็ต่อเมื่อคุณสั่งลุย",
  },
  "marketing.landing.storySteps.approve.body": {
    es: "Cada toma recibe primero un fotograma de referencia. Regenerar cuesta 1 crédito — el render completo, y su cobro, espera hasta que des tu visto bueno.",
    zh: "每个镜头先出参考图。重新生成一次扣 1 积分；完整渲染和相应的扣费，都等你确认后才开始。",
    ja: "各ショットには先に参考フレームが付きます。再生成は1回1クレジット。本番レンダリングとその課金は、あなたが承認するまで始まりません。",
    ko: "모든 숏에 참조 프레임이 먼저 생성됩니다. 재생성은 1회 1크레딧이며, 전체 렌더링과 과금은 당신이 사인하기 전까지 시작되지 않습니다.",
    pt: "Cada take recebe antes um frame de referência. Regenerar custa 1 crédito — o render completo, e a cobrança, só acontece depois do seu ok.",
    id: "Setiap shot mendapat frame acuan lebih dulu. Membuat ulang memakai 1 kredit — render penuh, dan tagihannya, baru berjalan setelah Anda setuju.",
    vi: "Mỗi cảnh có khung hình tham chiếu trước. Tạo lại tốn 1 tín dụng mỗi lần — bản render đầy đủ, và khoản phí của nó, chỉ bắt đầu sau khi bạn ký duyệt.",
    th: "ทุกช็อตจะได้เฟรมอ้างอิงก่อน สร้างใหม่ครั้งละ 1 เครดิต ส่วนการเรนเดอร์เต็มและการเก็บเงินจะเริ่มก็ต่อเมื่อคุณเซ็นผ่าน",
  },
  // ja machine seed left these two in English while the other locales translated.
  "app.productCard.source.amazon": {
    ja: "Amazonから",
  },
  "app.productCard.source.shopify": {
    ja: "Shopifyから",
  },
  "app.format.justNow": {
    es: "ahora mismo",
    zh: "刚刚",
    ja: "たった今",
    ko: "방금",
    pt: "agora mesmo",
    id: "baru saja",
    vi: "vừa xong",
    th: "เมื่อกี้",
  },
  "app.format.minutesAgo": {
    es: "hace {n} min",
    zh: "{n}分钟前",
    ja: "{n}分前",
    ko: "{n}분 전",
    pt: "há {n} min",
    id: "{n} mnt lalu",
    vi: "{n} phút trước",
    th: "{n} นาทีที่แล้ว",
  },
  "app.format.hoursAgo": {
    es: "hace {n} h",
    zh: "{n}小时前",
    ja: "{n}時間前",
    ko: "{n}시간 전",
    pt: "há {n} h",
    id: "{n} jam lalu",
    vi: "{n} giờ trước",
    th: "{n} ชั่วโมงที่แล้ว",
  },
  "app.format.daysAgo": {
    es: "hace {n} d",
    zh: "{n}天前",
    ja: "{n}日前",
    ko: "{n}일 전",
    pt: "há {n} d",
    id: "{n} hari lalu",
    vi: "{n} ngày trước",
    th: "{n} วันที่แล้ว",
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
  // Storyboard context labels: bare one-word nouns the machine reads
  // geometrically - "Angle" is the editorial angle-of-approach of `hook_angle`,
  // not a measurement in degrees (ko "각도", id "Sudut"), and "Audience" is the
  // buyer the video is aimed at. `noVisual` is the shot card's missing-visual
  // fallback, where "visual" is the shot's camera direction, not an adjective.
  "app.jobs.storyboard.context.angle": {
    es: "Ángulo",
    zh: "角度",
    ja: "切り口",
    ko: "접근 방식",
    pt: "Ângulo",
    id: "Sudut pandang",
    vi: "Góc tiếp cận",
    th: "มุมมอง",
  },
  "app.jobs.storyboard.context.audience": {
    es: "Audiencia",
    zh: "受众",
    ja: "視聴者",
    ko: "대상",
    pt: "Público",
    id: "Audiens",
    vi: "Đối tượng",
    th: "ผู้ชม",
  },
  // Shot-card line labels (icon + screen-reader text): "line" here is a spoken
  // script line, which the machine reads as a wire or circuit (zh "语音线路",
  // th "สายพูด"), and "visual" is the shot's camera direction, not an adjective.
  "app.jobs.shotCard.spokenLine": {
    es: "Diálogo",
    zh: "口播台词",
    ja: "セリフ",
    ko: "대사",
    pt: "Fala",
    id: "Kalimat yang diucapkan",
    vi: "Lời thoại",
    th: "บทพูด",
  },
  "app.jobs.shotCard.noSpokenLine": {
    es: "Sin diálogo",
    zh: "没有口播台词",
    ja: "セリフなし",
    ko: "대사 없음",
    pt: "Sem fala",
    id: "Tidak ada kalimat yang diucapkan",
    vi: "Không có lời thoại",
    th: "ไม่มีบทพูด",
  },
  "app.jobs.shotCard.visual": {
    es: "Indicación visual",
    zh: "视觉说明",
    ja: "映像の指定",
    ko: "시각적 설명",
    pt: "Direção visual",
    id: "Arahan visual",
    vi: "Mô tả hình ảnh",
    th: "คำอธิบายภาพ",
  },
  "app.jobs.shotCard.noVisual": {
    es: "Sin indicación visual",
    zh: "没有视觉说明",
    ja: "映像の指定なし",
    ko: "시각적 설명 없음",
    pt: "Sem direção visual",
    id: "Tidak ada arahan visual",
    vi: "Chưa có mô tả hình ảnh",
    th: "ไม่มีคำอธิบายภาพ",
  },
  // pricing-copy-c4 (captain decisions 2026-08-01): credits track real render
  // cost (model/resolution/aspect ratio - no claim that Studio displays it
  // until the cost-preview UI ships), free grant is 300 one-time, plans are
  // 900/3,000/7,500, storyboard-first wording, 5 aspect ratios, and only
  // Seedance 2.0 live in the picker (2.0 Fast and 2.0 Mini are coming soon,
  // 2.5 after them). Hand-set in all 9 locales - the
  // machine mangles money surfaces, reads 'Live'/'left' as directions and the
  // Creator tier as a deity in id ('Pencipta'). Do not remove these pins.
  "app.profile.creditNote": {
    es: "Los créditos reflejan el costo real del render: el costo exacto depende del modelo, la resolución y la relación de aspecto que elijas.",
    zh: "积分对应真实渲染成本——确切费用取决于你选择的模型、分辨率和宽高比。",
    ja: "クレジットは実際のレンダリングコストに連動します。正確なコストは選んだモデル・解像度・アスペクト比によって変わります。",
    ko: "크레딧은 실제 렌더링 비용을 반영합니다 - 정확한 비용은 선택한 모델, 해상도, 화면 비율에 따라 달라집니다.",
    pt: "Os créditos acompanham o custo real do render - o custo exato depende do modelo, da resolução e da proporção de tela que você escolher.",
    id: "Kredit mengikuti biaya render nyata - biaya pastinya tergantung pada model, resolusi, dan rasio aspek yang Anda pilih.",
    vi: "Tín dụng phản ánh chi phí render thực tế - chi phí chính xác phụ thuộc vào mô hình, độ phân giải và tỷ lệ khung hình bạn chọn.",
    th: "เครดิตสะท้อนต้นทุนการเรนเดอร์จริง - ต้นทุนที่แน่ชัดขึ้นอยู่กับโมเดล ความละเอียด และอัตราส่วนภาพที่คุณเลือก",
  },
  "app.profile.creditsLeft": {
    es: "restantes",
    zh: "剩余积分",
    ja: "残りクレジット",
    ko: "크레딧 남음",
    pt: "restantes",
    id: "tersisa",
    vi: "còn lại",
    th: "คงเหลือ",
  },
  "app.profile.creditsOneTime": {
    es: "Tus créditos",
    zh: "你的积分",
    ja: "あなたのクレジット",
    ko: "내 크레딧",
    pt: "Seus créditos",
    id: "Kredit Anda",
    vi: "Tín dụng của bạn",
    th: "เครดิตของคุณ",
  },
  // Plan-neutral twin of limitHitOneTime: an unrecognised plan literal takes
  // the one-time wording, and must not be told its *free* credits ran out.
  "app.profile.limitHitCredits": {
    es: "Has usado tus créditos.",
    zh: "你的积分已用完。",
    ja: "クレジットを使い切りました。",
    ko: "크레딧을 모두 사용했습니다.",
    pt: "Você usou seus créditos.",
    id: "Kredit Anda sudah habis.",
    vi: "Bạn đã dùng hết tín dụng.",
    th: "คุณใช้เครดิตหมดแล้ว",
  },
  // Renewing-plan third of the usage card (thisMonth/usageSummary/limitHit).
  // Pinned alongside its one-time and neutral twins so all three thirds stay
  // one voice: the machine seed inverted {used}/{limit} on a money surface.
  "app.profile.limitHit": {
    es: "Has alcanzado tu límite mensual.",
    zh: "你本月的积分已用完。",
    ja: "今月の上限に達しました。",
    ko: "이번 달 한도를 모두 사용했습니다.",
    pt: "Você atingiu seu limite mensal.",
    id: "Anda telah mencapai batas bulanan.",
    vi: "Bạn đã dùng hết hạn mức tháng này.",
    th: "คุณใช้เครดิตของเดือนนี้หมดแล้ว",
  },
  "app.profile.limitHitOneTime": {
    es: "Has usado tus créditos gratuitos.",
    zh: "你的免费积分已用完。",
    ja: "無料クレジットを使い切りました。",
    ko: "무료 크레딧을 모두 사용했습니다.",
    pt: "Você usou seus créditos gratuitos.",
    id: "Kredit gratis Anda sudah habis.",
    vi: "Bạn đã dùng hết tín dụng miễn phí.",
    th: "คุณใช้เครดิตฟรีหมดแล้ว",
  },
  // One label, three render sites (profile card, Studio notice, landing pricing
  // footer) - all pinned together so a regeneration can't ship two spellings of
  // the same link. The machine reads "plans" as intentions (id/vi) or drawings
  // (es "planos", which is also Portuguese), never a subscription tier.
  "app.profile.seePlans": {
    es: "Ver planes",
    zh: "查看套餐",
    ja: "プランを見る",
    ko: "요금제 보기",
    pt: "Ver planos",
    id: "Lihat paket",
    vi: "Xem các gói",
    th: "ดูแพ็กเกจ",
  },
  "app.studio.seePlans": {
    es: "Ver planes",
    zh: "查看套餐",
    ja: "プランを見る",
    ko: "요금제 보기",
    pt: "Ver planos",
    id: "Lihat paket",
    vi: "Xem các gói",
    th: "ดูแพ็กเกจ",
  },
  "marketing.landing.seePlans": {
    es: "Ver planes",
    zh: "查看套餐",
    ja: "プランを見る",
    ko: "요금제 보기",
    pt: "Ver planos",
    id: "Lihat paket",
    vi: "Xem các gói",
    th: "ดูแพ็กเกจ",
  },
  "app.profile.thisMonth": {
    es: "Este mes",
    zh: "本月",
    ja: "今月",
    ko: "이번 달",
    pt: "Este mês",
    id: "Bulan ini",
    vi: "Tháng này",
    th: "เดือนนี้",
  },
  "app.profile.usageSummary": {
    es: "{used} de {limit} créditos usados · plan {plan} · se renueva el {date}",
    zh: "已使用 {limit} 积分中的 {used} · {plan} 套餐 · {date} 重置",
    ja: "{limit} クレジット中 {used} を使用 · {plan} プラン · {date} にリセット",
    ko: "{limit} 크레딧 중 {used} 사용 · {plan} 플랜 · {date} 갱신",
    pt: "{used} de {limit} créditos usados · plano {plan} · renova em {date}",
    id: "{used} dari {limit} kredit terpakai · paket {plan} · diperbarui {date}",
    vi: "Đã dùng {used}/{limit} tín dụng · gói {plan} · làm mới ngày {date}",
    th: "ใช้ไป {used} จาก {limit} เครดิต · แพลน {plan} · รีเซ็ต {date}",
  },
  // Renewal-neutral twin: an unrecognised plan literal must claim neither a
  // monthly reset nor a one-time grant, since nobody knows which it is.
  "app.profile.usageSummaryNeutral": {
    es: "{used} de {limit} créditos usados · plan {plan}",
    zh: "已使用 {limit} 积分中的 {used} · {plan} 套餐",
    ja: "{limit} クレジット中 {used} を使用 · {plan} プラン",
    ko: "{limit} 크레딧 중 {used} 사용 · {plan} 플랜",
    pt: "{used} de {limit} créditos usados · plano {plan}",
    id: "{used} dari {limit} kredit terpakai · paket {plan}",
    vi: "Đã dùng {used}/{limit} tín dụng · gói {plan}",
    th: "ใช้ไป {used} จาก {limit} เครดิต · แพลน {plan}",
  },
  "app.profile.usageSummaryOneTime": {
    es: "{used} de {limit} créditos usados · plan {plan} · asignación única, no se renueva",
    zh: "已使用 {limit} 积分中的 {used} · {plan} 套餐 · 一次性发放，不会续期",
    ja: "{limit} クレジット中 {used} を使用 · {plan} プラン · 1回限りの付与、更新なし",
    ko: "{limit} 크레딧 중 {used} 사용 · {plan} 플랜 · 일회성 지급, 갱신 없음",
    pt: "{used} de {limit} créditos usados · plano {plan} · concessão única, não renova",
    id: "{used} dari {limit} kredit terpakai · paket {plan} · pemberian satu kali, tidak diperbarui",
    vi: "Đã dùng {used}/{limit} tín dụng · gói {plan} · cấp một lần, không gia hạn",
    th: "ใช้ไป {used} จาก {limit} เครดิต · แพลน {plan} · ให้ครั้งเดียว ไม่ต่ออายุ",
  },
  // Studio quotes no per-render cost until the backend credit lane flips: the
  // deployed backend still meters seconds, so a client-computed cost would
  // contradict the backend's own 429 prose on the same screen. render-cost.ts
  // holds the flip-ready computation - re-enabling is one string each.
  "app.studio.outOfQuota": {
    es: "No hay suficientes créditos para este video (quedan {remaining} de {limit}).",
    zh: "积分不足，无法生成此视频（剩余 {remaining}/{limit}）。",
    ja: "この動画にはクレジットが足りません（残り {remaining}/{limit}）。",
    ko: "이 영상을 만들 크레딧이 부족합니다({limit} 중 {remaining} 남음).",
    pt: "Créditos insuficientes para este vídeo ({remaining} de {limit} restantes).",
    id: "Kredit tidak cukup untuk video ini (tersisa {remaining} dari {limit}).",
    vi: "Không đủ tín dụng cho video này (còn {remaining}/{limit}).",
    th: "เครดิตไม่พอสำหรับวิดีโอนี้ (เหลือ {remaining} จาก {limit})",
  },
  "app.studio.usageSummary": {
    es: "{remaining} de {limit} créditos restantes",
    zh: "剩余 {remaining}/{limit} 积分",
    ja: "残り {remaining}/{limit} クレジット",
    ko: "{limit} 크레딧 중 {remaining} 크레딧 남음",
    pt: "{remaining} de {limit} créditos restantes",
    id: "{remaining} dari {limit} kredit tersisa",
    vi: "Còn {remaining}/{limit} tín dụng",
    th: "เหลือ {remaining}/{limit} เครดิต",
  },
  "auth.layout.benefitPublish": {
    es: "5 relaciones de aspecto para cada plataforma",
    zh: "5 种宽高比适配各平台",
    ja: "あらゆるプラットフォームに対応する5つのアスペクト比",
    ko: "모든 플랫폼에 맞는 5가지 화면 비율",
    pt: "5 proporções de tela para cada plataforma",
    id: "5 rasio aspek untuk setiap platform",
    vi: "5 tỷ lệ khung hình cho mọi nền tảng",
    th: "5 อัตราส่วนภาพสำหรับทุกแพลตฟอร์ม",
  },
  "auth.layout.benefitReview": {
    es: "Revisa cada toma antes de renderizar",
    zh: "渲染前审阅每个镜头",
    ja: "レンダリング前にすべてのショットを確認",
    ko: "렌더링 전 모든 숏 검토",
    pt: "Revise cada take antes do render",
    id: "Tinjau setiap shot sebelum dirender",
    vi: "Xem từng cảnh trước khi render",
    th: "ตรวจทุกช็อตก่อนเรนเดอร์",
  },
  "marketing.about.intro2": {
    es: "Lumi toma otro camino. Antes de escribir un guion, estudia una amplia muestra de los éxitos orgánicos reales de la categoría de tu producto y aprende la <em>estructura</em> que convierte — luego escribe, storyboarda y renderiza un video que revisas toma por toma y publicas en minutos.",
    zh: "Lumi 走了一条不同的路。在动笔写脚本之前，它会研究你产品所在品类中大量真实的自然爆款，学习其中能促成转化的<em>结构</em>——然后完成脚本、分镜和渲染，你逐镜头审阅，几分钟即可发布。",
    ja: "Lumi は別のアプローチを取ります。脚本を書く前に、あなたの商品カテゴリーで実際に成果を上げたオーガニック動画を大量に分析し、コンバージョンにつながる<em>構造</em>を学習します。そして脚本・ストーリーボード・レンダリングを行い、あなたはショットごとに確認して数分で公開できます。",
    ko: "Lumi는 다른 길을 갑니다. 스크립트를 쓰기 전에 제품 카테고리에서 실제로 성과를 낸 오가닉 인기 영상을 대량으로 연구해 전환을 만드는 <em>구조</em>를 학습합니다. 그런 다음 스크립트, 스토리보드, 렌더링까지 만들어 내면, 당신은 숏별로 검토하고 몇 분 만에 게시합니다.",
    pt: "Lumi segue outro caminho. Antes de escrever um roteiro, estuda uma grande amostra dos sucessos orgânicos reais da categoria do seu produto e aprende a <em>estrutura</em> que converte — depois roteiriza, storyboarda e renderiza um vídeo que você revisa take a take e publica em minutos.",
    id: "Lumi mengambil jalan berbeda. Sebelum menulis skrip, ia mempelajari sampel besar konten organik berperforma terbaik di kategori produk Anda dan mempelajari <em>struktur</em> yang menghasilkan konversi — lalu menulis skrip, membuat storyboard, dan merender video yang Anda tinjau shot demi shot dan terbitkan dalam hitungan menit.",
    vi: "Lumi đi một hướng khác. Trước khi viết kịch bản, nó nghiên cứu một mẫu lớn các video tự nhiên hiệu quả nhất trong ngành của bạn và học <em>cấu trúc</em> tạo ra chuyển đổi — rồi viết kịch bản, dựng storyboard và render video để bạn xem từng cảnh và đăng trong vài phút.",
    th: "Lumi เดินคนละเส้นทาง ก่อนเขียนสคริปต์ มันศึกษาตัวอย่างจำนวนมากจากวิดีโอออร์แกนิกที่ประสบความสำเร็จจริงในหมวดสินค้าของคุณ และเรียนรู้<em>โครงสร้าง</em>ที่ทำให้เกิดยอดขาย — จากนั้นจึงเขียนสคริปต์ ทำสตอรี่บอร์ด และเรนเดอร์วิดีโอที่คุณตรวจทีละช็อตและเผยแพร่ได้ในไม่กี่นาที",
  },
  "marketing.about.values.control.body": {
    es: "Revisa el storyboard toma por toma. El render completo solo gasta créditos tras tu visto bueno.",
    zh: "逐镜头审阅分镜。完整渲染只在你签字确认后才消耗积分。",
    ja: "ストーリーボードをショットごとに確認。本番レンダリングがクレジットを消費するのは承認後だけです。",
    ko: "스토리보드를 숏별로 검토하세요. 전체 렌더링은 당신의 승인 후에만 크레딧을 사용합니다.",
    pt: "Revise o storyboard take a take. O render completo só gasta créditos depois do seu ok.",
    id: "Tinjau storyboard shot demi shot. Render penuh hanya memakai kredit setelah persetujuan Anda.",
    vi: "Duyệt storyboard từng cảnh một. Bản render đầy đủ chỉ tiêu tín dụng sau khi bạn ký duyệt.",
    th: "ตรวจสตอรี่บอร์ดทีละช็อต การเรนเดอร์เต็มจะใช้เครดิตหลังคุณเซ็นผ่านเท่านั้น",
  },
  "marketing.faq.a3": {
    es: "Sí. Tu guion llega como un storyboard de tomas, cada una con un fotograma de referencia generado primero. Aprueba las tomas que te gusten, regenera las que no por 1 crédito cada una, y solo cuando apruebas el render completo gasta créditos.",
    zh: "可以。你的脚本会以分镜的形式呈现，每个镜头都会先生成一张参考画面。满意的镜头直接通过，不满意的可以重新生成，每次 1 积分；只有在你确认之后，完整渲染才会消耗积分。",
    ja: "はい。脚本はショットごとのストーリーボードとして届き、各ショットの参照フレームが先に生成されます。気に入ったショットは承認し、そうでないものは1クレジットで再生成。承認して初めて、本番レンダリングがクレジットを消費します。",
    ko: "네. 스크립트는 숏 단위 스토리보드로 도착하며, 각 숏의 참조 프레임이 먼저 생성됩니다. 마음에 드는 숏은 승인하고 아닌 숏은 1크레딧으로 다시 생성하세요. 승인한 뒤에야 전체 렌더링이 크레딧을 사용합니다.",
    pt: "Sim. Seu roteiro chega como um storyboard de takes, cada um com um frame de referência gerado primeiro. Aprove os takes que gostar, regenere os que não gostar por 1 crédito cada, e só depois da sua aprovação o render completo gasta créditos.",
    id: "Ya. Skrip Anda datang sebagai storyboard berisi shot, masing-masing dengan frame referensi yang dibuat lebih dulu. Setujui shot yang Anda suka, buat ulang yang tidak dengan 1 kredit per shot, dan render penuh baru memakai kredit setelah Anda menyetujuinya.",
    vi: "Có. Kịch bản của bạn đến dưới dạng storyboard gồm các cảnh, mỗi cảnh có một khung hình tham chiếu được tạo trước. Duyệt những cảnh bạn ưng ý, tạo lại những cảnh chưa ưng với 1 tín dụng mỗi lần, và chỉ khi bạn duyệt thì bản render đầy đủ mới tiêu tín dụng.",
    th: "ได้ สคริปต์ของคุณจะมาในรูปสตอรี่บอร์ดแบบทีละช็อต โดยแต่ละช็อตจะสร้างเฟรมอ้างอิงก่อน อนุมัติช็อตที่คุณชอบ สร้างใหม่ช็อตที่ยังไม่ใช่ด้วยราคา 1 เครดิตต่อครั้ง และการเรนเดอร์เต็มจะใช้เครดิตก็ต่อเมื่อคุณอนุมัติแล้วเท่านั้น",
  },
  "marketing.faq.a4": {
    es: "Hoy Seedance 2.0 renderiza tu video. Seedance 2.0 Fast y 2.0 Mini se suman pronto al selector de Studio, y Seedance 2.5 después: tus guiones y storyboards aprobados se conservan cuando lleguen.",
    zh: "目前你的视频由 Seedance 2.0 渲染。Seedance 2.0 Fast 与 2.0 Mini 很快会加入 Studio 的选择器，Seedance 2.5 随后到来；上线后你的脚本和已确认的分镜都会照常沿用。",
    ja: "現在、動画をレンダリングするのは Seedance 2.0 です。Seedance 2.0 Fast と 2.0 Mini はまもなく Studio のピッカーに加わり、その後 Seedance 2.5 が続きます。登場しても脚本と承認済みのストーリーボードはそのまま引き継がれます。",
    ko: "지금은 Seedance 2.0이 영상을 렌더링합니다. Seedance 2.0 Fast와 2.0 Mini가 곧 Studio 선택기에 추가되고 그다음 Seedance 2.5가 이어지며, 출시되면 스크립트와 승인된 스토리보드가 그대로 이어집니다.",
    pt: "Hoje o Seedance 2.0 renderiza o seu vídeo. O Seedance 2.0 Fast e o 2.0 Mini entram no seletor do Studio em breve, e o Seedance 2.5 depois deles - seus roteiros e storyboards aprovados são transferidos quando chegarem.",
    id: "Saat ini Seedance 2.0 yang merender video Anda. Seedance 2.0 Fast dan 2.0 Mini segera bergabung ke pemilih di Studio, lalu Seedance 2.5 - skrip dan storyboard yang sudah Anda setujui tetap terpakai saat model itu tiba.",
    vi: "Hiện Seedance 2.0 render video của bạn. Seedance 2.0 Fast và 2.0 Mini sắp có trong bộ chọn của Studio, sau đó là Seedance 2.5 - kịch bản và storyboard đã duyệt của bạn vẫn dùng được khi chúng xuất hiện.",
    th: "ตอนนี้ Seedance 2.0 เป็นตัวเรนเดอร์วิดีโอของคุณ ส่วน Seedance 2.0 Fast และ 2.0 Mini จะเข้ามาในตัวเลือกของ Studio เร็วๆ นี้ ตามด้วย Seedance 2.5 - สคริปต์และสตอรี่บอร์ดที่คุณอนุมัติแล้วจะใช้ต่อได้เมื่อโมเดลเหล่านั้นมาถึง",
  },
  "marketing.features.rows.modes.bullets[0]": {
    es: "4 estilos pensados para el comercio",
    zh: "4 种为电商调优的风格",
    ja: "コマース向けの4スタイル",
    ko: "커머스에 맞춘 4가지 스타일",
    pt: "4 estilos ajustados para comércio",
    id: "4 gaya yang disetel untuk niaga",
    vi: "4 phong cách tối ưu cho thương mại",
    th: "4 สไตล์ที่ออกแบบมาเพื่อการค้า",
  },
  "marketing.features.rows.modes.bullets[1]": {
    es: "Duraciones de 10–30 segundos, 5 relaciones de aspecto",
    zh: "10–30 秒时长，5 种宽高比",
    ja: "10〜30秒の長さ、5つのアスペクト比",
    ko: "10~30초 길이, 5가지 화면 비율",
    pt: "Durações de 10–30 segundos, 5 proporções de tela",
    id: "Durasi 10–30 detik, 5 rasio aspek",
    vi: "Độ dài 10–30 giây, 5 tỷ lệ khung hình",
    th: "ความยาว 10–30 วินาที 5 อัตราส่วนภาพ",
  },
  "marketing.features.rows.publish.body": {
    es: "Elige entre 5 relaciones de aspecto en Studio — 9:16 para TikTok y Reels, 16:9, 1:1, 4:3 o 3:4 — luego descarga o marca como publicado, para que tus estadísticas sigan ordenadas.",
    zh: "在 Studio 中从 5 种宽高比中选择——TikTok 和 Reels 用 9:16，另有 16:9、1:1、4:3 或 3:4——然后下载或标记为已发布，让你的数据保持整洁。",
    ja: "Studio で5つのアスペクト比から選択 — TikTok や Reels には 9:16、ほかに 16:9、1:1、4:3、3:4 — あとはダウンロードするか投稿済みにするだけで、統計もすっきり保てます。",
    ko: "Studio에서 5가지 화면 비율 중 선택하세요 — TikTok과 Reels에는 9:16, 16:9, 1:1, 4:3, 3:4 — 다운로드하거나 게시 완료로 표시하면 통계가 깔끔하게 유지됩니다.",
    pt: "Escolha entre 5 proporções de tela no Studio — 9:16 para TikTok e Reels, 16:9, 1:1, 4:3 ou 3:4 — depois baixe ou marque como postado, mantendo suas estatísticas em ordem.",
    id: "Pilih dari 5 rasio aspek di Studio — 9:16 untuk TikTok dan Reels, 16:9, 1:1, 4:3, atau 3:4 — lalu unduh atau tandai sudah diposting, agar statistik Anda tetap rapi.",
    vi: "Chọn trong 5 tỷ lệ khung hình trong Studio — 9:16 cho TikTok và Reels, 16:9, 1:1, 4:3 hoặc 3:4 — rồi tải xuống hoặc đánh dấu đã đăng để số liệu luôn gọn gàng.",
    th: "เลือกจาก 5 อัตราส่วนภาพใน Studio — 9:16 สำหรับ TikTok และ Reels, 16:9, 1:1, 4:3 หรือ 3:4 — แล้วดาวน์โหลดหรือทำเครื่องหมายว่าโพสต์แล้ว สถิติของคุณจะได้เป็นระเบียบ",
  },
  "marketing.features.rows.publish.bullets[0]": {
    es: "Exportación lista para publicar en 5 relaciones de aspecto",
    zh: "可按 5 种宽高比导出，导出即可发布",
    ja: "5つのアスペクト比で投稿可能な書き出し",
    ko: "5가지 화면 비율로 바로 게시 가능한 내보내기",
    pt: "Exportação pronta para publicar em 5 proporções de tela",
    id: "Ekspor siap posting dalam 5 rasio aspek",
    vi: "Xuất video sẵn sàng đăng với 5 tỷ lệ khung hình",
    th: "ส่งออกพร้อมโพสต์ใน 5 อัตราส่วนภาพ",
  },
  "marketing.features.rows.publish.bullets[1]": {
    es: "Sigue publicados vs. borradores en Mis Videos",
    zh: "在“我的视频”中跟踪已发布与草稿",
    ja: "マイビデオで投稿済みと下書きを管理",
    ko: "내 영상에서 게시됨과 초안 추적",
    pt: "Acompanhe postados vs. rascunhos em Meus Vídeos",
    id: "Lacak yang diposting vs. draf di Video Saya",
    vi: "Theo dõi đã đăng vs. bản nháp trong Video của tôi",
    th: "ติดตามโพสต์แล้ว vs. แบบร่างในวิดีโอของฉัน",
  },
  "marketing.features.rows.qa.body": {
    es: "Después de que se renderiza cada toma, Whisper transcribe la línea hablada y la compara con el guion, marcando cualquier desvío. La voz siempre dice lo que debe decir, sin sorpresas fuera del guion.",
    zh: "每个镜头渲染完成后，Whisper 都会转录台词并与脚本比对，标记偏差。配音永远说该说的话，不会出现脱稿的意外。",
    ja: "各ショットのレンダリング後、Whisper が話されたセリフを文字起こしし、脚本と照合してズレを検出します。音声は常に台本どおりで、想定外の発話はありません。",
    ko: "각 숏이 렌더링된 뒤 Whisper가 음성 대사를 받아 적고 스크립트와 대조해 어긋난 부분을 표시합니다. 목소리는 항상 대본대로 말하며, 대본을 벗어나는 일이 없습니다.",
    pt: "Depois que cada take é renderizado, o Whisper transcreve a fala e compara com o roteiro, sinalizando desvios. A voz sempre diz o que deveria, sem surpresas fora do roteiro.",
    id: "Setelah setiap shot dirender, Whisper mentranskripsikan kalimat yang diucapkan dan membandingkannya dengan skrip, menandai penyimpangan. Suaranya selalu mengatakan yang seharusnya, tanpa kejutan di luar naskah.",
    vi: "Sau khi mỗi cảnh render xong, Whisper ghi lại lời thoại và đối chiếu với kịch bản, đánh dấu chỗ lệch. Giọng đọc luôn nói đúng những gì cần nói, không có bất ngờ ngoài kịch bản.",
    th: "หลังจากเรนเดอร์แต่ละช็อตเสร็จ Whisper จะถอดเสียงคำพูดและเทียบกับสคริปต์ พร้อมทำเครื่องหมายจุดที่คลาดเคลื่อน เสียงพากย์จะพูดตามบทเสมอ ไม่มีเซอร์ไพรส์นอกบท",
  },
  "marketing.features.rows.review.body": {
    es: "Lumi escribe tu guion como un storyboard de tomas, cada una con un fotograma de referencia generado primero. Aprueba las tomas que te encantan, regenera las que no por 1 crédito cada una — y solo cuando apruebas, el render completo gasta créditos.",
    zh: "Lumi 把脚本写成由镜头组成的分镜，每个镜头先生成一张参考图。喜欢的镜头就通过，不满意的每个花 1 积分重新生成——只有你批准之后，完整渲染才会消耗积分。",
    ja: "Lumi は脚本をショットのストーリーボードとして書き、各ショットには最初に参考フレームが生成されます。気に入ったショットは承認し、気に入らないショットは1回1クレジットで再生成。本番レンダリングがクレジットを消費するのは、あなたが承認したときだけです。",
    ko: "Lumi는 스크립트를 숏 단위의 스토리보드로 작성하고, 각 숏에는 참조 프레임이 먼저 생성됩니다. 마음에 드는 숏은 승인하고, 마음에 들지 않는 숏은 개당 1크레딧으로 다시 생성하세요. 전체 렌더링은 당신이 승인할 때만 크레딧을 사용합니다.",
    pt: "Lumi escreve seu roteiro como um storyboard de takes, cada um com um frame de referência gerado primeiro. Aprove os takes que você adora, regenere os que não aprovou por 1 crédito cada — e só quando você aprova o render completo gasta créditos.",
    id: "Lumi menulis skrip Anda sebagai storyboard berisi shot, masing-masing dengan frame acuan yang dibuat lebih dulu. Setujui shot yang Anda sukai, buat ulang yang tidak seharga 1 kredit per shot — dan hanya saat Anda menyetujui, render penuh memakai kredit.",
    vi: "Lumi viết kịch bản thành storyboard gồm nhiều cảnh, mỗi cảnh có một khung hình tham chiếu được tạo trước. Duyệt những cảnh bạn thích, tạo lại những cảnh chưa ưng với giá 1 tín dụng mỗi lần — và chỉ khi bạn duyệt, bản render đầy đủ mới tiêu tín dụng.",
    th: "Lumi เขียนสคริปต์ของคุณเป็นสตอรี่บอร์ดทีละช็อต โดยแต่ละช็อตมีเฟรมอ้างอิงสร้างไว้ก่อน อนุมัติช็อตที่ชอบ สร้างช็อตที่ไม่ชอบใหม่ในราคาช็อตละ 1 เครดิต — และการเรนเดอร์เต็มจะใช้เครดิตก็ต่อเมื่อคุณอนุมัติเท่านั้น",
  },
  "marketing.features.rows.review.bullets[0]": {
    es: "Un fotograma de referencia por toma antes de gastar en renders",
    zh: "渲染之前每个镜头先生成参考图",
    ja: "レンダリング前に各ショットの参考フレームを生成",
    ko: "렌더링 전 숏마다 참조 프레임 생성",
    pt: "Um frame de referência por take antes de gastar com render",
    id: "Satu frame acuan per shot sebelum render apa pun",
    vi: "Một khung hình tham chiếu cho mỗi cảnh trước khi render tốn phí",
    th: "เฟรมอ้างอิงหนึ่งเฟรมต่อช็อตก่อนเรนเดอร์เสียเงิน",
  },
  "marketing.features.rows.review.bullets[1]": {
    es: "Regenera tomas sueltas por 1 crédito cada una",
    zh: "单个镜头重新生成仅需 1 积分",
    ja: "1ショットだけの再生成は1回1クレジット",
    ko: "숏 하나만 다시 생성해도 1크레딧",
    pt: "Regenere takes soltos por 1 crédito cada",
    id: "Buat ulang shot satuan seharga 1 kredit",
    vi: "Tạo lại từng cảnh riêng lẻ với 1 tín dụng",
    th: "สร้างช็อตเดี่ยวใหม่ครั้งละ 1 เครดิต",
  },
  "marketing.features.rows.review.bullets[2]": {
    es: "El render completo espera tu aprobación",
    zh: "完整渲染等待你的批准",
    ja: "本番レンダリングはあなたの承認待ち",
    ko: "전체 렌더링은 승인을 기다립니다",
    pt: "O render completo espera sua aprovação",
    id: "Render penuh menunggu persetujuan Anda",
    vi: "Bản render đầy đủ chờ bạn phê duyệt",
    th: "การเรนเดอร์เต็มรอการอนุมัติจากคุณ",
  },
  "marketing.features.rows.review.title": {
    es: "Revisión del storyboard",
    zh: "分镜审阅",
    ja: "ストーリーボードレビュー",
    ko: "스토리보드 검토",
    pt: "Revisão do storyboard",
    id: "Tinjauan storyboard",
    vi: "Duyệt storyboard",
    th: "รีวิวสตอรี่บอร์ด",
  },
  "marketing.features.rows.scripts.bullets[1]": {
    es: "Takes de gancho / prueba / oferta, no una ejecución copiada y pegada",
    zh: "钩子/证明/报价镜头，而不是照搬的执行",
    ja: "コピペの実行ではなく、フック／プルーフ／オファーのショット",
    ko: "복사해 붙여넣은 실행이 아닌 후크 / 증명 / 제안 숏",
    pt: "Takes de gancho / prova / oferta, não execução copiada e colada",
    id: "Shot hook / bukti / penawaran, bukan eksekusi salin-tempel",
    vi: "Cảnh hook / bằng chứng / chào hàng, không phải bản sao chép",
    th: "ช็อตฮุก / พิสูจน์ / ข้อเสนอ ไม่ใช่การคัดลอกมาวาง",
  },
  "marketing.footer.columns.workflow.beatReview": {
    es: "Revisión del storyboard",
    zh: "分镜审阅",
    ja: "ストーリーボードレビュー",
    ko: "스토리보드 검토",
    pt: "Revisão do storyboard",
    id: "Tinjauan storyboard",
    vi: "Duyệt storyboard",
    th: "รีวิวสตอรี่บอร์ด",
  },
  "marketing.landing.heroFinePrint": {
    es: "Primer video gratis · Sin tarjeta · 5 relaciones de aspecto",
    zh: "首个视频免费 · 无需银行卡 · 5 种宽高比",
    ja: "最初の動画は無料 · カード不要 · 5つのアスペクト比",
    ko: "첫 영상 무료 · 카드 불필요 · 5가지 화면 비율",
    pt: "Primeiro vídeo grátis · Sem cartão · 5 proporções de tela",
    id: "Video pertama gratis · Tanpa kartu · 5 rasio aspek",
    vi: "Video đầu tiên miễn phí · Không cần thẻ · 5 tỷ lệ khung hình",
    th: "วิดีโอแรกฟรี · ไม่ต้องใช้บัตร · 5 อัตราส่วนภาพ",
  },
  "marketing.landing.heroSubtitle": {
    es: "Pega un enlace. Lumi aprende el patrón detrás de los videos más exitosos de tu categoría y escribe tu guion como un storyboard de tomas. Revisa y aprueba cada toma: el render completo solo gasta créditos cuando tú lo autorizas.",
    zh: "粘贴一个链接。Lumi 学习你所在品类爆款视频背后的规律，把脚本写成一个由镜头组成的分镜。逐个审阅并批准每个镜头——完整渲染只有在你点头后才会消耗积分。",
    ja: "リンクを貼るだけ。Lumi はあなたのカテゴリーで最も成果を上げている動画のパターンを学び、ショットのストーリーボードとして脚本を書きます。各ショットを確認・承認してください。本番レンダリングがクレジットを消費するのは、あなたがGOを出したときだけです。",
    ko: "링크를 붙여넣으세요. Lumi는 카테고리에서 가장 성과가 좋은 영상의 패턴을 학습해 스크립트를 숏 단위의 스토리보드로 작성합니다. 각 숏을 검토하고 승인하세요. 전체 렌더링은 당신이 시작하라고 할 때만 크레딧을 사용합니다.",
    pt: "Cole um link. Lumi aprende o padrão por trás dos vídeos de melhor desempenho da sua categoria e escreve seu roteiro como um storyboard de takes. Revise e aprove cada take — o render completo só gasta créditos quando você dá o sinal.",
    id: "Tempel tautan. Lumi mempelajari pola di balik video berperforma terbaik di kategori Anda dan menulis skrip Anda sebagai storyboard berisi shot. Tinjau dan setujui setiap shot — render penuh hanya memakai kredit saat Anda memberi aba-aba.",
    vi: "Dán một liên kết. Lumi học mô hình đằng sau những video hiệu quả nhất trong ngành của bạn và viết kịch bản thành một storyboard gồm nhiều cảnh. Xem và duyệt từng cảnh — bản render đầy đủ chỉ tiêu tín dụng khi bạn ra hiệu.",
    th: "วางลิงก์แล้วรอเลย Lumi เรียนรู้แพทเทิร์นจากวิดีโอที่ทำผลงานดีที่สุดในหมวดของคุณ แล้วเขียนสคริปต์ออกมาเป็นสตอรี่บอร์ดทีละช็อต ตรวจและอนุมัติทีละช็อต — การเรนเดอร์เต็มจะใช้เครดิตก็ต่อเมื่อคุณสั่งเท่านั้น",
  },
  "marketing.landing.marquee.ratio": {
    es: "5 relaciones de aspecto",
    zh: "5 种宽高比",
    ja: "5つのアスペクト比",
    ko: "5가지 화면 비율",
    pt: "5 proporções de tela",
    id: "5 rasio aspek",
    vi: "5 tỷ lệ khung hình",
    th: "5 อัตราส่วนภาพ",
  },
  "marketing.landing.marquee.review": {
    es: "Revisión del storyboard",
    zh: "分镜审阅",
    ja: "ストーリーボードレビュー",
    ko: "스토리보드 검토",
    pt: "Revisão do storyboard",
    id: "Tinjauan storyboard",
    vi: "Duyệt storyboard",
    th: "รีวิวสตอรี่บอร์ด",
  },
  "marketing.landing.marquee.seedance": {
    es: "Seedance 2.0",
    zh: "Seedance 2.0",
    ja: "Seedance 2.0",
    ko: "Seedance 2.0",
    pt: "Seedance 2.0",
    id: "Seedance 2.0",
    vi: "Seedance 2.0",
    th: "Seedance 2.0",
  },
  "marketing.landing.pricingSubtitle": {
    es: "Basado en créditos: los créditos reflejan el costo real del render, así que los ajustes más ligeros cuestan menos. Tu primer video es gratis, sin tarjeta.",
    zh: "积分制：积分对应真实渲染成本，设置越轻花费越少。首个视频免费，无需银行卡。",
    ja: "クレジット制：クレジットは実際のレンダリングコストに連動し、軽い設定ほど安く済みます。最初の動画は無料、カード不要です。",
    ko: "크레딧 기반: 크레딧은 실제 렌더링 비용을 반영해, 가벼운 설정일수록 적게 듭니다. 첫 영상은 무료, 카드도 필요 없습니다.",
    pt: "Baseado em créditos: os créditos acompanham o custo real do render, então configurações mais leves custam menos. Seu primeiro vídeo é grátis - sem cartão.",
    id: "Berbasis kredit: kredit mengikuti biaya render nyata, jadi pengaturan yang lebih ringan lebih murah. Video pertama Anda gratis - tanpa kartu.",
    vi: "Tính theo tín dụng: tín dụng phản ánh chi phí render thực tế, nên thiết lập nhẹ hơn sẽ rẻ hơn. Video đầu tiên của bạn miễn phí - không cần thẻ.",
    th: "ระบบเครดิต: เครดิตสะท้อนต้นทุนการเรนเดอร์จริง การตั้งค่าที่เบากว่าจึงถูกกว่า วิดีโอแรกของคุณฟรี - ไม่ต้องใช้บัตร",
  },
  "marketing.landing.pricingTiers.creator.features[0]": {
    es: "900 créditos — unos 3 videos",
    zh: "900 积分 — 约 3 个视频",
    ja: "900クレジット — 約3本",
    ko: "900 크레딧 — 약 3개 영상",
    pt: "900 créditos — cerca de 3 vídeos",
    id: "900 kredit — sekitar 3 video",
    vi: "900 tín dụng — khoảng 3 video",
    th: "900 เครดิต — ประมาณ 3 วิดีโอ",
  },
  "marketing.landing.pricingTiers.creator.features[1]": {
    es: "Sin marca de agua",
    zh: "无水印",
    ja: "ウォーターマークなし",
    ko: "워터마크 없음",
    pt: "Sem marca d'água",
    id: "Tanpa tanda air",
    vi: "Không hình mờ",
    th: "ไม่มีลายน้ำ",
  },
  "marketing.landing.pricingTiers.creator.features[2]": {
    es: "Revisión del storyboard",
    zh: "分镜审阅",
    ja: "ストーリーボードレビュー",
    ko: "스토리보드 검토",
    pt: "Revisão do storyboard",
    id: "Tinjauan storyboard",
    vi: "Duyệt storyboard",
    th: "รีวิวสตอรี่บอร์ด",
  },
  "marketing.landing.pricingTiers.creator.name": {
    id: "Kreator",
  },
  "marketing.landing.pricingTiers.pro.features[0]": {
    es: "3.000 créditos — unos 10 videos",
    zh: "3,000 积分 — 约 10 个视频",
    ja: "3,000クレジット — 約10本",
    ko: "3,000 크레딧 — 약 10개 영상",
    pt: "3.000 créditos — cerca de 10 vídeos",
    id: "3.000 kredit — sekitar 10 video",
    vi: "3.000 tín dụng — khoảng 10 video",
    th: "3,000 เครดิต — ประมาณ 10 วิดีโอ",
  },
  "marketing.landing.pricingTiers.pro.features[1]": {
    es: "Todo lo de Creator",
    zh: "包含 Creator 全部功能",
    ja: "Creator のすべて",
    ko: "Creator의 모든 기능",
    pt: "Tudo do Creator",
    id: "Semua fitur Kreator",
    vi: "Mọi tính năng của Creator",
    th: "ทุกอย่างใน Creator",
  },
  "marketing.landing.pricingTiers.pro.features[2]": {
    es: "Renderizado prioritario",
    zh: "优先渲染",
    ja: "優先レンダリング",
    ko: "우선 렌더링",
    pt: "Renderização prioritária",
    id: "Render prioritas",
    vi: "Render ưu tiên",
    th: "เรนเดอร์ก่อนใคร",
  },
  "marketing.landing.pricingTiers.pro.features[3]": {
    es: "Exportación 720p · 5 relaciones de aspecto",
    zh: "720p 导出 · 5 种宽高比",
    ja: "720p 書き出し · 5つのアスペクト比",
    ko: "720p 내보내기 · 5가지 화면 비율",
    pt: "Exportação 720p · 5 proporções de tela",
    id: "Ekspor 720p · 5 rasio aspek",
    vi: "Xuất 720p · 5 tỷ lệ khung hình",
    th: "ส่งออก 720p · 5 อัตราส่วนภาพ",
  },
  "marketing.landing.pricingTiers.scale.features[0]": {
    es: "7.500 créditos — unos 25 videos",
    zh: "7,500 积分 — 约 25 个视频",
    ja: "7,500クレジット — 約25本",
    ko: "7,500 크레딧 — 약 25개 영상",
    pt: "7.500 créditos — cerca de 25 vídeos",
    id: "7.500 kredit — sekitar 25 video",
    vi: "7.500 tín dụng — khoảng 25 video",
    th: "7,500 เครดิต — ประมาณ 25 วิดีโอ",
  },
  "marketing.landing.pricingTiers.scale.features[1]": {
    es: "Todo lo de Pro",
    zh: "包含 Pro 全部功能",
    ja: "Pro のすべて",
    ko: "Pro의 모든 기능",
    pt: "Tudo do Pro",
    id: "Semua fitur Pro",
    vi: "Mọi tính năng của Pro",
    th: "ทุกอย่างใน Pro",
  },
  "marketing.landing.pricingTiers.scale.features[2]": {
    es: "Hecho para publicar sin parar",
    zh: "为持续日更打造",
    ja: "毎日投稿し続けるためのプラン",
    ko: "상시 게시를 위한 플랜",
    pt: "Feito para postar sem parar",
    id: "Dibuat untuk posting tanpa henti",
    vi: "Dành cho đăng bài liên tục",
    th: "สำหรับสายโพสต์ไม่หยุด",
  },
  "marketing.landing.storyFact2": {
    es: "Los créditos reflejan el costo real del render",
    zh: "积分对应真实渲染成本",
    ja: "クレジットは実際のレンダリングコストに連動",
    ko: "크레딧은 실제 렌더링 비용을 반영",
    pt: "Os créditos acompanham o custo real do render",
    id: "Kredit mengikuti biaya render nyata",
    vi: "Tín dụng phản ánh chi phí render thực tế",
    th: "เครดิตสะท้อนต้นทุนการเรนเดอร์จริง",
  },
  "marketing.landing.storySteps.render.body": {
    es: "El control de calidad automático verifica cada línea hablada contra el guion, y el corte queda listo para publicar en la relación de aspecto que elegiste.",
    zh: "自动质检会逐句核对台词与脚本，成片即可按你选择的宽高比发布。",
    ja: "自動QAがすべての音声セリフを脚本と照合し、選んだアスペクト比でそのまま投稿できる状態になります。",
    ko: "자동 QA가 모든 음성 대사를 스크립트와 대조하고, 선택한 화면 비율로 바로 게시할 수 있는 상태가 됩니다.",
    pt: "O QA automático confere cada linha falada com o roteiro, e o corte fica pronto para postar na proporção que você escolheu.",
    id: "QA otomatis memeriksa setiap baris ucapan terhadap skrip, dan hasilnya siap diposting dalam rasio aspek yang Anda pilih.",
    vi: "QA tự động đối chiếu từng câu thoại với kịch bản, và video sẵn sàng đăng theo tỷ lệ khung hình bạn đã chọn.",
    th: "QA อัตโนมัติตรวจทุกบรรทัดเสียงพูดเทียบกับสคริปต์ และคลิปพร้อมโพสต์ในอัตราส่วนภาพที่คุณเลือก",
  },
  "marketing.landing.wallSubtitle": {
    es: "Cada video de Lumi sale con voz hablada en la relación de aspecto que elijas, con guion y voz adaptados a cada mercado.",
    zh: "每个 Lumi 视频都配有真人感配音，并可按你选择的宽高比导出，脚本和声音会针对每个目标市场进行调整。",
    ja: "Lumi の動画はすべて、選んだアスペクト比で音声ナレーション付きで仕上がり、脚本と声は各ターゲット市場に合わせて調整されます。",
    ko: "모든 Lumi 영상은 선택한 화면 비율에 음성 내레이션을 담아 제공되며, 스크립트와 목소리는 각 목표 시장에 맞게 조정됩니다.",
    pt: "Todo vídeo Lumi sai com narração falada na proporção que você escolher, com roteiro e voz adaptados para cada mercado-alvo.",
    id: "Setiap video Lumi hadir dengan sulih suara dalam rasio aspek pilihan Anda, dengan skrip dan suara yang disesuaikan untuk setiap pasar sasaran.",
    vi: "Mọi video Lumi đều có lồng tiếng theo tỷ lệ khung hình bạn chọn, với kịch bản và giọng đọc được điều chỉnh cho từng thị trường mục tiêu.",
    th: "วิดีโอ Lumi ทุกเรื่องมาพร้อมเสียงพากย์ในอัตราส่วนภาพที่คุณเลือก โดยปรับสคริปต์และเสียงให้เข้ากับแต่ละตลาดเป้าหมาย",
  },
  "marketing.metadata.features.description": {
    es: "Todo lo que Lumi hace: de enlace a video, guiones basados en patrones, revisión del storyboard, formatos solo de producto, control de diálogo y exportación lista para publicar en 5 relaciones de aspecto.",
    zh: "Lumi 的全部功能——链接生成视频、基于真实规律的脚本、分镜审阅、纯产品形式、台词质检，以及可按 5 种宽高比导出成片。",
    ja: "Lumi のすべて — リンクから動画へ、パターンに基づく脚本、ストーリーボードレビュー、商品のみのフォーマット、セリフQA、5つのアスペクト比で投稿可能な書き出し。",
    ko: "Lumi의 모든 기능 — 링크에서 영상으로, 패턴 기반 스크립트, 스토리보드 검토, 제품 전용 포맷, 대사 QA, 5가지 화면 비율로 바로 게시 가능한 내보내기.",
    pt: "Tudo o que Lumi faz — do link ao vídeo, roteiros baseados em padrões, revisão do storyboard, formatos só de produto, QA de diálogo e exportação pronta para publicar em 5 proporções de tela.",
    id: "Semua yang Lumi lakukan — dari tautan ke video, skrip berbasis pola, tinjauan storyboard, format khusus produk, QA dialog, dan ekspor siap posting dalam 5 rasio aspek.",
    vi: "Mọi thứ Lumi làm — từ liên kết thành video, kịch bản dựa trên mô hình, duyệt storyboard, định dạng chỉ sản phẩm, QA lời thoại và xuất video sẵn sàng đăng với 5 tỷ lệ khung hình.",
    th: "ทุกสิ่งที่ Lumi ทำ — จากลิงก์สู่วิดีโอ สคริปต์ที่อิงแพทเทิร์น รีวิวสตอรี่บอร์ด รูปแบบเฉพาะสินค้า QA บทพูด และส่งออกพร้อมโพสต์ใน 5 อัตราส่วนภาพ",
  },
  "marketing.metadata.models.description": {
    es: "Hoy Studio renderiza con Seedance 2.0, y 2.0 Fast, 2.0 Mini y Seedance 2.5 se sumarán al selector. Cada toma recibe los ajustes que mejor la renderizan.",
    zh: "目前 Studio 使用 Seedance 2.0 渲染，2.0 Fast、2.0 Mini 和 Seedance 2.5 将陆续加入选择器。每个镜头都会获得最佳渲染设置。",
    ja: "現在 Studio は Seedance 2.0 でレンダリングし、2.0 Fast、2.0 Mini、Seedance 2.5 が順次ピッカーに加わります。各ショットに最適な設定が適用されます。",
    ko: "현재 Studio는 Seedance 2.0으로 렌더링하며 2.0 Fast, 2.0 Mini, Seedance 2.5가 차례로 선택기에 추가됩니다. 각 숏에 가장 적합한 설정이 적용됩니다.",
    pt: "Hoje o Studio renderiza com o Seedance 2.0, e 2.0 Fast, 2.0 Mini e Seedance 2.5 entram no seletor em seguida. Cada take recebe as configurações que melhor o renderizam.",
    id: "Saat ini Studio merender dengan Seedance 2.0, sementara 2.0 Fast, 2.0 Mini, dan Seedance 2.5 menyusul ke pemilih model. Setiap shot mendapat pengaturan yang merendernya paling baik.",
    vi: "Hiện Studio render bằng Seedance 2.0, còn 2.0 Fast, 2.0 Mini và Seedance 2.5 sẽ lần lượt vào bộ chọn. Mỗi cảnh đều được thiết lập để render đẹp nhất.",
    th: "ตอนนี้ Studio เรนเดอร์ด้วย Seedance 2.0 ส่วน 2.0 Fast, 2.0 Mini และ Seedance 2.5 จะทยอยเข้ามาในตัวเลือก ทุกช็อตได้รับการตั้งค่าที่เรนเดอร์ออกมาดีที่สุด",
  },
  "marketing.metadata.pricing.description": {
    es: "Empieza gratis y escala cuando funcione. El precio de Lumi se basa en créditos: los créditos reflejan el costo real del render, y los ajustes más ligeros cuestan menos. Free (primer video), Creator, Pro, Scale y Enterprise. Sin tarjeta para empezar; el plan anual ahorra ~20%.",
    zh: "免费开始，见效再扩展。Lumi 采用积分制定价——积分对应真实渲染成本，设置越轻花费越少。免费版（首个视频）、Creator、Pro、Scale 和 Enterprise。开始无需信用卡；按年付省约 20%。",
    ja: "無料で始めて、効果が出たら拡大。Lumi の料金はクレジット制 — クレジットは実際のレンダリングコストに連動し、軽い設定ほど安く済みます。Free（最初の動画）、Creator、Pro、Scale、Enterprise。開始にクレジットカードは不要。年払いで約20%お得。",
    ko: "무료로 시작하고, 효과가 보이면 확장하세요. Lumi 요금은 크레딧 기반 — 크레딧은 실제 렌더링 비용을 반영해 가벼운 설정일수록 적게 듭니다. Free(첫 영상), Creator, Pro, Scale, Enterprise. 시작에 신용카드 불필요, 연간 결제 시 약 20% 절약.",
    pt: "Comece grátis e escale quando estiver funcionando. O preço do Lumi é baseado em créditos — os créditos acompanham o custo real do render, e configurações mais leves custam menos. Free (primeiro vídeo), Creator, Pro, Scale e Enterprise. Sem cartão para começar; o anual economiza ~20%.",
    id: "Mulai gratis, naik kelas saat sudah terbukti. Harga Lumi berbasis kredit — kredit mengikuti biaya render nyata, dan pengaturan yang lebih ringan lebih murah. Free (video pertama), Creator, Pro, Scale, dan Enterprise. Tanpa kartu kredit untuk mulai; tahunan hemat ~20%.",
    vi: "Bắt đầu miễn phí, mở rộng khi thấy hiệu quả. Giá Lumi tính theo tín dụng — tín dụng phản ánh chi phí render thực tế, thiết lập nhẹ hơn sẽ rẻ hơn. Free (video đầu tiên), Creator, Pro, Scale và Enterprise. Không cần thẻ để bắt đầu; gói năm tiết kiệm ~20%.",
    th: "เริ่มฟรี แล้วขยายเมื่อเห็นผล ราคา Lumi เป็นแบบเครดิต — เครดิตสะท้อนต้นทุนการเรนเดอร์จริง การตั้งค่าที่เบากว่าจึงถูกกว่า Free (วิดีโอแรก), Creator, Pro, Scale และ Enterprise ไม่ต้องใช้บัตรเครดิตตอนเริ่ม รายปีประหยัด ~20%",
  },
  "marketing.models.cards.fast.bestFor[0]": {
    es: "Velocidad",
    zh: "速度",
    ja: "速度",
    ko: "속도",
    pt: "Velocidade",
    id: "Kecepatan",
    vi: "Tốc độ",
    th: "ความเร็ว",
  },
  "marketing.models.cards.fast.bestFor[1]": {
    es: "Menor costo",
    zh: "更低成本",
    ja: "低コスト",
    ko: "낮은 비용",
    pt: "Custo menor",
    id: "Biaya lebih rendah",
    vi: "Chi phí thấp hơn",
    th: "ต้นทุนต่ำกว่า",
  },
  "marketing.models.cards.fast.bestFor[2]": {
    es: "Hasta 720p",
    zh: "最高 720p",
    ja: "最大720p",
    ko: "최대 720p",
    pt: "Até 720p",
    id: "Hingga 720p",
    vi: "Lên đến 720p",
    th: "สูงสุด 720p",
  },
  "marketing.models.cards.fast.desc": {
    es: "La misma familia ajustada para velocidad — renders más rápidos a un menor costo en créditos, hasta 720p. Se suma al selector muy pronto.",
    zh: "同系列的速度优化版——渲染更快、积分成本更低，最高 720p。很快就会加入选择器。",
    ja: "同じファミリーを速度重視にチューニング — より速いレンダリングをより低いクレジットコストで。最大720p。まもなくピッカーに加わります。",
    ko: "같은 패밀리를 속도에 맞게 튜닝 — 더 낮은 크레딧 비용으로 더 빠른 렌더링, 최대 720p. 곧 선택기에 추가됩니다.",
    pt: "A mesma família ajustada para velocidade — renders mais rápidos com menor custo em créditos, até 720p. Entra no seletor em breve.",
    id: "Keluarga yang sama, disetel untuk kecepatan — render lebih cepat dengan biaya kredit lebih rendah, hingga 720p. Segera bergabung ke pemilih model.",
    vi: "Cùng gia đình nhưng tối ưu cho tốc độ — render nhanh hơn với chi phí tín dụng thấp hơn, lên đến 720p. Sắp có trong bộ chọn.",
    th: "ตระกูลเดียวกันปรับมาเพื่อความเร็ว — เรนเดอร์ไวขึ้นด้วยต้นทุนเครดิตที่ต่ำกว่า สูงสุด 720p จะเข้ามาในตัวเลือกเร็วๆ นี้",
  },
  "marketing.models.cards.fast.name": {
    es: "Seedance 2.0 Fast",
    zh: "Seedance 2.0 Fast",
    ja: "Seedance 2.0 Fast",
    ko: "Seedance 2.0 Fast",
    pt: "Seedance 2.0 Fast",
    id: "Seedance 2.0 Fast",
    vi: "Seedance 2.0 Fast",
    th: "Seedance 2.0 Fast",
  },
  "marketing.models.cards.fast.tag": {
    es: "Próximamente",
    zh: "即将推出",
    ja: "近日公開",
    ko: "출시 예정",
    pt: "Em breve",
    id: "Segera hadir",
    vi: "Sắp ra mắt",
    th: "เร็วๆ นี้",
  },
  "marketing.models.cards.mini.bestFor[0]": {
    es: "Borradores",
    zh: "草稿",
    ja: "下書き",
    ko: "초안",
    pt: "Rascunhos",
    id: "Draf",
    vi: "Bản nháp",
    th: "ร่างงาน",
  },
  "marketing.models.cards.mini.bestFor[1]": {
    es: "Costo mínimo",
    zh: "最低成本",
    ja: "最小コスト",
    ko: "최저 비용",
    pt: "Custo mínimo",
    id: "Biaya terendah",
    vi: "Chi phí thấp nhất",
    th: "ต้นทุนต่ำสุด",
  },
  "marketing.models.cards.mini.bestFor[2]": {
    es: "Hasta 720p",
    zh: "最高 720p",
    ja: "最大720p",
    ko: "최대 720p",
    pt: "Até 720p",
    id: "Hingga 720p",
    vi: "Lên đến 720p",
    th: "สูงสุด 720p",
  },
  "marketing.models.cards.mini.desc": {
    es: "El nivel más ligero — borradores e iteraciones al menor costo en créditos por render, hasta 720p. Se suma al selector muy pronto.",
    zh: "最轻量的一档——以每次渲染最低的积分成本打草稿、做迭代，最高 720p。很快就会加入选择器。",
    ja: "最軽量ティア — 下書きと試行を1レンダリングあたり最小のクレジットコストで。最大720p。まもなくピッカーに加わります。",
    ko: "가장 가벼운 티어 — 렌더링당 가장 낮은 크레딧 비용으로 초안을 만들고 반복하세요. 최대 720p. 곧 선택기에 추가됩니다.",
    pt: "O nível mais leve — rascunhe e itere com o menor custo em créditos por render, até 720p. Entra no seletor em breve.",
    id: "Tingkat paling ringan — buat draf dan iterasi dengan biaya kredit terendah per render, hingga 720p. Segera bergabung ke pemilih model.",
    vi: "Gói nhẹ nhất — nháp và lặp lại với chi phí tín dụng thấp nhất mỗi lần render, lên đến 720p. Sắp có trong bộ chọn.",
    th: "ระดับที่เบาที่สุด — ร่างและปรับซ้ำด้วยต้นทุนเครดิตต่ำสุดต่อการเรนเดอร์ สูงสุด 720p จะเข้ามาในตัวเลือกเร็วๆ นี้",
  },
  "marketing.models.cards.mini.name": {
    es: "Seedance 2.0 Mini",
    zh: "Seedance 2.0 Mini",
    ja: "Seedance 2.0 Mini",
    ko: "Seedance 2.0 Mini",
    pt: "Seedance 2.0 Mini",
    id: "Seedance 2.0 Mini",
    vi: "Seedance 2.0 Mini",
    th: "Seedance 2.0 Mini",
  },
  "marketing.models.cards.mini.tag": {
    es: "Próximamente",
    zh: "即将推出",
    ja: "近日公開",
    ko: "출시 예정",
    pt: "Em breve",
    id: "Segera hadir",
    vi: "Sắp ra mắt",
    th: "เร็วๆ นี้",
  },
  "marketing.models.cards.seedance.bestFor[0]": {
    es: "Máxima calidad",
    zh: "最高画质",
    ja: "最高品質",
    ko: "최고 품질",
    pt: "Qualidade máxima",
    id: "Kualitas terbaik",
    vi: "Chất lượng cao nhất",
    th: "คุณภาพสูงสุด",
  },
  "marketing.models.cards.seedance.bestFor[1]": {
    es: "Hasta 1080p",
    zh: "最高 1080p",
    ja: "最大1080p",
    ko: "최대 1080p",
    pt: "Até 1080p",
    id: "Hingga 1080p",
    vi: "Lên đến 1080p",
    th: "สูงสุด 1080p",
  },
  "marketing.models.cards.seedance.bestFor[2]": {
    es: "Audio por toma",
    zh: "分镜音频",
    ja: "ショットごとの音声",
    ko: "숏별 오디오",
    pt: "Áudio por take",
    id: "Audio per shot",
    vi: "Âm thanh theo cảnh",
    th: "เสียงต่อช็อต",
  },
  "marketing.models.cards.seedance.desc": {
    es: "El insignia: el movimiento más realista para tomas de producto, hasta 1080p, con audio generado por toma.",
    zh: "旗舰模型——产品镜头中最逼真的动态效果，最高 1080p，并为每个镜头生成音频。",
    ja: "フラッグシップ — 商品ショットに最も生き生きとしたモーションを。最大1080p、ショットごとの音声生成付き。",
    ko: "플래그십 — 제품 숏에 가장 생생한 모션을 제공하며, 최대 1080p, 숏별 오디오 생성 지원.",
    pt: "O carro-chefe — o movimento mais realista para takes de produto, até 1080p, com áudio gerado por take.",
    id: "Sang unggulan — gerakan paling hidup untuk shot produk, hingga 1080p, dengan audio yang dibuat per shot.",
    vi: "Mẫu flagship — chuyển động sống động nhất cho cảnh sản phẩm, lên đến 1080p, kèm âm thanh tạo theo từng cảnh.",
    th: "รุ่นเรือธง — มอชันที่สมจริงที่สุดสำหรับช็อตสินค้า สูงสุด 1080p พร้อมสร้างเสียงให้ทุกช็อต",
  },
  "marketing.models.cards.seedance.tag": {
    es: "Disponible",
    zh: "已上线",
    ja: "提供中",
    ko: "사용 가능",
    pt: "Disponível",
    id: "Tersedia",
    vi: "Đang dùng được",
    th: "ใช้งานได้แล้ว",
  },
  "marketing.models.cards.seedance25.bestFor[0]": {
    es: "Hoja de ruta",
    zh: "路线图",
    ja: "ロードマップ",
    ko: "로드맵",
    pt: "Roadmap",
    id: "Peta jalan",
    vi: "Lộ trình",
    th: "แผนงาน",
  },
  "marketing.models.cards.seedance25.bestFor[1]": {
    es: "Sin rehacer",
    zh: "无需重做",
    ja: "作り直し不要",
    ko: "재작업 불필요",
    pt: "Sem retrabalho",
    id: "Tanpa mengulang",
    vi: "Không cần làm lại",
    th: "ไม่ต้องทำใหม่",
  },
  "marketing.models.cards.seedance25.desc": {
    es: "La próxima generación se une al selector en cuanto esté disponible en nuestro proveedor de render. Tus guiones y storyboards aprobados se conservan sin rehacer nada.",
    zh: "新一代模型一旦在我们的渲染服务商上线，就会加入选择器。你的脚本和已批准的分镜无需重做，直接沿用。",
    ja: "次世代モデルは、レンダリングプロバイダーで提供開始され次第ピッカーに追加されます。スクリプトと承認済みストーリーボードは作り直しなしで引き継がれます。",
    ko: "차세대 모델은 렌더링 제공업체에서 출시되는 즉시 선택기에 추가됩니다. 스크립트와 승인된 스토리보드는 다시 만들 필요 없이 그대로 이어집니다.",
    pt: "A próxima geração entra no seletor assim que estiver disponível no nosso provedor de render. Seus roteiros e storyboards aprovados seguem sem refazer nada.",
    id: "Generasi berikutnya bergabung ke pemilih begitu tersedia di penyedia render kami. Skrip dan storyboard yang sudah disetujui terbawa tanpa perlu mengulang.",
    vi: "Thế hệ tiếp theo sẽ xuất hiện trong bộ chọn ngay khi có trên nhà cung cấp render của chúng tôi. Kịch bản và storyboard đã duyệt của bạn được chuyển sang mà không cần làm lại.",
    th: "รุ่นใหม่จะเข้ามาในตัวเลือกทันทีที่เปิดใช้งานบนผู้ให้บริการเรนเดอร์ของเรา สคริปต์และสตอรี่บอร์ดที่อนุมัติแล้วของคุณใช้ต่อได้โดยไม่ต้องทำใหม่",
  },
  "marketing.models.cards.seedance25.name": {
    es: "Seedance 2.5",
    zh: "Seedance 2.5",
    ja: "Seedance 2.5",
    ko: "Seedance 2.5",
    pt: "Seedance 2.5",
    id: "Seedance 2.5",
    vi: "Seedance 2.5",
    th: "Seedance 2.5",
  },
  "marketing.models.cards.seedance25.tag": {
    es: "Próximamente",
    zh: "即将推出",
    ja: "近日公開",
    ko: "출시 예정",
    pt: "Em breve",
    id: "Segera hadir",
    vi: "Sắp ra mắt",
    th: "เร็วๆ นี้",
  },
  "marketing.models.header.subtitle": {
    es: "Hoy Studio renderiza con Seedance 2.0; el resto de la familia se suma al selector a medida que llega, y tus guiones se conservan.",
    zh: "目前 Studio 使用 Seedance 2.0 渲染；系列中的其他模型上线后会陆续加入选择器，你的脚本始终可以沿用。",
    ja: "現在 Studio は Seedance 2.0 でレンダリングします。ファミリーの他のモデルは提供開始次第ピッカーに加わり、スクリプトはそのまま引き継がれます。",
    ko: "현재 Studio는 Seedance 2.0으로 렌더링합니다. 패밀리의 나머지 모델은 출시되는 대로 선택기에 추가되며, 스크립트는 그대로 이어집니다.",
    pt: "Hoje o Studio renderiza com o Seedance 2.0; o resto da família entra no seletor conforme chega, e seus roteiros seguem valendo.",
    id: "Saat ini Studio merender dengan Seedance 2.0; anggota keluarga lainnya bergabung ke pemilih begitu tersedia, dan skrip Anda tetap terbawa.",
    vi: "Hiện Studio render bằng Seedance 2.0; các mô hình còn lại trong gia đình sẽ vào bộ chọn khi sẵn sàng, và kịch bản của bạn vẫn dùng được.",
    th: "ตอนนี้ Studio เรนเดอร์ด้วย Seedance 2.0 ส่วนโมเดลอื่นในตระกูลจะเข้ามาในตัวเลือกเมื่อพร้อม และสคริปต์ของคุณยังใช้ต่อได้",
  },
  "marketing.models.points.carriesOver.body": {
    es: "Los guiones y los storyboards aprobados no dependen del modelo. Cuando llega uno nuevo, tus videos pueden usarlo sin rehacer nada.",
    zh: "脚本和已批准的分镜与模型无关。新模型上线时，你的视频无需重做即可使用。",
    ja: "スクリプトと承認済みストーリーボードはモデルに依存しません。新しいモデルが登場しても、作り直しなしで動画に使えます。",
    ko: "스크립트와 승인된 스토리보드는 모델에 종속되지 않습니다. 새 모델이 나와도 영상을 다시 만들 필요 없이 사용할 수 있습니다.",
    pt: "Roteiros e storyboards aprovados não dependem do modelo. Quando um novo modelo chega, seus vídeos podem usá-lo sem refazer nada.",
    id: "Skrip dan storyboard yang disetujui tidak tergantung model. Saat model baru tiba, video Anda bisa memakainya tanpa mengulang.",
    vi: "Kịch bản và storyboard đã duyệt không phụ thuộc mô hình. Khi có mô hình mới, video của bạn dùng được ngay mà không cần làm lại.",
    th: "สคริปต์และสตอรี่บอร์ดที่อนุมัติแล้วไม่ผูกกับโมเดลใด เมื่อมีโมเดลใหม่ วิดีโอของคุณใช้มันได้ทันทีโดยไม่ต้องทำใหม่",
  },
  // zh names the credit unit 积分 everywhere; the machine reaches for 信用,
  // which is creditworthiness/banking credit (信用卡 = credit card is the one
  // place it belongs). Same reason for the two pricing pins below.
  "marketing.models.points.oneBill.body": {
    zh: "无需处理单独的模型帐户或积分——一切都在 Lumi 内。",
  },
  // No model-choice claim while VIDEO_MODELS has one entry - the picker offers
  // no choice today.
  "marketing.models.points.tuned.body": {
    es: "Lumi ajusta movimiento, duración y encuadre por toma para que cada una rinda al máximo: nunca tienes que pelear con ajustes del modelo.",
    zh: "Lumi 为每个镜头设置动态、时长和构图，让每个镜头都呈现最佳效果，你无需折腾模型参数。",
    ja: "Lumi はショットごとにモーション・長さ・フレーミングを設定し、それぞれを最高の状態にレンダリングします。モデルの細かい設定をいじる必要はありません。",
    ko: "Lumi는 샷마다 모션, 길이, 프레이밍을 설정해 각 샷이 최상으로 렌더링되게 합니다. 모델 설정을 만지작거릴 필요가 없습니다.",
    pt: "Lumi define movimento, duração e enquadramento por take para que cada um renda o seu melhor - você nunca mexe em configurações do modelo.",
    id: "Lumi mengatur gerakan, durasi, dan pembingkaian per shot agar masing-masing tampil terbaik - Anda tidak perlu utak-atik pengaturan model.",
    vi: "Lumi thiết lập chuyển động, độ dài và bố cục cho từng cảnh để mỗi cảnh đẹp nhất - bạn không bao giờ phải vọc cài đặt mô hình.",
    th: "Lumi ตั้งค่ามอชัน ความยาว และเฟรมมิงให้ทีละช็อตเพื่อให้ทุกช็อตออกมาดีที่สุด คุณไม่ต้องจุ้นกับการตั้งค่าโมเดล",
  },
  "marketing.models.points.tuned.title": {
    es: "Ajustado por toma",
    zh: "逐镜头调优",
    ja: "ショットごとに最適化",
    ko: "숏별 튜닝",
    pt: "Ajustado por take",
    id: "Disetel per shot",
    vi: "Tinh chỉnh theo từng cảnh",
    th: "ปรับแต่งทีละช็อต",
  },
  "marketing.pricing.creditFootnote": {
    es: "Los créditos reflejan el costo real del render: el costo exacto de un video depende del modelo, la resolución y la relación de aspecto que elijas. Los conteos de videos son aproximados, basados en clips de 20 segundos con Seedance 2.0 a 720p (300 créditos cada uno).",
    zh: "积分对应真实的渲染成本：每个视频的确切花费取决于你选择的模型、分辨率和宽高比。视频数量为估算值，基于 Seedance 2.0 720p 的 20 秒片段（每条 300 积分）。",
    ja: "クレジットは実際のレンダリングコストに連動します。動画の正確なコストは選択したモデル・解像度・アスペクト比によって変わります。動画本数は目安で、Seedance 2.0・720p の20秒クリップ（1本300クレジット）を基準にしています。",
    ko: "크레딧은 실제 렌더링 비용을 반영합니다. 영상의 정확한 비용은 선택한 모델, 해상도, 화면 비율에 따라 달라집니다. 영상 개수는 Seedance 2.0 720p 기준 20초 클립(개당 300 크레딧)을 바탕으로 한 대략적인 수치입니다.",
    pt: "Os créditos acompanham o custo real do render: o custo exato de um vídeo depende do modelo, da resolução e da proporção de tela escolhidos. As contagens de vídeos são aproximadas, com base em clipes de 20 segundos no Seedance 2.0 a 720p (300 créditos cada).",
    id: "Kredit mengikuti biaya render yang sebenarnya: biaya pasti sebuah video tergantung pada model, resolusi, dan rasio aspek yang Anda pilih. Jumlah video bersifat perkiraan, berdasarkan klip 20 detik di Seedance 2.0 720p (masing-masing 300 kredit).",
    vi: "Tín dụng phản ánh chi phí render thực tế: chi phí chính xác của một video phụ thuộc vào mô hình, độ phân giải và tỷ lệ khung hình bạn chọn. Số lượng video chỉ là ước tính, dựa trên clip 20 giây chạy Seedance 2.0 ở 720p (mỗi clip 300 tín dụng).",
    th: "เครดิตสะท้อนต้นทุนการเรนเดอร์จริง ต้นทุนที่แน่ชัดของวิดีโอแต่ละเรื่องขึ้นอยู่กับโมเดล ความละเอียด และอัตราส่วนภาพที่คุณเลือก จำนวนวิดีโอเป็นเพียงค่าประมาณ อิงจากคลิป 20 วินาทีบน Seedance 2.0 ที่ 720p (เรื่องละ 300 เครดิต)",
  },
  "marketing.pricing.faq.a1": {
    es: "Los créditos reflejan el costo real de renderizado de tu video. El costo exacto depende del modelo, la resolución y la relación de aspecto que elijas: un clip de 20 segundos con Seedance 2.0 a 720p cuesta 300 créditos, y los ajustes más ligeros cuestan menos.",
    zh: "积分对应视频的真实渲染成本。确切费用取决于你选择的模型、分辨率和宽高比——Seedance 2.0 720p 的 20 秒片段需 300 积分，更轻的设置花费更少。",
    ja: "クレジットは動画の実際のレンダリングコストに連動します。正確なコストは選択したモデル・解像度・アスペクト比によって変わります。Seedance 2.0・720p の20秒クリップなら300クレジット、より軽い設定ならさらに少なくなります。",
    ko: "크레딧은 영상의 실제 렌더링 비용을 반영합니다. 정확한 비용은 선택한 모델, 해상도, 화면 비율에 따라 달라집니다. Seedance 2.0 720p의 20초 클립은 300 크레딧이며, 더 가벼운 설정은 더 적게 듭니다.",
    pt: "Os créditos acompanham o custo real de renderização do seu vídeo. O custo exato depende do modelo, da resolução e da proporção de tela escolhidos — um clipe de 20 segundos no Seedance 2.0 a 720p custa 300 créditos, e configurações mais leves custam menos.",
    id: "Kredit mengikuti biaya render nyata video Anda. Biaya pastinya tergantung pada model, resolusi, dan rasio aspek yang Anda pilih — klip 20 detik di Seedance 2.0 720p berharga 300 kredit, dan pengaturan yang lebih ringan lebih murah.",
    vi: "Tín dụng phản ánh chi phí render thực tế của video. Chi phí chính xác phụ thuộc vào mô hình, độ phân giải và tỷ lệ khung hình bạn chọn — clip 20 giây chạy Seedance 2.0 ở 720p tốn 300 tín dụng, và các thiết lập nhẹ hơn thì rẻ hơn.",
    th: "เครดิตสะท้อนต้นทุนการเรนเดอร์จริงของวิดีโอคุณ ต้นทุนที่แน่ชัดขึ้นอยู่กับโมเดล ความละเอียด และอัตราส่วนภาพที่คุณเลือก — คลิป 20 วินาทีบน Seedance 2.0 ที่ 720p ใช้ 300 เครดิต และการตั้งค่าที่เบากว่าจะถูกกว่า",
  },
  "marketing.pricing.faq.a3": {
    es: "Los créditos de los planes de pago se renuevan al inicio de cada ciclo de facturación; la asignación gratuita de registro es única y no se renueva. El pago autoservicio aún no está disponible - para subir a una asignación mensual mayor, escribe a {address} y lo configuramos.",
    zh: "付费套餐的积分会在每个计费周期开始时重置；注册赠送的免费积分为一次性发放，不会续期。目前尚不支持自助结账——如需升级到更高的月度额度，请发送邮件至 {address}，我们会为你设置。",
    ja: "有料プランのクレジットは各請求サイクルの開始時にリセットされます。無料の登録特典は1回限りで、更新されません。セルフサービスのチェックアウトはまだ利用できません。より大きな月間クレジットへアップグレードするには、{address} までメールでご連絡ください。設定いたします。",
    ko: "유료 플랜 크레딧은 매 결제 주기 시작 시 초기화되며, 무료 가입 크레딧은 일회성으로 갱신되지 않습니다. 셀프 결제는 아직 지원되지 않습니다. 더 큰 월간 크레딧으로 업그레이드하려면 {address}(으)로 이메일을 보내 주시면 설정해 드립니다.",
    pt: "Os créditos dos planos pagos renovam no início de cada ciclo de cobrança; o crédito gratuito de cadastro é único e não renova. O checkout self-service ainda não está disponível - para aumentar sua cota mensal, envie um e-mail para {address} e nós configuramos.",
    id: "Kredit paket berbayar diatur ulang di awal setiap siklus penagihan; pemberian gratis saat mendaftar bersifat satu kali dan tidak diperbarui. Checkout mandiri belum tersedia - untuk meningkatkan ke jatah bulanan yang lebih besar, email ke {address} dan kami akan mengaturnya.",
    vi: "Tín dụng của gói trả phí được đặt lại vào đầu mỗi chu kỳ thanh toán; tín dụng miễn phí khi đăng ký chỉ cấp một lần và không gia hạn. Thanh toán tự phục vụ chưa khả dụng - để nâng lên hạn mức hằng tháng lớn hơn, hãy email {address} và chúng tôi sẽ thiết lập cho bạn.",
    th: "เครดิตของแพลนแบบเสียเงินจะรีเซ็ตเมื่อเริ่มรอบบิลใหม่ ส่วนเครดิตฟรีตอนสมัครเป็นแบบครั้งเดียว ไม่ต่ออายุ ยังไม่มีระบบชำระเงินด้วยตนเอง - หากต้องการอัปเกรดเป็นโควตารายเดือนที่มากขึ้น ส่งอีเมลมาที่ {address} แล้วเราจะตั้งค่าให้",
  },
  "marketing.pricing.faq.a5": {
    es: "Hoy el modelo de renderizado en Studio es Seedance 2.0. Seedance 2.0 Fast y 2.0 Mini se suman al selector muy pronto, para cuando importan más la velocidad y el costo, y Seedance 2.5 después.",
    zh: "目前 Studio 使用的渲染模型是 Seedance 2.0。更看重速度和成本的 Seedance 2.0 Fast 与 2.0 Mini 很快会加入选择器，Seedance 2.5 随后推出。",
    ja: "現在 Studio のレンダリングモデルは Seedance 2.0 です。速度とコストを重視する Seedance 2.0 Fast と 2.0 Mini はまもなくピッカーに加わり、その後に Seedance 2.5 が続きます。",
    ko: "현재 Studio의 렌더링 모델은 Seedance 2.0입니다. 속도와 비용이 더 중요할 때 쓰는 Seedance 2.0 Fast와 2.0 Mini가 곧 선택기에 추가되고, 그다음에 Seedance 2.5가 이어집니다.",
    pt: "Hoje o modelo de renderização no Studio é o Seedance 2.0. O Seedance 2.0 Fast e o 2.0 Mini entram no seletor em breve, para quando velocidade e custo importam mais, e o Seedance 2.5 depois deles.",
    id: "Saat ini model render di Studio adalah Seedance 2.0. Seedance 2.0 Fast dan 2.0 Mini segera bergabung ke pemilih untuk saat kecepatan dan biaya lebih penting, lalu Seedance 2.5 menyusul.",
    vi: "Hiện mô hình render trong Studio là Seedance 2.0. Seedance 2.0 Fast và 2.0 Mini sắp có trong bộ chọn cho những lúc tốc độ và chi phí quan trọng hơn, rồi đến Seedance 2.5.",
    th: "ตอนนี้โมเดลเรนเดอร์ใน Studio คือ Seedance 2.0 ส่วน Seedance 2.0 Fast และ 2.0 Mini จะเข้ามาในตัวเลือกเร็วๆ นี้ สำหรับงานที่ความเร็วและต้นทุนสำคัญกว่า แล้วตามด้วย Seedance 2.5",
  },
  "marketing.pricing.faq.q1": {
    zh: "什么是积分？",
  },
  "marketing.pricing.included[0]": {
    es: "Guiones basados en patrones reales",
    zh: "基于真实爆款规律的脚本",
    ja: "パターンに基づく脚本",
    ko: "패턴 기반 스크립트",
    pt: "Roteiros baseados em padrões reais",
    id: "Skrip berbasis pola terbukti",
    vi: "Kịch bản dựa trên mô hình thực tế",
    th: "สคริปต์ที่อิงจากแพทเทิร์นจริง",
  },
  "marketing.pricing.included[1]": {
    es: "Revisión del storyboard antes de gastar",
    zh: "花费之前先审阅分镜",
    ja: "使う前に確認できるストーリーボードレビュー",
    ko: "크레딧을 쓰기 전 스토리보드 검토",
    pt: "Revisão do storyboard antes de gastar",
    id: "Tinjauan storyboard sebelum Anda membayar",
    vi: "Duyệt storyboard trước khi tốn tín dụng",
    th: "รีวิวสตอรี่บอร์ดก่อนเสียเครดิต",
  },
  "marketing.pricing.included[2]": {
    es: "5 relaciones de aspecto para cada plataforma",
    zh: "5 种宽高比适配各平台",
    ja: "あらゆるプラットフォームに対応する5つのアスペクト比",
    ko: "모든 플랫폼에 맞는 5가지 화면 비율",
    pt: "5 proporções de tela para cada plataforma",
    id: "5 rasio aspek untuk setiap platform",
    vi: "5 tỷ lệ khung hình cho mọi nền tảng",
    th: "5 อัตราส่วนภาพสำหรับทุกแพลตฟอร์ม",
  },
  "marketing.pricing.included[3]": {
    es: "Pega cualquier enlace de producto o sube fotos del producto",
    zh: "粘贴任意商品链接或上传商品图片",
    ja: "商品リンクを貼るだけ、または商品写真をアップロード",
    ko: "상품 링크를 붙여넣거나 상품 사진 업로드",
    pt: "Cole qualquer link de produto ou envie fotos do produto",
    id: "Tempel tautan produk apa pun atau unggah foto produk",
    vi: "Dán bất kỳ liên kết sản phẩm nào hoặc tải ảnh sản phẩm lên",
    th: "วางลิงก์สินค้าอะไรก็ได้ หรืออัปโหลดรูปสินค้า",
  },
  "marketing.pricing.tiers.creator.credits": {
    es: "900 créditos / mes",
    zh: "900 积分 / 月",
    ja: "900クレジット / 月",
    ko: "900 크레딧 / 월",
    pt: "900 créditos / mês",
    id: "900 kredit / bulan",
    vi: "900 tín dụng / tháng",
    th: "900 เครดิต / เดือน",
  },
  "marketing.pricing.tiers.creator.cta": {
    id: "Mulai Kreator",
  },
  "marketing.pricing.tiers.creator.features[0]": {
    es: "Sin marca de agua",
    zh: "无水印",
    ja: "ウォーターマークなし",
    ko: "워터마크 없음",
    pt: "Sem marca d'água",
    id: "Tanpa tanda air",
    vi: "Không hình mờ",
    th: "ไม่มีลายน้ำ",
  },
  "marketing.pricing.tiers.creator.features[1]": {
    es: "Revisión del storyboard",
    zh: "分镜审阅",
    ja: "ストーリーボードレビュー",
    ko: "스토리보드 검토",
    pt: "Revisão do storyboard",
    id: "Tinjauan storyboard",
    vi: "Duyệt storyboard",
    th: "รีวิวสตอรี่บอร์ด",
  },
  "marketing.pricing.tiers.creator.features[2]": {
    es: "Exportación 720p · 5 relaciones de aspecto",
    zh: "720p 导出 · 5 种宽高比",
    ja: "720p 書き出し · 5つのアスペクト比",
    ko: "720p 내보내기 · 5가지 화면 비율",
    pt: "Exportação 720p · 5 proporções de tela",
    id: "Ekspor 720p · 5 rasio aspek",
    vi: "Xuất 720p · 5 tỷ lệ khung hình",
    th: "ส่งออก 720p · 5 อัตราส่วนภาพ",
  },
  "marketing.pricing.tiers.creator.name": {
    id: "Kreator",
  },
  "marketing.pricing.tiers.enterprise.allowance": {
    zh: "定制积分额度",
  },
  "marketing.pricing.tiers.free.credits": {
    es: "300 créditos, una sola vez",
    zh: "300 积分，一次性",
    ja: "300クレジット（1回限り）",
    ko: "300 크레딧, 일회성",
    pt: "300 créditos, uma única vez",
    id: "300 kredit, satu kali",
    vi: "300 tín dụng, một lần",
    th: "300 เครดิต ครั้งเดียว",
  },
  "marketing.pricing.tiers.free.features[0]": {
    es: "Exportación 720p · 5 relaciones de aspecto",
    zh: "720p 导出 · 5 种宽高比",
    ja: "720p 書き出し · 5つのアスペクト比",
    ko: "720p 내보내기 · 5가지 화면 비율",
    pt: "Exportação 720p · 5 proporções de tela",
    id: "Ekspor 720p · 5 rasio aspek",
    vi: "Xuất 720p · 5 tỷ lệ khung hình",
    th: "ส่งออก 720p · 5 อัตราส่วนภาพ",
  },
  "marketing.pricing.tiers.free.features[1]": {
    es: "Importación por enlace de producto",
    zh: "商品链接导入",
    ja: "商品リンク取り込み",
    ko: "상품 링크 가져오기",
    pt: "Importação por link do produto",
    id: "Impor tautan produk",
    vi: "Nhập bằng liên kết sản phẩm",
    th: "นำเข้าจากลิงก์สินค้า",
  },
  "marketing.pricing.tiers.free.features[2]": {
    es: "Revisión del storyboard",
    zh: "分镜审阅",
    ja: "ストーリーボードレビュー",
    ko: "스토리보드 검토",
    pt: "Revisão do storyboard",
    id: "Tinjauan storyboard",
    vi: "Duyệt storyboard",
    th: "รีวิวสตอรี่บอร์ด",
  },
  "marketing.pricing.tiers.free.features[3]": {
    es: "Marca de agua Lumi",
    zh: "Lumi 水印",
    ja: "Lumi ウォーターマーク",
    ko: "Lumi 워터마크",
    pt: "Marca d'água Lumi",
    id: "Tanda air Lumi",
    vi: "Hình mờ Lumi",
    th: "ลายน้ำ Lumi",
  },
  "marketing.pricing.tiers.pro.credits": {
    es: "3.000 créditos / mes",
    zh: "3,000 积分 / 月",
    ja: "3,000クレジット / 月",
    ko: "3,000 크레딧 / 월",
    pt: "3.000 créditos / mês",
    id: "3.000 kredit / bulan",
    vi: "3.000 tín dụng / tháng",
    th: "3,000 เครดิต / เดือน",
  },
  "marketing.pricing.tiers.scale.credits": {
    es: "7.500 créditos / mes",
    zh: "7,500 积分 / 月",
    ja: "7,500クレジット / 月",
    ko: "7,500 크레딧 / 월",
    pt: "7.500 créditos / mês",
    id: "7.500 kredit / bulan",
    vi: "7.500 tín dụng / tháng",
    th: "7,500 เครดิต / เดือน",
  },
  "app.jobs.completed.description": {
    es: "Un corte listo para publicar con audio hablado. Descárgalo o márcalo como publicado para mantener tus estadísticas ordenadas.",
    zh: "一条可发布的成片，配有口播音频。下载或标记为已发布，让你的数据保持整洁。",
    ja: "音声付きですぐに投稿できるカット。ダウンロードするか投稿済みにして、統計をすっきり保ちましょう。",
    ko: "음성 오디오가 포함된 바로 게시 가능한 컷. 다운로드하거나 게시 완료로 표시해 통계를 깔끔하게 유지하세요.",
    pt: "Um corte pronto para publicar com áudio falado. Baixe ou marque como postado para manter suas estatísticas em ordem.",
    id: "Hasil siap posting dengan audio suara. Unduh atau tandai sudah diposting agar statistik Anda tetap rapi.",
    vi: "Một bản cắt sẵn sàng đăng kèm âm thanh lồng tiếng. Tải xuống hoặc đánh dấu đã đăng để số liệu luôn gọn gàng.",
    th: "คลิปพร้อมโพสต์พร้อมเสียงพูด ดาวน์โหลดหรือทำเครื่องหมายว่าโพสต์แล้วเพื่อให้สถิติของคุณเป็นระเบียบ",
  },
  // One balance, one noun: zh calls the credit unit 积分 on every money surface,
  // so the refund lines and the delete warning say it too - the machine reaches
  // for 额度 (an allowance/limit) here, which reads as a second currency.
  "app.jobs.failed.reasons.workerRestart": {
    zh: "我们的渲染系统重启后丢失了这个视频的进度。你的积分已退还 - 点击重试重新制作。",
  },
  "app.jobs.failed.reasons.resumeInvalidScript": {
    zh: "这个视频无法从中断处继续。你的积分已退还 - 请重试。",
  },
  "app.jobs.failed.reasons.productNotFound": {
    zh: "这个视频对应的商品已不存在。你的积分已退还。",
  },
  "app.jobs.failed.reasons.providerUnavailable": {
    zh: "由于我们这边的问题，视频生成暂时不可用。你的积分已退还 - 请稍后重试。",
  },
  "app.jobs.failed.reasons.renderStart": {
    zh: "我们无法启动视频渲染。你的积分已退还 - 请重试。",
  },
  "app.jobs.failed.reasons.renderIncomplete": {
    zh: "一个或多个视频渲染未能完成。你的积分已退还 - 请重试。",
  },
  "app.jobs.failed.reasons.assembling": {
    zh: "在合成这个视频时，我们这边出现了问题。你的积分已退还 - 请重试。",
  },
  "app.jobs.failed.reasons.finishing": {
    zh: "在完成这个视频的收尾时，我们这边出现了问题。你的积分已退还 - 请重试。",
  },
  "app.jobs.failed.reasons.making": {
    zh: "在制作这个视频时，我们这边出现了问题。你的积分已退还 - 请重试。",
  },
  "app.jobs.failed.reasons.categoryUnsupported": {
    zh: "我们暂时还无法为这个商品类目制作视频。你的积分已退还。",
  },
  "app.jobs.delete.description": {
    zh: "此操作将永久删除该视频，无法恢复，已消耗的积分不予退还。",
  },
  "marketing.pricing.tiers.pro.features[0]": {
    zh: "包含创作者全部功能",
    id: "Semua fitur Kreator",
  },
  // In-app storyboard vocabulary. The retired "beat" noun is the one word the
  // machine cannot survive - it read it as a heartbeat/musical beat in every
  // locale ("Latidos", "nhịp đập", "เต้น") and as "to defeat" in id
  // ("mengalahkan"). Shot/storyboard wording is hand-set here; do not unpin.
  // The waiting copy is one story per stage, so the whole block is hand-set:
  // the machine loses the shot noun, and `scriptDescription` is a money fact
  // (nothing renders before approval) it must not be allowed to reword.
  "app.jobs.working.queuedForScript": {
    es: "Esperando para escribir tu guion…",
    zh: "正在等待编写脚本…",
    ja: "スクリプト作成を待っています…",
    ko: "스크립트 작성을 기다리는 중…",
    pt: "Aguardando para escrever seu roteiro…",
    id: "Menunggu untuk menulis skrip Anda…",
    vi: "Đang chờ viết kịch bản của bạn…",
    th: "กำลังรอเขียนสคริปต์ของคุณ…",
  },
  "app.jobs.working.writingScript": {
    es: "Escribiendo tu guion…",
    zh: "正在编写脚本…",
    ja: "スクリプトを書いています…",
    ko: "스크립트를 작성하는 중…",
    pt: "Escrevendo seu roteiro…",
    id: "Menulis skrip Anda…",
    vi: "Đang viết kịch bản của bạn…",
    th: "กำลังเขียนสคริปต์ของคุณ…",
  },
  "app.jobs.working.queuedForShots": {
    es: "Esperando para crear tus tomas…",
    zh: "正在等待制作镜头…",
    ja: "ショット作成を待っています…",
    ko: "샷 제작을 기다리는 중…",
    pt: "Aguardando para criar suas tomadas…",
    id: "Menunggu untuk membangun shot Anda…",
    vi: "Đang chờ dựng các cảnh của bạn…",
    th: "กำลังรอสร้างช็อตของคุณ…",
  },
  "app.jobs.working.buildingShots": {
    es: "Creando tus tomas…",
    zh: "正在制作镜头…",
    ja: "ショットを作成しています…",
    ko: "샷을 제작하는 중…",
    pt: "Criando suas tomadas…",
    id: "Membangun shot Anda…",
    vi: "Đang dựng các cảnh của bạn…",
    th: "กำลังสร้างช็อตของคุณ…",
  },
  "app.jobs.working.queuedForRender": {
    es: "Esperando para renderizar tu video…",
    zh: "正在等待渲染视频…",
    ja: "動画レンダリングを待っています…",
    ko: "동영상 렌더링을 기다리는 중…",
    pt: "Aguardando para renderizar seu vídeo…",
    id: "Menunggu untuk merender video Anda…",
    vi: "Đang chờ render video của bạn…",
    th: "กำลังรอเรนเดอร์วิดีโอของคุณ…",
  },
  "app.jobs.working.renderingVideo": {
    es: "Renderizando tu video…",
    zh: "正在渲染视频…",
    ja: "動画をレンダリングしています…",
    ko: "동영상을 렌더링하는 중…",
    pt: "Renderizando seu vídeo…",
    id: "Merender video Anda…",
    vi: "Đang render video của bạn…",
    th: "กำลังเรนเดอร์วิดีโอของคุณ…",
  },
  "app.jobs.working.working": {
    es: "Trabajando en tu video…",
    zh: "正在处理你的视频…",
    ja: "動画を処理しています…",
    ko: "동영상을 작업 중…",
    pt: "Trabalhando no seu vídeo…",
    id: "Mengerjakan video Anda…",
    vi: "Đang xử lý video của bạn…",
    th: "กำลังทำงานกับวิดีโอของคุณ…",
  },
  "app.jobs.working.queuedScriptDescription": {
    es: "Tu video está en cola para empezar. No se renderiza nada hasta que apruebas el storyboard. Esta página se actualiza automáticamente. Puedes salir y volver.",
    zh: "你的视频正在排队等待开始。在你批准分镜前不会开始渲染。此页面会自动更新，你可以离开后再回来。",
    ja: "動画は開始待ちの列に並んでいます。ストーリーボードを承認するまでレンダリングは始まりません。このページは自動更新されるので、離れてもあとで戻れます。",
    ko: "동영상이 시작 대기열에 있습니다. 스토리보드를 승인하기 전까지 렌더링은 시작되지 않습니다. 이 페이지는 자동으로 업데이트되니 나갔다가 다시 오셔도 됩니다.",
    pt: "Seu vídeo está na fila para começar. Nada é renderizado até você aprovar o storyboard. Esta página é atualizada automaticamente. Você pode sair e voltar depois.",
    id: "Video Anda sedang antre untuk dimulai. Tidak ada yang dirender sampai Anda menyetujui storyboard. Halaman ini diperbarui secara otomatis. Anda boleh pergi dan kembali lagi.",
    vi: "Video của bạn đang xếp hàng chờ bắt đầu. Chưa render gì cho đến khi bạn duyệt storyboard. Trang này cập nhật tự động, bạn có thể rời đi rồi quay lại.",
    th: "วิดีโอของคุณกำลังรอคิวเพื่อเริ่ม จะยังไม่เริ่มเรนเดอร์จนกว่าคุณจะอนุมัติสตอรี่บอร์ด หน้านี้อัปเดตโดยอัตโนมัติ คุณออกไปก่อนแล้วกลับมาดูใหม่ได้",
  },
  "app.jobs.working.scriptDescription": {
    es: "Lumi está escribiendo tu guion. No se renderiza nada hasta que apruebas el storyboard. Esta página se actualiza automáticamente. Puedes salir y volver.",
    zh: "Lumi 正在撰写你的脚本。在你批准分镜前不会开始渲染。此页面会自动更新，你可以离开后再回来。",
    ja: "Lumi がスクリプトを作成しています。ストーリーボードを承認するまでレンダリングは始まりません。このページは自動更新されるので、離れてもあとで戻れます。",
    ko: "Lumi가 스크립트를 작성하고 있습니다. 스토리보드를 승인하기 전까지 렌더링은 시작되지 않습니다. 이 페이지는 자동으로 업데이트되니 나갔다가 다시 오셔도 됩니다.",
    pt: "A Lumi está escrevendo seu roteiro. Nada é renderizado até você aprovar o storyboard. Esta página é atualizada automaticamente. Você pode sair e voltar depois.",
    id: "Lumi sedang menulis naskah Anda. Tidak ada yang dirender sampai Anda menyetujui storyboard. Halaman ini diperbarui secara otomatis. Anda boleh pergi dan kembali lagi.",
    vi: "Lumi đang viết kịch bản của bạn. Chưa render gì cho đến khi bạn duyệt storyboard. Trang này cập nhật tự động, bạn có thể rời đi rồi quay lại.",
    th: "Lumi กำลังเขียนสคริปต์ของคุณ จะยังไม่เริ่มเรนเดอร์จนกว่าคุณจะอนุมัติสตอรี่บอร์ด หน้านี้อัปเดตโดยอัตโนมัติ คุณออกไปก่อนแล้วกลับมาดูใหม่ได้",
  },
  "app.jobs.working.queuedShotsDescription": {
    es: "Tu storyboard está aprobado. Este video está en cola para preparar las referencias de tomas y los recursos de renderizado. Esta página se actualiza automáticamente. Puedes salir y volver.",
    zh: "你的分镜已批准。此视频正在排队等待生成镜头参考图和渲染素材。此页面会自动更新，你可以离开后再回来。",
    ja: "ストーリーボードは承認済みです。この動画はショット参照とレンダリング素材の準備待ちです。このページは自動更新されるので、離れてもあとで戻れます。",
    ko: "스토리보드가 승인되었습니다. 이 동영상은 샷 참조와 렌더링 에셋 준비를 기다리는 중입니다. 이 페이지는 자동으로 업데이트되니 나갔다가 다시 오셔도 됩니다.",
    pt: "Seu storyboard foi aprovado. Este vídeo está na fila para preparar as referências das tomadas e os recursos de renderização. Esta página é atualizada automaticamente. Você pode sair e voltar depois.",
    id: "Storyboard Anda sudah disetujui. Video ini sedang antre untuk penyiapan referensi shot dan aset render. Halaman ini diperbarui secara otomatis. Anda boleh pergi dan kembali lagi.",
    vi: "Storyboard của bạn đã được duyệt. Video này đang xếp hàng chờ chuẩn bị ảnh tham chiếu cho cảnh và tài nguyên render. Trang này cập nhật tự động, bạn có thể rời đi rồi quay lại.",
    th: "สตอรี่บอร์ดของคุณได้รับอนุมัติแล้ว วิดีโอนี้กำลังรอคิวเพื่อเตรียมภาพอ้างอิงของช็อตและไฟล์สำหรับเรนเดอร์ หน้านี้อัปเดตโดยอัตโนมัติ คุณออกไปก่อนแล้วกลับมาดูใหม่ได้",
  },
  "app.jobs.working.shotsDescription": {
    es: "Tu storyboard está aprobado. Lumi está preparando las referencias de tomas y los recursos de renderizado. Esta página se actualiza automáticamente. Puedes salir y volver.",
    zh: "你的分镜已批准。Lumi 正在准备镜头参考图和渲染素材。此页面会自动更新，你可以离开后再回来。",
    ja: "ストーリーボードは承認済みです。Lumi がショット参照とレンダリング素材を準備しています。このページは自動更新されるので、離れてもあとで戻れます。",
    ko: "스토리보드가 승인되었습니다. Lumi가 샷 참조와 렌더링 에셋을 준비하고 있습니다. 이 페이지는 자동으로 업데이트되니 나갔다가 다시 오셔도 됩니다.",
    pt: "Seu storyboard foi aprovado. A Lumi está preparando as referências das tomadas e os recursos de renderização. Esta página é atualizada automaticamente. Você pode sair e voltar depois.",
    id: "Storyboard Anda sudah disetujui. Lumi sedang menyiapkan referensi shot dan aset render. Halaman ini diperbarui secara otomatis. Anda boleh pergi dan kembali lagi.",
    vi: "Storyboard của bạn đã được duyệt. Lumi đang chuẩn bị ảnh tham chiếu cho cảnh và tài nguyên render. Trang này cập nhật tự động, bạn có thể rời đi rồi quay lại.",
    th: "สตอรี่บอร์ดของคุณได้รับอนุมัติแล้ว Lumi กำลังเตรียมภาพอ้างอิงของช็อตและไฟล์สำหรับเรนเดอร์ หน้านี้อัปเดตโดยอัตโนมัติ คุณออกไปก่อนแล้วกลับมาดูใหม่ได้",
  },
  "app.jobs.working.queuedRenderDescription": {
    es: "Tus tomas aprobadas están en cola para renderizarse. Esta página se actualiza automáticamente. Puedes salir y volver.",
    zh: "你批准的镜头正在排队等待渲染。此页面会自动更新，你可以离开后再回来。",
    ja: "承認済みのショットはレンダリング待ちです。このページは自動更新されるので、離れてもあとで戻れます。",
    ko: "승인된 샷이 렌더링을 기다리고 있습니다. 이 페이지는 자동으로 업데이트되니 나갔다가 다시 오셔도 됩니다.",
    pt: "Suas tomadas aprovadas estão na fila para renderizar. Esta página é atualizada automaticamente. Você pode sair e voltar depois.",
    id: "Shot yang Anda setujui sedang antre untuk dirender. Halaman ini diperbarui secara otomatis. Anda boleh pergi dan kembali lagi.",
    vi: "Các cảnh đã duyệt của bạn đang xếp hàng chờ render. Trang này cập nhật tự động, bạn có thể rời đi rồi quay lại.",
    th: "ช็อตที่คุณอนุมัติกำลังรอคิวเรนเดอร์ หน้านี้อัปเดตโดยอัตโนมัติ คุณออกไปก่อนแล้วกลับมาดูใหม่ได้",
  },
  "app.jobs.working.renderDescription": {
    es: "Tus tomas aprobadas se están renderizando en el video final. Esta página se actualiza automáticamente. Puedes salir y volver.",
    zh: "你批准的镜头正在渲染成最终视频。此页面会自动更新，你可以离开后再回来。",
    ja: "承認済みのショットを最終動画にレンダリングしています。このページは自動更新されるので、離れてもあとで戻れます。",
    ko: "승인된 샷을 최종 동영상으로 렌더링하고 있습니다. 이 페이지는 자동으로 업데이트되니 나갔다가 다시 오셔도 됩니다.",
    pt: "Suas tomadas aprovadas estão sendo renderizadas no vídeo final. Esta página é atualizada automaticamente. Você pode sair e voltar depois.",
    id: "Shot yang Anda setujui sedang dirender menjadi video final. Halaman ini diperbarui secara otomatis. Anda boleh pergi dan kembali lagi.",
    vi: "Các cảnh đã duyệt của bạn đang được render thành video cuối cùng. Trang này cập nhật tự động, bạn có thể rời đi rồi quay lại.",
    th: "ช็อตที่คุณอนุมัติกำลังถูกเรนเดอร์เป็นวิดีโอสุดท้าย หน้านี้อัปเดตโดยอัตโนมัติ คุณออกไปก่อนแล้วกลับมาดูใหม่ได้",
  },
  "app.jobs.working.workingDescription": {
    es: "Esta página se actualiza automáticamente. Puedes salir y volver.",
    zh: "此页面会自动更新，你可以离开后再回来。",
    ja: "このページは自動更新されるので、離れてもあとで戻れます。",
    ko: "이 페이지는 자동으로 업데이트되니 나갔다가 다시 오셔도 됩니다.",
    pt: "Esta página é atualizada automaticamente. Você pode sair e voltar depois.",
    id: "Halaman ini diperbarui secara otomatis. Anda boleh pergi dan kembali lagi.",
    vi: "Trang này cập nhật tự động, bạn có thể rời đi rồi quay lại.",
    th: "หน้านี้อัปเดตโดยอัตโนมัติ คุณออกไปก่อนแล้วกลับมาดูใหม่ได้",
  },
  "app.jobs.review.title": {
    es: "Revisa tus tomas",
    zh: "检查你的镜头",
    ja: "ショットを確認",
    ko: "샷을 검토하세요",
    pt: "Revise suas tomadas",
    id: "Tinjau shot Anda",
    vi: "Xem lại các cảnh của bạn",
    th: "ตรวจสอบช็อตของคุณ",
  },
  "app.jobs.review.description": {
    es: "Aprueba cada toma, o regenera las que no te convenzan. Lumi renderiza en cuanto cada toma está aprobada.",
    zh: "批准每个镜头，或重新生成你不喜欢的镜头。每个镜头获批后，Lumi 就会开始渲染。",
    ja: "各ショットを承認するか、気に入らないものを再生成してください。すべてのショットが承認されると Lumi がレンダリングします。",
    ko: "각 샷을 승인하거나 마음에 들지 않는 샷을 다시 생성하세요. 모든 샷이 승인되면 Lumi가 렌더링합니다.",
    pt: "Aprove cada tomada ou regenere as que você não curtir. A Lumi renderiza assim que cada tomada é aprovada.",
    id: "Setujui setiap shot, atau buat ulang yang tidak Anda sukai. Lumi merender setelah setiap shot disetujui.",
    vi: "Duyệt từng cảnh, hoặc tạo lại những cảnh bạn chưa ưng. Lumi sẽ render khi mọi cảnh đã được duyệt.",
    th: "อนุมัติแต่ละช็อต หรือสร้างช็อตที่คุณไม่ชอบขึ้นมาใหม่ Lumi จะเรนเดอร์เมื่อทุกช็อตได้รับการอนุมัติแล้ว",
  },
  // The five tracker labels are one row read left to right, so all of them are
  // pinned together: the machine read "Review" as a product comment in zh
  // ("评论") and dropped the initial capital on single-word steps in id/vi.
  "shared.jobProgress.script": {
    es: "Guion",
    zh: "脚本",
    ja: "スクリプト",
    ko: "스크립트",
    pt: "Roteiro",
    id: "Naskah",
    vi: "Kịch bản",
    th: "สคริปต์",
  },
  "shared.jobProgress.review": {
    es: "Revisión",
    zh: "审阅",
    ja: "レビュー",
    ko: "검토",
    pt: "Revisão",
    id: "Tinjau",
    vi: "Xem lại",
    th: "ตรวจสอบ",
  },
  "shared.jobProgress.shots": {
    es: "Tomas",
    zh: "镜头",
    ja: "ショット",
    ko: "샷",
    pt: "Tomadas",
    id: "Shot",
    vi: "Cảnh",
    th: "ช็อต",
  },
  "shared.jobProgress.render": {
    es: "Render",
    zh: "渲染",
    ja: "レンダリング",
    ko: "렌더링",
    pt: "Render",
    id: "Render",
    vi: "Render",
    th: "เรนเดอร์",
  },
  "shared.jobProgress.ready": {
    es: "Listo",
    zh: "完成",
    ja: "準備完了",
    ko: "완료",
    pt: "Pronto",
    id: "Siap",
    vi: "Sẵn sàng",
    th: "พร้อม",
  },
  // Job status badge vocabulary: same shot noun, plus the queue/stage split the
  // machine flattens back into a bare "Queued" for every wait.
  "shared.status.queuedForScript": {
    es: "En cola para guion",
    zh: "等待脚本",
    ja: "スクリプト待ち",
    ko: "스크립트 대기 중",
    pt: "Na fila para roteiro",
    id: "Antre untuk skrip",
    vi: "Chờ viết kịch bản",
    th: "รอเขียนสคริปต์",
  },
  "shared.status.writingScript": {
    es: "Escribiendo guion",
    zh: "正在写脚本",
    ja: "スクリプト作成中",
    ko: "스크립트 작성 중",
    pt: "Escrevendo roteiro",
    id: "Menulis skrip",
    vi: "Đang viết kịch bản",
    th: "กำลังเขียนสคริปต์",
  },
  "shared.status.queuedForShots": {
    es: "En cola para tomas",
    zh: "等待镜头",
    ja: "ショット待ち",
    ko: "샷 대기 중",
    pt: "Na fila para tomadas",
    id: "Antre untuk shot",
    vi: "Chờ dựng cảnh",
    th: "รอสร้างช็อต",
  },
  "shared.status.buildingShots": {
    es: "Creando tomas",
    zh: "正在制作镜头",
    ja: "ショット作成中",
    ko: "샷 제작 중",
    pt: "Criando tomadas",
    id: "Membangun shot",
    vi: "Đang dựng cảnh",
    th: "กำลังสร้างช็อต",
  },
  "shared.status.reviewShots": {
    es: "Revisar tomas",
    zh: "检查镜头",
    ja: "ショット確認",
    ko: "샷 검토",
    pt: "Revisar tomadas",
    id: "Tinjau shot",
    vi: "Xem lại cảnh",
    th: "ตรวจสอบช็อต",
  },
  "shared.status.queuedForRender": {
    es: "En cola para render",
    zh: "等待渲染",
    ja: "レンダリング待ち",
    ko: "렌더링 대기 중",
    pt: "Na fila para render",
    id: "Antre untuk render",
    vi: "Chờ render",
    th: "รอเรนเดอร์",
  },
  "shared.status.working": {
    es: "Trabajando",
    zh: "处理中",
    ja: "処理中",
    ko: "작업 중",
    pt: "Trabalhando",
    id: "Bekerja",
    vi: "Đang xử lý",
    th: "กำลังทำงาน",
  },
  // Connections-page honesty copy (2026-08-06): the Shopify OAuth handshake
  // stores a real token but nothing imports a catalog from it yet, so this
  // page must never read as "connect and your products import" - see
  // /app/connections and CLAUDE.md's connections section. Hand-set per
  // locale like the pricing-copy-c4 block above; do not let the machine
  // regenerate a claim this surface exists specifically to retract.
  "app.connections.subtitle": {
    es: "Autoriza a Lumi para acceder a tu tienda.",
    zh: "授权 Lumi 访问你的商店。",
    ja: "Lumi にショップへのアクセスを許可します。",
    ko: "Lumi가 상점에 접근하도록 승인하세요.",
    pt: "Autorize a Lumi a acessar sua loja.",
    id: "Izinkan Lumi mengakses toko Anda.",
    vi: "Cấp quyền cho Lumi truy cập cửa hàng của bạn.",
    th: "อนุญาตให้ Lumi เข้าถึงร้านค้าของคุณ",
  },
  "app.connections.connectNotice": {
    es: "Conectar autoriza a Lumi a acceder a tu tienda, pero todavía no importa productos automáticamente. <link>Importa tu catálogo desde la página de Productos</link> mientras tanto.",
    zh: "连接会授权 Lumi 访问你的商店，但目前还不会自动导入商品。你可以<link>在“商品”页面导入你的商品目录</link>。",
    ja: "連携すると Lumi にストアへのアクセスを許可しますが、商品はまだ自動でインポートされません。それまでは<link>商品ページからカタログをインポート</link>してください。",
    ko: "연결하면 Lumi가 상점에 접근할 수 있도록 승인되지만, 아직 상품이 자동으로 가져와지지는 않습니다. 그동안 <link>상품 페이지에서 카탈로그를 가져오세요</link>.",
    pt: "Conectar autoriza a Lumi a acessar sua loja, mas ainda não importa produtos automaticamente. <link>Importe seu catálogo pela página Produtos</link> enquanto isso.",
    id: "Menghubungkan mengizinkan Lumi mengakses toko Anda, tetapi belum mengimpor produk secara otomatis. Sementara itu, <link>impor katalog Anda dari halaman Produk</link>.",
    vi: "Kết nối sẽ cấp quyền cho Lumi truy cập cửa hàng của bạn, nhưng chưa tự động nhập sản phẩm. Trong lúc chờ, hãy <link>nhập danh mục của bạn từ trang Sản phẩm</link>.",
    th: "การเชื่อมต่อจะอนุญาตให้ Lumi เข้าถึงร้านค้าของคุณ แต่ยังไม่นำเข้าสินค้าโดยอัตโนมัติ ระหว่างนี้ <link>นำเข้าแคตตาล็อกของคุณจากหน้าสินค้า</link> ได้เลย",
  },
  "app.connections.connectedBanner": {
    es: "{shop} está autorizada a compartir su catálogo con Lumi. La importación automática de productos aún no está disponible.",
    zh: "{shop} 已授权将其商品目录分享给 Lumi。自动导入商品功能尚未上线。",
    ja: "{shop} は Lumi とカタログを共有することを許可されました。商品の自動インポートはまだ利用できません。",
    ko: "{shop}이(가) Lumi와 카탈로그를 공유하도록 승인되었습니다. 상품 자동 가져오기는 아직 제공되지 않습니다.",
    pt: "{shop} está autorizada a compartilhar seu catálogo com a Lumi. A importação automática de produtos ainda não está disponível.",
    id: "{shop} telah mengizinkan katalognya dibagikan ke Lumi. Impor produk otomatis belum tersedia.",
    vi: "{shop} đã cấp quyền chia sẻ danh mục với Lumi. Tính năng tự động nhập sản phẩm chưa hoạt động.",
    th: "{shop} ได้อนุญาตให้แชร์แคตตาล็อกกับ Lumi แล้ว การนำเข้าสินค้าอัตโนมัติยังไม่เปิดใช้งาน",
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

const sourcePaths = new Set(flatten(source).map((leaf) => leaf.path));
const orphanedOverrides = Object.keys(MANUAL_OVERRIDES).filter(
  (path) => !sourcePaths.has(path),
);
if (orphanedOverrides.length > 0) {
  throw new Error(
    `MANUAL_OVERRIDES pins keys that no longer exist in ${SOURCE} (rename or drop them):\n  ${orphanedOverrides.join("\n  ")}`,
  );
}

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
