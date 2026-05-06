import { useState } from "react";
import Layout from "@/components/Layout";
import { ShieldCheck, Crown, Sparkles, Lock, Wallet as WalletIcon, BookOpen, Trophy, Zap, Coins, ArrowLeftRight, Star, CheckCircle2 } from "lucide-react";

type Tab = "principles" | "tier" | "jackpot" | "wallet";

export default function Guide() {
  const [tab, setTab] = useState<Tab>("principles");

  return (
    <Layout>
      <div className="container pt-6 pb-32 animate-liquid-in">
        <h1 className="font-display font-black text-2xl flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-gradient-primary">운영원칙 & 이용가이드</span>
        </h1>
        <p className="text-xs text-muted-foreground mb-4">투명하고 지속 가능한 스마트 여가 플랫폼, 폰미션</p>

        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {[
            { id: "principles", l: "운영원칙", i: ShieldCheck },
            { id: "tier", l: "등급", i: Crown },
            { id: "jackpot", l: "잭팟", i: Trophy },
            { id: "wallet", l: "충전/환전", i: WalletIcon },
          ].map((t: any) => {
            const Icon = t.i;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-[10px] font-bold transition ${tab === t.id ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}>
                <Icon className="w-4 h-4" /> {t.l}
              </button>
            );
          })}
        </div>

        {tab === "principles" && <Principles />}
        {tab === "tier" && <TierGuide />}
        {tab === "jackpot" && <JackpotGuide />}
        {tab === "wallet" && <WalletGuide />}
      </div>
    </Layout>
  );
}

function Section({ icon: Icon, title, children, gold = false }: any) {
  return (
    <div className={`glass-strong rounded-2xl p-5 mb-3 ${gold ? "neon-border" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${gold ? "bg-gradient-gold glow-gold" : "bg-gradient-primary glow-primary"}`}>
          <Icon className={`w-4 h-4 ${gold ? "text-gold-foreground" : "text-primary-foreground"}`} />
        </div>
        <h2 className={`font-display font-black text-base ${gold ? "text-gradient-gold" : ""}`}>{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-foreground/90 space-y-2">{children}</div>
      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

function Principles() {
  return (
    <div>
      <div className="glass rounded-2xl p-4 mb-4 text-xs leading-relaxed text-muted-foreground">
        폰미션은 <b className="text-foreground">"즐겁고 지속 가능한 스마트 여가 플랫폼"</b>을 목표로 운영됩니다.
        유저 여러분이 안전하고, 투명하며, 오랫동안 만족스럽게 이용할 수 있도록 최선을 다합니다.
      </div>

      <Section icon={Sparkles} title="1. 우리의 핵심 철학">
        <ul className="space-y-1.5">
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 완전 무료로 시작 가능</li>
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 강제 입금·압박 없음</li>
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 등급↑ → 게임은 쉬워지고 보상은 커지는 <b>반전 구조</b></li>
          <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 즐기면서 자연스럽게 성장하는 경험</li>
        </ul>
      </Section>

      <Section icon={ShieldCheck} title="2. 플랫폼 수익 및 운영 구조 (완전 공개)">
        <ul className="space-y-1.5 text-xs">
          <li>• <b>FREE 사용자</b>: 완전 무료 (플랫폼 수익 발생 X)</li>
          <li>• <b>STARTER ~ EMPIRE 유료 패키지</b>: 이용료를 통해 서버, 보안, AI, 고객지원, 콘텐츠 업데이트 유지</li>
          <li>• <b>Empire 멤버십</b>: 플랫폼 수익 일부를 <span className="text-gold font-bold">오너십 형태</span>로 공유 (선착순 제한)</li>
        </ul>
        <p className="text-[11px] text-muted-foreground mt-2">장기적으로 지속 가능하고 공정한 생태계를 위해 설계되었습니다.</p>
      </Section>

      <Section icon={Crown} title="3. 등급 시스템 상세">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="text-left py-2 px-2">등급</th><th className="text-left">난이도</th><th className="text-left">보상</th><th className="text-left">특징</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["FREE","보통","기본","부담 없이 체험"],
                ["STARTER","약간 쉬움","중간","더 많은 기회"],
                ["VIP","쉬움","높음","고급 미션 오픈"],
                ["GOD","매우 쉬움","매우 높음","거의 실패 없음"],
                ["EMPIRE","극도로 쉬움","초고액","수익 공유 + 전용 혜택"],
              ].map((r, i) => (
                <tr key={i} className={`border-b border-border/20 ${r[0] === "EMPIRE" ? "text-gold font-bold" : ""}`}>
                  <td className="py-2 px-2">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={Trophy} title="4. 게임 및 잭팟 운영 방식">
        <ul className="space-y-1 text-xs">
          <li>• 총 25종의 간단하고 재미있는 미니게임 제공</li>
          <li>• <b>Progressive Jackpot</b>: 모든 게임 참여 시 잭팟 적립, 주기적 폭발</li>
          <li>• 상위 등급일수록 당첨 확률 대폭 상승 (EMPIRE 65%)</li>
          <li>• 실패 시 Recovery Mission으로 빠르게 재도전 가능</li>
        </ul>
      </Section>

      <Section icon={Lock} title="5. 보안 및 신뢰 시스템">
        <ul className="space-y-1 text-xs">
          <li>• 256bit 금융급 암호화 적용</li>
          <li>• 모든 출금은 철저한 검증 후 처리</li>
          <li>• 개인정보는 법적 기준 이상 보호</li>
          <li>• 모든 활동 기록 본인 실시간 확인 가능</li>
        </ul>
      </Section>

      <Section icon={WalletIcon} title="6. 출금 정책">
        <ul className="space-y-1 text-xs">
          <li>• 최소 출금 금액 충족 시 언제든 신청</li>
          <li>• 평균 1~12시간 처리, 최대 24시간</li>
          <li>• 마이페이지에서 모든 내역 투명 확인</li>
        </ul>
      </Section>

      <Section icon={Crown} title="7. Empire 오너십" gold>
        <p className="text-sm">
          Empire는 단순한 유료 플랜이 아니라, <b className="text-gold">플랫폼의 공동 오너</b>가 되는 자리입니다.
          플랫폼 수익 일부를 평생 공유받고, 전용 고액 게임과 특별 혜택을 누립니다.
        </p>
      </Section>

      <div className="glass-strong neon-border rounded-2xl p-5 mt-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gold/30 blur-3xl" />
        <h3 className="font-display font-black text-base mb-2 text-gradient-gold">마지막 약속</h3>
        <p className="text-xs leading-relaxed text-foreground/90">
          폰미션은 단기적인 수익 극대화가 아닌, <b>유저와 함께 오래 성장하는 플랫폼</b>이 되겠습니다.
          여러분의 즐거운 경험과 안전이 언제나 최우선입니다.
        </p>
        <p className="text-xs mt-3 text-right font-bold text-gold">— 폰미션 팀</p>
      </div>
    </div>
  );
}

function TierGuide() {
  const tiers = [
    { n: "FREE", c: "회색", d: "완전 무료", reward: "기본 보상", limit: "월 50만원", chance: "잭팟 4%", color: "bg-muted text-foreground", note: "압박 ZERO, 평생 무료. 신규 5,000원 즉시 지급." },
    { n: "STARTER", c: "민트", d: "첫 업그레이드", reward: "1.5배", limit: "월 100만원", chance: "잭팟 6%", color: "bg-secondary/20 text-secondary", note: "본격 수익의 시작. 30일 후 원금+수익 회수." },
    { n: "PRO", c: "블루", d: "수익 가속", reward: "3배", limit: "월 300만원", chance: "잭팟 10%", color: "bg-primary/20 text-primary", note: "VIP 미션 입장권 + 추천 페이백 5%." },
    { n: "VIP", c: "퍼플", d: "VIP 풀 입장", reward: "6배", limit: "월 500만원", chance: "잭팟 12%", color: "bg-accent/20 text-accent", note: "1:1 매니저, 즉시 정산 12분 이내." },
    { n: "GOD", c: "시안", d: "안정적 고수익", reward: "10배", limit: "월 5,000만원", chance: "잭팟 28%", color: "bg-cyan-500/20 text-cyan-300", note: "AI 자동 수익 봇, 거의 실패 없음." },
    { n: "EMPIRE", c: "골드", d: "플랫폼 오너", reward: "20배+", limit: "무제한", chance: "잭팟 65%", color: "bg-gradient-gold text-gold-foreground", note: "수익 10% 평생 공유. 선착순 20명." },
  ];
  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed">
        등급이 올라갈수록 게임 난이도는 <b className="text-foreground">쉬워지고</b>, 보상은 <b className="text-primary">기하급수적으로 커집니다</b>.
        잭팟 당첨 확률 또한 등급별로 크게 차이납니다.
      </div>
      {tiers.map((t, i) => (
        <div key={i} className={`glass-strong rounded-2xl p-4 ${t.n === "EMPIRE" ? "neon-border" : ""} relative overflow-hidden`}>
          {t.n === "EMPIRE" && <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/30 blur-3xl" />}
          <div className="relative flex items-start justify-between mb-2">
            <div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${t.color}`}>{t.n}</span>
              <span className="ml-2 text-xs text-muted-foreground">{t.d}</span>
            </div>
            {t.n === "EMPIRE" && <Crown className="w-5 h-5 text-gold animate-crown" />}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] my-3">
            <div className="glass rounded-lg p-2"><div className="text-muted-foreground">보상</div><div className="font-bold text-sm">{t.reward}</div></div>
            <div className="glass rounded-lg p-2"><div className="text-muted-foreground">출금한도</div><div className="font-bold text-sm">{t.limit}</div></div>
            <div className="glass rounded-lg p-2"><div className="text-muted-foreground">잭팟 확률</div><div className={`font-bold text-sm ${t.n === "EMPIRE" ? "text-gold" : "text-primary"}`}>{t.chance}</div></div>
          </div>
          <p className="text-xs text-foreground/80">{t.note}</p>
        </div>
      ))}
    </div>
  );
}

function JackpotGuide() {
  return (
    <div className="space-y-3">
      <div className="glass-strong neon-border rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-cyber opacity-20" />
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/40 blur-3xl animate-float" />
        <div className="relative">
          <h2 className="font-display font-black text-lg text-gradient-gold mb-1 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" /> Progressive Mega Jackpot
          </h2>
          <p className="text-xs text-muted-foreground">전 유저가 함께 적립하고, 단 한 명이 가져가는 초대형 누적 잭팟</p>
        </div>
      </div>

      <Section icon={Coins} title="잭팟은 어떻게 적립되나요?">
        <ul className="text-xs space-y-1.5">
          <li>• 모든 게임 참여 금액의 <b className="text-primary">8%</b>가 잭팟 풀에 자동 적립</li>
          <li>• 승패와 무관하게 <b>모든 플레이</b>가 적립에 기여</li>
          <li>• 풀의 <b>55%</b>가 당첨자에게 지급, 45%는 플랫폼 운영비</li>
        </ul>
      </Section>

      <Section icon={Zap} title="언제 폭발하나요?">
        <ul className="text-xs space-y-1.5">
          <li>• 🎯 <b>금액 도달</b>: 3,000만원 도달 시 즉시 폭발</li>
          <li>• ⏰ <b>시간 도달</b>: 최대 6시간마다 자동 폭발 보장</li>
          <li>• 폭발 후 풀은 <b>1,000만원 ~ 1,500만원</b>으로 자동 리셋</li>
        </ul>
      </Section>

      <Section icon={Star} title="Mini Jackpot">
        <ul className="text-xs space-y-1.5">
          <li>• 매 <b>1시간마다</b> 작은 잭팟 폭발</li>
          <li>• 당첨금 <b>50만원 ~ 300만원</b></li>
          <li>• "자주 터진다"는 짜릿함의 핵심</li>
        </ul>
      </Section>

      <Section icon={Crown} title="등급별 당첨 확률 (게임당)" gold>
        <div className="space-y-2">
          {[
            { t: "NORMAL", c: 4, w: "w-[8%]" },
            { t: "VIP", c: 12, w: "w-[18%]" },
            { t: "GOD", c: 28, w: "w-[42%]" },
            { t: "EMPIRE", c: 65, w: "w-full" },
          ].map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className={r.t === "EMPIRE" ? "text-gold font-bold" : "font-semibold"}>{r.t}</span>
                <span className="tabular-nums font-bold">{r.c}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${r.t === "EMPIRE" ? "bg-gradient-gold glow-gold" : "bg-gradient-primary"}`} style={{ width: `${r.c}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          EMPIRE는 일반 등급 대비 <b className="text-gold">16배 이상</b> 당첨 확률. 진짜 오너의 특권입니다.
        </p>
      </Section>
    </div>
  );
}

function WalletGuide() {
  return (
    <div className="space-y-3">
      <Section icon={Coins} title="충전 방법">
        <ol className="text-xs space-y-2 list-decimal list-inside">
          <li>지갑 → <b>Coin 탭</b>에서 코인 주소 / QR 확인</li>
          <li>지갑 앱(메타마스크/거래소)에서 USDT 송금</li>
          <li><b>6자리 인증번호</b> + <b>6자리 출금비밀번호</b> 입력</li>
          <li>관리자 검증 후 즉시 잔액 반영</li>
        </ol>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {["TRC20","ERC20","BEP20"].map(n => (
            <div key={n} className="glass rounded-lg p-2 text-[11px] font-bold">{n}</div>
          ))}
        </div>
      </Section>

      <Section icon={ArrowLeftRight} title="환전(출금) 방법">
        <ol className="text-xs space-y-2 list-decimal list-inside">
          <li>지갑 → <b>출금</b> 탭 → 금액 입력</li>
          <li>은행/계좌 또는 코인주소 입력</li>
          <li><b>6자리 인증번호</b> 발송 → 입력</li>
          <li><b>6자리 출금비밀번호</b> 입력</li>
          <li>관리자 검증 후 평균 10~30분 내 입금</li>
        </ol>
      </Section>

      <Section icon={ShieldCheck} title="출금 한도 / 수수료">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="text-left py-2 px-2">등급</th><th className="text-left">한도</th><th className="text-left">수수료</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["FREE","월 50만원","35%"],
                ["STARTER","월 300만원","20%"],
                ["PRO","월 1,000만원","12%"],
                ["VIP","월 3,000만원","5%"],
                ["GOD","월 1억원","3%"],
                ["EMPIRE","무제한 ∞","0%"],
              ].map((r, i) => (
                <tr key={i} className={`border-b border-border/20 ${r[0] === "EMPIRE" ? "text-gold font-bold" : ""}`}>
                  <td className="py-2 px-2">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={Lock} title="2단계 보안 인증">
        <ul className="text-xs space-y-1.5">
          <li>• <b>6자리 SMS 인증번호</b>: 휴대폰 본인확인</li>
          <li>• <b>6자리 출금비밀번호</b>: 본인만 알고 있는 PIN</li>
          <li>• 두 단계 모두 통과해야 출금 신청 가능</li>
          <li>• 비밀번호 분실 시 1:1 채팅으로 본인 인증 후 재설정</li>
        </ul>
      </Section>
    </div>
  );
}
