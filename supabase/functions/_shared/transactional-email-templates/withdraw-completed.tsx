/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, muted, card, amountStyle, labelStyle } from './_styles.ts'

interface Props { amount?: number; tx_code?: string }
const fmt = (n?: number) => n != null ? new Intl.NumberFormat('ko-KR').format(n) + '원' : '-'

const WithdrawCompleted = ({ amount, tx_code }: Props) => (
  <Html lang="ko">
    <Head />
    <Preview>출금이 완료되었습니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ 출금 완료</Heading>
        <Text style={text}>요청하신 출금이 정상적으로 송금 완료되었습니다.</Text>
        <Section style={{ ...card, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <Text style={labelStyle}>송금 금액</Text>
          <Text style={{ ...amountStyle, color: '#059669' }}>{fmt(amount)}</Text>
          {tx_code && <Text style={{ ...text, margin: 0, fontFamily: 'monospace' }}>거래코드: {tx_code}</Text>}
        </Section>
        <Text style={text}>이용해 주셔서 감사합니다.</Text>
        <Text style={muted}>— {SITE_NAME} 운영팀</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WithdrawCompleted,
  subject: '✅ 출금이 완료되었습니다',
  displayName: '출금 완료',
  previewData: { amount: 100000, tx_code: 'WD-ABC123' },
} satisfies TemplateEntry
