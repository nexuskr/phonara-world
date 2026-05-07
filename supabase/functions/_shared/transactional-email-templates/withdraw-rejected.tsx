/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, muted, card, amountStyle, labelStyle } from './_styles.ts'

interface Props { amount?: number; reason?: string; tx_code?: string }
const fmt = (n?: number) => n != null ? new Intl.NumberFormat('ko-KR').format(n) + '원' : '-'

const WithdrawRejected = ({ amount, reason, tx_code }: Props) => (
  <Html lang="ko">
    <Head />
    <Preview>출금 요청이 거절되었습니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>❌ 출금 요청 거절</Heading>
        <Text style={text}>아쉽게도 요청하신 출금이 거절되어 잔액이 환원되었습니다.</Text>
        <Section style={{ ...card, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <Text style={labelStyle}>요청 금액</Text>
          <Text style={{ ...amountStyle, color: '#dc2626' }}>{fmt(amount)}</Text>
          {tx_code && <Text style={{ ...text, margin: '0 0 8px', fontFamily: 'monospace' }}>거래코드: {tx_code}</Text>}
          {reason && <Text style={{ ...text, margin: 0 }}>사유: {reason}</Text>}
        </Section>
        <Text style={text}>문의가 있으시면 고객센터로 연락 주세요.</Text>
        <Text style={muted}>— {SITE_NAME} 운영팀</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WithdrawRejected,
  subject: '❌ 출금 요청이 거절되었습니다',
  displayName: '출금 거절',
  previewData: { amount: 100000, reason: '계좌정보 오류', tx_code: 'WD-ABC123' },
} satisfies TemplateEntry
