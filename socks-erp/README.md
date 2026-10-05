# ThreadCraft ERP: Next.js 14 Enterprise Manufacturing Core

This directory contains the Next.js 14 full-stack application and Prisma persistence layer for **ThreadCraft ERP**.

For the complete architectural breakdown, domain design, Mermaid diagrams, and Forward Deployed AI Engineer documentation, please refer to the [Root README](../README.md).

## Quickstart (Development)

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run database synchronization & seed
npx prisma db push
npm run db:seed

# Start development server
npm run dev
```

Default administrator credentials:
* **Username:** `admin`
* **Password:** `AdminSecurePassword123!` (or value configured in `.env`)
