/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { main, container, h1, text, button, footer, brandBar } from './_brand.ts'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 비밀번호 재설정</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>PHONETOK</Text>
        <Heading style={h1}>비밀번호 재설정</Heading>
        <Text style={text}>{siteName} 계정의 비밀번호 재설정 요청을 받았습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.</Text>
        <Button style={button} href={confirmationUrl}>비밀번호 재설정</Button>
        <Text style={footer}>본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다. 비밀번호는 변경되지 않습니다.</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
