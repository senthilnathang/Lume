<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label for="donor">Donor *</label>
              <select id="donor" v-model="form.donor_id" :disabled="mode === 'view'" required>
                <option value="">Select Donor</option>
                <option v-for="donor in donors" :key="donor.id" :value="donor.id">
                  {{ donor.name }} ({{ donor.email }})
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="campaign">Campaign</label>
              <select id="campaign" v-model="form.campaign_id" :disabled="mode === 'view'">
                <option value="">General Fund</option>
                <option v-for="campaign in campaigns" :key="campaign.id" :value="campaign.id">
                  {{ campaign.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="amount">Amount *</label>
              <div class="input-with-prefix">
                <span class="prefix">$</span>
                <input
                  id="amount"
                  v-model="form.amount"
                  type="number"
                  :disabled="mode === 'view'"
                  required
                  min="1"
                  step="0.01"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="date">Donation Date *</label>
              <input
                id="date"
                v-model="form.donation_date"
                type="date"
                :disabled="mode === 'view'"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="payment_method">Payment Method *</label>
              <select id="payment_method" v-model="form.payment_method" :disabled="mode === 'view'" required>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="online">Online Payment</option>
              </select>
            </div>
            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" v-model="form.status" :disabled="mode === 'view'">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea
              id="notes"
              v-model="form.notes"
              :disabled="mode === 'view'"
              rows="3"
              placeholder="Add any special instructions or notes..."
            ></textarea>
          </div>

          <div class="form-group" v-if="mode !== 'view'">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.send_receipt" />
              Send receipt to donor via email
            </label>
          </div>

          <div class="modal-footer" v-if="mode !== 'view'">
            <button type="button" class="btn-secondary" @click="$emit('close')">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : (isEdit ? 'Update Donation' : 'Record Donation') }}
            </button>
          </div>

          <div class="modal-footer" v-else>
            <button type="button" class="btn-secondary" @click="$emit('close')">
              Close
            </button>
            <button type="button" class="btn-primary" @click="editMode">
              Edit Donation
            </button>
            <button type="button" class="btn-secondary" @click="printReceipt">
              Print Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  donation: { type: Object, default: null },
  mode: { type: String, default: 'add' }
});

const emit = defineEmits(['close', 'save']);

const form = ref({
  donor_id: '',
  campaign_id: '',
  amount: '',
  donation_date: new Date().toISOString().split('T')[0],
  payment_method: 'online',
  status: 'completed',
  notes: '',
  send_receipt: true
});

const saving = ref(false);
const donors = ref([
  { id: 1, name: 'John Smith', email: 'john@example.com' },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com' }
]);
const campaigns = ref([
  { id: 1, name: 'Annual Fund 2024' },
  { id: 2, name: 'Building Fund' }
]);

const title = computed(() => {
  if (props.mode === 'view') return `Donation Details`;
  if (props.mode === 'edit') return 'Edit Donation';
  return 'Record New Donation';
});

const isEdit = computed(() => props.mode === 'edit');

watch(() => props.donation, (newDonation) => {
  if (newDonation) {
    form.value = {
      donor_id: newDonation.donor_id || '',
      campaign_id: newDonation.campaign_id || '',
      amount: newDonation.amount || '',
      donation_date: newDonation.donation_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      payment_method: newDonation.payment_method || 'online',
      status: newDonation.status || 'completed',
      notes: newDonation.notes || '',
      send_receipt: false
    };
  }
}, { immediate: true });

const editMode = () => {
  emit('save', { ...props.donation, _mode: 'edit' });
};

const printReceipt = () => {
  window.print();
};

const handleSubmit = async () => {
  saving.value = true;
  try {
    emit('save', { ...form.value });
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
  background: #f8fafc;
  color: #6b7280;
}

.input-with-prefix {
  display: flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.input-with-prefix:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.input-with-prefix .prefix {
  padding: 10px 12px;
  background: #f8fafc;
  color: #6b7280;
  border-right: 1px solid #e2e8f0;
}

.input-with-prefix input {
  border: none;
  flex: 1;
}

.input-with-prefix input:focus {
  box-shadow: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #4f46e5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4f46e5;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
