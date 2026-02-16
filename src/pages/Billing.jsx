import React from 'react';
import BillingUI from '../components/billing/BillingUI';
import AdminOnly from '../components/layout/AdminOnly';

export default function BillingManager() {
  return (
    <AdminOnly>
      <BillingUI />
    </AdminOnly>
  );
}