import * as path from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { CoupangPagingProduct, JobType, ProductRegistrationSummary } from '@daechanjo/models';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly adminEmails: string[];

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: this.configService.get<string>('EMAIL_SERVICE'),
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE'),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
    this.adminEmails = [
      this.configService.get<string>('ADMIN_EMAIL')!,
      this.configService.get<string>('ADMIN_EMAIL_2')!,
    ];
  }

  async sendBatchDeletionEmail(
    jobId: string,
    jobType: string,
    jobName: string,
    data: CoupangPagingProduct[] | { sellerProductId: string; productName: string }[],
  ): Promise<void> {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      // 삭제된 상품 정보를 HTML로 변환
      const productListHtml = data
        .map((product: any) => {
          return `
            <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1; margin-bottom: 10px;">
              <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>상품 ID:</strong> ${product.productId}</p>
              <p style="margin: 0; font-size: 14px;"><strong>상품명:</strong> ${product.productName}</p>
            </div>
          `;
        })
        .join('');

      const mailOptions = {
        from: `"Hush-BOT"`,
        to: this.adminEmails,
        subject: `${jobType}${jobId} - 상품 삭제 알림`,
        html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ff9500; margin: 0; font-size: 22px; font-weight: 600;">상품 삭제 알림</h1>
          <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
        </div>
        
        <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
              <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 유형:</td>
              <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
              <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-size: 14px;">삭제 건수:</td>
              <td style="padding: 6px 0; font-weight: 500; font-size: 14px; color: #ff9500;">${data.length}개</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600;">삭제된 상품 목록</h2>
          ${productListHtml}
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
      </div>
      `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('삭제 알림 이메일 발송 성공');
    } catch (error) {
      if (error instanceof Error) console.error('삭제 알림 이메일 발송 실패:', error.message);
    }
  }

  async sendProductUpdateEmail(
    jobId: string,
    jobType: string,
    jobName: string,
    data: { filePath: string; successCount: number; failedCount: number },
  ): Promise<void> {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const totalProducts = data.successCount + data.failedCount;

    // 성공/실패 비율에 따른 색상 결정
    const getTitleColor = () => {
      if (data.failedCount === 0) return '#34c759'; // 모두 성공 - 녹색
      if (data.successCount === 0) return '#ff3b30'; // 모두 실패 - 빨간색
      return '#ff9500'; // 일부 성공 - 주황색
    };

    const mailOptions = {
      from: `"Hush-BOT"`,
      to: this.adminEmails,
      subject: `${jobType}${jobId} - 자동 상품 가격 업데이트 안내`,
      html: `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: ${getTitleColor()}; margin: 0; font-size: 22px; font-weight: 600;">상품 가격 업데이트 결과</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
      </div>
      
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 유형:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600;">처리 결과</h2>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
            <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">전체</p>
            <p style="margin: 0; font-size: 20px; font-weight: 600; color: #333333">${totalProducts}</p>
          </div>
          <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
            <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">성공</p>
            <p style="margin: 0; font-size: 20px; font-weight: 600; color: #34c759">${data.successCount}</p>
          </div>
          <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
            <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">실패</p>
            <p style="margin: 0; font-size: 20px; font-weight: 600; color: ${data.failedCount > 0 ? '#ff3b30' : '#8e8e93'}">${data.failedCount}</p>
          </div>
        </div>
      </div>
      
      <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1; margin-bottom: 15px;">
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #333;">상세 결과는 첨부된 파일을 확인해주세요.</p>
        <p style="margin: 0; font-size: 14px; color: #666;">첨부 파일: ${path.basename(data.filePath)}</p>
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
    </div>
    `,
      attachments: [
        {
          filename: path.basename(data.filePath),
          path: data.filePath,
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`자동 상품 가격 업데이트 알림 이메일 발송 성공`);
      // fs.unlinkSync(filePath);
    } catch (error) {
      if (error instanceof Error)
        console.error(`자동 상품 가격 업데이트 알림 이메일 발송 실패:`, error.message);
    }
  }

  async sendSuccessOrders(jobId: string, jobType: string, store: string, data: any) {
    try {
      const itemsHtml = data
        .map(
          (order: any) =>
            `<li>주문번호: ${order.orderId}<br>주문인: ${order.ordererName}<br>수취인: ${order.receiverName}<br>상품: ${order.sellerProductName}<br>옵션: ${order.sellerProductItemName}<br>수량: ${order.shippingCount}<br><br></li>`,
        )
        .join('');

      const mailOptions = {
        from: `"Hush-BOT"`,
        to: this.adminEmails,
        subject: `${jobType}-${jobId} 자동 발주 안내`,
        html: `
        <h3>발주 알림</h3>
        <ul>
          ${itemsHtml}
        </ul>
      `,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.log(`자동 발주 알림 이메일 발송 실패:`, error);
    }
  }

  async sendFailedOrders(
    jobId: string,
    jobType: string,
    jobName: string, // store 대신 jobName으로 변경
    data: any[],
  ) {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 실패한 발주 정보를 HTML로 변환
    const itemsHtml = data
      .map(
        (order) => `
        <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1; margin-bottom: 10px;">
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>주문번호:</strong> ${order.orderId}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>주문인:</strong> ${order.ordererName}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>수취인:</strong> ${order.receiverName}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>상품코드:</strong> ${order.productCode}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>상품:</strong> ${order.sellerProductName}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>옵션:</strong> ${order.sellerProductItemName}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>수량:</strong> ${order.shippingCount}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>안전번호:</strong> ${order.safeNumber}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>우편번호:</strong> ${order.postNumber}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>주소:</strong> ${order.fullAddress}</p>
          <div style="background: #f8f8f8; border-radius: 4px; padding: 10px; margin-top: 8px;">
            <pre style="margin: 0; font-size: 12px; color: #ff3b30; font-family: monospace; white-space: pre-wrap;">${JSON.stringify(order.error, null, 2)}</pre>
          </div>
        </div>
      `,
      )
      .join('');

    const mailOptions = {
      from: `"Hush-BOT"`,
      to: this.adminEmails,
      subject: `${jobType}${jobId} - 자동 발주 실패 안내`,
      html: `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ff3b30; margin: 0; font-size: 22px; font-weight: 600;">자동 발주 실패 알림</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
      </div>
      
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 유형:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">실패 건수:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px; color: #ff3b30;">${data.length}건</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600;">실패 항목 상세 내역</h2>
        ${itemsHtml}
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
    </div>
    `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error instanceof Error)
        console.error(`자동 발주 실패 알림 이메일 발송 실패:`, error.message);
    }
  }

  async sendSuccessInvoiceUpload(jobId: string, jobType: string, jobName: string, data: any[]) {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 성공한 운송장 정보를 HTML로 변환
    const itemsHtml = data
      .map(
        (order) => `
        <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1; margin-bottom: 10px;">
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>주문번호:</strong> ${order.orderId}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>수취인:</strong> ${order.name}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>안심번호:</strong> ${order.safeNumber}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>택배사:</strong> ${order.courierName}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>운송장:</strong> ${order.trackingNumber}</p>
        </div>
      `,
      )
      .join('');

    const mailOptions = {
      from: `"Hush-BOT"`,
      to: this.adminEmails,
      subject: `${jobType}${jobId} - 운송장 업로드 성공 안내`,
      html: `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #34c759; margin: 0; font-size: 22px; font-weight: 600;">운송장 업로드 성공 알림</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
      </div>
      
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 유형:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">성공 건수:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px; color: #34c759;">${data.length}건</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600;">성공 항목 상세 내역</h2>
        ${itemsHtml}
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
    </div>
    `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error instanceof Error)
        console.error(`운송장 업로드 성공 알림 메일 발송 실패:`, error.message);
    }
  }

  async sendFailedInvoiceUpload(jobId: string, jobType: string, jobName: string, data: any[]) {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 실패한 운송장 정보를 HTML로 변환
    const itemsHtml = data
      .map(
        (order) => `
        <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1; margin-bottom: 10px;">
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>주문번호:</strong> ${order.orderId}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>수취인:</strong> ${order.name}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>안심번호:</strong> ${order.safeNumber}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>택배사:</strong> ${order.courierName}</p>
          <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>운송장:</strong> ${order.trackingNumber}</p>
          <div style="background: #f8f8f8; border-radius: 4px; padding: 10px; margin-top: 8px;">
            <pre style="margin: 0; font-size: 12px; color: #ff3b30; font-family: monospace; white-space: pre-wrap;">${JSON.stringify(order.error, null, 2)}</pre>
          </div>
        </div>
      `,
      )
      .join('');

    const mailOptions = {
      from: `"Hush-BOT"`,
      to: this.adminEmails,
      subject: `${jobType}${jobId} - 운송장 업로드 실패 안내`,
      html: `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ff3b30; margin: 0; font-size: 22px; font-weight: 600;">운송장 업로드 실패 알림</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
      </div>
      
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 유형:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">실패 건수:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px; color: #ff3b30;">${data.length}건</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600;">실패 항목 상세 내역</h2>
        ${itemsHtml}
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
    </div>
    `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error instanceof Error)
        console.error(`운송장 업로드 실패 알림 메일 발송 실패:`, error.message);
    }
  }

  // async sendNewNotification(jobId: string, jobType: string) {
  //   const mailOptions = {
  //     from: `"Hush-BOT"`,
  //     to: this.adminEmails,
  //     subject: `${jobType}${jobId}-온채널 신규 메시지 안내`,
  //     html: `
  //       <h3>ON채널 요청함 확인 요망</h3>
  //       <p>확인하지 않은 요청이 있습니다.</p>,
  //     `,
  //   };
  //
  //   try {
  //     await this.transporter.sendMail(mailOptions);
  //   } catch (error) {
  //     if (error instanceof Error) console.error(`에러 알림 이메일 발송 실패:`, error.message);
  //   }
  // }

  // async sendDailyLimitReached(jobId: string, jobType: string) {
  //   const mailOptions = {
  //     from: `"Hush-BOT"`,
  //     to: this.adminEmails,
  //     subject: `${jobType}${jobId}-일일 상품 등록 요청 제한 안내`,
  //     html: `
  //       <h3>쿠팡 상품 등록 불가</h3>
  //       <p>일일 상품 등록 요청 제한에 도달했습니다. 내일 다시 시도하세요.</p>,
  //     `,
  //   };
  //
  //   try {
  //     await this.transporter.sendMail(mailOptions);
  //   } catch (error) {
  //     if (error instanceof Error) console.error(`에러 알림 이메일 발송 실패:`, error.message);
  //   }
  // }

  async sendNotificationMail(
    jobId: string,
    jobType: string,
    jobName: string,
    data: { title: string; message: string },
  ) {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const mailOptions = {
      from: `"Hush-BOT"`,
      to: this.adminEmails,
      subject: `${jobType}${jobId} - ${data.title}`,
      html: `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333; margin: 0; font-size: 22px; font-weight: 600;">${data.title}</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
      </div>
      
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 유형:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1; margin-bottom: 15px;">
        <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">${data.message}</p>
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
    </div>
  `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error instanceof Error) console.error(`알림 메일 발송 실패:`, error.message);
    }
  }

  async sendErrorMail(
    jobId: string,
    jobType: string,
    jobName: string,
    data: { title: string; message: string },
  ) {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const mailOptions = {
      from: `"Hush-BOT"`,
      to: this.adminEmails,
      subject: `[ERROR] ${jobType}${jobId} - ${data.title}`,
      html: `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ff3b30; margin: 0; font-size: 22px; font-weight: 600;">⚠️ 오류 발생 알림</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
      </div>
      
      <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 유형:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
            <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #333; font-weight: 600;">오류 메시지</h2>
        <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
          <p style="margin: 0; font-size: 14px; color: #ff3b30; font-family: monospace;">${data.message}</p>
        </div>
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
    </div>
  `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error instanceof Error) console.error(`에러 알림 메일 발송 실패:`, error.message);
    }
  }

  async sendProductRegistrationSummary(
    jobId: string,
    jobType: string,
    jobQueueId: string,
    jobName: string,
    summary: ProductRegistrationSummary,
  ) {
    // 현재 날짜 포맷팅
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 결과별 색상 설정
    const getColorForCount = (count: number) => {
      if (count === 0) return '#8e8e93';
      return '#333333';
    };

    const mailOptions = {
      from: `"Hush-BOT"`,
      to: this.adminEmails,
      subject: `${jobType}${jobId} - 상품등록 결과`,
      html: `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0; font-size: 22px; font-weight: 600;">상품등록 요약 보고서</h1>
          <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">${formattedDate}</p>
        </div>
        
        <div style="background-color: #f8f8f8; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666; font-size: 14px; width: 100px;">작업 ID:</td>
              <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobQueueId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-size: 14px;">작업 이름:</td>
              <td style="padding: 6px 0; font-weight: 500; font-size: 14px;">${jobName}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600;">처리 결과</h2>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
              <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">성공</p>
              <p style="margin: 0; font-size: 20px; font-weight: 600; color: ${getColorForCount(summary.successCount)}">${summary.successCount}</p>
            </div>
            <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
              <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">실패</p>
              <p style="margin: 0; font-size: 20px; font-weight: 600; color: ${getColorForCount(summary.failCount)}">${summary.failCount}</p>
            </div>
            <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
              <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">이미 등록됨</p>
              <p style="margin: 0; font-size: 20px; font-weight: 600; color: ${getColorForCount(summary.alreadyRegisteredCount)}">${summary.alreadyRegisteredCount}</p>
            </div>
            <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1;">
              <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">중복 이름</p>
              <p style="margin: 0; font-size: 20px; font-weight: 600; color: ${getColorForCount(summary.duplicateNameCount)}">${summary.duplicateNameCount}</p>
            </div>
          </div>
        </div>
        
        <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e1e1e1; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: #333;">총 처리 아이템</p>
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: #333;">${summary.totalProcessed}</p>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: #333;">실패한 페이지</p>
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${summary.failedPage > 0 ? '#ff3b30' : '#8e8e93'}">${summary.failedPage > 0 ? summary.failedPage : '없음'}</p>
          </div>
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">이 메일은 자동으로 발송되었습니다. © ${now.getFullYear()} Hush-BOT</p>
      </div>
    `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error instanceof Error) console.error(`에러 알림 이메일 발송 실패:`, error.message);
    }
  }
}
