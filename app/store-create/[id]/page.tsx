'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Save, Eye, EyeOff } from 'lucide-react';
import NextLink from 'next/link';
import { toast } from 'sonner';
import { StoreData } from '@/lib/types';
import { createDefaultStore } from '@/lib/store-store';
import { saveStoreToSupabase, getStoreFromSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth-modal';
import { StoreEditor } from '@/components/store-editor';
import { StorePreview } from '@/components/store-preview';
import { cn } from '@/lib/utils';

// ─── Draft helpers ────────────────────────────────────────────────────────────
function getDraftKey(id: string) {
  return `orstar_store_draft_${id}`;
}

function saveDraft(id: string, store: StoreData) {
  try {
    localStorage.setItem(getDraftKey(id), JSON.stringify({ store, savedAt: Date.now() }));
  } catch {}
}

function loadDraft(id: string): StoreData | null {
  try {
    const raw = localStorage.getItem(getDraftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getDraftKey(id));
      return null;
    }
    return parsed.store as StoreData;
  } catch {
    return null;
  }
}

function clearDraft(id: string) {
  try {
    localStorage.removeItem(getDraftKey(id));
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

export default function StoreCreatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [store, setStore] = useState<StoreData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shortId, setShortId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const storeRef = useRef<StoreData | null>(null);
  storeRef.current = store;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setShowAuth(true);
      setIsLoading(false);
      return;
    }
    const init = async () => {
      const existing = await getStoreFromSupabase(id);
      const draft = loadDraft(id);

      if (existing) {
        setShortId((existing as { short_id?: string }).short_id || null);
        if (draft) {
          setStore(draft);
          setHasDraft(true);
        } else {
          setStore(existing as StoreData);
        }
      } else if (draft) {
        setStore(draft);
        setHasDraft(true);
      } else {
        const newStore = createDefaultStore();
        newStore.id = id;
        setStore(newStore);
      }
      setIsLoading(false);
    };
    init();
  }, [id, user, authLoading]);

  useEffect(() => {
    if (!store) return;
    const timer = setInterval(() => {
      if (storeRef.current) saveDraft(id, storeRef.current);
    }, 3000);
    return () => clearInterval(timer);
  }, [id, store]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && storeRef.current) {
        saveDraft(id, storeRef.current);
      }
    };
    const onUnload = () => {
      if (storeRef.current) saveDraft(id, storeRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [id]);

  const handleStoreChange = useCallback((updated: StoreData) => {
    setStore(updated);
    saveDraft(id, updated);
    setHasDraft(true);
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!store || !user) return;
    setSaving(true);
    try {
      const result = await saveStoreToSupabase(user.id, store.id, store);
      if (result.error) {
        toast.error('حدث خطأ أثناء حفظ المتجر');
      } else {
        setShortId(result.shortId);
        clearDraft(id);
        setHasDraft(false);
        toast.success('تم حفظ المتجر بنجاح ✓');
        setTimeout(() => router.push('/'), 600);
      }
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  }, [store, user, router, id]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <AuthModal
          isOpen={showAuth}
          onClose={() => router.push('/')}
          onSuccess={() => { setShowAuth(false); window.location.reload(); }}
          title="سجّل دخولك لإنشاء متجر"
        />
      </div>
    );
  }

  if (!store) return null;

  const floatingStyle: React.CSSProperties = {
    background: 'rgba(20,20,20,0.55)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Content */}
      <div className="flex h-screen">
        <div className={`flex-1 overflow-y-auto pb-24 ${showPreview ? 'hidden lg:block' : ''}`}>
          <div className="max-w-2xl mx-auto px-4 py-6">
            <StoreEditor store={store} onChange={handleStoreChange} />
          </div>
        </div>
        {showPreview && (
          <div className="flex-1 border-r border-border/60 overflow-hidden bg-muted/30">
            <div className="h-full overflow-y-auto">
              <StorePreview store={store} />
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      <nav
        className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center justify-around gap-1 rounded-full px-3 py-2"
        style={floatingStyle}
        dir="ltr"
      >
        {/* Save button — icon only, same style as other buttons */}
        <button
          onClick={handleSave}
          disabled={saving}
          aria-label={saving ? 'جاري الحفظ...' : 'حفظ'}
          className={cn(
            'flex size-12 items-center justify-center rounded-full transition-all duration-300 ease-out',
            'text-white/60 hover:bg-white/10 hover:text-white/90 hover:scale-105',
            saving && 'opacity-60'
          )}
        >
          {saving ? (
            <div className="size-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
        </button>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          aria-label="معاينة"
          className={cn(
            'flex size-12 items-center justify-center rounded-full transition-all duration-300 ease-out',
            showPreview
              ? 'bg-white/15 scale-105'
              : 'text-white/60 hover:bg-white/10 hover:text-white/90 hover:scale-105'
          )}
          style={showPreview ? { color: 'var(--theme-accent)', boxShadow: '0 0 16px -4px color-mix(in srgb, var(--theme-accent) 60%, transparent)' } : undefined}
        >
          {showPreview ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>

        {/* Back button */}
        <NextLink
          href="/"
          className="flex size-12 items-center justify-center rounded-full text-white/60 transition-all duration-300 ease-out hover:bg-white/10 hover:text-white/90 hover:scale-105"
          aria-label="رجوع"
        >
          <ArrowRight className="size-5" />
        </NextLink>
      </nav>
    </div>
  );
}
