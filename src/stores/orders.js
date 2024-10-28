import { defineStore } from 'pinia';
import { notifyError } from 'src/js/notify';

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    dataSources: [], // List of URLs
    orders: [],      // List of orders
    loading: false   // Loading state
  }),

  actions: {
    async fetchOrders() {
      this.loading = true;
      try {
        // For now, let's simulate some orders
        this.orders = [
          {
            id: '1',
            type: 'sell',
            amount: 100000,
            price: 50000,
            timestamp: Date.now(),
            source: 'test-source'
          },
          {
            id: '2',
            type: 'buy',
            amount: 50000,
            price: 49000,
            timestamp: Date.now() - 1000 * 60, // 1 minute ago
            source: 'test-source'
          }
        ];
      } catch (error) {
        console.error('Error fetching orders:', error);
        notifyError('Failed to fetch orders');
      } finally {
        this.loading = false;
      }
    },

    addDataSource(url) {
      // Normalize URL (remove trailing slash)
      const normalizedUrl = url.replace(/\/$/, '');
      
      if (!this.dataSources.includes(normalizedUrl)) {
        this.dataSources.push(normalizedUrl);
        // Save to localStorage
        localStorage.setItem('orderbook-sources', JSON.stringify(this.dataSources));
      }
    },

    removeDataSource(index) {
      this.dataSources.splice(index, 1);
      // Update localStorage
      localStorage.setItem('orderbook-sources', JSON.stringify(this.dataSources));
      // Refresh orders after removing a source
      this.fetchOrders();
    },

    // Initialize from localStorage
    initializeSources() {
      try {
        const saved = localStorage.getItem('orderbook-sources');
        if (saved) {
          this.dataSources = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Error loading data sources:', error);
        this.dataSources = [];
      }
    }
  }
});