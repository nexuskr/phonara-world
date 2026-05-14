/**
 * /guide/phon — PHON · NFT · Dynasty 전용 가이드 페이지
 * 한국어/영어 i18n. 풀스크린 스토리텔링이 아닌 정적 정보 페이지.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Crown, Heart, Shield, ArrowRight, Sparkles, Zap, Users } from "lucide-react";
import { useMyPower } from "@/hooks/use-my-power";

export default function GuidePhon() {
  const { i18n } = useTranslation();
  const ko = (i18n.language || "ko").startsWith("ko");
  const { phon, nfts, boostPct, maxLeverage } = useMyPower();
  const t = ko ? KO : EN;

  return (
    <Layout>
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-primary/30 bg-gradient-to-br from-background via-primary/[0.04] to-gold/[0.04]">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[10px] tracking-[0.2em] font-bold mb-4">
              <Sparkles className="w-3 h-3 text-primary" /> {t.heroTag}
            </div>
            <h1 className="font-imperial text-3xl md:text-5xl tracking-tight text-gradient-imperial mb-3 leading-tight">
              {t.heroTitle}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">{t.heroSub}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <Stat icon={Coins} label={t.statPhon} value={phon.toLocaleString()} />
              <Stat icon={Crown} label={t.statNft} value={String(nfts.length)} />
              <Stat icon={Zap} label={t.statBoost} value={`+${boostPct}%`} />
              <Stat icon={Shield} label={t.statLev} value={`${maxLeverage}x`} />
            </div>
          </div>
        </div>

        {/* PHON 섹션 */}
        <Section icon={Coins} title={t.phonTitle} subtitle={t.phonSub}>
          <div className="grid md:grid-cols-3 gap-3">
            <InfoCard title={t.phonCard1Title} desc={t.phonCard1Desc} />
            <InfoCard title={t.phonCard2Title} desc={t.phonCard2Desc} />
            <InfoCard title={t.phonCard3Title} desc={t.phonCard3Desc} />
          </div>
          <div className="mt-4 rounded-xl p-4 border border-primary/30 bg-primary/[0.04]">
            <div className="text-xs font-black mb-2">{t.phonValueTitle}</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{t.phonValueDesc}</p>
          </div>
          <div className="flex gap-2 mt-4">
            <Link to="/wallet"><Button size="sm" className="text-xs">{t.ctaUsePhon} <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
            <Link to="/packages"><Button size="sm" variant="outline" className="text-xs">{t.ctaEarnPhon}</Button></Link>
          </div>
        </Section>

        {/* NFT 섹션 */}
        <Section icon={Crown} title={t.nftTitle} subtitle={t.nftSub}>
          <div className="grid md:grid-cols-3 gap-3">
            <TierCard tier="BRONZE" boost="+5~10%" color="from-amber-700/30 to-amber-900/30" border="border-amber-700/40" />
            <TierCard tier="GOLD" boost="+15~30%" color="from-yellow-500/30 to-amber-600/30" border="border-yellow-500/40" />
            <TierCard tier="DIAMOND" boost="+35~50%" color="from-cyan-400/30 to-blue-600/30" border="border-cyan-400/40" />
          </div>
          <div className="mt-4 rounded-xl p-4 border border-border/40 glass">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{t.nftMigrationNote}</p>
          </div>
          <div className="flex gap-2 mt-4">
            <Link to="/empire/collection"><Button size="sm" className="text-xs">{t.ctaCollection} <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
          </div>
        </Section>

        {/* Dynasty 섹션 */}
        <Section icon={Heart} title={t.dynastyTitle} subtitle={t.dynastySub}>
          <div className="grid md:grid-cols-2 gap-3">
            <InfoCard title={t.dyn1Title} desc={t.dyn1Desc} />
            <InfoCard title={t.dyn2Title} desc={t.dyn2Desc} />
          </div>
          <div className="mt-4 rounded-xl p-4 border border-gold/30 bg-gold/[0.04]">
            <div className="text-xs font-black text-gold mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> {t.dynSafetyTitle}
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
              <li>· {t.dynSafe1}</li>
              <li>· {t.dynSafe2}</li>
              <li>· {t.dynSafe3}</li>
            </ul>
          </div>
          <div className="flex gap-2 mt-4">
            <Link to="/dynasty"><Button size="sm" className="text-xs">{t.ctaDynasty} <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
          </div>
        </Section>

        {/* Disclaimer */}
        <div className="rounded-2xl p-5 border border-border/40 glass text-[11px] text-muted-foreground leading-relaxed">
          <div className="font-bold text-foreground mb-2">{t.disclaimerTitle}</div>
          <p>{t.disclaimerBody}</p>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3 border border-border/40">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-primary" />
        <span className="text-[10px] tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="font-mono font-black text-base tabular-nums">{value}</div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 border border-border/40">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-imperial text-xl tracking-wide">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="glass rounded-xl p-4 border border-border/40 hover:border-primary/40 transition">
      <div className="text-xs font-black mb-1.5">{title}</div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function TierCard({ tier, boost, color, border }: { tier: string; boost: string; color: string; border: string }) {
  return (
    <div className={`rounded-xl p-4 border ${border} bg-gradient-to-br ${color}`}>
      <div className="text-[10px] tracking-[0.2em] font-bold opacity-70 mb-1">TIER</div>
      <div className="font-imperial text-lg font-black">{tier}</div>
      <div className="font-mono font-bold text-xs mt-2 tabular-nums">{boost}</div>
    </div>
  );
}

const KO = {
  heroTag: "PHON · NFT · DYNASTY",
  heroTitle: "당신의 제국,\n혈액과 왕관과 유산",
  heroSub: "PHON은 권력의 혈액이고, NFT는 왕관이며, Dynasty는 자녀에게 남기는 유산입니다.",
  statPhon: "내 PHON", statNft: "내 NFT", statBoost: "부스트", statLev: "최대 레버리지",

  phonTitle: "PHON 토큰 — 권력의 혈액",
  phonSub: "Phonara 내부 토큰. 수수료 할인·부스터 구매·Crown 부스트에 사용.",
  phonCard1Title: "수수료 50% 할인",
  phonCard1Desc: "1~1,000 PHON 사용 → 다음 출금 1회 수수료 50% 할인 슬롯 적립.",
  phonCard2Title: "Empire Booster 24h",
  phonCard2Desc: "5,000 PHON → 24시간 수수료 −30% · Crown ×1.5 · 레버리지 7x 동시 적용.",
  phonCard3Title: "Crown 부스트 24h",
  phonCard3Desc: "1,000 PHON → 24시간 모든 Crown 적립 1.5배.",
  phonValueTitle: "PHON은 어떻게 가치를 가지나?",
  phonValueDesc: "PHON은 입금/패키지 구매/미션 보상으로 발행되고, 사용 시 소각됩니다. 발행과 소각이 균형을 이루며, 1만명 이상 사용자 도달 시 외부 블록체인 NFT/토큰으로 1:1 마이그레이션이 보장됩니다.",
  ctaUsePhon: "PHON 사용하기",
  ctaEarnPhon: "PHON 적립 패키지",

  nftTitle: "NFT — 왕관의 등급",
  nftSub: "Crown / Emperor / Founder × Bronze / Gold / Diamond. 보유 시 부스트 +5~50% 자동.",
  nftMigrationNote: "현재 NFT는 Phonara 내부 NFT입니다. 1만명 도달 시 외부 블록체인(Polygon/Solana 등) 1:1 마이그레이션이 보장되며, 그 전까지는 안전하게 잠금 보관됩니다.",
  ctaCollection: "내 컬렉션 보기",

  dynastyTitle: "Dynasty — 자녀에게 남기는 유산",
  dynastySub: "PHON과 NFT를 자녀(성인 + KYC 완료)에게 양도할 수 있습니다.",
  dyn1Title: "왕조 링크 (최대 3명)",
  dyn1Desc: "자녀 이메일로 초대 → 자녀가 토큰을 받아 수락하면 부모-자녀 링크 형성.",
  dyn2Title: "양도 요청 → 48시간 쿨다운",
  dyn2Desc: "PHON·NFT 양도 요청 시 48시간 쿨다운 후 실행 가능. 그 사이 언제든 취소 가능.",
  dynSafetyTitle: "안전 장치",
  dynSafe1: "양도 요청·실행은 TOTP 2단계 인증 필수",
  dynSafe2: "자녀 계정은 만 19세 이상 + KYC Level 2 완료 필수",
  dynSafe3: "48시간 쿨다운 + 부모 단독 취소 권한",
  ctaDynasty: "왕조 양도 시작",

  disclaimerTitle: "⚠️ 중요 안내",
  disclaimerBody: "PHON은 가상자산이 아닌 Phonara 플랫폼 내부 포인트이며, NFT는 블록체인 NFT가 아닌 내부 컬렉터블입니다. 1만명 도달 시 외부 마이그레이션을 약속드리며, 그 전까지는 모두 내부 데이터베이스에 안전하게 보관됩니다.",
};

const EN = {
  heroTag: "PHON · NFT · DYNASTY",
  heroTitle: "Your Empire —\nBlood, Crown, Legacy",
  heroSub: "PHON is the blood of power, NFTs are crowns, and Dynasty is what you leave to your children.",
  statPhon: "My PHON", statNft: "My NFTs", statBoost: "Boost", statLev: "Max Leverage",

  phonTitle: "PHON Token — Blood of Power",
  phonSub: "Phonara internal token. Use for fee discount, booster purchase, Crown boost.",
  phonCard1Title: "50% Fee Discount",
  phonCard1Desc: "Spend 1~1,000 PHON → next withdrawal gets a 50% fee discount slot.",
  phonCard2Title: "Empire Booster 24h",
  phonCard2Desc: "5,000 PHON → 24h fee −30% · Crown ×1.5 · leverage 7x simultaneously.",
  phonCard3Title: "Crown Boost 24h",
  phonCard3Desc: "1,000 PHON → 24h all Crown earnings ×1.5.",
  phonValueTitle: "How does PHON hold value?",
  phonValueDesc: "PHON is minted via deposits / package purchases / mission rewards, and burned on use. Mint & burn balance each other. When user count reaches 10,000+, a 1:1 migration to external blockchain NFT/token is guaranteed.",
  ctaUsePhon: "Use PHON",
  ctaEarnPhon: "Earn via Packages",

  nftTitle: "NFT — Tier of the Crown",
  nftSub: "Crown / Emperor / Founder × Bronze / Gold / Diamond. Auto +5~50% boost when held.",
  nftMigrationNote: "NFTs are currently Phonara internal NFTs. At 10,000 users, a 1:1 external blockchain (Polygon/Solana) migration is guaranteed; until then they're safely locked.",
  ctaCollection: "View My Collection",

  dynastyTitle: "Dynasty — Legacy to Your Children",
  dynastySub: "Bequest PHON and NFTs to your children (adult + KYC completed).",
  dyn1Title: "Dynasty Link (max 3)",
  dyn1Desc: "Invite by email → child accepts token → parent–child link is formed.",
  dyn2Title: "Bequest Request → 48h Cooldown",
  dyn2Desc: "After requesting, 48h cooldown before execution. Cancellable any time during cooldown.",
  dynSafetyTitle: "Safety Guards",
  dynSafe1: "TOTP 2FA required for both request and execution",
  dynSafe2: "Child account must be 19+ and KYC Level 2 complete",
  dynSafe3: "48h cooldown + parent-only cancel right",
  ctaDynasty: "Start Dynasty Bequest",

  disclaimerTitle: "⚠️ Important",
  disclaimerBody: "PHON is not a crypto asset but Phonara internal points. NFTs are not blockchain NFTs but internal collectibles. External migration is promised at 10,000 users; until then everything is safely stored in our internal database.",
};
