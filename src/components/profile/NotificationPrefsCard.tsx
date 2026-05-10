import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import { Bell, Mail, Phone } from "lucide-react";

/**
 * Lets users opt in/out of SMS and email notifications.
 * SMS defaults to OFF (Phase D — SMS-Free first). Email defaults to ON.
 */
export default function NotificationPrefsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smsOn, setSmsOn] = useState(false);
  const [emailOn, setEmailOn] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("sms_notifications_enabled, email_notifications_enabled, phone")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setSmsOn(!!data.sms_notifications_enabled);
        setEmailOn(data.email_notifications_enabled !== false);
        setPhone(data.phone || null);
      }
      setLoading(false);
    })();
  }, []);

  async function update(field: "sms_notifications_enabled" | "email_notifications_enabled", value: boolean) {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("로그인이 필요합니다");
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", u.user.id);
      if (error) throw error;
      if (field === "sms_notifications_enabled") setSmsOn(value);
      else setEmailOn(value);
      notify.success("저장됨");
    } catch (e: any) {
      notify.error("저장 실패", { description: e?.message });
      // revert
      if (field === "sms_notifications_enabled") setSmsOn(!value);
      else setEmailOn(!value);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2 font-bold">
        <Bell className="w-4 h-4 text-primary" />
        알림 설정
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 mt-0.5 text-secondary" />
          <div>
            <div className="text-sm font-medium">이메일 알림</div>
            <div className="text-xs text-muted-foreground">출금/패키지 상태 변경 시 이메일 발송</div>
          </div>
        </div>
        <Switch checked={emailOn} disabled={saving} onCheckedChange={(v) => update("email_notifications_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <Phone className="w-4 h-4 mt-0.5 text-accent" />
          <div>
            <div className="text-sm font-medium">SMS 알림 {smsOn ? "" : <span className="text-xs text-muted-foreground">(기본 꺼짐)</span>}</div>
            <div className="text-xs text-muted-foreground">
              {phone
                ? `등록된 번호: ${phone}로 출금 진행 단계 안내`
                : "전화번호가 등록되어 있지 않습니다"}
            </div>
          </div>
        </div>
        <Switch checked={smsOn} disabled={saving || !phone} onCheckedChange={(v) => update("sms_notifications_enabled", v)} />
      </div>
    </Card>
  );
}
