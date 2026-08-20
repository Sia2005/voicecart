export interface Language {
  code: string;
  label: string;
  short: string;
}

export const LANGUAGES: Language[] = [
  { code: "en-IN", label: "English", short: "EN" },
  { code: "hi-IN", label: "हिन्दी", short: "HI" },
  { code: "es-ES", label: "Español", short: "ES" },
  { code: "fr-FR", label: "Français", short: "FR" },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0].code;