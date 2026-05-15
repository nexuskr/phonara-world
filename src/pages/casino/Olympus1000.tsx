import Layout from "@/components/Layout";
import OlympusSlot from "@/components/slots/OlympusSlot";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function Olympus1000Page() {
  const user = useRequireAuth();
  if (!user) return null;
  return (
    <Layout>
      <div className="container py-4 space-y-4">
        <Link to="/casino" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-3.5 h-3.5" /> 슬롯 로비로
        </Link>
        <OlympusSlot />
        <Disclaimer />
      </div>
    </Layout>
  );
}
