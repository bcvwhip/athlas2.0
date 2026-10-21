const LOGIN_ALERT_RECIPIENT = 'valendinobenoit@gmail.com';

export async function sendLoginAlert(user: { email: string; name: string }, ipAddress?: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    console.warn('[Email] Login alert skipped: configure RESEND_API_KEY and EMAIL_FROM.');
    return;
  }

  const loginTime = new Date().toLocaleString('it-IT', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Europe/Rome',
  });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [LOGIN_ALERT_RECIPIENT],
      subject: 'Nuovo accesso a 3 athlas',
      text: [
        'È stato effettuato un nuovo accesso a 3 athlas.',
        '',
        `Account: ${user.email}`,
        `Nome: ${user.name}`,
        `Data e ora: ${loginTime}`,
        `Indirizzo IP: ${ipAddress || 'non disponibile'}`,
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'risposta non disponibile');
    throw new Error(`Resend HTTP ${response.status}: ${errorText}`);
  }
}
