"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductionPermits } from "@/components/certificate/production-permits";

function IssuedProductionPermits() {
  const searchParams = useSearchParams();
  const [network, ...duplicateNetworks] = searchParams.getAll("network");
  const [periodId, ...duplicatePeriods] = searchParams.getAll("periodId");
  const initialNetwork = network && duplicateNetworks.length === 0
    && /^\d{1,10}$/.test(network) && Number(network) <= 2147483647 && Number(network) > 0
    ? network : "";
  const initialPeriod = initialNetwork && periodId && duplicatePeriods.length === 0
    && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(periodId)
    ? periodId : "";

  return (
    <ProductionPermits
      key={`${initialNetwork}/${initialPeriod}`}
      mode="issued"
      initialNetwork={initialNetwork}
      initialPeriod={initialPeriod}
    />
  );
}

export default function IssuedProductionPermitsPage() {
  return (
    <Suspense fallback={<p role="status">در حال بارگذاری مجوزهای صادرشده…</p>}>
      <IssuedProductionPermits />
    </Suspense>
  );
}
