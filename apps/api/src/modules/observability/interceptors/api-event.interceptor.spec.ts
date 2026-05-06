import { HttpException, HttpStatus } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { ApiEventRecorderService } from "../services/api-event-recorder.service";
import { ApiEventInterceptor } from "./api-event.interceptor";

describe("ApiEventInterceptor", () => {
  const recorderMock = {
    recordAsync: jest.fn(),
  };

  const createContext = (requestOverrides: Record<string, unknown> = {}) => {
    const request = {
      headers: {
        "x-request-id": "request-id",
        "user-agent": "jest",
      },
      method: "GET",
      route: {
        path: "/v1/orders",
      },
      ip: "203.0.113.10",
      socket: {},
      tenantId: "tenant-id",
      appId: "app-id",
      apiTokenId: "token-id",
      ...requestOverrides,
    };
    const response = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    return {
      request,
      response,
      context: {
        getType: () => "http",
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
      },
    };
  };

  let interceptor: ApiEventInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new ApiEventInterceptor(
      recorderMock as unknown as ApiEventRecorderService,
    );
  });

  it("records API token requests after successful responses", async () => {
    const { context, response } = createContext();

    await lastValueFrom(
      interceptor.intercept(context as never, {
        handle: () => of({ ok: true }),
      }),
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      "request-id",
    );
    expect(recorderMock.recordAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-id",
        appId: "app-id",
        tokenId: "token-id",
        requestId: "request-id",
        method: "GET",
        path: "/v1/orders",
        statusCode: 200,
        ip: "203.0.113.10",
        userAgent: "jest",
      }),
    );
  });

  it("records failed requests with the thrown HTTP status", async () => {
    const { context } = createContext();

    await expect(
      lastValueFrom(
        interceptor.intercept(context as never, {
          handle: () =>
            throwError(
              () =>
                new HttpException("rate limited", HttpStatus.TOO_MANY_REQUESTS),
            ),
        }),
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(recorderMock.recordAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
      }),
    );
  });

  it("skips requests without API token tenant context", async () => {
    const { context } = createContext({
      tenantId: undefined,
      apiTokenId: undefined,
    });

    await lastValueFrom(
      interceptor.intercept(context as never, {
        handle: () => of({ ok: true }),
      }),
    );

    expect(recorderMock.recordAsync).not.toHaveBeenCalled();
  });
});
