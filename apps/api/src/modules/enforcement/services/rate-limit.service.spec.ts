import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
  });

  it('allows initial requests inside limits', () => {
    const decisions = service.evaluate({
      tenantId: 'tenant-1',
      appId: 'app-1',
      apiTokenId: 'token-1',
    });

    expect(decisions.every((decision) => decision.allowed)).toBe(true);
  });

  it('blocks after token limit is exceeded', () => {
    let lastDecision;

    for (let i = 0; i < 301; i += 1) {
      const decisions = service.evaluate({
        tenantId: 'tenant-1',
        appId: 'app-1',
        apiTokenId: 'token-1',
      });

      lastDecision = decisions.find((decision) => decision.dimension === 'token');
    }

    expect(lastDecision).toBeDefined();
    expect(lastDecision?.allowed).toBe(false);
  });
});
