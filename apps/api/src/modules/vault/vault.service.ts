import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createVaultClient, type VaultClient } from "@basix-core/vault";

@Injectable()
export class VaultService implements OnModuleDestroy {
  private client: VaultClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async createSecret(input: {
    name: string;
    secret: string;
    description?: string;
  }) {
    return this.getClient().createSecret(input);
  }

  async updateSecret(input: {
    vaultSecretId: string;
    name: string;
    secret: string;
    description?: string;
  }) {
    return this.getClient().updateSecret(input);
  }

  async readSecret(vaultSecretId: string) {
    return this.getClient().readSecret(vaultSecretId);
  }

  async deleteSecret(vaultSecretId: string) {
    return this.getClient().deleteSecret(vaultSecretId);
  }

  async assertReady() {
    return this.getClient().assertVaultReady();
  }

  async onModuleDestroy() {
    await this.client?.close();
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const connectionString =
      this.configService.get<string>("VAULT_DATABASE_URL");
    if (!connectionString) {
      throw new ServiceUnavailableException("VAULT_DATABASE_URL is required");
    }

    this.client = createVaultClient({ connectionString });
    return this.client;
  }
}
