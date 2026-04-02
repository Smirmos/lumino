'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { ArrowLeft, Power, X, Plus } from 'lucide-react';
import Link from 'next/link';

const settingsSchema = z.object({
  businessName: z.string().min(1, 'Required').max(100),
  services: z.string().min(1, 'Required').max(2000),
  pricing: z.string().max(1000).optional(),
  businessHours: z.string().min(1, 'Required').max(200),
  location: z.string().max(200).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  toneDescription: z.string().min(1, 'Required').max(500),
  languages: z.array(z.string()).min(1),
  fallbackMessage: z.string().max(500).optional(),
  escalationSla: z.string(),
  canBook: z.boolean(),
  bookingUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  escalationKeywords: z.array(z.string().max(50)).max(20).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsResponse extends SettingsFormData {
  isActive: boolean;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TONE_OPTIONS = [
  { value: 'Professional and precise', label: 'Formal' },
  { value: 'Friendly and professional', label: 'Friendly' },
  { value: 'Casual and conversational', label: 'Casual' },
];

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect (recommended)' },
  { value: 'he', label: 'Hebrew only' },
  { value: 'ru', label: 'Russian only' },
  { value: 'en', label: 'English only' },
];

const SLA_OPTIONS = ['1 hour', '2 hours', '4 hours', '24 hours'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''} ago`;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

export default function SettingsPage() {
  const { data, mutate } = useSWR<SettingsResponse>('/api/settings', fetcher);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      businessName: '',
      services: '',
      pricing: '',
      businessHours: '',
      location: '',
      website: '',
      toneDescription: 'Friendly and professional',
      languages: ['auto'],
      fallbackMessage: '',
      escalationSla: '24 hours',
      canBook: false,
      bookingUrl: '',
      escalationKeywords: [],
    },
  });

  // Load data into form when it arrives
  useEffect(() => {
    if (data) {
      reset({
        businessName: data.businessName,
        services: data.services,
        pricing: data.pricing ?? '',
        businessHours: data.businessHours,
        location: data.location ?? '',
        website: data.website ?? '',
        toneDescription: data.toneDescription,
        languages: data.languages,
        fallbackMessage: data.fallbackMessage ?? '',
        escalationSla: data.escalationSla,
        canBook: data.canBook,
        bookingUrl: data.bookingUrl ?? '',
        escalationKeywords: data.escalationKeywords ?? [],
      });
    }
  }, [data, reset]);

  const canBook = watch('canBook');
  const languages = watch('languages');
  const escalationKeywords = watch('escalationKeywords') ?? [];

  const toggleBot = async () => {
    if (!data) return;
    setToggling(true);
    mutate({ ...data, isActive: !data.isActive }, false);
    try {
      const res = await fetch('/api/settings/toggle', { method: 'POST' });
      const result = await res.json();
      mutate({ ...data, isActive: result.isActive });
    } catch {
      mutate(data);
    } finally {
      setToggling(false);
    }
  };

  const onSubmit = async (formData: SettingsFormData) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        mutate();
        addToast('Settings saved. Your bot will use the new configuration immediately.', 'success');
      }
    } catch {
      addToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const word = keywordInput.trim();
    if (!word || escalationKeywords.includes(word)) return;
    setValue('escalationKeywords', [...escalationKeywords, word], { shouldDirty: true });
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setValue('escalationKeywords', escalationKeywords.filter((k) => k !== kw), { shouldDirty: true });
  };

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
        <div className="space-y-6">
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Bot Settings</h1>
      </div>

      {/* Bot Active Toggle — prominent */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              data.isActive ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
            }`}>
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Bot is {data.isActive ? 'Active' : 'Paused'}
              </h2>
              <p className="text-sm text-gray-500">
                {data.isActive ? 'Your bot is live and responding' : 'Messages will not be answered'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleBot}
            disabled={toggling}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
              data.isActive
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-brand text-white hover:bg-brand-600'
            }`}
          >
            {toggling ? 'Updating...' : data.isActive ? 'Pause Bot' : 'Activate Bot'}
          </button>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1 — Business Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
          <div className="space-y-4">
            <div>
              <FieldLabel label="Business Name" required />
              <input {...register('businessName')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
              <FieldError message={errors.businessName?.message} />
            </div>
            <div>
              <FieldLabel label="Services" required />
              <textarea {...register('services')} rows={3} placeholder="List your services and prices, one per line" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
              <FieldError message={errors.services?.message} />
            </div>
            <div>
              <FieldLabel label="Pricing" />
              <textarea {...register('pricing')} rows={2} placeholder="If blank, bot will say 'contact us for pricing'" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
            <div>
              <FieldLabel label="Business Hours" required />
              <input {...register('businessHours')} placeholder="e.g. Sun-Thu 09:00-18:00, Fri 09:00-14:00" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
              <FieldError message={errors.businessHours?.message} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel label="Location" />
                <input {...register('location')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
              </div>
              <div>
                <FieldLabel label="Website" />
                <input {...register('website')} placeholder="https://" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                <FieldError message={errors.website?.message} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 — Language & Tone */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Language & Tone</h3>
          <div className="space-y-4">
            <div>
              <FieldLabel label="Language Mode" required />
              <div className="space-y-2">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={languages.length === 1 && languages[0] === opt.value}
                      onChange={() => setValue('languages', [opt.value], { shouldDirty: true })}
                      className="text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel label="Tone" required />
              <select
                {...register('toneDescription')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3 — Booking */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('canBook')}
                className="w-5 h-5 rounded text-brand focus:ring-brand"
              />
              <span className="text-sm text-gray-700">Enable booking link in bot responses</span>
            </label>
            {canBook && (
              <div>
                <FieldLabel label="Booking URL" />
                <input {...register('bookingUrl')} placeholder="https://cal.com/your-link" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                <FieldError message={errors.bookingUrl?.message} />
              </div>
            )}
          </div>
        </div>

        {/* Section 4 — Escalation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalation</h3>
          <div className="space-y-4">
            <div>
              <FieldLabel label="Escalation SLA" />
              <select
                {...register('escalationSla')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                {SLA_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel label="Fallback Message" />
              <textarea {...register('fallbackMessage')} rows={2} placeholder="Shown when the bot encounters an error" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
            <div>
              <FieldLabel label="Custom Escalation Keywords" />
              <p className="text-xs text-gray-400 mb-2">The bot will escalate when these words appear in a message</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                  placeholder="Type a keyword..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {escalationKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                  >
                    {kw}
                    <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <span className="text-xs text-gray-400">
            Last saved: {data.updatedAt ? timeAgo(data.updatedAt) : 'never'}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              disabled={!isDirty}
              className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="flex-1 sm:flex-initial px-6 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-600 disabled:opacity-30"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
