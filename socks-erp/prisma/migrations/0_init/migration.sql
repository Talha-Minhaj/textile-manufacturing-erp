-- ==============================================================================
-- ThreadCraft ERP - Initial Enterprise PostgreSQL Schema Migration (0_init)
-- Domain: Apparel Manufacturing & Supply Chain Operations
-- Tables: 10 Models, Foreign Keys, Referential Integrity Cascades, Composite Indexes
-- ==============================================================================

-- 1. Role-Based Access Control (RBAC)
CREATE TABLE IF NOT EXISTS "Role" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Permission" (
    "id" SERIAL PRIMARY KEY,
    "roleId" INTEGER NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
    "module" VARCHAR(64) NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Permission_roleId_module_key" UNIQUE ("roleId", "module")
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(128) NOT NULL,
    "username" VARCHAR(64) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "roleId" INTEGER NOT NULL REFERENCES "Role"("id"),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Data: Warehouses, Suppliers & Materials (Raw Yarn)
CREATE TABLE IF NOT EXISTS "Warehouse" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(128) UNIQUE NOT NULL,
    "type" VARCHAR(32) NOT NULL, -- RAW, FINISHED, PACKAGING, SECONDS
    "location" VARCHAR(255),
    "manager" VARCHAR(128),
    "capacity" DECIMAL(12,2) DEFAULT 10000.00
);

CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(128) UNIQUE NOT NULL,
    "phone" VARCHAR(64),
    "address TEXT
);

CREATE TABLE IF NOT EXISTS "Material" (
    "id" SERIAL PRIMARY KEY,
    "code" VARCHAR(64) UNIQUE NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "yarnType" VARCHAR(64),
    "yarnCount" VARCHAR(32),
    "composition" VARCHAR(128),
    "color" VARCHAR(64),
    "unit" VARCHAR(16) NOT NULL DEFAULT 'kg',
    "reorderLevel" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Material_name_idx" ON "Material"("name");

CREATE TABLE IF NOT EXISTS "MaterialBatch" (
    "id" SERIAL PRIMARY KEY,
    "materialId" INTEGER NOT NULL REFERENCES "Material"("id") ON DELETE RESTRICT,
    "supplierId" INTEGER REFERENCES "Supplier"("id") ON DELETE SET NULL,
    "lotNo" VARCHAR(64) NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "rate" DECIMAL(10,2),
    "remarks" TEXT,
    CONSTRAINT "MaterialBatch_materialId_lotNo_key" UNIQUE ("materialId", "lotNo")
);

-- 3. Master Data: Products & Machine Floor
CREATE TABLE IF NOT EXISTS "Product" (
    "id" SERIAL PRIMARY KEY,
    "code" VARCHAR(64) UNIQUE NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "type" VARCHAR(64),
    "size" VARCHAR(32) NOT NULL,
    "color" VARCHAR(64) NOT NULL,
    "design" VARCHAR(64),
    "composition" VARCHAR(128),
    "pairWeightG" DECIMAL(8,2),
    "dozenWeightKg" DECIMAL(8,3),
    "stdCost" DECIMAL(10,2),
    "sellingPrice" DECIMAL(10,2),
    "pairsPerCarton" INTEGER NOT NULL DEFAULT 144,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Product_category_size_idx" ON "Product"("category", "size");
CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");

CREATE TABLE IF NOT EXISTS "ProductSize" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(32) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS "ProductColor" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Machine" (
    "id" SERIAL PRIMARY KEY,
    "machineNo" INTEGER UNIQUE NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "model" VARCHAR(128) NOT NULL DEFAULT 'Lonati Donna 400',
    "cylinderSize" VARCHAR(32) NOT NULL DEFAULT '3.75 inch',
    "needleCount" INTEGER NOT NULL DEFAULT 144,
    "rpm" INTEGER NOT NULL DEFAULT 280,
    "status" VARCHAR(32) NOT NULL DEFAULT 'RUNNING',
    "operator" VARCHAR(128),
    "targetPerHour" DECIMAL(6,2) NOT NULL DEFAULT 3.50,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Shift Production Logging & Dual-Grade Output
CREATE TABLE IF NOT EXISTS "ProductionLog" (
    "id" SERIAL PRIMARY KEY,
    "machineId" INTEGER NOT NULL REFERENCES "Machine"("id"),
    "productId" INTEGER NOT NULL REFERENCES "Product"("id"),
    "materialId" INTEGER REFERENCES "Material"("id"),
    "shiftType" VARCHAR(32) NOT NULL DEFAULT 'DAY_12H',
    "shiftHours" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "operator" VARCHAR(128) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dozenA" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "dozenB" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalDozen" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalPairs" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "yarnUsedKg" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "efficiency" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "defectRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "status" VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdById" INTEGER NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProductionLog_machineId_date_idx" ON "ProductionLog"("machineId", "date");
CREATE INDEX IF NOT EXISTS "ProductionLog_productId_date_idx" ON "ProductionLog"("productId", "date");

-- 5. Double-Entry Stock Movement Ledger & Cached Balances
CREATE TABLE IF NOT EXISTS "StockMovement" (
    "id" SERIAL PRIMARY KEY,
    "type" VARCHAR(32) NOT NULL,
    "direction" INTEGER NOT NULL, -- +1 in, -1 out
    "qty" DECIMAL(12,3) NOT NULL,
    "materialId" INTEGER REFERENCES "Material"("id"),
    "productId" INTEGER REFERENCES "Product"("id"),
    "batchId" INTEGER REFERENCES "MaterialBatch"("id"),
    "warehouseId" INTEGER NOT NULL REFERENCES "Warehouse"("id"),
    "referenceType" VARCHAR(64),
    "referenceId" INTEGER,
    "note" TEXT,
    "createdById" INTEGER NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "StockMovement_materialId_warehouseId_createdAt_idx" ON "StockMovement"("materialId", "warehouseId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_productId_warehouseId_createdAt_idx" ON "StockMovement"("productId", "warehouseId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");

CREATE TABLE IF NOT EXISTS "StockBalance" (
    "id" SERIAL PRIMARY KEY,
    "itemKey" VARCHAR(64) NOT NULL,
    "materialId" INTEGER,
    "productId" INTEGER,
    "warehouseId" INTEGER NOT NULL REFERENCES "Warehouse"("id"),
    "qty" DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    CONSTRAINT "StockBalance_itemKey_warehouseId_key" UNIQUE ("itemKey", "warehouseId")
);

-- 6. Immutable Audit Log
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES "User"("id"),
    "action" VARCHAR(64) NOT NULL,
    "entity" VARCHAR(64) NOT NULL,
    "entityId" INTEGER,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
