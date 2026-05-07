/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, muted, card, amountStyle, labelStyle } from './_styles.ts'

interface Props { amount?: number; tx_code?: string }
const fmt = (n?: number) => n != null ? new Intl.NumberFormat('ko-KR').format(n) + '원' : '-'

const WithdrawApproved = ({ amount, tx_code }: Props) => (
  <Html lang="ko">
    <Head />
    <Preview>출금 요청이 승인되어 처리 중입니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>👍 출금 승인 — 처리 중</Heading>
        <Text style={text}>요청하신 출금이 승인되어 송금 처리가 진행 중입니다.</Text>
        <Section style={card}>
          <Text style={labelStyle}>출금 금액</Text>
          <Text style={amountStyle}>{fmt(amount)}</Text>
          {tx_code && <Text style={{ ...text, margin: 0, fontFamily: 'monospace' }}>거래코드: {tx_code}</Text>}
        </Section>
        <Text style={text}>송금이 완료되면 별도 안내 메일을 다시 보내드립니다.</Text>
        <Text style={muted}>— {SITE_NAME} 운영팀</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WithdrawApproved,
  subject: '👍 출금이 승인되었습니다',
  displayName: '출금 승인',
  previewData: { amount: 100000, tx_code: 'WD-ABC123' },
} satisfies TemplateEntry
