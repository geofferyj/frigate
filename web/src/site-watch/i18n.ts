// Our translations live in one bundle ("site-watch" namespace) registered at runtime, so no
// Frigate locale file is touched. Other languages fall back to English.
import i18n from "@/utils/i18n";
import en from "./locales/en.json";

export const SW_NS = "site-watch";

if (!i18n.hasResourceBundle("en", SW_NS)) {
  i18n.addResourceBundle("en", SW_NS, en, true, true);
}

export default i18n;
