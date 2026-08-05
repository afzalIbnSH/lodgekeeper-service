import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

import { PROVISIONING_ENVIRONMENT } from './provisioning.constants';
import type { ProvisioningEnvironment } from './provisioning.config';

export interface InvitationMessage {
  email: string;
  tenantId: string;
  tenantName: string;
  token: string;
}

@Injectable()
export class InvitationMailer {
  private readonly logger = new Logger(InvitationMailer.name);

  constructor(
    @Inject(PROVISIONING_ENVIRONMENT)
    private readonly environment: ProvisioningEnvironment,
  ) {}

  activationUrl(message: InvitationMessage): URL {
    const activationUrl = new URL('/activate', this.environment.appPublicUrl);

    activationUrl.searchParams.set('tenantId', message.tenantId);
    activationUrl.searchParams.set('token', message.token);

    return activationUrl;
  }

  async send(message: InvitationMessage): Promise<void> {
    const activationUrl = this.activationUrl(message);

    if (this.environment.delivery === 'console') {
      this.logger.log(
        `Invitation for ${message.email} (${message.tenantName}): ${activationUrl.toString()}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      auth:
        this.environment.smtpUser && this.environment.smtpPassword
          ? {
              pass: this.environment.smtpPassword,
              user: this.environment.smtpUser,
            }
          : undefined,
      host: this.environment.smtpHost,
      port: this.environment.smtpPort,
      secure: this.environment.smtpSecure,
    });

    await transporter.sendMail({
      from: this.environment.smtpFrom,
      subject: `Complete your Lodgekeeper account for ${message.tenantName}`,
      text: [
        `You have been invited to administer ${message.tenantName} in Lodgekeeper.`,
        '',
        `Complete your account: ${activationUrl.toString()}`,
        '',
        `This link expires in ${this.environment.invitationTtlHours} hours.`,
      ].join('\n'),
      to: message.email,
    });
  }
}
