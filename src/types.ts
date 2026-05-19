export type Environment =
  | "Local"
  | "Dev"
  | "QA"
  | "Staging"
  | "UAT"
  | "Pre-Prod"
  | "Production"
  | "Sandbox"
  | "Demo"
  | "Other";

export const ENVIRONMENTS: Environment[] = [
  "Local",
  "Dev",
  "QA",
  "Staging",
  "UAT",
  "Pre-Prod",
  "Production",
  "Sandbox",
  "Demo",
  "Other",
];

export interface CredentialEntry {
  id: string;
  app: string;
  environment: Environment | string;
  url?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  notes?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface UrlEntry {
  id: string;
  app: string;
  variant?: string;
  environment: Environment | string;
  url: string;
  label?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Vault {
  version: 1;
  entries: CredentialEntry[];
  urls?: UrlEntry[];
  updatedAt: number;
}

export type NoteFormat = "html" | "markdown";

export interface NoteEntry {
  id: string;
  title: string;
  body: string;
  format?: NoteFormat;
  tags?: string[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}
