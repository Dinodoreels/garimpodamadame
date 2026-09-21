/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as adminReport } from './admin-report.tsx'
import { template as customerNotification } from './customer-notification.tsx'
import { template as marketingMessage } from './marketing-message.tsx'
import { template as refundConfirmation } from './refund-confirmation.tsx'
import { template as refundApproved } from './refund-approved.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-report': adminReport,
  'customer-notification': customerNotification,
  'marketing-message': marketingMessage,
  'refund-confirmation': refundConfirmation,
  'refund-approved': refundApproved,
}