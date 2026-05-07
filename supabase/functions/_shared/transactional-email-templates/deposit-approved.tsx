/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, muted, card, amountStyle, labelStyle } from './_styles.ts'

interface Props { amount?: number; method?: string }

const fmt = (n?: number) => n != null ? new Intl.NumberFormat('ko-KR').format(n) + '원' : '-'

const DepositApproved = ({ amount, method }: Props) => (
  <Html lang="ko">
    <Head />
    <Preview>충전이 승인되어 잔액이 적립되었습니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ 충전 승인 완료</Heading>
        <Text style={text}>요청하신 충전이 승인되어 잔액이 즉시 적립되었습니다.</Text>
        <Section style={card}>
          <Text style={labelStyle}>적립 금액</Text>
          <Text style={amountStyle}>{fmt(amount)}</Text>
          {method && <Text style={{ ...text, margin: 0 }}>결제수단: {method === 'coin' ? '🪙 코인' : '🏦 은행'}</Text>}
        </Section>
        <Text style={text}>지금 바로 미션 / 부스트 / 패키지에 사용해 보세요.</Text>
        <Text style={muted}>— {SITE_NAME} 운영팀</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DepositApproved,
  subject: '✅ 충전이 승인되었습니다',
  displayName: '충전 승인',
  previewData: { amount: 50000, method: 'bank' },
} satisfies TemplateEntry
