export type UserRole = "customer" | "staff" | "admin";
export type PackageType = "hora_vale" | "hora_pico" | "pacote_3h" | "corujao";
export type SessionStatus = "active" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Profile {
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
}

export interface Session {
  id: string;
  customer_id: string | null;
  station_id: string;
  package_type: PackageType | null;
  started_at: string;
  ended_at: string | null;
  planned_end_at: string | null;
  status: SessionStatus;
  price_cents: number;
  transaction_id: string | null;
  created_at: string;
}

export type ProfileUpdate = Partial<
  Pick<Profile, "full_name" | "phone" | "cpf" | "birth_date">
>;
