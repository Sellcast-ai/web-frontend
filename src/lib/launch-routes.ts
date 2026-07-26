/**
 * Launch surface routing. Marketplace is deliberately excluded from this
 * launch; restore it by reintroducing the app-shell/footer links, re-adding the
 * /app/marketplace route, and pointing APP_HOME_HREF back at it.
 */
export const PRODUCTS_HREF = "/app/products";
export const NEW_PRODUCT_HREF = "/app/products/new";
export const APP_HOME_HREF = PRODUCTS_HREF;
