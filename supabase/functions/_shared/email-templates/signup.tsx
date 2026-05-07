/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { main, container, h1, text, link, button, footer, brandBar } from './_brand.ts'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 이메일 인증을 완료해 주세요</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>PHONETOK</Text>
        <Heading style={h1}>이메일 인증</Heading>
        <Text style={text}>
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>에 가입해 주셔서 감사합니다!
        </Text>
        <Text style={text}>
          아래 버튼을 눌러 이메일 주소(<Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>)를 인증해 주세요.
        </Text>
        <Button style={button} href={confirmationUrl}>이메일 인증하기</Button>
        <Text style={footer}>본인이 가입하지 않으셨다면 이 메일을 무시하셔도 됩니다.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
