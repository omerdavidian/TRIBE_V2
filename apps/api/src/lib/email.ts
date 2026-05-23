import { Resend } from 'resend'
import { env } from './env.js'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

const FROM = `TRIBE <${env.RESEND_FROM_EMAIL}>`

function logFallback(to: string, subject: string, text: string) {
  console.log(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}`)
  console.log(text)
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

  if (!resend) {
    logFallback(to, subject, `Welcome ${fullName}! Visit ${env.FRONTEND_URL}/dashboard`)
    return
  }

  await resend.emails.send({ from: FROM, to, subject, html })
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

  if (!resend) {
    logFallback(to, subject, `Verify: ${url}`)
    return
  }

  await resend.emails.send({ from: FROM, to, subject, html })
}

export async function sendPasswordReset(to: string, token: string) {
  const url = `${env.FRONTEND_URL}/auth/reset-password?token=${token}`
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

  if (!resend) {
    logFallback(to, subject, `Reset: ${url}`)
    return
  }

  await resend.emails.send({ from: FROM, to, subject, html })
}

export async function sendWaitlistConfirmation(to: string) {
  const subject = "You're on the TRIBE waitlist 🌿"
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #004C54; font-size: 28px;">You're in!</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Thank you for joining the TRIBE waitlist. We're building something special for new mothers 
        and we can't wait to have you with us.
      </p>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        We'll reach out as soon as we launch in your area.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">
        To unsubscribe, 
        <a href="${env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color: #999;">
          click here
        </a>.
      </p>
    </div>
  `

  if (!resend) {
    logFallback(to, subject, `Waitlist confirmed for ${to}`)
    return
  }

  await resend.emails.send({ from: FROM, to, subject, html })
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

  if (!resend) {
    logFallback(to, subject, `Application received for ${businessName}`)
    return
  }

  await resend.emails.send({ from: FROM, to, subject, html })
}
