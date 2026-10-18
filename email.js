'use strict';
/**
 * Envoi d'e-mails transactionnels (codes de réinitialisation de mot de passe).
 *  - mock  : n'envoie rien, se contente de journaliser (développement/tests)
 *  - brevo : envoie un vrai e-mail via l'API Brevo (https://api.brevo.com) — gratuit, sans carte bancaire,
 *            pas besoin de nom de domaine : il suffit de vérifier UNE adresse d'expéditeur dans le tableau
 *            de bord Brevo (Paramètres -> Expéditeurs), ce qui se fait avec n'importe quelle adresse e-mail.
 */
function mockEmailProvider(log) {
  return {
    name: 'mock',
    async send({ to, subject, text, html }) {
      log.log('[email mock] à ' + to + ' — ' + subject + ' — ' + text);
      return { accepted: true };
    }
  };
}

function brevoEmailProvider({ apiKey, senderEmail, senderName }) {
  if (!apiKey) throw new Error('BREVO_API_KEY manquant.');
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL manquant.');
  return {
    name: 'brevo',
    async send({ to, subject, text, html }) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName || 'Grand Marché' },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html || ('<p>' + String(text).replace(/\n/g, '<br>') + '</p>')
        }),
        signal: AbortSignal.timeout(15000)
      });
      const body = await r.json().catch(() => ({}));
      if (r.status >= 200 && r.status < 300) return { accepted: true, id: body.messageId };
      return { accepted: false, failure: (body && (body.message || body.code)) || ('HTTP_' + r.status) };
    }
  };
}

function createEmailProvider(cfg, log) {
  if (cfg.EMAIL_PROVIDER === 'brevo') {
    return brevoEmailProvider({ apiKey: cfg.BREVO_API_KEY, senderEmail: cfg.BREVO_SENDER_EMAIL, senderName: cfg.BREVO_SENDER_NAME });
  }
  return mockEmailProvider(log || console);
}
module.exports = { createEmailProvider, mockEmailProvider, brevoEmailProvider };
