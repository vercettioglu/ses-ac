import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env';

// Self-hosted Postfix'e (127.0.0.1:25) best-effort gönderim. Düşük hacim:
// yalnızca hoş geldin + şifre sıfırlama. Gönderim başarısız olursa akış BOZULMAZ
// (false döner); kullanıcıya hata gösterilmez.

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mailHost,
      port: env.mailPort,
      secure: false, // 25/loopback: STARTTLS opsiyonel
      ignoreTLS: true, // yerel teslim; şifreleme relay tarafında (OpenDKIM/Postfix)
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });
  }
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  try {
    await getTransport().sendMail({
      from: env.mailFrom,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error('[mail] gönderim hatası (akış etkilenmez):', err);
    return false;
  }
}

// Basit, markalı HTML sarmalayıcı (Susma kırmızısı #d8392b). Tarafsız; siyasi içerik yok.
export function brandedHtml(opts: { heading: string; bodyHtml: string }): string {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#faf9f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<div style="max-width:480px;margin:0 auto;padding:24px">
<div style="font-size:20px;font-weight:700;color:#d8392b;margin-bottom:16px">Susma</div>
<h1 style="font-size:18px;margin:0 0 12px">${opts.heading}</h1>
${opts.bodyHtml}
<p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
Bu e-posta <a href="https://susma.org" style="color:#64748b">susma.org</a> tarafından gönderildi.
Bu işlemi siz yapmadıysanız bu mesajı yok sayabilirsiniz.</p>
</div></body></html>`;
}
