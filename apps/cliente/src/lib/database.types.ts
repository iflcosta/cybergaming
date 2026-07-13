export type UserRole = "customer" | "staff" | "admin";
export type PackageType = "hora_vale" | "hora_pico" | "pacote_3h" | "corujao";
export type SessionStatus = "active" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          cpf: string | null;
          birth_date: string | null;
          role: UserRole;
          is_founding_member: boolean;
          founding_discount_used: boolean;
          credits_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      sessions: {
        Row: {
          id: string;
          customer_id: string;
          station_id: string;
          package_type: PackageType;
          started_at: string;
          ended_at: string | null;
          planned_end_at: string | null;
          status: SessionStatus;
          price_cents: number;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sessions"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
