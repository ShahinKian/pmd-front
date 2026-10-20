import { baseInfoRoute } from "@/lib/base-info/route";
import { baseInfoService } from "@/lib/base-info/service";

export async function GET() {
  return baseInfoRoute(() => baseInfoService.getStructurePrograms());
}
