"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type BusinessType,
  type BusinessConfig,
  BUSINESS_CONFIGS,
} from "./business-config";

interface BusinessTypeContextValue {
  businessType: BusinessType;
  config: BusinessConfig;
  loading: boolean;
  /** Call after updating the company so context stays in sync */
  refresh: () => void;
}

const BusinessTypeContext = createContext<BusinessTypeContextValue>({
  businessType: "GENERAL",
  config: BUSINESS_CONFIGS.GENERAL,
  loading: true,
  refresh: () => {},
});

export function BusinessTypeProvider({ children }: { children: ReactNode }) {
  const [businessType, setBusinessType] = useState<BusinessType>("GENERAL");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/company")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.businessType) {
          const bt = data.data.businessType as BusinessType;
          if (bt in BUSINESS_CONFIGS) setBusinessType(bt);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tick]);

  const refresh = () => setTick((n) => n + 1);

  return (
    <BusinessTypeContext.Provider
      value={{ businessType, config: BUSINESS_CONFIGS[businessType], loading, refresh }}
    >
      {children}
    </BusinessTypeContext.Provider>
  );
}

export function useBusinessType() {
  return useContext(BusinessTypeContext);
}
