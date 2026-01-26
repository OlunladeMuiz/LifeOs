'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import type { EnergyLevel, UpdateContextRequest } from '@/lib/api-types';

// Energy level options matching Figma design
const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'LOW', label: 'Low - Need easy wins' },
  { value: 'MEDIUM', label: 'Medium - Balanced capacity' },
  { value: 'HIGH', label: 'High - Ready for challenges' },
];

export default function ContextPage() {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('MEDIUM');
  const [availableMinutes, setAvailableMinutes] = useState<number | ''>('');
  const [stressLevel, setStressLevel] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await apiClient.getContextToday();
      if (res.ok && res.data) {
        setDate(res.data.date);
        if (res.data.energyLevel) setEnergyLevel(res.data.energyLevel);
        if (res.data.availableMinutes !== null && res.data.availableMinutes !== undefined) {
          setAvailableMinutes(res.data.availableMinutes);
        }
        setStressLevel(res.data.stressLevel ?? '');
      } else {
        setError(res.message || 'Could not load today\'s context.');
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    
    const payload: UpdateContextRequest = {
      date: date || new Date().toISOString().split('T')[0],
      energyLevel,
      availableMinutes: typeof availableMinutes === 'number' ? availableMinutes : 0,
      stressLevel: stressLevel === '' ? undefined : stressLevel,
    };
    
    const res = await apiClient.updateContext(payload);
    if (res.ok) {
      setMessage('Context saved for today.');
      setTimeout(() => setMessage(null), 3000);
    } else {
      setError(res.message || 'Could not save context.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Context Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Daily Context</h1>
          <p className="text-sm text-gray-500">Tell LifeOS your capacity so it can choose a sensible next task.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Available Minutes */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Available minutes
              </label>
              <input
                type="number"
                min={0}
                value={availableMinutes}
                onChange={(e) => setAvailableMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 120"
                required
              />
              <p className="mt-1.5 text-xs text-gray-500">
                The decision engine won’t recommend tasks that don’t fit.
              </p>
            </div>

            {/* Energy Level */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Energy Level
              </label>
              <select
                value={energyLevel}
                onChange={(e) => setEnergyLevel(e.target.value as EnergyLevel)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {ENERGY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                High-effort tasks are deprioritized when energy is low
              </p>
            </div>

            {/* Stress (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Stress (optional)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={stressLevel}
                onChange={(e) => setStressLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0–10"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                When stress is high, shorter tasks can be a better fit.
              </p>
            </div>

            {/* Success Message */}
            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{message}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save context'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
