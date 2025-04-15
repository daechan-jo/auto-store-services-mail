import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { MailService } from '../core/mail.service';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @MessagePattern('mail-queue')
  async handleMailMessage(message: any): Promise<void> {
    const { pattern, payload } = message;
    console.log(`송신 패턴: ${pattern}-${payload.jobId}`);

    switch (pattern) {
      case 'sendBatchDeletionEmail':
        await this.mailService.sendBatchDeletionEmail(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;

      case 'sendUpdateEmail':
        await this.mailService.sendProductUpdateEmail(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;

      case 'sendSuccessOrders':
        await this.mailService.sendSuccessOrders(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;

      case 'sendFailedOrders':
        await this.mailService.sendFailedOrders(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;

      case 'sendErrorMail':
        await this.mailService.sendErrorMail(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;

      case 'sendSuccessInvoiceUpload':
        await this.mailService.sendSuccessInvoiceUpload(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;

      case 'sendFailedInvoiceUpload':
        await this.mailService.sendFailedInvoiceUpload(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;

      case 'sendNewNotification':
        await this.mailService.sendNotificationMail(
          payload.jobId,
          payload.jobType,
          payload.jobName,
          payload.data,
        );
        break;
      //
      // case 'sendDailyLimitReached':
      //   await this.mailService.sendDailyLimitReached(payload.jobId, payload.jobType);
      //   break;

      case 'sendProductRegistrationSummary':
        await this.mailService.sendProductRegistrationSummary(
          payload.jobId,
          payload.jobType,
          payload.jobQueueId,
          payload.jobName,
          payload.summary,
        );
        break;

      default:
        console.error(`알 수 없는 패턴 유형: ${pattern}`);
    }
  }
}
