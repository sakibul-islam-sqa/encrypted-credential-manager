/** Top-level tab inside the dashboard shell. */
export type AppView = "credentials" | "urls" | "notes";

export const TAB_REFRESH_COPY: Record<AppView, { title: string; subtitle: string }> = {
  credentials: {
    title: "Fetching credentials",
    subtitle: "Loading your latest credentials",
  },
  urls: {
    title: "Fetching URLs",
    subtitle: "Loading your latest URLs",
  },
  notes: {
    title: "Fetching notes",
    subtitle: "Loading your latest notes",
  },
};
