import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { logger } from '../utils/logger';

class KeyVaultService {
  private client: SecretClient | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;

      if (!keyVaultName) {
        logger.info('Azure Key Vault not configured, using local encryption');
        this.enabled = false;
        return;
      }

      const url = `https://${keyVaultName}.vault.azure.net`;
      const credential = new DefaultAzureCredential();

      this.client = new SecretClient(url, credential);
      this.enabled = true;

      logger.info('Azure Key Vault client initialized', { keyVaultName });
    } catch (error) {
      logger.warn('Azure Key Vault initialization failed, using local encryption', { error });
      this.enabled = false;
    }
  }

  async storeSecret(name: string, value: string): Promise<string> {
    if (!this.enabled || !this.client) {
      // Fallback: use base64 encoding (not secure, but works for local dev)
      logger.warn('Storing secret without Key Vault (local dev only)');
      return Buffer.from(value).toString('base64');
    }

    try {
      const secret = await this.client.setSecret(name, value);
      logger.info('Secret stored in Key Vault', { secretName: name });
      return secret.properties.id || name;
    } catch (error) {
      logger.error('Failed to store secret in Key Vault', { error });
      throw error;
    }
  }

  async getSecret(secretIdOrName: string): Promise<string> {
    if (!this.enabled || !this.client) {
      // Fallback: decode base64
      logger.warn('Retrieving secret without Key Vault (local dev only)');
      return Buffer.from(secretIdOrName, 'base64').toString('utf-8');
    }

    try {
      // Extract secret name from ID if it's a full URL
      const secretName = secretIdOrName.includes('/')
        ? secretIdOrName.split('/').pop() || secretIdOrName
        : secretIdOrName;

      const secret = await this.client.getSecret(secretName);
      return secret.value || '';
    } catch (error) {
      logger.error('Failed to retrieve secret from Key Vault', { error });
      throw error;
    }
  }

  async deleteSecret(secretIdOrName: string): Promise<void> {
    if (!this.enabled || !this.client) {
      logger.warn('Cannot delete secret, Key Vault not configured');
      return;
    }

    try {
      const secretName = secretIdOrName.includes('/')
        ? secretIdOrName.split('/').pop() || secretIdOrName
        : secretIdOrName;

      await this.client.beginDeleteSecret(secretName);
      logger.info('Secret deleted from Key Vault', { secretName });
    } catch (error) {
      logger.error('Failed to delete secret from Key Vault', { error });
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const keyVaultService = new KeyVaultService();
