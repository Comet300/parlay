/**
 * Transactional email templates. Desaturated shell: primary CTA only,
 * no accent orange. Degrades to system sans without web fonts.
 * See openspec/specs/design-system/spec.md › Transactional email templates.
 */

interface BaseEmailOpts {
  title: string
  preview: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  footerNote?: string
}

function renderShell({ title, preview, body, ctaLabel, ctaHref, footerNote }: BaseEmailOpts): string {
  const cta = ctaLabel && ctaHref
    ? `<a href="${ctaHref}" style="display:inline-block;background:#0EA5E9;color:#ffffff;padding:11px 22px;border-radius:10px;font-weight:600;text-decoration:none;margin:8px 0;">${ctaLabel}</a>`
    : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(title)}</title>
<style>
  body { margin:0; padding:24px; background:#FAFAF9; font-family:'Sora',system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color:#292524; }
  .preview { display:none; opacity:0; visibility:hidden; height:0; width:0; overflow:hidden; font-size:1px; color:transparent; }
  .email { max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #E7E5E4; border-radius:14px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.03); }
  .email-h { padding:20px 24px; border-bottom:1px solid #F5F5F4; }
  .email-logo { font-size:18px; font-weight:800; color:#0EA5E9; letter-spacing:-0.03em; }
  .email-logo span { color:#F97316; }
  .email-b { padding:28px 24px; font-size:14px; line-height:1.6; color:#292524; }
  .email-b p { margin:0 0 14px 0; }
  .email-f { padding:16px 24px; background:#FAFAF9; font-size:11px; color:#A8A29E; text-align:center; line-height:1.5; }
</style>
</head>
<body>
  <span class="preview">${escape(preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td>
    <div class="email">
      <div class="email-h"><span class="email-logo">parlay<span>.</span></span></div>
      <div class="email-b">
        ${body}
        ${cta}
        ${footerNote ? `<p style="font-size:12px;color:#78716C;margin-top:18px;">${footerNote}</p>` : ''}
      </div>
      <div class="email-f">Parlay · Visual research flow builder<br>Reply to this email if you need help.</div>
    </div>
  </td></tr></table>
</body>
</html>`
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function verificationEmail(name: string | null, url: string): { subject: string; html: string } {
  const greeting = name ? `Hi ${escape(name)},` : 'Welcome to Parlay.'
  return {
    subject: 'Verify your email',
    html: renderShell({
      title: 'Verify your email',
      preview: 'Verify your email to start using Parlay.',
      body: `<p>${greeting}</p><p>Verify your email to activate your account.</p>`,
      ctaLabel: 'Verify email',
      ctaHref: url,
      footerNote: "If you didn't create a Parlay account, you can ignore this message.",
    }),
  }
}

export function resetPasswordEmail(name: string | null, url: string): { subject: string; html: string } {
  const greeting = name ? `Hi ${escape(name)},` : 'Hi,'
  return {
    subject: 'Reset your password',
    html: renderShell({
      title: 'Reset your password',
      preview: 'Reset your Parlay password.',
      body: `<p>${greeting}</p><p>Click below to set a new password. This link expires in 1 hour.</p>`,
      ctaLabel: 'Reset password',
      ctaHref: url,
      footerNote: "If you didn't ask for this, ignore this email — your password won't change.",
    }),
  }
}
