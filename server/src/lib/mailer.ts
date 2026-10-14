import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } }
      : {}),
  })

  return transporter
}

export type PasswordResetMail = {
  to: string
  resetUrl: string
  expiresInMinutes: number
}

export async function sendPasswordResetEmail(mail: PasswordResetMail): Promise<void> {
  const transport = getTransporter()
  const subject = 'TechStore — восстановление пароля'
  const text = [
    'Вы запросили восстановление пароля в TechStore.',
    '',
    `Ссылка действует ${mail.expiresInMinutes} минут и может быть использована только один раз:`,
    mail.resetUrl,
    '',
    'Если вы не запрашивали восстановление, просто проигнорируйте это письмо.',
  ].join('\n')

  if (!transport) {
    console.info(`[mail] SMTP is not configured. Password reset link for ${mail.to}: ${mail.resetUrl}`)
    return
  }

  await transport.sendMail({
    from: env.MAIL_FROM,
    to: mail.to,
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">Восстановление пароля</h2>
        <p>Вы запросили восстановление пароля в TechStore.</p>
        <p>
          <a href="${mail.resetUrl}" style="display:inline-block;padding:10px 18px;background:#111827;color:#fff;border-radius:8px;text-decoration:none">
            Задать новый пароль
          </a>
        </p>
        <p>Ссылка действует ${mail.expiresInMinutes} минут и может быть использована только один раз.</p>
        <p style="color:#6b7280">Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
      </div>
    `,
  })
}
