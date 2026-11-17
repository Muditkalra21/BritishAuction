const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { submitBid } = require('../services/auctionEngine');
const { requireAdmin, requireSupplier } = require('../middleware/auth');

const router = express.Router();

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const rfqSchema = z
  .object({
    name: z.string().min(1),
    referenceId: z.string().min(1),
    bidStart: z.string().datetime(),
    bidClose: z.string().datetime(),
    forcedClose: z.string().datetime(),
    pickupDate: z.string().datetime(),
    triggerX: z.number().int().positive(),
    extensionY: z.number().int().positive(),
    extensionTrigger: z.enum(['A', 'B', 'C']),
    minDecrement: z.number().min(0).default(0),
  })
  .refine((d) => new Date(d.bidClose) > new Date(d.bidStart), {
    message: 'bidClose must be after bidStart',
    path: ['bidClose'],
  })
  .refine((d) => new Date(d.forcedClose) > new Date(d.bidClose), {
    message: 'forcedClose must be after bidClose',
    path: ['forcedClose'],
  });

const bidSchema = z.object({
  supplierName: z.string().trim().min(1, 'Supplier name is required'),
  carrierName: z.string().trim().min(1, 'Carrier name is required'),
  freightCharges: z.number().positive('Freight charges must be greater than zero'),
  originCharges: z.number().min(0, 'Origin charges cannot be negative'),
  destinationCharges: z.number().min(0, 'Destination charges cannot be negative'),
  transitTime: z.string().trim().min(1, 'Transit time is required'),
  validity: z.string().trim().min(1, 'Validity is required'),
});

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/rfq
 * List all RFQs with currentLowestBid and supplierCount
 */
router.get('/', async (req, res) => {
  try {
    const rfqs = await prisma.rfq.findMany({
      include: { bids: true },
      orderBy: { createdAt: 'desc' },
    });

    const result = rfqs.map((rfq) => {
      const bids = rfq.bids;
      const supplierCount = new Set(bids.map((b) => b.supplierName)).size;
      const currentLowestBid = bids.length > 0 ? Math.min(...bids.map((b) => b.totalAmount)) : null;
      const { bids: _, ...rfqData } = rfq;
      return { ...rfqData, currentLowestBid, supplierCount };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/rfq
 * Create a new RFQ  Eopen to all users
 */
router.post('/', async (req, res) => {
  const parsed = rfqSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, referenceId, bidStart, bidClose, forcedClose, pickupDate, triggerX, extensionY, extensionTrigger, minDecrement } =
    parsed.data;

  try {
    const rfq = await prisma.rfq.create({
      data: {
        name, referenceId,
        bidStart: new Date(bidStart),
        bidClose: new Date(bidClose),
        forcedClose: new Date(forcedClose),
        pickupDate: new Date(pickupDate),
        triggerX, extensionY, extensionTrigger,
        minDecrement: minDecrement ?? 0,
      },
    });
    res.status(201).json(rfq);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'referenceId already exists' });
    }
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/rfq/:id
 * Single RFQ + ranked bids + logs
 */
router.get('/:id', async (req, res) => {
  try {
    const rfq = await prisma.rfq.findUnique({
      where: { id: req.params.id },
      include: {
        bids: { orderBy: { totalAmount: 'asc' } },
        logs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

    // Build ranked bids: for each supplier, their lowest bid gets the rank
    const rankedBids = buildRankedBids(rfq.bids);

    res.json({ ...rfq, rankedBids });
  } catch (err) {
    console.error(err);
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/rfq/:id/bid
 * Submit a bid  Erequires supplier JWT; supplierName taken from token (cannot be faked)
 */
router.post('/:id/bid', requireSupplier, async (req, res) => {
  // Strip supplierName from body  Euse the one from the verified JWT
  const { supplierName: _ignored, ...bodyRest } = req.body;
  const parsed = bidSchema.safeParse({
    ...bodyRest,
    supplierName: req.supplier.companyName, // locked from JWT
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const io = req.app.get('io');
    const result = await submitBid(req.params.id, parsed.data, io);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/rfq/:id/logs
 * Activity logs for an RFQ
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } });
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

    const logs = await prisma.auctionLog.findMany({
      where: { rfqId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/rfq/:id
 * Delete an RFQ and associated bids and logs  EAdmin only
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.auctionLog.deleteMany({ where: { rfqId: id } });
    await prisma.bid.deleteMany({ where: { rfqId: id } });
    await prisma.rfq.delete({ where: { id } });
    res.json({ success: true, message: 'Auction deleted' });
  } catch (err) {
    console.error(err);
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given all bids for an RFQ, build ranked list showing each supplier's best bid.
 * Also returns all bids (ranked ones marked with their rank).
 */
function buildRankedBids(bids) {
  // For each supplier, find their lowest bid
  const lowestPerSupplier = {};
  for (const bid of bids) {
    const existing = lowestPerSupplier[bid.supplierName];
    if (!existing || bid.totalAmount < existing.totalAmount) {
      lowestPerSupplier[bid.supplierName] = bid;
    }
  }
  // Sort by totalAmount and assign display rank
  return Object.values(lowestPerSupplier)
    .sort((a, b) => a.totalAmount - b.totalAmount)
    .map((bid, i) => ({ ...bid, displayRank: i + 1 }));
}

module.exports = router;
