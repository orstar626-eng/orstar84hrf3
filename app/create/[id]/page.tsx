'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Save } from 'lucide-react';
import { ProfileEditor } from '@/components/profile-editor';
import { ProfilePreview } from '@/components/profile-preview';
import { ProfileData } from '@/lib/types';
import { createDefaultProfile } from '@/lib/profile-store';
import { saveProfileToSupabase, getProfileFromSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/auth-modal';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Draft helpers ────────────────────────────────────────────────────────────
function getDraftKey(id: string) {
  return `orstar_profile_draft_${id}`;
}

function saveDraft(id: string, profile: ProfileData) {
  try {
    localStorage.setItem(getDraftKey(id), JSON.stringify({ profile, savedAt: Date.now() }));
  } catch {}
}

function loadDraft(id: string): ProfileData | null {
  try {
    const raw = localStorage.getItem(getDraftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getDraftKey(id));
      return null;
    }
    return parsed.profile as ProfileData;
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

export default function CreatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveAnim, setSaveAnim] = useState(false);
  const [shortId, setShortId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const router = useRouter();

  const profileRef = useRef<ProfileData | null>(null);
  profileRef.current = profile;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setShowAuth(true);
      setIsLoading(false);
      return;
    }
    const init = async () => {
      const existing = await getProfileFromSupabase(id);
      const draft = loadDraft(id);

      if (existing) {
        setShortId((existing as { short_id?: string }).short_id || null);
        if (draft) {
          setProfile(draft);
          setHasDraft(true);
        } else {
          setProfile(existing as ProfileData);
        }
      } else if (draft) {
        setProfile(draft);
        setHasDraft(true);
      } else {
        const p = createDefaultProfile();
        p.id = id;
        setProfile(p);
      }
      setIsLoading(false);
    };
    init();
  }, [id, user, authLoading]);

  useEffect(() => {
    if (!profile) return;
    const timer = setInterval(() => {
      if (profileRef.current) saveDraft(id, profileRef.current);
    }, 3000);
    return () => clearInterval(timer);
  }, [id, profile]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && profileRef.current) {
        saveDraft(id, profileRef.current);
      }
    };
    const onUnload = () => {
      if (profileRef.current) saveDraft(id, profileRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [id]);

  const handleProfileChange = useCallback((updated: ProfileData) => {
    setProfile(updated);
    saveDraft(id, updated);
    setHasDraft(true);
  }, [id]);

  const handleSave = async () => {
    if (!profile || !user) return;
    setIsSaving(true);
    try {
      const result = await saveProfileToSupabase(user.id, profile.id, profile);
      if (result.error) {
        toast.error('حدث خطأ أثناء الحفظ');
      } else {
        setSaveAnim(true);
        setShortId(result.shortId);
        clearDraft(id);
        setHasDraft(false);
        toast.success('تم حفظ التغييرات بنجاح ✓');
        setTimeout(() => setSaveAnim(false), 1500);
        setTimeout(() => router.push('/'), 600);
      }
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-ios-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-border border-t-foreground animate-spin" />
          </div>
          <span className="text-muted-foreground text-sm font-medium">جاري التحميل...</span>
        </div>
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
          title="سجّل دخولك لإنشاء صفحة"
        />
      </div>
    );
  }

  if (!profile) return null;

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
        <div className={cn('flex-1 overflow-y-auto pb-24', showPreview && 'hidden lg:block')}>
          <div className="max-w-2xl mx-auto px-4 py-6">
            <ProfileEditor profile={profile} onChange={handleProfileChange} />
          </div>
        </div>
        {showPreview && (
          <div className="flex-1 border-r border-border/60 overflow-hidden bg-muted/30">
            <div className="h-full overflow-y-auto">
              <ProfilePreview profile={profile} isPreview={true} />
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
          disabled={isSaving}
          aria-label={isSaving ? 'جاري الحفظ...' : 'حفظ'}
          className={cn(
            'flex size-12 items-center justify-center rounded-full transition-all duration-300 ease-out',
            saveAnim
              ? 'bg-emerald-500 text-white scale-105'
              : 'text-white/60 hover:bg-white/10 hover:text-white/90 hover:scale-105',
            isSaving && 'opacity-60'
          )}
        >
          {isSaving ? (
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
        <Link
          href="/"
          className="flex size-12 items-center justify-center rounded-full text-white/60 transition-all duration-300 ease-out hover:bg-white/10 hover:text-white/90 hover:scale-105"
          aria-label="رجوع"
        >
          <ArrowRight className="size-5" />
        </Link>
      </nav>
    </div>
  );
}
