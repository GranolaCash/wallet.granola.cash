<template>
  <div style="max-width: 800px; margin: 0 auto">
    <!-- Create Order -->
    <div class="q-py-md q-px-xs text-left">
      <q-list padding>
        <q-item>
          <q-item-section>
            <q-item-label overline>Atomic Ecash Swaps</q-item-label>
            <q-item-label caption>This is a nostr powered order book for atomic ecash swaps.</q-item-label>
            <q-item-label caption>We leverage NUT-10 and NUT-11 to make sure swaps only happen atomically: no counterparty risk.</q-item-label>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label overline>Create Order</q-item-label>
            <q-item-label caption>Exchange ecash between different denominations</q-item-label>
          </q-item-section>
        </q-item>

        <q-item>
          <div class="row full-width q-col-gutter-md">
            <!-- Send -->
            <div class="col-xs-12 col-sm-6">
              <q-input 
                v-model.number="newOrder.sendAmount" 
                label="You send"
                type="number"
                dense
                outlined
                rounded
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <q-select
                v-model="newOrder.sendDenomination"
                :options="denominations"
                label="Denomination"
                dense
                outlined
                rounded
                :error="isDenominationError"
                :error-message="denominationErrorMessage"
                @update:model-value="checkDenominations"
              />
            </div>

            <!-- Receive -->
            <div class="col-xs-12 col-sm-6">
              <q-input 
                v-model.number="newOrder.receiveAmount" 
                label="You receive"
                type="number"
                dense
                outlined
                rounded
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <q-select
                v-model="newOrder.receiveDenomination"
                :options="denominations"
                label="Denomination"
                dense
                outlined
                rounded
                :error="isDenominationError"
                :error-message="denominationErrorMessage"
                @update:model-value="checkDenominations"
              />
            </div>

            <!-- Create Button -->
            <div class="col-12">
              <q-btn 
                color="primary" 
                rounded
                @click="createOrder"
                class="q-px-lg"
                :disable="!isValidOrder"
                :loading="isCreatingOrder"
              >
                <template v-slot:default>
                  <q-icon name="add" size="xs" class="q-pr-xs"/>
                  Create Order
                </template>
                <template v-slot:loading>
                  <q-spinner-hourglass />
                  Publishing...
                </template>
              </q-btn>
            </div>
          </div>
        </q-item>
      </q-list>
    </div>

    <!-- Order List -->
    <div class="q-py-md q-px-xs text-left">
      <q-list padding>
        <q-item>
          <q-item-section>
            <q-item-label overline>Active Orders</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              round
              dense
              icon="refresh"
              :loading="isLoading"
              @click="refreshOrders"
            />
          </q-item-section>
        </q-item>

        <!-- Loading state -->
        <template v-if="isLoading">
          <q-item>
            <q-item-section class="text-center">
              <q-spinner color="primary" size="2em" />
              <q-item-label caption>
                Loading orders...
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <!-- Orders list -->
        <template v-else>
          <template v-for="order in orders" :key="order.id">
            <q-item>
              <q-item-section>
                <div class="row items-center">
                  <div class="text-body1">
                    {{ order.sendAmount }} {{ order.sendDenomination }}
                  </div>
                  <q-icon name="swap_horiz" class="q-px-md"/>
                  <div class="text-body1">
                    {{ order.receiveAmount }} {{ order.receiveDenomination }}
                  </div>
                </div>
                <q-item-label caption>
                  Created {{ formatTimestamp(order.created) }}
                  <template v-if="order.pubkey">
                    | by {{ shortPubkey(order.pubkey) }}
                  </template>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-btn 
                  color="primary" 
                  rounded 
                  outline
                  @click="showTakeOrderDialog(order)"
                  class="q-px-sm"
                >
                  Take Order
                </q-btn>
              </q-item-section>
            </q-item>
            <q-separator spaced inset="item" />
          </template>

          <!-- Empty state -->
          <q-item v-if="orders.length === 0">
            <q-item-section class="text-center text-grey">
              No active orders
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </div>

    <!-- Take Order Dialog -->
    <q-dialog
      v-model="takeOrderDialog.show"
      position="top"
      backdrop-filter="blur(2px) brightness(60%)"
      no-backdrop-dismiss
    >
      <q-card class="q-pa-none q-pt-none" style="min-width: 400px">
        <q-card-section class="q-pa-lg q-pt-md">
          <!-- Header -->
          <div class="row items-center no-wrap q-mb-sm">
            <div class="col">
              <span class="text-h6">Take Order</span>
            </div>
            <div class="col-auto">
              <q-badge
                outline
                rounded
                color="grey"
                class="q-pl-sm q-pr-sm"
                v-if="hasBalance"
              >
                <q-icon name="account_balance" color="primary" class="q-mr-xs" size="xs" />
                Balance: {{ currentBalance }} {{ takeOrderDialog.order?.receiveDenomination }}
              </q-badge>
            </div>
          </div>

          <!-- Order Details -->
          <q-list>
            <!-- From -->
            <q-item>
              <q-item-section>
                <q-item-label caption>pay</q-item-label>
                <div class="row items-center q-mt-xs">
                  <div class="text-h5">{{ takeOrderDialog.order?.sendAmount }}</div>
                  <div class="text-subtitle1 q-ml-sm">{{ takeOrderDialog.order?.sendDenomination }}</div>
                </div>
                <q-item-label caption class="q-mt-sm">Mint: {{ takeOrderDialog.fromMint }}</q-item-label>
              </q-item-section>
            </q-item>

            <!-- To -->
            <q-item>
              <q-item-section>
                <q-item-label caption>receive</q-item-label>
                <div class="row items-center q-mt-xs">
                  <div class="text-h5">{{ takeOrderDialog.order?.receiveAmount }}</div>
                  <div class="text-subtitle1 q-ml-sm">{{ takeOrderDialog.order?.receiveDenomination }}</div>
                </div>
                <q-item-label caption class="q-mt-sm">mint: {{ takeOrderDialog.toMint }}</q-item-label>
              </q-item-section>
            </q-item>

            <!-- Actions -->
            <q-item>
              <q-item-section class="q-gutter-x-md row">
                <q-btn
                  color="primary"
                  rounded
                  :loading="takeOrderDialog.processing"
                  @click="processOrder"
                  :disable="!hasBalance"
                >
                  Confirm Swap
                  <template v-slot:loading>
                    <q-spinner-hourglass />
                    Processing...
                  </template>
                </q-btn>
                <q-btn
                  rounded
                  flat
                  color="grey"
                  v-close-popup
                >
                  Cancel
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { defineComponent } from "vue";
import { notifyError, notifySuccess } from "src/js/notify";

// Helper function to generate random ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Mock data for initial orders
const mockOrders = [
  {
    id: generateId(),
    sendAmount: 100000,
    sendDenomination: 'sat',
    receiveAmount: 30,
    receiveDenomination: 'usd',
    created: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    pubkey: '8f7d8a9b5c6d'
  },
  {
    id: generateId(),
    sendAmount: 50,
    sendDenomination: 'usd',
    receiveAmount: 45,
    receiveDenomination: 'eur',
    created: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    pubkey: '3e4f5a6b7c8d'
  },
  {
    id: generateId(),
    sendAmount: 200,
    sendDenomination: 'eur',
    receiveAmount: 650000,
    receiveDenomination: 'sat',
    created: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    pubkey: '1a2b3c4d5e6f'
  }
];

// Mock mint URLs for testing
const MOCK_MINTS = {
  sat: 'https://legend.lnbits.com/',
  usd: 'https://mint.fiatjaf.com/',
  eur: 'https://euromint.cashu.space/'
};

export default defineComponent({
  name: "OrderBook",
  
  data() {
    return {
      denominations: ['sat', 'usd', 'eur', 'brl'],
      newOrder: {
        sendAmount: null,
        sendDenomination: 'sat',
        receiveAmount: null,
        receiveDenomination: 'usd',
      },
      isDenominationError: false,
      denominationErrorMessage: '',
      orders: [...mockOrders],
      isLoading: false,
      isCreatingOrder: false,
      
      // Take order dialog state
      takeOrderDialog: {
        show: false,
        order: null,
        processing: false,
        fromMint: '',
        toMint: '',
      },

      // Mock user balance (would come from wallet store in real app)
      currentBalance: 150000,
    };
  },

  computed: {
    isValidOrder() {
      return (
        this.newOrder.sendAmount > 0 &&
        this.newOrder.receiveAmount > 0 &&
        this.newOrder.sendDenomination !== this.newOrder.receiveDenomination &&
        !this.isDenominationError
      );
    },

    hasBalance() {
      if (!this.takeOrderDialog.order) return false;
      return this.currentBalance >= this.takeOrderDialog.order.sendAmount;
    }
  },

  methods: {
    checkDenominations() {
      if (this.newOrder.sendDenomination === this.newOrder.receiveDenomination) {
        this.isDenominationError = true;
        this.denominationErrorMessage = 'Cannot swap same denominations';
      } else {
        this.isDenominationError = false;
        this.denominationErrorMessage = '';
      }
    },

    async createOrder() {
      if (!this.isValidOrder) {
        notifyError('Invalid order');
        return;
      }

      this.isCreatingOrder = true;
      try {
        // Create new order with mock data
        const newOrder = {
          id: generateId(),
          sendAmount: this.newOrder.sendAmount,
          sendDenomination: this.newOrder.sendDenomination,
          receiveAmount: this.newOrder.receiveAmount,
          receiveDenomination: this.newOrder.receiveDenomination,
          created: new Date(),
          pubkey: '0x' + Math.random().toString(16).slice(2, 14)
        };

        // Add to start of orders array
        this.orders.unshift(newOrder);

        // Reset form
        this.newOrder = {
          sendAmount: null,
          sendDenomination: 'sat',
          receiveAmount: null,
          receiveDenomination: 'usd',
        };

        // Reset any errors
        this.checkDenominations();

        notifySuccess('Order created successfully');
      } catch (error) {
        console.error('Error creating order:', error);
        notifyError('Failed to create order');
      } finally {
        this.isCreatingOrder = false;
      }
    },

    showTakeOrderDialog(order) {
      this.takeOrderDialog.order = order;
      this.takeOrderDialog.fromMint = MOCK_MINTS[order.sendDenomination];
      this.takeOrderDialog.toMint = MOCK_MINTS[order.receiveDenomination];
      this.takeOrderDialog.show = true;
    },

    async processOrder() {
      if (!this.takeOrderDialog.order) return;

      this.takeOrderDialog.processing = true;
      try {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Remove the order from the list
        this.orders = this.orders.filter(o => o.id !== this.takeOrderDialog.order.id);
        
        notifySuccess('Order processed successfully');
        this.takeOrderDialog.show = false;
      } catch (error) {
        console.error('Error processing order:', error);
        notifyError('Failed to process order');
      } finally {
        this.takeOrderDialog.processing = false;
        this.takeOrderDialog.order = null;
      }
    },

    async refreshOrders() {
      this.isLoading = true;
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Reset orders to initial mock data
        this.orders = [...mockOrders];
        notifySuccess('Orders refreshed');
      } catch (error) {
        console.error('Error refreshing orders:', error);
        notifyError('Failed to refresh orders');
      } finally {
        this.isLoading = false;
      }
    },

    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      return date.toLocaleDateString();
    },

    shortPubkey(pubkey) {
      if (!pubkey) return '';
      return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
    },

    shortMint(mintUrl) {
      if (!mintUrl) return 'Unknown';
      try {
        const url = new URL(mintUrl);
        return `${url.hostname.split('.')[0]}...${url.pathname.slice(-4)}`;
      } catch {
        return 'Invalid URL';
      }
    },

    // Utility methods for handling balances and amounts
    formatAmount(amount, denomination) {
      if (denomination === 'sat') {
        return amount.toLocaleString();
      }
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  },

  created() {
    this.checkDenominations();
  },

  beforeUnmount() {
    // Clear any pending timers or cleanup
    if (this.takeOrderDialog.processing) {
      this.takeOrderDialog.processing = false;
    }
  }
});
</script>

<style scoped>
.q-dialog__inner--minimized > div {
  max-width: 600px;
}
</style>