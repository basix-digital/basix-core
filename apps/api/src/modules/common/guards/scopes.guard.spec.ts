import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ScopesGuard } from "./scopes.guard";

describe("ScopesGuard", () => {
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  const createContext = (apiTokenScopes?: string[]) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ apiTokenScopes }),
      }),
    }) as never;

  let guard: ScopesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new ScopesGuard(reflectorMock as unknown as Reflector);
  });

  it("allows requests when no scopes are required", () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it("allows requests with all required scopes", () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      "metrics:write",
      "events:write",
    ]);

    expect(
      guard.canActivate(createContext(["metrics:write", "events:write"])),
    ).toBe(true);
  });

  it("rejects requests missing required scopes", () => {
    reflectorMock.getAllAndOverride.mockReturnValue(["metrics:write"]);

    expect(() => guard.canActivate(createContext(["events:write"]))).toThrow(
      ForbiddenException,
    );
  });
});
