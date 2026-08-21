import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'
import { db } from './config/db.config.js'
import {
    users,
    locations,
    categories,
    items,
    inventory,
    workOrders,
    transfers,
    customerOrders,
    customerOrderItems
} from './models/index.js'

export async function runSeed() {
    console.log('Clearing existing data and seeding fresh demo datasets...')

    // Clean all tables before seeding
    await db.execute(sql`
        TRUNCATE TABLE
            inventory_transactions,
            customer_order_items,
            customer_orders,
            transfers,
            work_orders,
            inventory,
            items,
            locations,
            categories,
            users
        RESTART IDENTITY CASCADE
    `)

    // --- Users ---
    console.log('Creating official demo users (@erp.com)...')
    const passwordHash = await bcrypt.hash('password123', 12)

    const [adminErp, opsErp, salesErp] = await db.insert(users).values([
        { name: 'Internal Admin', email: 'admin@erp.com', passwordHash, role: 'ADMIN' },
        { name: 'Operations Specialist', email: 'ops@erp.com', passwordHash, role: 'OPERATIONS' },
        { name: 'Enterprise Sales', email: 'sales@erp.com', passwordHash, role: 'SALES' }
    ]).returning()

    // --- Locations ---
    console.log('Creating locations...')
    const [mainWarehouse, branchWarehouse, prodFacility] = await db.insert(locations).values([
        { name: 'Main Distribution Hub', code: 'WH-MAIN' },
        { name: 'Regional Branch Warehouse', code: 'WH-BRANCH' },
        { name: 'Assembly Plant Facility', code: 'FAC-PROD' }
    ]).returning()

    // --- Categories ---
    console.log('Creating categories...')
    const [electronics, mechanical, rawMaterial] = await db.insert(categories).values([
        { name: 'Electronics' },
        { name: 'Mechanical' },
        { name: 'Raw Materials' }
    ]).returning()

    // --- Items ---
    console.log('Creating items...')
    const [laptop, motor, bearing, sensor, aluExtrusion] = await db.insert(items).values([
        { sku: 'ELEC-001', name: 'Industrial Rugged Laptop i7', categoryId: electronics.id },
        { sku: 'MECH-001', name: 'High-Torque Stepper Motor NEMA 17', categoryId: mechanical.id },
        { sku: 'MECH-002', name: 'Precision Deep-Groove Bearing 608ZZ', categoryId: mechanical.id },
        { sku: 'ELEC-002', name: 'Thermal Sensor Probe X1', categoryId: electronics.id },
        { sku: 'RAW-001', name: 'Anodized Aluminum Profile 2020 (1m)', categoryId: rawMaterial.id }
    ]).returning()

    // --- Inventory ---
    console.log('Creating initial inventory balances...')
    await db.insert(inventory).values([
        // Main Warehouse
        { itemId: laptop.id, locationId: mainWarehouse.id, batchNumber: 'BATCH-L01', physicalQuantity: 120, reservedQuantity: 25 },
        { itemId: motor.id, locationId: mainWarehouse.id, batchNumber: 'BATCH-M01', physicalQuantity: 250, reservedQuantity: 40 },
        { itemId: bearing.id, locationId: mainWarehouse.id, batchNumber: 'BATCH-B01', physicalQuantity: 45, reservedQuantity: 10 },
        { itemId: sensor.id, locationId: mainWarehouse.id, batchNumber: 'BATCH-S01', physicalQuantity: 90, reservedQuantity: 15 },
        { itemId: aluExtrusion.id, locationId: mainWarehouse.id, batchNumber: 'BATCH-R01', physicalQuantity: 300, reservedQuantity: 50 },

        // Branch Warehouse
        { itemId: laptop.id, locationId: branchWarehouse.id, batchNumber: 'BATCH-L02', physicalQuantity: 40, reservedQuantity: 0 },
        { itemId: bearing.id, locationId: branchWarehouse.id, batchNumber: 'BATCH-B02', physicalQuantity: 180, reservedQuantity: 0 },
        { itemId: sensor.id, locationId: branchWarehouse.id, batchNumber: 'BATCH-S02', physicalQuantity: 35, reservedQuantity: 0 },

        // Assembly Plant Facility
        { itemId: motor.id, locationId: prodFacility.id, batchNumber: 'BATCH-M03', physicalQuantity: 60, reservedQuantity: 0 },
        { itemId: aluExtrusion.id, locationId: prodFacility.id, batchNumber: 'BATCH-R02', physicalQuantity: 100, reservedQuantity: 0 }
    ])

    // --- Demo Work Orders ---
    console.log('Creating sample work orders...')
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    await db.insert(workOrders).values([
        {
            workOrderNumber: `WO-${todayStr}-0001`,
            locationId: mainWarehouse.id,
            itemId: bearing.id,
            requiredQuantity: 60,
            assignedUserId: opsErp.id,
            status: 'ASSIGNED',
            createdBy: adminErp.id
        },
        {
            workOrderNumber: `WO-${todayStr}-0002`,
            locationId: prodFacility.id,
            itemId: motor.id,
            requiredQuantity: 20,
            assignedUserId: opsErp.id,
            status: 'IN_PROGRESS',
            createdBy: adminErp.id
        },
        {
            workOrderNumber: `WO-${todayStr}-0003`,
            locationId: mainWarehouse.id,
            itemId: laptop.id,
            requiredQuantity: 10,
            assignedUserId: opsErp.id,
            status: 'COMPLETED',
            createdBy: adminErp.id
        }
    ])

    // --- Demo Transfers ---
    console.log('Creating sample internal transfers...')
    await db.insert(transfers).values([
        {
            transferNumber: `TRN-${todayStr}-0001`,
            sourceLocationId: branchWarehouse.id,
            destinationLocationId: mainWarehouse.id,
            itemId: bearing.id,
            quantity: 50,
            status: 'REQUESTED',
            requestedBy: opsErp.id
        },
        {
            transferNumber: `TRN-${todayStr}-0002`,
            sourceLocationId: mainWarehouse.id,
            destinationLocationId: prodFacility.id,
            itemId: aluExtrusion.id,
            quantity: 25,
            status: 'DISPATCHED',
            requestedBy: opsErp.id,
            dispatchedBy: adminErp.id,
            dispatchedAt: new Date()
        }
    ])

    // --- Demo Customer Orders ---
    console.log('Creating sample customer orders...')
    const [order1, order2] = await db.insert(customerOrders).values([
        {
            orderNumber: `ORD-${todayStr}-0001`,
            customerName: 'Apex Robotics International',
            status: 'RESERVED',
            createdBy: salesErp.id
        },
        {
            orderNumber: `ORD-${todayStr}-0002`,
            customerName: 'Global Tech Automations',
            status: 'PENDING',
            createdBy: salesErp.id
        }
    ]).returning()

    await db.insert(customerOrderItems).values([
        {
            orderId: order1.id,
            itemId: laptop.id,
            locationId: mainWarehouse.id,
            quantity: 25,
            reservedQuantity: 25
        },
        {
            orderId: order2.id,
            itemId: sensor.id,
            locationId: mainWarehouse.id,
            quantity: 15,
            reservedQuantity: 0
        }
    ])

    console.log('\n=============================================')
    console.log('✅ Database successfully seeded with demo data!')
    console.log('=============================================')
    console.log('\nOfficial Demo Credentials (Password: password123):')
    console.log('  👑 Admin:       admin@erp.com')
    console.log('  ⚙️ Operations:  ops@erp.com')
    console.log('  🛒 Sales:       sales@erp.com')
    console.log('\nLocations: Main Distribution Hub, Regional Branch Warehouse, Assembly Plant Facility')
    console.log('Items: Industrial Rugged Laptop, Stepper Motor, Precision Bearing, Thermal Sensor, Aluminum Profile')
}

// If invoked directly from CLI
if (process.argv[1]?.endsWith('seed.js')) {
    runSeed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Seed failed:', err)
            process.exit(1)
        })
}
