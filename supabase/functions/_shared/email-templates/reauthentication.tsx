/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { main, container, h1, text, footer, codeStyle, brandBar } from './_brand.ts'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>본인 확인 코드</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>PHONETOK</Text>
        <Heading style={h1}>본인 확인 코드</Heading>
        <Text style={text}>아래 코드를 입력하여 본인 확인을 완료해 주세요.</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>이 코드는 곧 만료됩니다. 본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
