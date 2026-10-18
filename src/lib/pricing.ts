"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
export const pricing = {
  setup: 2800,
  monthly: 250,
  annual: 2000,
  annualBeforeDiscount: 3000,
  seatMonthly: 50,
  seatAnnual: 600,
  currency: "جنيه مصري",
};
export function usePricing() {
  const [value, setValue] = useState(pricing);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const r = await supabase
        ?.from("site_prices")
        .select("*")
        .eq("id", true)
        .single();
      if (active && r?.data) setValue({ ...pricing, ...r.data });
    };
    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, []);
  return value;
}
