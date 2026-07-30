/**
 * The billing inbox the site tells people to write to while checkout isn't
 * self-serve. The catalogs interpolate it as `{address}` rather than spelling
 * it out, so changing the inbox is this one edit and no locale can be left
 * advertising a dead address.
 */
export const BILLING_EMAIL = "billing@sellcast.ai";
