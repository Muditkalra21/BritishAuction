require('dotenv').config();
const prisma = require('./db');

async function seed() {
  console.log('Seeding initial British Auction RFQ demo data...');

  // Clean existing data
  await prisma.auctionLog.deleteMany({});
  await prisma.bid.deleteMany({});
  await prisma.rfq.deleteMany({});

  const now = new Date();
  const bidStart = new Date(now.getTime() - 30 * 60 * 1000); // started 30 mins ago
  const bidClose = new Date(now.getTime() + 15 * 60 * 1000);  // closes in 15 mins
  const forcedClose = new Date(now.getTime() + 45 * 60 * 1000); // absolute forced close in 45 mins
  const pickupDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const rfq = await prisma.rfq.create({
    data: {
      name: 'Delhi to Mumbai Freight Transportation (100T)',
      referenceId: 'RFQ-DEL-MUM-101',
      bidStart,
      bidClose,
      forcedClose,
      pickupDate,
      triggerX: 10, // 10 min window
      extensionY: 5,  // 5 min extension
      extensionTrigger: 'C', // L1 change
      status: 'ACTIVE',
    },
  });

  console.log(`Created RFQ: ${rfq.name} (${rfq.referenceId})`);

  // Log start
  await prisma.auctionLog.create({
    data: {
      rfqId: rfq.id,
      eventType: 'AUCTION_STARTED',
      description: 'Auction started for Delhi to Mumbai Freight (RFQ-DEL-MUM-101)',
      createdAt: bidStart,
    },
  });

  // Seed initial bids
  const bidsData = [
    {
      supplierName: 'FastTrack Logistics',
      carrierName: 'Tata Ace Fleet',
      freightCharges: 42000,
      originCharges: 5000,
      destinationCharges: 5000,
      totalAmount: 52000,
      transitTime: '36 hours',
      validity: '14 days',
      rank: 3,
      createdAt: new Date(now.getTime() - 25 * 60 * 1000),
    },
    {
      supplierName: 'ABC Logistics',
      carrierName: 'Mahindra Blazo 40T',
      freightCharges: 40000,
      originCharges: 5000,
      destinationCharges: 5000,
      totalAmount: 50000,
      transitTime: '32 hours',
      validity: '15 days',
      rank: 2,
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
    },
    {
      supplierName: 'XYZ Logistics',
      carrierName: 'BharatBenz Heavy Haul',
      freightCharges: 38000,
      originCharges: 5000,
      destinationCharges: 5000,
      totalAmount: 48000,
      transitTime: '30 hours',
      validity: '30 days',
      rank: 1,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
  ];

  for (const b of bidsData) {
    const bid = await prisma.bid.create({
      data: {
        rfqId: rfq.id,
        ...b,
      },
    });
    await prisma.auctionLog.create({
      data: {
        rfqId: rfq.id,
        eventType: 'BID_SUBMITTED',
        description: `${b.supplierName} submitted quote of ₹${b.totalAmount.toLocaleString('en-IN')} (Rank L${b.rank})`,
        createdAt: b.createdAt,
      },
    });
    console.log(`Placed initial bid: ${b.supplierName} - ₹${b.totalAmount} (L${b.rank})`);
  }

  console.log('Seed completed successfully!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
