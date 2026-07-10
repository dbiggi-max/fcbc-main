export interface DailyThemeLite {
  id: string;
  themeText: string;
  themeDate: Date;
  description: string | null;
  status: string;
  minThemeMatchScore: number | null;
  minQualityScore: number | null;
  minEffortScore: number | null;
  maxSpamScore: number | null;
  maxSimplicityScore: number | null;
}

export interface GeneratedTheme {
  title: string;
  prompt: string;
  description: string;
  rules: string;
  tags?: string[];
  difficulty?: string;
}

export interface ThemeRotationResult {
  success: boolean;
  dateKey: string;
  activatedThemeId: string | null;
  themeText: string | null;
  source: "ADMIN" | "AI_FALLBACK";
  isNewActivation: boolean;
  error?: string;
}

export interface ThemeRotationOptions {
  triggerSource?: "CRON" | "MANUAL";
  adminId?: string;
}
