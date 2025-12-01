import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TransactionHistory({ transactions }) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-12 text-center text-gray-400 shadow-sm">
        No transactions recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#F4F4F6] text-xs uppercase text-gray-500 font-bold tracking-wider">
            <tr>
              <th className="p-6">Date</th>
              <th className="p-6">Description</th>
              <th className="p-6">Method</th>
              <th className="p-6">Amount</th>
              <th className="p-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-6 text-sm text-gray-500">
                  {format(new Date(t.date), 'MMM d, yyyy')}
                  <div className="text-xs text-gray-400">{format(new Date(t.date), 'h:mm a')}</div>
                </td>
                <td className="p-6">
                  <div className="font-medium text-[#333333]">{t.type === 'payment' ? 'Payment Received' : 'Refund Issued'}</div>
                  <div className="text-xs text-gray-400">{t.parent_email}</div>
                </td>
                <td className="p-6 capitalize text-sm text-gray-600">
                  {t.method.replace('_', ' ')}
                </td>
                <td className="p-6">
                   <div className={`flex items-center gap-1 font-serif font-medium ${t.type === 'payment' ? 'text-green-600' : 'text-[#333333]'}`}>
                      {t.type === 'payment' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      ${t.amount.toFixed(2)}
                   </div>
                </td>
                <td className="p-6">
                   <span className={`text-xs font-bold uppercase tracking-wider ${t.status === 'succeeded' ? 'text-green-500' : 'text-red-400'}`}>
                      {t.status}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}