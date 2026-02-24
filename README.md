# Buildex - Procurement & Price Intelligence for Construction

A B2B multi-tenant SaaS MVP for construction procurement and price intelligence, specifically designed for the Romanian market (2026).

## Features

- **Materials Catalog**: Manage canonical SKUs with aliases/synonyms
- **RFQ Workflow**: Create and send requests for quotes to suppliers
- **Supplier Management**: Maintain supplier contacts and information
- **Public Offer Submission**: Secure token-based supplier offer submission (no account required)
- **Offer Comparison**: Compare offers side-by-side with normalized data
- **Price Intelligence**: Historical price tracking with statistics (30/60/90 day averages, volatility, trends)
- **Price Alerts**: Configurable threshold and volatility alert rules with triggered alert management
- **Audit Log**: Full audit trail of all entity changes per tenant
- **Multi-tenancy**: Row-level tenant isolation with session-based authentication

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis + BullMQ (for background jobs)
- **Email**: Azure Communication Services (configurable)
- **Deployment**: Azure Container Apps + Azure Database for PostgreSQL Flexible Server + Azure Cache for Redis

## Architecture

```
/apps
  /api          NestJS backend API
  /web          Next.js frontend
/packages
  /shared       Shared types and Zod schemas
/infrastructure
  /azure        Bicep templates for Azure deployment
```

## Security Features

- Cookie-based sessions with HTTP-only cookies (no JWT in localStorage)
- CSRF protection
- Tenant isolation at the application layer
- Rate limiting on public endpoints
- Secure token hashing for supplier invites
- GDPR-compliant data handling

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd buildex
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start the infrastructure with Docker Compose:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
npm run db:migrate
```

5. Seed demo data:
```bash
npm run db:seed
```

6. Access the application:
- Web: http://localhost:3000
- API: http://localhost:4000/api
- Click "Enter Demo Mode" to access without credentials

### Development Mode

The application includes a "Dev Login" feature that creates a demo session without requiring sign-up. This is enabled by default in development (`DEV_LOGIN_ENABLED=true`) but disabled in production.

## API Endpoints

### Authentication
- `POST /api/auth/dev-login` - Create demo session (dev only)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Materials
- `GET /api/materials` - List materials
- `POST /api/materials` - Create material
- `GET /api/materials/:id` - Get material details
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material
- `GET /api/materials/:id/aliases` - List aliases
- `POST /api/materials/:id/aliases` - Create alias

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier details
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### RFQs
- `GET /api/rfqs` - List RFQs
- `POST /api/rfqs` - Create RFQ
- `GET /api/rfqs/:id` - Get RFQ with items and invites
- `PUT /api/rfqs/:id` - Update RFQ
- `DELETE /api/rfqs/:id` - Delete RFQ (draft only)
- `POST /api/rfqs/:id/send` - Send RFQ to suppliers

### Offers
- `GET /api/offers/rfq/:rfqId` - List offers for RFQ
- `GET /api/offers/rfq/:rfqId/compare` - Get comparison data
- `POST /api/offers/:id/win` - Mark winning offer

### Public Supplier Endpoint
- `GET /api/supplier/offer?token=...` - Get RFQ context for token
- `POST /api/supplier/offer` - Submit offer with token

### Price Intelligence
- `GET /api/price/stats?materialId=&city=` - Get price statistics
- `GET /api/price/history?materialId=&city=` - Get price history

### Alerts
- `GET /api/alerts/rules` - List alert rules
- `POST /api/alerts/rules` - Create alert rule
- `DELETE /api/alerts/rules/:id` - Delete alert rule
- `GET /api/alerts` - List triggered alerts
- `POST /api/alerts/:id/ack` - Acknowledge alert
- `POST /api/alerts/check` - Manually trigger alert evaluation

### Audit Log
- `GET /api/audit-log?entityType=&limit=&offset=` - Query audit log

### Health
- `GET /api/healthz` - Health check endpoint

## Deployment to Azure

### Prerequisites

- Azure CLI (`az`) installed and logged in
- Azure subscription with necessary quotas
- Service principal credentials for CI/CD

### Manual Deployment

1. Create resource group:
```bash
az group create --name buildex-rg --location westeurope
```

2. Deploy Bicep template:
```bash
az deployment group create \
  --resource-group buildex-rg \
  --template-file infrastructure/azure/main.bicep \
  --parameters dbAdminPassword=<secure-password>
```

3. Build and push images:
```bash
az acr build --registry <registry-name> --image buildex-api:latest --file apps/api/Dockerfile .
az acr build --registry <registry-name> --image buildex-web:latest --file apps/web/Dockerfile .
```

### CI/CD with GitHub Actions

1. Set up GitHub secrets:
   - `AZURE_CREDENTIALS`: Service principal JSON
   - `AZURE_SUBSCRIPTION`: Subscription ID
   - `DB_ADMIN_PASSWORD`: Database admin password
   - `REGISTRY_USERNAME` and `REGISTRY_PASSWORD`: ACR credentials

2. Push to `main` branch triggers automatic deployment.

## Environment Variables

### API (`apps/api/.env`)
- `NODE_ENV` - development/production
- `PORT` - API port (default: 4000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `REDIS_URL` - Redis connection string
- `WEB_URL` - Frontend URL for CORS
- `COOKIE_SECURE` - Set to true in production
- `DEV_LOGIN_ENABLED` - Enable dev login mode

### Web (`apps/web/.env`)
- `NEXT_PUBLIC_API_URL` - API URL for client-side requests

## Project Structure

```
.
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/          # Session auth & dev-login
│   │   │   ├── materials/     # Materials CRUD
│   │   │   ├── suppliers/     # Suppliers CRUD
│   │   │   ├── rfq/           # RFQ workflow
│   │   │   ├── offers/        # Offers & public supplier
│   │   │   ├── price-engine/  # Price calculations
│   │   │   ├── dashboard/     # Dashboard stats & overview
│   │   │   ├── email/          # Email templates & sending
│   │   │   ├── alerts/        # Alert rules & triggers
│   │   │   ├── audit-log/     # Audit trail (global)
│   │   │   ├── common/        # Filters, middleware
│   │   │   └── database/      # Database module
│   │   ├── scripts/           # Migration & seed scripts
│   │   └── Dockerfile
│   └── web/                   # Next.js frontend
│       ├── src/
│       │   ├── app/           # App router pages (10 routes)
│       │   ├── components/    # Shared UI components
│       │   └── lib/           # API client, utilities
│       └── Dockerfile
├── packages/
│   └── shared/               # Shared types & Zod schemas
├── infrastructure/
│   └── azure/                # Bicep templates
├── docker-compose.yml
└── .github/workflows/         # CI/CD
```

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please contact the development team.

---

Built for the Romanian construction market in 2026.
