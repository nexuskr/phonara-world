import CasinoLayout from "@/components/casino/CasinoLayout";
import OlympusSlot from "@/components/slots/OlympusSlot";
import Disclaimer from "@/components/Disclaimer";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function Olympus1000Page() {
  const user = useRequireAuth();
  if (!user) return null;
  return (
    <CasinoLayout backTo="/casino" backLabel="슬롯 로비로">
      <div className="container py-4 space-y-4">
        <OlympusSlot />
        <Disclaimer />
      </div>
    </CasinoLayout>
  );
}
