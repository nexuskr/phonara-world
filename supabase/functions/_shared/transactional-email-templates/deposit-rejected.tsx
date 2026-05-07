/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, muted, card, amountStyle, labelStyle } from './_styles.ts'

interface Props { amount?: number; reason?: string }
const fmt = (n?: number) => n != null ? new Intl.NumberFormat('ko-KR').format(n) + '원' : '-'

const DepositRejected = ({ amount, reason }: Props) => (
  <Html lang="ko">
    <Head />
    <Preview>충전 요청이 거절되었습니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>❌ 충전 요청 거절</Heading>
        <Text style={text}>아쉽게도 요청하신 충전이 거절되었습니다.</Text>
        <Section style={{ ...card, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <Text style={labelStyle}>요청 금액</Text>
          <Text style={{ ...amountStyle, color: '#dc2626' }}>{fmt(amount)}</Text>
          {reason && <Text style={{ ...text, margin: '8px 0 0' }}>사유: {reason}</Text>}
        </Section>
        <Text style={text}>문의가 있으시면 고객센터로 연락 주세요.</Text>
        <Text style={muted}>— {SITE_NAME} 운영팀</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DepositRejected,
  subject: '❌ 충전 요청이 거절되었습니다',
  displayName: '충전 거절',
  previewData: { amount: 50000, reason: '입금자명 불일치' },
} satisfies TemplateEntry
