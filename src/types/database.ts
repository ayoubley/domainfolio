/**
 * Hand-authored Supabase schema types.
 * Mirrors `supabase/migrations/*.sql`. Regenerate with
 * `supabase gen types typescript --local > src/types/database.ts` once the
 * project is linked, but keep the derived-field helpers in `domain-rules.ts`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DomainStatus = "active" | "listed" | "sold" | "expired";
export type RenewalDecision = "auto_renew" | "renew" | "review" | "dont_renew" | "pending";
export type SaleType = "buy_now" | "make_offer" | "request_price";
export type PurchaseCurrency = "USD" | "EUR";
export type DomainActivityAction =
  | "created"
  | "updated"
  | "sold"
  | "renewed"
  | "archived"
  | "restored"
  | "imported";
export type WorkspaceRole = "owner" | "admin" | "member";
export type CustomOptionCategory =
  | "registrar"
  | "listing_platform"
  | "sale_platform"
  | "niche"
  | "acquisition_source"
  | "tag";

export type DomainRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  domain: string;
  tld: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  purchase_price: number | null;
  purchase_currency: PurchaseCurrency;
  renewal_cost: number | null;
  registrar: string | null;
  status: DomainStatus;
  renewal_decision: RenewalDecision;
  listed_on: string[] | null;
  asking_price: number | null;
  sale_platform: string | null;
  sale_type: SaleType | null;
  sold_date: string | null;
  sale_price: number | null;
  net_proceeds: number | null;
  acquisition_source: string | null;
  niche: string | null;
  estimated_value: number | null;
  tags: string[] | null;
  notes: string | null;
  archived_at: string | null;
  archive_reason: string | null;
  last_renewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DomainActivityRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  domain_id: string | null;
  action: DomainActivityAction;
  summary: string;
  changes: Json | null;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceRow = {
  id: string;
  owner_id: string;
  name: string;
  default_currency: PurchaseCurrency;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
};

export type ImportBatchRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  warning_count: number;
  created_at: string;
};

export type SavedViewRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  config: Json;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type UserSettingsRow = {
  user_id: string;
  theme: "light" | "dark" | "system";
  language: "en" | "ar";
  notifications: Json;
  updated_at: string;
};

export type CustomOptionRow = {
  id: string;
  workspace_id: string;
  category: CustomOptionCategory;
  value: string;
  sort_order: number;
  created_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        { id: string; full_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string },
        { full_name?: string | null; avatar_url?: string | null; updated_at?: string }
      >;
      workspaces: Table<
        WorkspaceRow,
        {
          id?: string;
          owner_id: string;
          name: string;
          default_currency?: PurchaseCurrency;
          created_at?: string;
          updated_at?: string;
        },
        { name?: string; default_currency?: PurchaseCurrency; updated_at?: string }
      >;
      workspace_members: Table<
        WorkspaceMemberRow,
        { workspace_id: string; user_id: string; role?: WorkspaceRole; created_at?: string },
        { role?: WorkspaceRole }
      >;
      domains: Table<
        DomainRow,
        {
          id?: string;
          workspace_id: string;
          user_id: string;
          domain: string;
          purchase_date?: string | null;
          expiry_date?: string | null;
          purchase_price?: number | null;
          purchase_currency?: PurchaseCurrency;
          renewal_cost?: number | null;
          registrar?: string | null;
          status?: DomainStatus;
          renewal_decision?: RenewalDecision;
          listed_on?: string[] | null;
          asking_price?: number | null;
          sale_platform?: string | null;
          sale_type?: SaleType | null;
          sold_date?: string | null;
          sale_price?: number | null;
          net_proceeds?: number | null;
          acquisition_source?: string | null;
          niche?: string | null;
          estimated_value?: number | null;
          tags?: string[] | null;
          notes?: string | null;
          archived_at?: string | null;
          archive_reason?: string | null;
          last_renewed_at?: string | null;
        },
        Partial<
          Omit<DomainRow, "id" | "workspace_id" | "user_id" | "tld" | "created_at" | "updated_at">
        >
      >;
      domain_activity: Table<
        DomainActivityRow,
        {
          id?: string;
          workspace_id: string;
          user_id: string;
          domain_id?: string | null;
          action: DomainActivityAction;
          summary: string;
          changes?: Json | null;
          created_at?: string;
        },
        { summary?: string; changes?: Json | null }
      >;
      import_batches: Table<
        ImportBatchRow,
        {
          id?: string;
          workspace_id: string;
          user_id: string;
          file_name: string;
          total_rows?: number;
          imported_rows?: number;
          updated_rows?: number;
          warning_count?: number;
          created_at?: string;
        },
        { imported_rows?: number; updated_rows?: number; warning_count?: number }
      >;
      saved_views: Table<
        SavedViewRow,
        {
          id?: string;
          workspace_id: string;
          user_id: string;
          name: string;
          config: Json;
          is_shared?: boolean;
        },
        { name?: string; config?: Json; is_shared?: boolean; updated_at?: string }
      >;
      user_settings: Table<
        UserSettingsRow,
        {
          user_id: string;
          theme?: "light" | "dark" | "system";
          language?: "en" | "ar";
          notifications?: Json;
          updated_at?: string;
        },
        { theme?: "light" | "dark" | "system"; language?: "en" | "ar"; notifications?: Json; updated_at?: string }
      >;
      custom_options: Table<
        CustomOptionRow,
        {
          id?: string;
          workspace_id: string;
          category: CustomOptionCategory;
          value: string;
          sort_order?: number;
        },
        { value?: string; sort_order?: number }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      renew_domain: {
        Args: { p_domain_id: string; p_renewal_cost: number | null; p_note?: string | null };
        Returns: DomainRow;
      };
      archive_domain: {
        Args: { p_domain_id: string; p_reason?: string | null };
        Returns: DomainRow;
      };
      restore_domain: {
        Args: { p_domain_id: string };
        Returns: DomainRow;
      };
      create_workspace: {
        Args: { p_name: string; p_default_currency?: string };
        Returns: string;
      };
      load_demo_data: {
        Args: { p_workspace_id: string };
        Returns: number;
      };
    };
    Enums: {
      domain_status: DomainStatus;
      renewal_decision: RenewalDecision;
      sale_type: SaleType;
      purchase_currency: PurchaseCurrency;
      domain_activity_action: DomainActivityAction;
      workspace_role: WorkspaceRole;
      custom_option_category: CustomOptionCategory;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type DomainInsert = Database["public"]["Tables"]["domains"]["Insert"];
export type DomainUpdate = Database["public"]["Tables"]["domains"]["Update"];
