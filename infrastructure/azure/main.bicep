param location string = resourceGroup().location
param environmentName string = 'buildex'
param dbAdminUsername string = 'buildexadmin'
@secure()
param dbAdminPassword string
param containerRegistryName string = 'buildex${uniqueString(resourceGroup().id)}'
// Set after first deploy when FQDN is known; used for CORS on the API
param webAppFqdn string = ''

// ─── Container Registry ───────────────────────────────────────────────────────

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// ─── PostgreSQL Flexible Server ───────────────────────────────────────────────

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${environmentName}-postgres'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: dbAdminUsername
    administratorLoginPassword: dbAdminPassword
    version: '16'
    storage: { storageSizeGB: 32 }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresServer
  name: 'buildex'
}

resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresServer
  name: 'AllowAllAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ─── Redis Cache ──────────────────────────────────────────────────────────────

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${environmentName}-redis'
  location: location
  sku: {
    name: 'Basic'
    family: 'C'
    capacity: 0
  }
  properties: {
    redisVersion: '7'
    enableNonSslPort: false   // TLS only — port 6380
    minimumTlsVersion: '1.2'
  }
}

// Azure Cache for Redis requires TLS → use rediss:// scheme on port 6380
var redisUrl = 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:6380'

// ─── Azure Communication Service ─────────────────────────────────────────────

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: '${environmentName}-comms'
  location: 'global'
  properties: { dataLocation: 'Europe' }
}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: '${environmentName}-email'
  location: 'global'
  properties: { dataLocation: 'Europe' }
}

// ─── Observability ────────────────────────────────────────────────────────────

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${environmentName}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${environmentName}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ─── Container Apps Environment ───────────────────────────────────────────────

resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${environmentName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ─── API Container App ────────────────────────────────────────────────────────

resource apiContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${environmentName}-api'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3101
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        { name: 'registry-password'; value: containerRegistry.listCredentials().passwords[0].value }
        { name: 'db-password'; value: dbAdminPassword }
        { name: 'redis-url'; value: redisUrl }
        { name: 'azure-comms-conn'; value: communicationService.listKeys().primaryConnectionString }
        { name: 'appinsights-conn'; value: appInsights.properties.ConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${containerRegistry.properties.loginServer}/buildex-api:latest'
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3101' }
            { name: 'DB_HOST', value: postgresServer.properties.fullyQualifiedDomainName }
            { name: 'DB_PORT', value: '5432' }
            { name: 'DB_NAME', value: 'buildex' }
            { name: 'DB_USER', value: dbAdminUsername }
            { name: 'DB_PASSWORD', secretRef: 'db-password' }
            { name: 'REDIS_URL', secretRef: 'redis-url' }
            // webAppFqdn is empty on first deploy; update after web app FQDN is known
            { name: 'WEB_URL', value: empty(webAppFqdn) ? '' : 'https://${webAppFqdn}' }
            { name: 'COOKIE_SECURE', value: 'true' }
            { name: 'DEV_LOGIN_ENABLED', value: 'false' }
            { name: 'AZURE_COMMUNICATION_CONNECTION_STRING', secretRef: 'azure-comms-conn' }
            { name: 'AZURE_SENDER_EMAIL', value: 'DoNotReply@buildex.ro' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'appinsights-conn' }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Readiness'
              httpGet: { path: '/api/healthz', port: 3101 }
              initialDelaySeconds: 15
              periodSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Liveness'
              httpGet: { path: '/api/healthz', port: 3101 }
              initialDelaySeconds: 30
              periodSeconds: 20
              failureThreshold: 5
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

// ─── Web Container App ────────────────────────────────────────────────────────

resource webContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${environmentName}-web'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        { name: 'registry-password'; value: containerRegistry.listCredentials().passwords[0].value }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${containerRegistry.properties.loginServer}/buildex-web:latest'
          env: [
            { name: 'NODE_ENV', value: 'production' }
            // Browser-side: public FQDN of the API
            { name: 'NEXT_PUBLIC_API_URL', value: 'https://${apiContainerApp.properties.configuration.ingress.fqdn}/api' }
            // Server-side (Next.js rewrites): same FQDN, avoids container networking complexity
            { name: 'API_INTERNAL_URL', value: 'https://${apiContainerApp.properties.configuration.ingress.fqdn}/api' }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output webUrl string = 'https://${webContainerApp.properties.configuration.ingress.fqdn}'
output apiUrl string = 'https://${apiContainerApp.properties.configuration.ingress.fqdn}'
output webFqdn string = webContainerApp.properties.configuration.ingress.fqdn
output registryLoginServer string = containerRegistry.properties.loginServer
output appInsightsConnectionString string = appInsights.properties.ConnectionString
