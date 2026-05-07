/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { main, container, h1, text, link, button, footer, brandBar } from './_brand.ts'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 초대장이 도착했습니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>PHONETOK</Text>
        <Heading style={h1}>초대장이 도착했습니다</Heading>
        <Text style={text}>
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>에 초대받으셨습니다. 아래 버튼을 눌러 가입을 완료해 주세요.
        </Text>
        <Button style={button} href={confirmationUrl}>초대 수락하기</Button>
        <Text style={footer}>예상하지 않은 초대라면 이 메일을 무시하셔도 됩니다.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
