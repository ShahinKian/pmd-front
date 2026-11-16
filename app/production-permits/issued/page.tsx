import { ProductionPermits } from "@/components/certificate/production-permits";

export default async function IssuedProductionPermitsPage({ searchParams }: {
  searchParams: Promise<{ network?: string | string[]; periodId?: string | string[] }>;
}) {
  const { network, periodId } = await searchParams;
  const initialNetwork = typeof network === "string" && /^\d{1,10}$/.test(network) && Number(network) <= 2147483647 && Number(network) > 0
    ? network : "";
  const initialPeriod = initialNetwork && typeof periodId === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(periodId)
    ? periodId : "";
  return <ProductionPermits mode="issued" initialNetwork={initialNetwork} initialPeriod={initialPeriod} />;
}
