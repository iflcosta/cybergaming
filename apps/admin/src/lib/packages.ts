import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { PACKAGES, type PackageType } from "./types";

export interface PackageInfo {
  label: string;
  price_cents: number;
  duration_min: number;
  detail: string;
  founding_price_cents?: number;
}

interface PackageRow {
  code: PackageType;
  label: string;
  price_cents: number;
  duration_min: number;
  detail: string | null;
  founding_price_cents: number | null;
  is_active: boolean;
}

/** Packages priced from the DB, falling back to the static constants until loaded. */
export function usePackages(): Record<PackageType, PackageInfo> {
  const [packages, setPackages] = useState<Record<PackageType, PackageInfo>>(PACKAGES);

  useEffect(() => {
    supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (!data?.length) return;
        const next = { ...PACKAGES };
        for (const row of data as PackageRow[]) {
          if (next[row.code]) {
            next[row.code] = {
              label: row.label,
              price_cents: row.price_cents,
              duration_min: row.duration_min,
              detail: row.detail ?? next[row.code].detail,
              founding_price_cents: row.founding_price_cents ?? undefined,
            };
          }
        }
        setPackages(next);
      });
  }, []);

  return packages;
}
