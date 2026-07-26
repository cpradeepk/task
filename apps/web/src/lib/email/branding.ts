/**
 * Per-company email branding.
 *
 * Emails used to be stamped with a single hardcoded product name ('Karmayog')
 * and logo, which is wrong once one deployment serves several companies — a
 * user at company B should not receive mail branded as company A.
 *
 * Resolution order: the company's own name/logo, then the platform default from
 * EMAIL_CONFIG. Falling back rather than failing means a company that has not
 * set a logo still gets sensible mail.
 */

import { EMAIL_CONFIG } from './config'
import { getCompanyById } from '../db/companies'

export interface EmailBranding {
  companyName: string
  logoUrl: string
  supportContact: string
}

export function platformBranding(): EmailBranding {
  return {
    companyName: EMAIL_CONFIG.templates.companyName,
    logoUrl: EMAIL_CONFIG.templates.logoUrl,
    supportContact: EMAIL_CONFIG.templates.supportContact,
  }
}

export async function brandingForCompany(companyId?: string | null): Promise<EmailBranding> {
  const fallback = platformBranding()
  if (!companyId) return fallback

  try {
    const company = await getCompanyById(companyId)
    if (!company) return fallback
    return {
      companyName: company.name || fallback.companyName,
      logoUrl: company.logoUrl || fallback.logoUrl,
      supportContact: fallback.supportContact,
    }
  } catch (error) {
    // Before migration 062 the companies table does not exist. Branding is
    // cosmetic — never let it block an email from going out.
    console.warn('Could not resolve company branding, using platform default:', error)
    return fallback
  }
}
