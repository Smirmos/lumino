import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { ContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly resend: Resend;
  private readonly toEmail: string;
  private readonly fromEmail: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
    this.toEmail = this.config.get<string>('CONTACT_TO_EMAIL', 'hello@luminoai.co.il');
    this.fromEmail = this.config.get<string>('CONTACT_FROM_EMAIL', 'Lumino AI <onboarding@resend.dev>');
  }

  async sendContactForm(dto: ContactDto): Promise<void> {
    const { name, email, phone, language, interest, dedicatedNumber, message } = dto;

    const html = `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Phone</td><td style="padding:8px;border-bottom:1px solid #eee;">${phone || '—'}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Language</td><td style="padding:8px;border-bottom:1px solid #eee;">${language}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Interest</td><td style="padding:8px;border-bottom:1px solid #eee;">${interest}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Dedicated Number</td><td style="padding:8px;border-bottom:1px solid #eee;">${dedicatedNumber ? 'Yes' : 'No'}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Message</td><td style="padding:8px;border-bottom:1px solid #eee;">${message}</td></tr>
      </table>
    `;

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: this.toEmail,
      replyTo: email,
      subject: `New Lead: ${name} — ${interest}`,
      html,
    });

    if (error) {
      this.logger.error('Failed to send contact email', error);
      throw new Error('Failed to send email');
    }

    this.logger.log(`Contact form sent: ${name} <${email}> — ${interest}`);
  }
}
