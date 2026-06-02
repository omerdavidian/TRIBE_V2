import { Resend } from 'resend'
import { env } from './env.js'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

const FROM = `TRIBE <${env.RESEND_FROM_EMAIL}>`

function logFallback(to: string, subject: string, text: string) {
  console.log(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}`)
  console.log(text)
}

async function dispatchEmail(params: {
  to: string
  subject: string
  html: string
  fallbackText: string
}) {
  const isLocalDev = env.NODE_ENV !== 'production'

  if (!resend) {
    logFallback(params.to, params.subject, params.fallbackText)
    return { delivered: isLocalDev, provider: 'fallback' as const }
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    if ('error' in result && result.error) {
      console.error('[EMAIL ERROR]', {
        to: params.to,
        subject: params.subject,
        provider: 'resend',
        error: result.error,
      })
      logFallback(params.to, params.subject, params.fallbackText)
      return { delivered: isLocalDev, provider: 'fallback' as const, messageId: null }
    }

    return {
      delivered: true,
      provider: 'resend' as const,
      messageId: 'data' in result ? (result.data?.id ?? null) : null,
    }
  } catch (error) {
    console.error('[EMAIL ERROR]', {
      to: params.to,
      subject: params.subject,
      provider: 'resend',
      error,
    })
    logFallback(params.to, params.subject, params.fallbackText)
    return { delivered: isLocalDev, provider: 'fallback' as const, messageId: null }
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendContributionConfirmationEmail(params: {
  to: string
  supporterName: string
  amountCents: number
  registryTitle: string
  serviceTitle: string | null
  livemode: boolean
}) {
  const amountLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(params.amountCents / 100)
  const safeName = escapeHtml(params.supporterName)
  const safeRegistryTitle = escapeHtml(params.registryTitle)
  const safeServiceTitle = escapeHtml(params.serviceTitle ?? 'General registry support')
  const sandboxBanner = params.livemode
    ? ''
    : `
      <div style="margin:0 0 24px 0;padding:16px 18px;border-radius:14px;background:#fff2cc;border:1px solid #f0c36d;color:#7a4b00;font-size:14px;font-weight:700;line-height:1.5;">
        ⚠️ TEST SYSTEM DISPATCH — No real currency was exchanged. This transaction was successfully simulated utilizing a Stripe Sandbox Test Card.
      </div>
    `
  const subject = params.livemode ? 'Your TRIBE contribution receipt' : 'TRIBE test contribution receipt'
  const html = `
    <div style="margin:0;padding:24px;background:#f4f1ed;font-family:Arial,sans-serif;color:#14323a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5ddd7;border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:28px 32px;background:#0b3f45;color:#ffffff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;opacity:0.72;">TRIBE receipt</div>
            <h1 style="margin:12px 0 8px 0;font-size:30px;line-height:1.15;font-weight:700;">Thank you for supporting a mother’s care team.</h1>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#d6ecef;">We’ve recorded your contribution and shared the details below for your records.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 32px 32px;">
            ${sandboxBanner}
            <p style="margin:0 0 22px 0;font-size:16px;line-height:1.6;color:#32484d;">Hi ${safeName}, thank you for showing up for postpartum care in a tangible way.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #ebe3dd;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="padding:14px 16px;background:#faf7f4;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6a7d82;">Total Contribution Amount</td>
                <td style="padding:14px 16px;background:#faf7f4;font-size:16px;font-weight:700;color:#14323a;text-align:right;">${amountLabel}</td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-top:1px solid #ebe3dd;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6a7d82;">Target Registry Name</td>
                <td style="padding:14px 16px;border-top:1px solid #ebe3dd;font-size:15px;color:#14323a;text-align:right;">${safeRegistryTitle}</td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-top:1px solid #ebe3dd;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6a7d82;">Specific Care Service Funded</td>
                <td style="padding:14px 16px;border-top:1px solid #ebe3dd;font-size:15px;color:#14323a;text-align:right;">${safeServiceTitle}</td>
              </tr>
            </table>
            <p style="margin:22px 0 0 0;font-size:14px;line-height:1.7;color:#5a6d72;">TRIBE will continue helping families translate contributions into real postpartum support.</p>
          </td>
        </tr>
      </table>
    </div>
  `

  const fallbackText = [
    params.livemode
      ? 'Thank you for your TRIBE contribution.'
      : 'TEST SYSTEM DISPATCH — No real currency was exchanged. This transaction was simulated using a Stripe Sandbox Test Card.',
    `Amount: ${amountLabel}`,
    `Registry: ${params.registryTitle}`,
    `Service: ${params.serviceTitle ?? 'General registry support'}`,
  ].join('\n')

  return dispatchEmail({
    to: params.to,
    subject,
    html,
    fallbackText,
  })
}

export async function sendWelcomeEmail(to: string, fullName: string) {
  const subject = 'Welcome to TRIBE 🌿'
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 28px;">Welcome to TRIBE, ${fullName}!</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        We're so glad you're here. TRIBE is a postpartum care marketplace that connects 
        new mothers with the services and support they need to heal, thrive, and feel loved.
      </p>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Your account is ready. Let's get started.
      </p>
      <a href="${env.FRONTEND_URL}/dashboard" 
         style="display: inline-block; background: #E97451; color: white; padding: 14px 28px; 
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
        Go to Dashboard →
      </a>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px;">TRIBE · tribewishlist.com</p>
    </div>
  `

  return dispatchEmail({
    to,
    subject,
    html,
    fallbackText: `Welcome ${fullName}! Visit ${env.FRONTEND_URL}/dashboard`,
  })
}

export async function sendEmailVerification(
  to: string,
  token: string
) {
  const url = `${env.FRONTEND_URL}/auth/verify-email?token=${token}`
  const subject = 'Verify your TRIBE email'
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 24px;">Verify your email</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Click the button below to verify your email address.
        This link expires in 24 hours.
      </p>
      <a href="${url}" 
         style="display: inline-block; background: #E97451; color: white; padding: 14px 28px; 
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
        Verify Email →
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        If you didn't create a TRIBE account, you can safely ignore this email.
      </p>
    </div>
  `

  return dispatchEmail({
    to,
    subject,
    html,
    fallbackText: `Verify: ${url}`,
  })
}

export async function sendPasswordReset(
  to: string,
  token: string,
  resetBaseOrigin = env.FRONTEND_URL
) {
  const normalizedBase = resetBaseOrigin.replace(/\/$/, '')
  const url = `${normalizedBase}/auth/reset-password?token=${encodeURIComponent(token)}`
  const subject = 'Reset your TRIBE password'
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 24px;">Reset your password</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Click the button below to set a new password. This link expires in 1 hour.
      </p>
      <a href="${url}" 
         style="display: inline-block; background: #E97451; color: white; padding: 14px 28px; 
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
        Reset Password →
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `

  return dispatchEmail({
    to,
    subject,
    html,
    fallbackText: `Reset: ${url}`,
  })
}

export async function sendProviderVerificationAlert(
  providerName: string,
  providerEmail: string
) {
  const alertTo = env.PLATFORM_ALERT_EMAIL ?? env.RESEND_FROM_EMAIL
  const subject = `[TRIBE] New Provider Application , ${providerName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 22px;">New Provider Application</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        A new provider has registered and is awaiting verification.
      </p>
      <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
        <tr>
          <td style="padding: 10px 12px; background: #f4f6f8; font-weight: 600; color: #333;">Name</td>
          <td style="padding: 10px 12px; color: #555;">${providerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; font-weight: 600; color: #333;">Email</td>
          <td style="padding: 10px 12px; color: #555;">${providerEmail}</td>
        </tr>
      </table>
      <a href="${env.FRONTEND_URL}/dashboard/admin"
         style="display: inline-block; background: #004C54; color: white; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px;">
        Review in Admin Dashboard →
      </a>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px;">TRIBE · tribewishlist.com</p>
    </div>
  `
  return dispatchEmail({
    to: alertTo,
    subject,
    html,
    fallbackText: `New provider application: ${providerName} <${providerEmail}>. Review at ${env.FRONTEND_URL}/dashboard/admin`,
  })
}

export async function sendVendorSignupNotificationEmail(
  to: string,
  vendorName: string,
  vendorEmail: string,
) {
  const subject = `[TRIBE] New Vendor Signup: ${vendorName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 22px;">New Vendor Signup</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        A new vendor has registered on TRIBE and is awaiting review.
      </p>
      <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
        <tr>
          <td style="padding: 10px 12px; background: #f4f6f8; font-weight: 600; color: #333;">Name</td>
          <td style="padding: 10px 12px; color: #555;">${vendorName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; font-weight: 600; color: #333;">Email</td>
          <td style="padding: 10px 12px; color: #555;">${vendorEmail}</td>
        </tr>
      </table>
      <a href="${env.FRONTEND_URL}/dashboard/admin"
         style="display: inline-block; background: #004C54; color: white; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px;">
        Review Vendor Applications →
      </a>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px;">TRIBE · tribewishlist.com</p>
    </div>
  `
  return dispatchEmail({
    to,
    subject,
    html,
    fallbackText: `New vendor signup: ${vendorName} <${vendorEmail}>. Review at ${env.FRONTEND_URL}/dashboard/admin`,
  })
}

export async function sendWaitlistConfirmation(to: string) {
  const unsubscribeUrl = `${env.API_PUBLIC_URL}/v1/waitlist/unsubscribe?email=${encodeURIComponent(to)}`
  const subject = 'Welcome to the Tribe!'
  const html = `
    <div style="margin:0;padding:0;background:#f4f6fb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7eaf1;">
              <tr>
                <td style="padding:28px 32px;background:linear-gradient(135deg,#1f4a45 0%,#2f6a63 100%);color:#ffffff;font-family:Arial,sans-serif;">
                  <div style="font-size:26px;font-weight:700;letter-spacing:0.3px;">TRIBE</div>
                  <div style="margin-top:6px;font-size:14px;opacity:0.9;">Postpartum care marketplace</div>
                </td>
              </tr>
              <tr>
                <td style="padding:34px 32px 12px 32px;font-family:Arial,sans-serif;color:#1f2937;">
                  <h1 style="margin:0 0 12px 0;font-size:28px;line-height:1.25;color:#1f4a45;">Welcome to the Tribe!</h1>
                  <p style="margin:0;font-size:17px;line-height:1.7;color:#334155;">
                    Thank you for joining the Tribe. We'll reach out as soon as we go live.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px 30px 32px;font-family:Arial,sans-serif;color:#64748b;font-size:13px;line-height:1.6;">
                  You are receiving this email because you joined the TRIBE waitlist.
                  <br />
                  <a href="${unsubscribeUrl}" style="color:#8e3349;text-decoration:underline;font-weight:600;">Unsubscribe</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `

  return dispatchEmail({
    to,
    subject,
    html,
    fallbackText: `Welcome to the Tribe! You can unsubscribe at ${unsubscribeUrl}`,
  })
}

export async function sendProviderApplicationReceived(
  to: string,
  businessName: string
) {
  const subject = 'TRIBE provider application received'
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 24px;">Application received</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Hi ${businessName}, we've received your TRIBE provider application and 
        our team is reviewing it. We'll notify you within 3–5 business days.
      </p>
    </div>
  `

  return dispatchEmail({
    to,
    subject,
    html,
    fallbackText: `Application received for ${businessName}`,
  })
}

export async function sendProviderApprovalEmail(to: string, name: string) {
  const subject = 'Your TRIBE provider application has been approved!'
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 24px;">Welcome to the TRIBE provider network!</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Hi ${name}, we're thrilled to let you know that your provider application has been <strong>approved</strong>.
        Your profile is now live and visible to mothers seeking postpartum care support.
      </p>
      <a href="${env.FRONTEND_URL}/dashboard/provider"
         style="display: inline-block; background: #E97451; color: white; padding: 14px 28px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
        Go to Provider Dashboard &rarr;
      </a>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px;">TRIBE &middot; tribewishlist.com</p>
    </div>
  `
  return dispatchEmail({ to, subject, html, fallbackText: `Your TRIBE provider application has been approved. Visit ${env.FRONTEND_URL}/dashboard/provider` })
}

export async function sendProviderRejectionEmail(to: string, name: string, note?: string) {
  const subject = 'Update on your TRIBE provider application'
  const noteHtml = note
    ? `<div style="background: #f4f6f8; border-left: 4px solid #E97451; padding: 16px; margin: 16px 0; border-radius: 4px;"><p style="color: #555; margin: 0; font-size: 15px;">${note}</p></div>`
    : ''
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 24px;">Provider Application Update</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Hi ${name}, thank you for applying to join the TRIBE provider network.
        After reviewing your application, we are unable to approve it at this time.
      </p>
      ${noteHtml}
      <p style="color: #555; font-size: 15px; line-height: 1.6; margin-top: 16px;">
        If you believe this was in error or have additional information to share, please contact us.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px;">TRIBE &middot; tribewishlist.com</p>
    </div>
  `
  return dispatchEmail({ to, subject, html, fallbackText: `Your TRIBE provider application has been declined.${note ? ` Reason: ${note}` : ''}` })
}

export async function sendProviderInfoRequestEmail(to: string, name: string, message: string) {
  const subject = 'Additional information required , TRIBE provider application'
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 24px;">We need a bit more information</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Hi ${name}, our team is reviewing your TRIBE provider application and needs some additional details.
      </p>
      <div style="background: #f4f6f8; border-left: 4px solid #004C54; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #333; margin: 0; font-size: 15px; line-height: 1.6;">${message}</p>
      </div>
      <p style="color: #555; font-size: 15px; line-height: 1.6;">
        Please reply to this email or contact us at
        <a href="mailto:support@tribewishlist.com" style="color: #E97451;">support@tribewishlist.com</a>
        with the requested information.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px;">TRIBE &middot; tribewishlist.com</p>
    </div>
  `
  return dispatchEmail({ to, subject, html, fallbackText: `Your TRIBE provider application requires additional information: ${message}` })
}

export async function sendVoucherEmail(params: {
  to: string
  motherName: string
  itemTitle: string
  voucherCode: string
  registrySlug: string
}) {
  const { to, motherName, itemTitle, voucherCode, registrySlug } = params
  const registryUrl = `${env.FRONTEND_URL}/registry/${registrySlug}`
  const subject = `🎉 Your ${itemTitle} has been fully funded!`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🎁</div>
        <h1 style="color: #004C54; font-size: 26px; margin: 0; font-weight: 700;">
          Congratulations, ${motherName.split(' ')[0]}!
        </h1>
      </div>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Your care item <strong style="color: #004C54;">${itemTitle}</strong> has been completely funded by your TRIBE.
        You can now redeem this service with a certified local provider.
      </p>
      <div style="background: #f0faf8; border: 2px dashed #29676f; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
        <p style="color: #70797a; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px;">Your Voucher Code</p>
        <p style="color: #004C54; font-size: 28px; font-weight: 800; letter-spacing: 0.18em; font-family: monospace; margin: 0;">${voucherCode}</p>
      </div>
      <p style="color: #555; font-size: 15px; line-height: 1.6;">
        Present this code to your provider when scheduling your session.
        Your voucher is active and ready to use.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${registryUrl}"
           style="display: inline-block; background: #004C54; color: white; padding: 14px 32px;
                  border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
          View Your Registry →
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
        TRIBE · tribewishlist.com · Real postpartum support for new mothers.
      </p>
    </div>
  `
  return dispatchEmail({
    to,
    subject,
    html,
    fallbackText: `Congratulations! Your "${itemTitle}" has been fully funded. Your voucher code is: ${voucherCode}. Visit your registry at ${registryUrl}`,
  })
}
