/**
 * Launch surface routing. Marketplace is deliberately excluded from this
 * launch; restore it by reintroducing the app-shell/footer links, re-adding the
 * /app/marketplace route, restoring the removed catalog keys (app.nav.marketplace,
 * app.marketplace.*, app.productDetail.backToMarketplace/marketplace, the footer
 * link) in all 9 messages/*.json - next-intl throws at render on a missing key and
 * src/i18n/messages.test.ts enforces parity - removing the /app/marketplace
 * redirect in next.config.ts, and pointing APP_HOME_HREF back at it.
 */
export const PRODUCTS_HREF = "/app/products";
export const NEW_PRODUCT_HREF = "/app/products/new";
export const STUDIO_HREF = "/app/studio";
export const APP_HOME_HREF = PRODUCTS_HREF;
