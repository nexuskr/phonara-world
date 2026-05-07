/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { main, container, h1, text, link, button, footer, brandBar } from './_brand.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 이메일 변경 확인</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>PHONETOK</Text>
        <Heading style={h1}>이메일 변경 확인</Heading>
        <Text style={text}>
          {siteName} 계정의 이메일을{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>에서{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>(으)로 변경 요청하셨습니다.
        </Text>
        <Text style={text}>아래 버튼을 눌러 변경을 확정해 주세요.</Text>
        <Button style={button} href={confirmationUrl}>이메일 변경 확정</Button>
        <Text style={footer}>본인이 요청하지 않으셨다면 즉시 계정 보안 조치를 취해 주세요.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
