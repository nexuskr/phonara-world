/**
 * Anomaly Notification Settings (per-device)
 * - Realtime alarm popup (siren beep)  → mute toggle
 * - Browser background push notification → enable toggle
 * - Test beep button
 *
 * Stored in localStorage via useAdminSiren so each operator controls their own device.
 */
import { memo } from "react";
import { Bell, BellOff, Smartphone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAdminSiren } from "@/hooks/use-admin-siren";

function AnomalyNotificationSettingsBase() {
  const { muted, setMuted, pushEnabled, setPushEnabled, lastFiredAt, testBeep } =
    useAdminSiren(true);

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-black text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          실시간 알림 설정
        </h2>
        <Button size="sm" variant="outline" onClick={testBeep}>
          <Volume2 className="w-3.5 h-3.5 mr-1" />
          테스트
        </Button>
      </div>

      <div className="grid gap-2">
        {/* Siren */}
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/40 p-3 cursor-pointer">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {muted ? (
                <BellOff className="w-4 h-4 text-destructive" />
              ) : (
                <Bell className="w-4 h-4 text-secondary" />
              )}
              <span className="font-bold text-sm">사이렌 (사내 비프음)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              이 기기에서 critical / high 이상 이벤트가 발생할 때 비프음을 재생합니다.
            </p>
          </div>
          <Switch checked={!muted} onCheckedChange={(v) => setMuted(!v)} />
        </label>

        {/* Push */}
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/40 p-3 cursor-pointer">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">브라우저 알림 (백그라운드)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              탭이 비활성 상태일 때도 OS 알림을 표시합니다. 최초 활성화 시 권한 요청이 표시됩니다.
            </p>
          </div>
          <Switch
            checked={pushEnabled}
            onCheckedChange={(v) => void setPushEnabled(v)}
          />
        </label>
      </div>

      <div className="text-[10px] text-muted-foreground flex items-center justify-between">
        <span>설정은 이 기기에만 저장됩니다 · Realtime 800ms debounce</span>
        {lastFiredAt && (
          <span className="text-destructive/80 font-bold">
            🚨 마지막 알람 {new Date(lastFiredAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(AnomalyNotificationSettingsBase);
