export type AppRoute = {
  title: string;
  href: string;
  description: string;
  status: string;
};

export const mainNavItems = [
  { title: "Home", href: "/" },
  { title: "Generate", href: "/generate" },
  { title: "Gallery", href: "/gallery" },
  { title: "Sketches", href: "/gallery/submissions" },
  { title: "Daily Theme", href: "/daily-theme" },
  { title: "Admin", href: "/admin" },
] as const;

export const adminNavItems = [
  { title: "Admin Overview", href: "/admin" },
  { title: "Artists", href: "/admin/artists" },
  { title: "Datasets", href: "/admin/datasets" },
  { title: "Model Adapters", href: "/admin/adapters" },
  { title: "Generations", href: "/admin/generations" },
  { title: "Royalties", href: "/admin/royalties" },
  { title: "Daily Themes", href: "/admin/daily-theme" },
  { title: "Submissions Moderation", href: "/admin/moderation" },
  { title: "Validation Settings", href: "/admin/settings/validation" },
  { title: "Audit Logs", href: "/admin/audit-logs" },
] as const;

export const pages = {
  home: {
    title: "Creator Style Lab",
    href: "/",
    description:
      "A prototype workspace for selecting artist styles, generating images, and reviewing simulated royalty events.",
    status:
      "This skeleton is ready for navigation and planning only. Artist selection, image generation, storage, and royalty logic are not implemented yet.",
  },
  generate: {
    title: "Generate",
    href: "/generate",
    description:
      "This page will let users choose an approved artist style, enter a prompt, and request a generated image.",
    status:
      "Generation controls, model adapter calls, image output, and persistence are intentionally not implemented yet.",
  },
  gallery: {
    title: "Gallery",
    href: "/gallery",
    description:
      "This page will display prototype generations with their selected style, prompt details, and royalty simulation status.",
    status:
      "Gallery data, image assets, filtering, and detail views are not connected yet.",
  },
  dailyTheme: {
    title: "Daily Theme",
    href: "/daily-theme",
    description:
      "This page will introduce a daily creative prompt that guides prototype image generation sessions.",
    status:
      "Theme scheduling, editorial controls, and user submissions are not implemented yet.",
  },
  admin: {
    title: "Admin Overview",
    href: "/admin",
    description:
      "This admin landing page will summarize artists, datasets, adapters, generations, and royalty events for internal review.",
    status:
      "Admin metrics, database-backed records, and operational workflows are not implemented yet.",
  },
  artists: {
    title: "Artists",
    href: "/admin/artists",
    description:
      "This page will manage artist profiles, consent status, available styles, and future royalty configuration.",
    status:
      "Artist records, edit forms, and consent workflows are not implemented yet.",
  },
  datasets: {
    title: "Datasets",
    href: "/admin/datasets",
    description:
      "This page will track approved datasets associated with artists and future model preparation workflows.",
    status:
      "Dataset ingestion, validation, provenance tracking, and storage are not implemented yet.",
  },
  adapters: {
    title: "Model Adapters",
    href: "/admin/adapters",
    description:
      "This page will catalog model adapters that represent artist-approved style capabilities.",
    status:
      "Adapter metadata, versioning, and model integration logic are not implemented yet.",
  },
  generations: {
    title: "Generations",
    href: "/admin/generations",
    description:
      "This page will review generated outputs, prompts, selected styles, and moderation or audit state.",
    status:
      "Generation records, review actions, and moderation states are not implemented yet.",
  },
  royalties: {
    title: "Royalties",
    href: "/admin/royalties",
    description:
      "This page will simulate royalty events tied to image generations and their contributing artist style.",
    status:
      "Royalty calculations, event history, payouts, and reporting are not implemented yet.",
  },
} satisfies Record<string, AppRoute>;
