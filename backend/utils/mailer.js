const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const baseStyle = `
  font-family: 'Georgia', serif;
  background: #05060a;
  color: #f0ece4;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid #C9A84C;
  border-radius: 4px;
`;

async function sendAdminNotification({ action, firstName, lastName, email, ip, time }) {
  await resend.emails.send({
    from: 'PegasusMobil <onboarding@resend.dev>',
    to: process.env.ADMIN_EMAIL,
    subject: `✦ PegasusMobil — ${action}`,
    html: `
      <div style="${baseStyle} padding: 40px;">
        <div style="text-align:center; margin-bottom:32px;">
          <h1 style="color:#C9A84C; font-size:2rem; letter-spacing:0.2em; margin:0;">PEGASUSMOBIL</h1>
          <p style="color:#a09880; letter-spacing:0.3em; font-size:0.7rem; margin:4px 0 0;">SYSTEM NOTIFICATION</p>
        </div>
        <div style="border-top:1px solid #C9A84C; padding-top:24px;">
          <h2 style="color:#C9A84C; font-size:1.1rem; letter-spacing:0.1em;">${action}</h2>
          <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            <tr><td style="padding:10px; color:#a09880; width:140px;">Nome</td><td style="padding:10px; color:#f0ece4;">${firstName} ${lastName}</td></tr>
            <tr style="background:rgba(255,255,255,0.03)"><td style="padding:10px; color:#a09880;">Email</td><td style="padding:10px; color:#f0ece4;">${email}</td></tr>
            <tr><td style="padding:10px; color:#a09880;">IP</td><td style="padding:10px; color:#f0ece4;">${ip || 'N/A'}</td></tr>
            <tr style="background:rgba(255,255,255,0.03)"><td style="padding:10px; color:#a09880;">Horário</td><td style="padding:10px; color:#f0ece4;">${time}</td></tr>
          </table>
        </div>
        <div style="margin-top:32px; text-align:center; color:#a09880; font-size:0.65rem; letter-spacing:0.2em;">
          © PegasusMobil S.A. — Sistema Automático
        </div>
      </div>
    `
  });
}

async function sendWelcomeEmail(user) {
  await resend.emails.send({
    from: 'PegasusMobil <onboarding@resend.dev>',
    to: user.email,
    subject: '✦ Bem-vindo à PegasusMobil — Acesso Elite Confirmado',
    html: `
      <div style="${baseStyle} padding: 40px;">
        <div style="text-align:center; margin-bottom:32px;">
          <h1 style="color:#C9A84C; font-size:2rem; letter-spacing:0.2em; margin:0;">PEGASUSMOBIL</h1>
          <p style="color:#a09880; letter-spacing:0.3em; font-size:0.7rem; margin:4px 0 0;">LUXURY AUTOMOTIVE HOUSE</p>
        </div>
        <div style="border-top:1px solid #C9A84C; padding-top:24px;">
          <h2 style="color:#f0ece4; font-size:1.4rem;">Bem-vindo, ${user.firstName}.</h2>
          <p style="color:#a09880; line-height:1.8;">
            Sua conta na PegasusMobil foi criada com sucesso. Você agora faz parte de um grupo seleto de colecionadores e entusiastas do mais alto nível do luxo automotivo mundial.
          </p>
          <div style="margin:28px 0; padding:20px; border:1px solid rgba(201,168,76,0.3); border-radius:4px; background:rgba(201,168,76,0.05);">
            <p style="color:#C9A84C; margin:0; letter-spacing:0.1em; font-size:0.85rem;">SEU ACESSO</p>
            <p style="color:#f0ece4; margin:8px 0 0;">${user.email}</p>
          </div>
          <p style="color:#a09880; line-height:1.8;">
            Explore nossa coleção privada de hipercarros raros, configure seu modelo dos sonhos e conte com nossa consultoria dedicada 24h.
          </p>
        </div>
        <div style="margin-top:32px; text-align:center; color:#a09880; font-size:0.65rem; letter-spacing:0.2em;">
          © PegasusMobil S.A. — Where Engineering Meets Eternity
        </div>
      </div>
    `
  });
}

async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/api/auth/reset-password/${token}`;
  await resend.emails.send({
    from: 'PegasusMobil <onboarding@resend.dev>',
    to: user.email,
    subject: '✦ PegasusMobil — Recuperação de Senha',
    html: `
      <div style="${baseStyle} padding: 40px;">
        <div style="text-align:center; margin-bottom:32px;">
          <h1 style="color:#C9A84C; font-size:2rem; letter-spacing:0.2em; margin:0;">PEGASUSMOBIL</h1>
          <p style="color:#a09880; letter-spacing:0.3em; font-size:0.7rem; margin:4px 0 0;">RECUPERAÇÃO DE ACESSO</p>
        </div>
        <div style="border-top:1px solid #C9A84C; padding-top:24px;">
          <h2 style="color:#f0ece4; font-size:1.4rem;">Olá, ${user.firstName}.</h2>
          <p style="color:#a09880; line-height:1.8;">
            Recebemos uma solicitação para redefinir a senha da sua conta PegasusMobil. Clique no botão abaixo para criar uma nova senha.
          </p>
          <div style="text-align:center; margin:32px 0;">
            <a href="${resetUrl}" style="background:linear-gradient(135deg,#C9A84C,#8a6f32); color:#050507; padding:14px 32px; border-radius:2px; text-decoration:none; font-weight:600; letter-spacing:0.2em; font-size:0.8rem;">
              REDEFINIR SENHA
            </a>
          </div>
          <p style="color:#a09880; font-size:0.8rem;">Este link expira em 1 hora. Se não foi você, ignore este email.</p>
        </div>
        <div style="margin-top:32px; text-align:center; color:#a09880; font-size:0.65rem; letter-spacing:0.2em;">
          © PegasusMobil S.A. — Where Engineering Meets Eternity
        </div>
      </div>
    `
  });
}

module.exports = { sendAdminNotification, sendWelcomeEmail, sendPasswordResetEmail };