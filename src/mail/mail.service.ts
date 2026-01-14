/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    if (!apiKey) {
      throw new Error('Resend API Key is missing');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>(
      'resend.fromEmail',
      'onboarding@resend.dev',
    );
    this.fromName = this.configService.get<string>(
      'resend.fromName',
      'Infos Santé',
    );
  }

  // =====================================
  // 📧 TEMPLATE EMAIL RÉINITIALISATION
  // =====================================
  private getResetPasswordTemplate(name: string, resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
            .header { background-color: #0056b3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0056b3; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
            .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Réinitialisation de mot de passe - Infos Santé Cameroun</h2>
            </div>
            <div class="content">
              <p>Bonjour <strong>${name}</strong>,</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe sur Infos Santé Cameroun.</p>
              <p>Ce lien est valable pendant <strong>15 minutes</strong>.</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
              </p>
              <p style="font-size: 12px; color: #999;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} ${this.fromName}. Tous droits réservés.
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // =====================================
  // 🚀 ENVOI EMAIL RESET
  // =====================================
  async sendPasswordReset(
    email: string,
    name: string,
    resetLink: string,
  ): Promise<void> {
    try {
      const html = this.getResetPasswordTemplate(name, resetLink);

      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: '🔑 Réinitialisation de votre mot de passe - Infos Santé',
        html: html,
      });

      if (error) {
        this.logger.error(`❌ Erreur envoi email Resend: ${error.message}`);
        throw new Error("Échec de l'envoi de l'email");
      }

      this.logger.log(`✅ Email de reset envoyé à ${email} (ID: ${data?.id})`);
    } catch (error) {
      this.logger.error(
        `Erreur critique envoi email à ${email}: ${error.message}`,
      );
      // On ne relance pas l'erreur pour ne pas bloquer la réponse API
      // mais on log l'erreur.
    }
  }
}
