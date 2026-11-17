const prisma = require('../db');
const { sendOutbidEmail } = require('./emailService');

/**
 * Submit a bid for an RFQ.
 * @param {string} rfqId
 * @param {object} bidData - { supplierName, carrierName, freightCharges, originCharges, destinationCharges, transitTime, validity }
 * @param {import('socket.io').Server} io
 */
async function submitBid(rfqId, bidData, io) {
  const now = new Date();

  // 1. Load RFQ
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });  if (!rfq) throw new Error('RFQ not found');

  // 2. Check status
  if (rfq.status !== 'ACTIVE') throw new Error(`RFQ is not active (status: ${rfq.status})`);

  // 3. Check bid window
  if (now < rfq.bidStart) throw new Error('Bidding has not started yet (cannot bid before start time)');
  if (now > rfq.bidClose) throw new Error('Bidding window has closed (cannot bid after closing time)');
  if (now > rfq.forcedClose) throw new Error('Auction deadline reached (cannot bid after forced closing time)');

  // 4. Compute totalAmount on server (never trust client total)
  const { supplierName, carrierName, freightCharges, originCharges, destinationCharges, transitTime, validity } = bidData;

  // Validate positive charges
  if (freightCharges <= 0) throw new Error('Freight charges must be greater than zero');
  if (originCharges < 0 || destinationCharges < 0) throw new Error('Origin and destination charges cannot be negative');

  const totalAmount = Number((freightCharges + originCharges + destinationCharges).toFixed(2));
  if (totalAmount <= 0) throw new Error('Total quote amount must be greater than zero');

  // 5a. Check supplier's own previous lowest bid — must always beat their own best
  const existingLowest = await prisma.bid.findFirst({
    where: { rfqId, supplierName },
    orderBy: { totalAmount: 'asc' },
  });
  if (existingLowest && totalAmount >= existingLowest.totalAmount) {
    throw new Error('New bid must be lower than your current lowest bid');
  }

  // 5b. minDecrement check — new bid must be at least minDecrement below global L1
  const minDecrement = rfq.minDecrement ?? 0;
  if (minDecrement > 0) {
    const currentL1 = await prisma.bid.findFirst({
      where: { rfqId },
      orderBy: { totalAmount: 'asc' },
    });
    if (currentL1) {
      const required = currentL1.totalAmount - minDecrement;
      if (totalAmount > required) {
        throw new Error(
          `Bid must be at least ₹${minDecrement.toLocaleString('en-IN')} below the current best bid of ₹${currentL1.totalAmount.toLocaleString('en-IN')} — your bid must be ≤ ₹${required.toLocaleString('en-IN')}`
        );
      }
    }
  }

  // Snapshot ranks before this bid (for Trigger B/C detection)
  const prevBids = await prisma.bid.findMany({ where: { rfqId } });
  const prevRanks = computeRanks(prevBids); // map supplierName -> rank

  // Identify who was L1 before this bid
  const prevL1Supplier = Object.entries(prevRanks).find(([, v]) => v.rank === 1)?.[0] ?? null;

  // 6. Create new bid
  const bid = await prisma.bid.create({
    data: {
      rfqId,
      supplierName,
      carrierName,
      freightCharges,
      originCharges,
      destinationCharges,
      totalAmount,
      transitTime,
      validity,
    },
  });

  // 7. Recompute ranks
  const allBids = await prisma.bid.findMany({ where: { rfqId } });
  const rankedSuppliers = computeRanks(allBids); // map supplierName -> { rank, bidId }

  // 8. Update rank field on the winning bid per supplier
  await Promise.all(
    Object.entries(rankedSuppliers).map(([supplier, { rank, bidId }]) =>
      prisma.bid.update({ where: { id: bidId }, data: { rank } })
    )
  );

  // 9. Log BID_SUBMITTED
  await prisma.auctionLog.create({
    data: {
      rfqId,
      eventType: 'BID_SUBMITTED',
      description: `${supplierName} submitted a bid of ${totalAmount} via ${carrierName}`,
    },
  });

  // 9b. Send outbid email if L1 changed and the previous L1 was a different supplier
  const newL1Supplier = Object.entries(rankedSuppliers).find(([, v]) => v.rank === 1)?.[0] ?? null;
  if (prevL1Supplier && prevL1Supplier !== supplierName && newL1Supplier === supplierName) {
    // prevL1Supplier just got bumped off rank 1 — notify them
    try {
      const outbidSupplier = await prisma.supplier.findUnique({
        where: { companyName: prevL1Supplier },
        select: { email: true, companyName: true },
      });
      if (outbidSupplier) {
        const theirBestBid = await prisma.bid.findFirst({
          where: { rfqId, supplierName: prevL1Supplier },
          orderBy: { totalAmount: 'asc' },
        });
        const newRank = rankedSuppliers[prevL1Supplier]?.rank ?? 2;
        await sendOutbidEmail({
          toEmail: outbidSupplier.email,
          companyName: outbidSupplier.companyName,
          rfqTitle: rfq.itemName || rfq.id,
          rfqId,
          theirBid: theirBestBid?.totalAmount ?? 0,
          newL1Amount: totalAmount,
          bidClose: rfq.bidClose,
          newRank,
        });
      }
    } catch (emailErr) {
      console.error('[Email] Outbid lookup failed:', emailErr.message);
    }
  }

  // 10. Check extension
  let currentRfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
  const triggerWindowStart = new Date(currentRfq.bidClose.getTime() - currentRfq.triggerX * 60 * 1000);

  if (now >= triggerWindowStart) {
    let shouldExtend = false;
    const trigger = currentRfq.extensionTrigger;

    if (trigger === 'A') {
      // Always extend
      shouldExtend = true;
    } else if (trigger === 'B') {
      // Extend if any rank changed vs before this bid
      shouldExtend = hasAnyRankChanged(prevRanks, rankedSuppliers);
    } else if (trigger === 'C') {
      // Extend only if L1 (rank=1) supplier changed
      shouldExtend = hasL1Changed(prevRanks, rankedSuppliers);
    }

    if (shouldExtend) {
      const extensionMs = currentRfq.extensionY * 60 * 1000;
      const newClose = new Date(Math.min(
        currentRfq.bidClose.getTime() + extensionMs,
        currentRfq.forcedClose.getTime()
      ));
      if (newClose > currentRfq.bidClose) {
        const oldClose = currentRfq.bidClose;
        currentRfq = await prisma.rfq.update({
          where: { id: rfqId },
          data: { bidClose: newClose },
        });
        await prisma.auctionLog.create({
          data: {
            rfqId,
            eventType: 'TIME_EXTENDED',
            description: `Bid window extended by ${currentRfq.extensionY} minutes due to Trigger ${trigger}`,
            oldCloseTime: oldClose,
            newCloseTime: newClose,
            triggerReason: trigger,
          },
        });
      }
    }
  }

  // Build ranked bids for socket emit
  const finalBids = await prisma.bid.findMany({
    where: { rfqId },
    orderBy: { totalAmount: 'asc' },
  });
  const rankedBids = buildRankedBidsList(finalBids);

  // 11. Emit socket event
  if (io) {
    io.to('rfq:' + rfqId).emit('bid_update', { rfq: currentRfq, rankedBids });
  }

  // 12. Return
  return { bid, rfq: currentRfq };
}

/**
 * Returns a map: supplierName -> { rank, bidId } based on each supplier's lowest bid.
 */
function computeRanks(bids) {
  // Group by supplierName, keep lowest totalAmount per supplier
  const lowestPerSupplier = {};
  for (const bid of bids) {
    const existing = lowestPerSupplier[bid.supplierName];
    if (!existing || bid.totalAmount < existing.totalAmount) {
      lowestPerSupplier[bid.supplierName] = bid;
    }
  }

  // Sort asc by totalAmount, assign rank
  const sorted = Object.values(lowestPerSupplier).sort((a, b) => a.totalAmount - b.totalAmount);
  const result = {};
  sorted.forEach((bid, i) => {
    result[bid.supplierName] = { rank: i + 1, bidId: bid.id };
  });
  return result;
}

/**
 * Returns true if any supplier's rank changed between prevRanks and newRanks.
 */
function hasAnyRankChanged(prevRanks, newRanks) {
  const allSuppliers = new Set([...Object.keys(prevRanks), ...Object.keys(newRanks)]);
  for (const supplier of allSuppliers) {
    if ((prevRanks[supplier]?.rank ?? null) !== (newRanks[supplier]?.rank ?? null)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if the rank-1 supplier changed.
 */
function hasL1Changed(prevRanks, newRanks) {
  const prevL1 = Object.entries(prevRanks).find(([, v]) => v.rank === 1)?.[0] ?? null;
  const newL1 = Object.entries(newRanks).find(([, v]) => v.rank === 1)?.[0] ?? null;
  return prevL1 !== newL1;
}

/**
 * Build ranked bids list: one best (lowest) bid per supplier, sorted by totalAmount.
 */
function buildRankedBidsList(bids) {
  const lowestPerSupplier = {};
  for (const bid of bids) {
    const existing = lowestPerSupplier[bid.supplierName];
    if (!existing || bid.totalAmount < existing.totalAmount) {
      lowestPerSupplier[bid.supplierName] = bid;
    }
  }
  return Object.values(lowestPerSupplier)
    .sort((a, b) => a.totalAmount - b.totalAmount)
    .map((bid, i) => ({ ...bid, displayRank: i + 1 }));
}

module.exports = { submitBid };
