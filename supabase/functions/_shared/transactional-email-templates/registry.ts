/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as depositApproved } from './deposit-approved.tsx'
import { template as depositRejected } from './deposit-rejected.tsx'
import { template as withdrawApproved } from './withdraw-approved.tsx'
import { template as withdrawCompleted } from './withdraw-completed.tsx'
import { template as withdrawRejected } from './withdraw-rejected.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'deposit-approved': depositApproved,
  'deposit-rejected': depositRejected,
  'withdraw-approved': withdrawApproved,
  'withdraw-completed': withdrawCompleted,
  'withdraw-rejected': withdrawRejected,
}
