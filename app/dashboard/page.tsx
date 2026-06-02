'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface PriceConfig {
  base_price_3g: number;
  updated_at: string;
}

interface KnowledgeEntry {
  id: number;
  key: string;
  value: string;
  type: string;
  scope: string;
  source: string;
}

interface CapacityEntry {
  id: number;
  date: string;
  size_inch: number;
  grammage: number;
  planned_kg: number;
  booked_kg: number;
  available_kg: number;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'knowledge' | 'capacity'>('pricing');
  const [priceConfig, setPriceConfig] = useState<PriceConfig | null>(null);
  const [newBasePrice, setNewBasePrice] = useState('');
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [capacity, setCapacity] = useState<CapacityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Load pricing config
  const loadPricing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pricing/config');
      const data = await res.json();
      if (data.ok && data.config) {
        setPriceConfig(data.config);
        setNewBasePrice(data.config.base_price_3g?.toString() || '');
      } else {
        // No pricing config yet, set defaults
        setPriceConfig(null);
        setNewBasePrice('');
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
      setPriceConfig(null);
      setNewBasePrice('');
    }
    setLoading(false);
  };

  // Update base price
  const updateBasePrice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pricing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_price_3g: parseFloat(newBasePrice) })
      });
      const data = await res.json();
      setPriceConfig(data);
      alert('Base price updated successfully!');
    } catch (error) {
      console.error('Failed to update pricing:', error);
      alert('Failed to update base price');
    }
    setLoading(false);
  };

  // Load knowledge base
  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setKnowledge(data.entries || []);
    } catch (error) {
      console.error('Failed to load knowledge:', error);
    }
    setLoading(false);
  };

  // Load capacity
  const loadCapacity = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetch(`/api/capacity?start_date=${today}&end_date=${endDate}`);
      const data = await res.json();
      setCapacity(data.entries || []);
    } catch (error) {
      console.error('Failed to load capacity:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'pricing') loadPricing();
    if (activeTab === 'knowledge') loadKnowledge();
    if (activeTab === 'capacity') loadCapacity();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Anjani Sales OS - Owner Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'pricing'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pricing Config
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'knowledge'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('capacity')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'capacity'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Production Capacity
          </button>
        </div>

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Base Price Configuration</h2>
            {priceConfig && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Base Price (3.0g fabric) - INR/kg
                  </label>
                  <div className="text-2xl font-bold text-gray-900 mb-4">
                    ₹{priceConfig.base_price_3g}
                  </div>
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(priceConfig.updated_at).toLocaleString()}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Base Price
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      step="0.01"
                      value={newBasePrice}
                      onChange={(e) => setNewBasePrice(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter new base price"
                    />
                    <Button
                      onClick={updateBasePrice}
                      disabled={loading || !newBasePrice}
                      className="px-6"
                    >
                      {loading ? 'Updating...' : 'Update Price'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Knowledge Base Entries</h2>
            <div className="space-y-2">
              {knowledge.length === 0 ? (
                <p className="text-gray-500">No knowledge entries found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {knowledge.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.key}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{entry.value}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.type}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              entry.scope === 'customer_visible'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {entry.scope}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Capacity Tab */}
        {activeTab === 'capacity' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Production Capacity (Next 30 Days)</h2>
            <div className="space-y-2">
              {capacity.length === 0 ? (
                <p className="text-gray-500">No capacity data found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grammage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned (kg)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booked (kg)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {capacity.slice(0, 50).map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{entry.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{entry.size_inch}"</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{entry.grammage}g</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.planned_kg}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.booked_kg}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <span className={entry.available_kg > 0 ? 'text-green-600' : 'text-red-600'}>
                              {entry.available_kg}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
