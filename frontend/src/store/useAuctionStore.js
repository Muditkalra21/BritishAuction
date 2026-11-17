import { create } from 'zustand';

const useAuctionStore = create((set) => ({
  rfqs: [],
  currentRfq: null,
  bids: [],
  logs: [],
  setRfqs: (rfqs) => set({ rfqs }),
  setCurrentRfq: (rfq) => set({ currentRfq: rfq }),
  setBids: (bids) => set({ bids }),
  setLogs: (logs) => set({ logs }),
  updateRfq: (rfq) => set({ currentRfq: rfq }),
  updateBids: (bids) => set({ bids }),
}));

export default useAuctionStore;
