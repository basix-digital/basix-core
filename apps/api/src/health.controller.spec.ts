import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('should return service health information', () => {
    const result = controller.health();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('basix-core-api');
    expect(result.timestamp).toBeDefined();
  });
});
