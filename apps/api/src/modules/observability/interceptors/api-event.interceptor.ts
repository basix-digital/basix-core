import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import { catchError, Observable, tap, throwError } from "rxjs";
import { AuthenticatedRequest } from "../../common/context/request-context.types";
import { ApiEventRecorderService } from "../services/api-event-recorder.service";

type ObservableHttpRequest = AuthenticatedRequest &
  Request & {
    baseUrl?: string;
    route?: {
      path?: string;
    };
    originalUrl?: string;
  };

const REQUEST_ID_HEADER = "x-request-id";
const VALID_REQUEST_ID = /^[a-zA-Z0-9_.:-]{1,128}$/;

@Injectable()
export class ApiEventInterceptor implements NestInterceptor {
  constructor(private readonly apiEventRecorder: ApiEventRecorderService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<ObservableHttpRequest>();
    const response = http.getResponse<Response>();
    const startTime = process.hrtime.bigint();
    const requestId = this.resolveRequestId(request);

    response.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle().pipe(
      tap(() => {
        this.recordEvent(request, response, requestId, startTime);
      }),
      catchError((error: unknown) => {
        this.recordEvent(
          request,
          response,
          requestId,
          startTime,
          this.resolveErrorStatus(error),
        );

        return throwError(() => error);
      }),
    );
  }

  private recordEvent(
    request: ObservableHttpRequest,
    response: Response,
    requestId: string,
    startTime: bigint,
    statusCode = response.statusCode,
  ) {
    if (!this.shouldRecord(request)) {
      return;
    }

    this.apiEventRecorder.recordAsync({
      tenantId: request.tenantId!,
      appId: request.appId ?? null,
      tokenId: request.apiTokenId ?? null,
      requestId,
      method: request.method,
      path: this.resolvePath(request),
      statusCode,
      durationMs: this.resolveDurationMs(startTime),
      ip: this.resolveIp(request),
      userAgent: this.resolveUserAgent(request),
    });
  }

  private shouldRecord(request: ObservableHttpRequest) {
    if (!request.tenantId || !request.apiTokenId) {
      return false;
    }

    const path = this.resolvePath(request);
    return !(
      path === "/health" ||
      path === "/api/health" ||
      path.startsWith("/admin/auth") ||
      path.startsWith("/api/admin/auth")
    );
  }

  private resolveRequestId(request: ObservableHttpRequest) {
    const header = request.headers[REQUEST_ID_HEADER];
    const requestId = Array.isArray(header) ? header[0] : header;

    if (requestId && VALID_REQUEST_ID.test(requestId)) {
      return requestId;
    }

    return crypto.randomUUID();
  }

  private resolvePath(request: ObservableHttpRequest) {
    const routePath = request.route?.path;
    if (routePath) {
      return `${request.baseUrl ?? ""}${routePath}`;
    }

    return (request.originalUrl ?? request.path ?? "").split("?")[0] || "/";
  }

  private resolveDurationMs(startTime: bigint) {
    const elapsedNs = process.hrtime.bigint() - startTime;
    return Math.max(0, Number(elapsedNs / 1_000_000n));
  }

  private resolveIp(request: ObservableHttpRequest) {
    return request.ip || request.socket.remoteAddress || null;
  }

  private resolveUserAgent(request: ObservableHttpRequest) {
    const userAgent = request.headers["user-agent"];
    return Array.isArray(userAgent)
      ? (userAgent[0] ?? null)
      : (userAgent ?? null);
  }

  private resolveErrorStatus(error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "getStatus" in error &&
      typeof error.getStatus === "function"
    ) {
      return error.getStatus();
    }

    return 500;
  }
}
