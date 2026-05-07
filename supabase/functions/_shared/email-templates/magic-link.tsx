/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { main, container, h1, text, button, footer, brandBar } from './_brand.ts'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 로그인 링크</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandBar}>PHONETOK</Text>
        <Heading style={h1}>로그인 링크</Heading>
        <Text style={text}>아래 버튼을 누르면 {siteName}에 로그인됩니다. 링크는 곧 만료됩니다.</Text>
        <Button style={button} href={confirmationUrl}>로그인</Button>
        <Text style={footer}>본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
