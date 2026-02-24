import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;
  private readonly apiKey: string | undefined;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get('SENDGRID_FROM_EMAIL', 'noreply@buildex.ro');
    this.enabled = !!this.apiKey;
  }

  async sendRfqInvitation(params: {
    to: string;
    supplierName: string;
    projectName: string;
    tokenUrl: string;
    expiresAt: Date;
  }): Promise<boolean> {
    const { to, supplierName, projectName, tokenUrl, expiresAt } = params;

    if (!this.enabled) {
      this.logger.warn(`Email not sent (SendGrid not configured). Would send RFQ invitation to ${to}`);
      this.logger.debug(`Token URL: ${tokenUrl}`);
      return false;
    }

    const html = this.getRfqInvitationTemplate({
      supplierName,
      projectName,
      tokenUrl,
      expiresAt,
    });

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to }],
              subject: `Cerere de Ofertă: ${projectName}`,
            },
          ],
          from: { email: this.fromEmail, name: 'Buildex' },
          content: [
            {
              type: 'text/html',
              value: html,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`SendGrid error: ${error}`);
        return false;
      }

      this.logger.log(`RFQ invitation sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return false;
    }
  }

  private getRfqInvitationTemplate(params: {
    supplierName: string;
    projectName: string;
    tokenUrl: string;
    expiresAt: Date;
  }): string {
    const { supplierName, projectName, tokenUrl, expiresAt } = params;
    const expiresDate = expiresAt.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cerere de Ofertă</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Buildex</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Platformă Achiziții Construcții</p>
        </div>

        <div style="border-top: 3px solid #3b82f6; padding-top: 30px;">
          <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 20px 0;">
            Salutare, ${supplierName}!
          </h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Ați primit o cerere de ofertă pentru proiectul:
          </p>
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0;">
              ${projectName}
            </p>
          </div>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Accesați link-ul de mai jos pentru a vedea detaliile cererii și a trimite oferta dumneavoastră.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${tokenUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            Vezi Cererea de Ofertă
          </a>
        </div>

        <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⏰ <strong>Atenție:</strong> Link-ul expiră la data de ${expiresDate}
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            Dacă aveți întrebări, nu ezitați să ne contactați.
          </p>
        </div>

      </td>
    </tr>
    <tr>
      <td style="text-align: center; padding: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Acest email a fost trimis automat de platforma Buildex.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
