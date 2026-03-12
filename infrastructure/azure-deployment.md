# Azure Deployment Guide

## Prerequisites

- Azure CLI installed
- Azure subscription
- GitHub repository with the code

## Step 1: Create Azure Resources

### 1.1 Create Resource Group

```bash
az group create \
  --name gitlab-timetracker-rg \
  --location eastus
```

### 1.2 Create PostgreSQL Database

```bash
az postgres flexible-server create \
  --name gitlab-timetracker-db \
  --resource-group gitlab-timetracker-rg \
  --location eastus \
  --admin-user dbadmin \
  --admin-password <SecurePassword123!> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15

# Create database
az postgres flexible-server db create \
  --resource-group gitlab-timetracker-rg \
  --server-name gitlab-timetracker-db \
  --database-name gitlab_timetracker

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group gitlab-timetracker-rg \
  --name gitlab-timetracker-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.3 Create Redis Cache

```bash
az redis create \
  --name gitlab-timetracker-redis \
  --resource-group gitlab-timetracker-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

### 1.4 Create Azure Key Vault

```bash
az keyvault create \
  --name gitlab-timetracker-kv \
  --resource-group gitlab-timetracker-rg \
  --location eastus

# Store JWT secrets
az keyvault secret set \
  --vault-name gitlab-timetracker-kv \
  --name JWT-SECRET \
  --value "<generate-random-secret>"

az keyvault secret set \
  --vault-name gitlab-timetracker-kv \
  --name JWT-REFRESH-SECRET \
  --value "<generate-random-secret>"
```

### 1.5 Create Container Registry

```bash
az acr create \
  --name gitlabtimetrackeracr \
  --resource-group gitlab-timetracker-rg \
  --sku Basic \
  --location eastus \
  --admin-enabled true
```

### 1.6 Create Application Insights

```bash
az monitor app-insights component create \
  --app gitlab-timetracker-insights \
  --resource-group gitlab-timetracker-rg \
  --location eastus \
  --kind web
```

### 1.7 Create App Service Plans

```bash
# Backend App Service Plan
az appservice plan create \
  --name gitlab-timetracker-backend-plan \
  --resource-group gitlab-timetracker-rg \
  --location eastus \
  --is-linux \
  --sku B1

# Frontend App Service Plan
az appservice plan create \
  --name gitlab-timetracker-frontend-plan \
  --resource-group gitlab-timetracker-rg \
  --location eastus \
  --is-linux \
  --sku B1
```

### 1.8 Create Web Apps

```bash
# Backend Web App
az webapp create \
  --name gitlab-timetracker-backend \
  --resource-group gitlab-timetracker-rg \
  --plan gitlab-timetracker-backend-plan \
  --deployment-container-image-name gitlabtimetrackeracr.azurecr.io/backend:latest

# Frontend Web App
az webapp create \
  --name gitlab-timetracker-frontend \
  --resource-group gitlab-timetracker-rg \
  --plan gitlab-timetracker-frontend-plan \
  --deployment-container-image-name gitlabtimetrackeracr.azurecr.io/frontend:latest
```

## Step 2: Configure Environment Variables

### 2.1 Backend Configuration

```bash
# Get connection strings
DATABASE_URL=$(az postgres flexible-server show-connection-string \
  --server-name gitlab-timetracker-db \
  --database-name gitlab_timetracker \
  --admin-user dbadmin \
  --admin-password <password> \
  --query connectionStrings.psql_cmd \
  --output tsv)

REDIS_HOST=$(az redis show \
  --name gitlab-timetracker-redis \
  --resource-group gitlab-timetracker-rg \
  --query hostName \
  --output tsv)

REDIS_KEY=$(az redis list-keys \
  --name gitlab-timetracker-redis \
  --resource-group gitlab-timetracker-rg \
  --query primaryKey \
  --output tsv)

# Set backend environment variables
az webapp config appsettings set \
  --name gitlab-timetracker-backend \
  --resource-group gitlab-timetracker-rg \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_HOST="$REDIS_HOST" \
    REDIS_PASSWORD="$REDIS_KEY" \
    AZURE_KEY_VAULT_NAME="gitlab-timetracker-kv" \
    JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://gitlab-timetracker-kv.vault.azure.net/secrets/JWT-SECRET/)" \
    JWT_REFRESH_SECRET="@Microsoft.KeyVault(SecretUri=https://gitlab-timetracker-kv.vault.azure.net/secrets/JWT-REFRESH-SECRET/)" \
    FRONTEND_URL="https://gitlab-timetracker-frontend.azurewebsites.net" \
    NODE_ENV="production" \
    PORT="80"
```

### 2.2 Frontend Configuration

```bash
az webapp config appsettings set \
  --name gitlab-timetracker-frontend \
  --resource-group gitlab-timetracker-rg \
  --settings \
    NEXT_PUBLIC_API_URL="https://gitlab-timetracker-backend.azurewebsites.net"
```

### 2.3 Enable Managed Identity for Key Vault Access

```bash
# Enable system-assigned managed identity for backend
az webapp identity assign \
  --name gitlab-timetracker-backend \
  --resource-group gitlab-timetracker-rg

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name gitlab-timetracker-backend \
  --resource-group gitlab-timetracker-rg \
  --query principalId \
  --output tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name gitlab-timetracker-kv \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

## Step 3: Build and Push Docker Images

```bash
# Login to Azure Container Registry
az acr login --name gitlabtimetrackeracr

# Build and push backend
cd backend
docker build -t gitlabtimetrackeracr.azurecr.io/backend:latest .
docker push gitlabtimetrackeracr.azurecr.io/backend:latest

# Build and push frontend
cd ../frontend
docker build -t gitlabtimetrackeracr.azurecr.io/frontend:latest .
docker push gitlabtimetrackeracr.azurecr.io/frontend:latest
```

## Step 4: Configure Continuous Deployment

### 4.1 Enable Container Registry Webhook

```bash
az webapp config container set \
  --name gitlab-timetracker-backend \
  --resource-group gitlab-timetracker-rg \
  --docker-custom-image-name gitlabtimetrackeracr.azurecr.io/backend:latest \
  --docker-registry-server-url https://gitlabtimetrackeracr.azurecr.io

az webapp config container set \
  --name gitlab-timetracker-frontend \
  --resource-group gitlab-timetracker-rg \
  --docker-custom-image-name gitlabtimetrackeracr.azurecr.io/frontend:latest \
  --docker-registry-server-url https://gitlabtimetrackeracr.azurecr.io
```

### 4.2 Configure GitHub Actions

Get Azure credentials:

```bash
az ad sp create-for-rbac \
  --name "gitlab-timetracker-github" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/gitlab-timetracker-rg \
  --sdk-auth
```

Add the output as `AZURE_CREDENTIALS` secret in GitHub repository settings.

## Step 5: Run Database Migrations

```bash
# SSH into backend container or run migration job
az webapp ssh --name gitlab-timetracker-backend --resource-group gitlab-timetracker-rg

# Inside container:
cd /app
npx prisma migrate deploy
```

## Step 6: Verify Deployment

```bash
# Check backend health
curl https://gitlab-timetracker-backend.azurewebsites.net/health

# Check frontend
curl https://gitlab-timetracker-frontend.azurewebsites.net

# View logs
az webapp log tail \
  --name gitlab-timetracker-backend \
  --resource-group gitlab-timetracker-rg
```

## Step 7: Configure Custom Domain (Optional)

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name gitlab-timetracker-frontend \
  --resource-group gitlab-timetracker-rg \
  --hostname www.yourdomDain.com

# Enable HTTPS
az webapp config ssl bind \
  --name gitlab-timetracker-frontend \
  --resource-group gitlab-timetracker-rg \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

## Monitoring and Maintenance

### View Application Insights

```bash
az monitor app-insights component show \
  --app gitlab-timetracker-insights \
  --resource-group gitlab-timetracker-rg
```

### Scale Resources

```bash
# Scale App Service
az appservice plan update \
  --name gitlab-timetracker-backend-plan \
  --resource-group gitlab-timetracker-rg \
  --sku B2

# Scale Database
az postgres flexible-server update \
  --name gitlab-timetracker-db \
  --resource-group gitlab-timetracker-rg \
  --sku-name Standard_B2s
```

### Backup Database

```bash
# PostgreSQL automatic backups are enabled by default
# Retention: 7 days (configurable up to 35 days)
```

## Cost Optimization

- Use Burstable tier for database during development
- Use Basic tier for Redis cache initially
- Enable auto-scale for App Service Plans
- Set up alerts for cost management
- Use Azure Cost Management for monitoring

## Estimated Monthly Costs

- PostgreSQL (Basic tier): $25-50
- Redis Cache (Basic C0): $16
- App Services (2x Basic B1): $26
- Key Vault: $0-5
- Application Insights: $0-10
- Container Registry: $5
- **Total: ~$75-115/month**
