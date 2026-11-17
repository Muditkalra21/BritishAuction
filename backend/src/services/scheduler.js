const cron = require('node-cron');
const prisma = require('../db');

function startScheduler(io) {
  // Run every 10 seconds
  cron.schedule('*/10 * * * * *', async () => {
    const now = new Date();

    try {
      // 1. Activate PENDING rfqs where bidStart <= now
      const pendingRfqs = await prisma.rfq.findMany({
        where: { status: 'PENDING', bidStart: { lte: now } },
      });
      for (const rfq of pendingRfqs) {
        await prisma.rfq.update({ where: { id: rfq.id }, data: { status: 'ACTIVE' } });
        await prisma.auctionLog.create({
          data: {
            rfqId: rfq.id,
            eventType: 'AUCTION_STARTED',
            description: `Auction ${rfq.referenceId} started`,
          },
        });
        if (io) io.to('rfq:' + rfq.id).emit('auction_status', { rfqId: rfq.id, status: 'ACTIVE' });
        console.log(`[Scheduler] RFQ ${rfq.referenceId} activated`);
      }

      // 2. Close ACTIVE rfqs where forcedClose <= now → FORCE_CLOSED
      //    (check forcedClose first, as it takes priority)
      const forceCloseRfqs = await prisma.rfq.findMany({
        where: { status: 'ACTIVE', forcedClose: { lte: now } },
      });
      for (const rfq of forceCloseRfqs) {
        await prisma.rfq.update({ where: { id: rfq.id }, data: { status: 'FORCE_CLOSED' } });
        await prisma.auctionLog.create({
          data: {
            rfqId: rfq.id,
            eventType: 'FORCE_CLOSED',
            description: `Auction ${rfq.referenceId} force-closed at forced close time`,
          },
        });
        if (io) io.to('rfq:' + rfq.id).emit('auction_status', { rfqId: rfq.id, status: 'FORCE_CLOSED' });
        console.log(`[Scheduler] RFQ ${rfq.referenceId} force-closed`);
      }

      // 3. Close ACTIVE rfqs where bidClose <= now AND forcedClose > now → CLOSED
      const closeRfqs = await prisma.rfq.findMany({
        where: {
          status: 'ACTIVE',
          bidClose: { lte: now },
          forcedClose: { gt: now },
        },
      });
      for (const rfq of closeRfqs) {
        await prisma.rfq.update({ where: { id: rfq.id }, data: { status: 'CLOSED' } });
        await prisma.auctionLog.create({
          data: {
            rfqId: rfq.id,
            eventType: 'AUCTION_CLOSED',
            description: `Auction ${rfq.referenceId} closed at bid close time`,
          },
        });
        if (io) io.to('rfq:' + rfq.id).emit('auction_status', { rfqId: rfq.id, status: 'CLOSED' });
        console.log(`[Scheduler] RFQ ${rfq.referenceId} closed`);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });

  // Auto-cleanup: runs once per hour — delete CLOSED/FORCE_CLOSED auctions older than 7 days
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const stale = await prisma.rfq.findMany({
        where: {
          status: { in: ['CLOSED', 'FORCE_CLOSED'] },
          bidClose: { lt: cutoff },
        },
        select: { id: true, referenceId: true },
      });

      for (const rfq of stale) {
        await prisma.auctionLog.deleteMany({ where: { rfqId: rfq.id } });
        await prisma.bid.deleteMany({ where: { rfqId: rfq.id } });
        await prisma.rfq.delete({ where: { id: rfq.id } });
        console.log(`[Scheduler] Auto-deleted stale auction ${rfq.referenceId} (closed > 7 days ago)`);
      }
    } catch (err) {
      console.error('[Scheduler] Auto-cleanup error:', err);
    }
  });

  console.log('[Scheduler] Started (runs every 10 seconds · cleanup every 1 hour)');
}

module.exports = { startScheduler };
