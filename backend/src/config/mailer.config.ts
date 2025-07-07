import { registerAs } from '@nestjs/config';

export default registerAs('mailer', () => ({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  defaults: {
    from: {
      name: process.env.MAIL_FROM_NAME || 'Slate',
      address: process.env.MAIL_FROM || 'noreply@slate.com',
    },
  },
  template: {
    dir: './src/templates/email',
    adapter: 'handlebars',
    options: {
      strict: true,
    },
  },
}));
