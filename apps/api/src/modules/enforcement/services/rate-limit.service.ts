import { Injectable } from "@nestjs/common";
import {
  EnforcementContext,
  RateLimitDecision,
  RateLimitDimension,
  RateLimitRule,
} from "../enforcement.types";

interface CounterState {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly counters = new Map<string, CounterState>();

  private readonly rules: RateLimitRule[] = [
    { dimension: "token", limit: 300, windowMs: 60_000 },
    { dimension: "app", limit: 2_000, windowMs: 60_000 },
    { dimension: "tenant", limit: 10_000, windowMs: 60_000 },
  ];

  evaluate(context: EnforcementContext): RateLimitDecision[] {
    return this.rules.map((rule) => this.consume(rule, context));
  }

  private consume(
    rule: RateLimitRule,
    context: EnforcementContext,
  ): RateLimitDecision {
    const now = Date.now();
    const key = this.buildKey(rule.dimension, context);
    const existing = this.counters.get(key);

    const state =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + rule.windowMs }
        : existing;

    state.count += 1;
    this.counters.set(key, state);

    const allowed = rule.limit === null ? true : state.count <= rule.limit;
    const remaining =
      rule.limit === null ? null : Math.max(0, rule.limit - state.count);

    return {
      allowed,
      dimension: rule.dimension,
      limit: rule.limit,
      remaining,
      resetAt: new Date(state.resetAt),
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((state.resetAt - now) / 1000),
      ),
    };
  }

  private buildKey(
    dimension: RateLimitDimension,
    context: EnforcementContext,
  ) {
    switch (dimension) {
      case "token":
        return `token:${context.apiTokenId}`;
      case "app":
        return `app:${context.appId}`;
      default:
        return `tenant:${context.tenantId}`;
    }
  }
}
