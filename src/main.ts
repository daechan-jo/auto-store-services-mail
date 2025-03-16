import * as process from 'node:process';
import * as path from 'path';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

import { MailModule } from './mail.module';

dotenv.config({
	path: '/Users/daechanjo/codes/project/auto-store/.env',
});

function setupGlobalConsoleLogging() {
	const formatTimestamp = (): string => {
		// KST(한국 표준시) 시간으로 변환
		const kstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000); // UTC + 9시간
		return kstDate.toISOString().replace('T', ' ').slice(0, 19); // 'YYYY-MM-DD HH:mm:ss' 포맷
	};

	function getCallerInfo(): string {
		const stack = new Error().stack?.split('\n');
		if (!stack || stack.length < 4) return 'Unknown';

		// stack[3]은 실제 호출한 함수의 위치
		const callerLine = stack[3]?.trim();

		// 정규식으로 함수명, 파일명, 줄 번호 추출
		const match = callerLine?.match(/at (\S+) \(([^)]+)\)/);
		if (match) {
			const functionName = match[1]; // 호출한 함수명
			// const fileInfo = match[2]; // 파일명 및 라인번호
			// return `${functionName} @ ${fileInfo}`;
			return `${functionName}`
		}

		return callerLine || 'Unknown';
	}

	const originalLog = console.log;
	const originalError = console.error;
	const originalWarn = console.warn;

	console.log = (message?: any, ...optionalParams: any[]) => {
		const timestamp = formatTimestamp();
		const location = getCallerInfo();
		originalLog(`${chalk.dim(timestamp)} [${chalk.cyan(location)}] ${message}`, ...optionalParams);
	};

	console.error = (message?: any, ...optionalParams: any[]) => {
		const timestamp = formatTimestamp();
		const location = getCallerInfo();
		originalError(
			`${chalk.dim(timestamp)} [${chalk.cyan(location)}] ${message}`,
			...optionalParams,
		);
	};

	console.warn = (message?: any, ...optionalParams: any[]) => {
		const timestamp = formatTimestamp();
		const location = getCallerInfo();
		originalWarn(`${chalk.dim(timestamp)} [${chalk.cyan(location)}]${message}`, ...optionalParams);
	};
}

async function bootstrap() {
	setupGlobalConsoleLogging();

	const app = await NestFactory.createMicroservice<MicroserviceOptions>(MailModule, {
		transport: Transport.RMQ,
		options: {
			urls: [String(process.env.RABBITMQ_URL)],
			queue: 'mail-queue',
			queueOptions: { durable: false },
		},
	});

	await app.listen();
	console.log('메일 서비스 시작');
}

bootstrap();
