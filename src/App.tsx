/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, 
  TrendingUp, 
  MessageSquare, 
  Zap, 
  Search, 
  Layout, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  BarChart3,
  Users,
  Target,
  PenTool,
  Youtube,
  Video,
  Lightbulb,
  Rocket,
  Quote,
  Settings,
  Type as TypeIcon,
  Anchor,
  Copy,
  Music,
  ShieldAlert,
  Hash,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  X,
  Volume2,
  MessageCircle,
  Play,
  HelpCircle,
  Mail,
  ChevronDown,
  Star,
  Globe,
  Trophy
} from 'lucide-react';
import { cn } from './lib/utils';
import { analyzeProfile, generateCaptions, generateCreatorIdeas, generateThumbnail, generateEngagementReplies, generateSpeech, optimizeTitles, generateHooks } from './services/gemini';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// --- Types ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};
interface Strategy {
  bioTips: string[];
  contentPillars: string[];
  engagementStrategy: string;
  hashtags: string[];
}

interface CreatorIdeas {
  trends: { title: string; insight: string }[];
  sprint: {
    day: number;
    concept: string;
    title: string;
    hook: string;
    outline: { hook: string; value: string; cta: string };
    thumbnail: string;
    audio: string;
    algoHack: string;
    keywords: string[];
  }[];
  growthAdvice: string;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  category?: string;
  createdAt: any;
  likes: number;
  replies?: { userId: string; userName: string; content: string; createdAt: any }[];
}

// --- Components ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.error.includes('insufficient permissions')) {
          displayMessage = "You don't have permission to perform this action. Please check your account status.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-8">
          <div className="max-w-md w-full border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-black uppercase mb-4 italic">System Error</h2>
            <p className="font-bold mb-6">{displayMessage}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' }) => {
  const variants = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    secondary: 'bg-emerald-500 text-white hover:bg-emerald-600',
    outline: 'border-2 border-black text-black hover:bg-black hover:text-white'
  };
  
  return (
    <button 
      className={cn(
        'px-6 py-3 font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, title, icon: Icon, badge, id, onClick }: { children: React.ReactNode, className?: string, title?: string, icon?: any, badge?: string, id?: string, onClick?: () => void }) => (
  <div id={id} onClick={onClick} className={cn(
    'bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative transition-colors',
    onClick && 'cursor-pointer hover:translate-y-[-2px] transition-transform',
    className
  )}>
    {badge && (
      <div className="absolute -top-3 -right-3 bg-yellow-300 border-2 border-black px-2 py-1 text-[8px] font-black uppercase tracking-tighter z-20">
        {badge}
      </div>
    )}
    {title && (
      <h3 className="font-black text-xl mb-4 border-b-2 border-black pb-2 uppercase italic flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        {title}
      </h3>
    )}
    {children}
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [step, setStep] = useState<'landing' | 'onboarding' | 'dashboard' | 'pricing' | 'brand-profile' | 'community' | 'profile-dashboard'>('landing');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('Win');
  const [communityFilter, setCommunityFilter] = useState('All');
  const [communitySearch, setCommunitySearch] = useState('');
  const [profile, setProfile] = useState({ 
    niche: '', 
    bio: '', 
    goals: '', 
    platform: 'TikTok',
    brandVoice: 'Witty & Bold',
    targetAudience: 'Gen Z Creators',
    isPro: false
  });
  const [savedSprints, setSavedSprints] = useState<any[]>([]);
  const [creatorIdeas, setCreatorIdeas] = useState<CreatorIdeas | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [captionTopic, setCaptionTopic] = useState('');
  const [activeDay, setActiveDay] = useState(1);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [generatingThumbnail, setGeneratingThumbnail] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [engagementComment, setEngagementComment] = useState('');
  const [engagementReplies, setEngagementReplies] = useState<string[]>([]);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const [optimizedTitles, setOptimizedTitles] = useState<{type: string, title: string}[]>([]);
  const [titleToOptimize, setTitleToOptimize] = useState('');
  const [hooks, setHooks] = useState<{type: string, hook: string}[]>([]);
  const [hookContext, setHookContext] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'billing' | 'api' | 'security'>('overview');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && isAuthReady) {
      const fetchProfile = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(prev => ({ ...prev, ...data }));

            // Sync to public profiles for community features
            await setDoc(doc(db, 'public_profiles', user.uid), {
              uid: user.uid,
              displayName: data.displayName || user.displayName,
              photoURL: data.photoURL || user.photoURL,
              niche: data.niche,
              platform: data.platform,
              brandVoice: data.brandVoice,
              isPro: data.isPro || false,
              stats: data.stats || { totalSprints: 0, communityPosts: 0, totalLikes: 0 }
            }, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      };

      const q = query(collection(db, 'sprints'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sprints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedSprints(sprints);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sprints');
      });

      fetchProfile();

      // Community listener
      const communityQuery = query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribeCommunity = onSnapshot(communityQuery, (snapshot) => {
        const communityPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        setPosts(communityPosts);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'community');
      });

      return () => {
        unsubscribe();
        unsubscribeCommunity();
      };
    }
  }, [user, isAuthReady]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        return; // Ignore user-initiated cancellation
      }
      console.error('Login Error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStep('landing');
      setCreatorIdeas(null);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const saveSprintToFirebase = async (ideas: CreatorIdeas) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'sprints'), {
        userId: user.uid,
        niche: profile.niche,
        platform: profile.platform,
        trends: ideas.trends,
        sprint: ideas.sprint,
        growthAdvice: ideas.growthAdvice,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sprints');
    }
  };

  const saveProfileToFirebase = async (updatedProfile: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        ...updatedProfile,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    let interval: any;
    if (autoScroll && teleprompterOpen) {
      interval = setInterval(() => {
        const el = document.getElementById('teleprompter-content');
        if (el) el.scrollTop += 1;
      }, 30);
    }
    return () => clearInterval(interval);
  }, [autoScroll, teleprompterOpen]);

  useEffect(() => {
    if (copyFeedback) {
      const timer = setTimeout(() => setCopyFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyFeedback]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`${label} copied!`);
  };

  const handleApiError = (error: any) => {
    console.error('API Error:', error);
    if (error.message?.includes('RESOURCE_EXHAUSTED') || error.status === 'RESOURCE_EXHAUSTED' || error.error?.code === 429) {
      alert("Gemini API quota exceeded. Please try again in a few minutes.");
    } else {
      alert("An error occurred. Please try again.");
    }
  };

  const handleGenerateThumbnail = async (day: number, description: string) => {
    setGeneratingThumbnail(day);
    try {
      const imageUrl = await generateThumbnail(description);
      if (imageUrl) {
        setThumbnails(prev => ({ ...prev, [day]: imageUrl }));
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setGeneratingThumbnail(null);
    }
  };

  const handleGenerateReplies = async () => {
    if (!engagementComment) return;
    setLoading(true);
    try {
      const data = await generateEngagementReplies(engagementComment, 'witty and engaging');
      setEngagementReplies(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (day: number, text: string) => {
    setPlayingAudio(day);
    try {
      const audioUrl = await generateSpeech(text);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => setPlayingAudio(null);
      } else {
        setPlayingAudio(null);
      }
    } catch (error) {
      console.error(error);
      setPlayingAudio(null);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'community'), {
        userId: user.uid,
        userName: user.displayName || user.email,
        userPhoto: user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`,
        content: newPostContent,
        category: newPostCategory,
        createdAt: serverTimestamp(),
        likes: 0,
        replies: []
      });
      setNewPostContent('');
      setNewPostCategory('Win');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'community');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'community', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists() && postSnap.data().userId === user.uid) {
        await deleteDoc(postRef);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `community/${postId}`);
    }
  };

  const handleAddReply = async (postId: string, replyContent: string) => {
    if (!user || !replyContent.trim()) return;
    try {
      const postRef = doc(db, 'community', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const currentReplies = postSnap.data().replies || [];
        await setDoc(postRef, {
          replies: [...currentReplies, {
            userId: user.uid,
            userName: user.displayName || user.email,
            content: replyContent,
            createdAt: new Date()
          }]
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `community/${postId}`);
    }
  };

  const handleLikePost = async (postId: string, currentLikes: number) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'community', postId), {
        likes: (currentLikes || 0) + 1
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `community/${postId}`);
    }
  };

  const extractHashtags = (text: string) => {
    const hashtags = text.match(/#[a-z0-9_]+/gi);
    return hashtags ? Array.from(new Set(hashtags)) : [];
  };

  const getTrendingHashtags = () => {
    const counts: Record<string, number> = {};
    posts.forEach(post => {
      const tags = extractHashtags(post.content);
      tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const handleViewCreator = async (userId: string) => {
    try {
      const docRef = doc(db, 'public_profiles', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedCreator(docSnap.data());
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error("Error fetching creator profile:", error);
    }
  };

  const STRIPE_PRO_LINK = "https://buy.stripe.com/test_dRm28sahrcb30BC1MleAg00";

  const renderContentWithHashtags = (text: string) => {
    const parts = text.split(/(#[a-z0-9_]+)/gi);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return <span key={i} className="text-emerald-600 font-bold cursor-pointer hover:underline" onClick={() => setCommunitySearch(part)}>{part}</span>;
      }
      return part;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Win': return <Trophy className="w-3 h-3" />;
      case 'Feedback': return <MessageSquare className="w-3 h-3" />;
      case 'Question': return <HelpCircle className="w-3 h-3" />;
      case 'Collaboration': return <Users className="w-3 h-3" />;
      case 'Strategy': return <Target className="w-3 h-3" />;
      default: return <Hash className="w-3 h-3" />;
    }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const [strategyData, ideasData] = await Promise.all([
        analyzeProfile(profile.bio, profile.niche, profile.goals),
        generateCreatorIdeas(profile.niche, profile.platform, profile.goals)
      ]);
      setCreatorIdeas(ideasData);
      setStep('dashboard');
      if (user) {
        await saveProfileToFirebase(profile);
        await saveSprintToFirebase(ideasData);
      }
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCaptions = async () => {
    if (!captionTopic) return;
    setLoading(true);
    try {
      const data = await generateCaptions(captionTopic, 'engaging and punchy');
      setCaptions(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeTitle = async () => {
    if (!titleToOptimize) return;
    setLoading(true);
    try {
      const data = await optimizeTitles(titleToOptimize, profile.platform);
      setOptimizedTitles(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHooks = async () => {
    if (!hookContext) return;
    setLoading(true);
    try {
      const data = await generateHooks(hookContext, profile.platform);
      setHooks(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case 'YouTube': return <Youtube className="w-5 h-5" />;
      case 'TikTok': return <Video className="w-5 h-5" />;
      case 'Instagram': return <Instagram className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <ErrorBoundary>
      <div className={cn(
        "min-h-screen font-sans transition-colors duration-300 selection:bg-emerald-300 bg-[#F0F0F0] text-black"
      )}>
      {/* Header */}
      <nav className={cn(
        "border-b-4 border-black p-4 sticky top-0 z-50 transition-colors bg-white"
      )}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('landing')}>
            <div className="bg-black p-2 rounded-sm">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">CreatorFlow Pro</span>
          </div>
          <div className="hidden md:flex gap-8 font-bold uppercase text-sm tracking-widest">
            <button onClick={() => setStep('landing')} className="hover:underline underline-offset-4">Home</button>
            <button onClick={() => setStep('community')} className="hover:underline underline-offset-4">Community</button>
            <button onClick={() => setStep('pricing')} className="hover:underline underline-offset-4">Pricing</button>
            <button onClick={() => setStep('onboarding')} className="hover:underline underline-offset-4">Sprint</button>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep('profile-dashboard')}
                  className="hidden sm:block text-right hover:opacity-70 transition-opacity"
                >
                  <div className="text-[10px] font-black uppercase opacity-40">Creator</div>
                  <div className="text-xs font-bold">{user.displayName || user.email}</div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 border-2 border-black hover:bg-zinc-100 transition-colors"
                  title="Logout"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Button variant="outline" className="py-2 text-xs" onClick={handleLogin}>
                Login
              </Button>
            )}
            <AnimatePresence>
              {copyFeedback && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {copyFeedback}
                </motion.div>
              )}
            </AnimatePresence>
            {user && (
              <Button variant="outline" className="p-2" onClick={() => setStep('brand-profile')}>
                <Settings className="w-5 h-5" />
              </Button>
            )}
            <Button variant="outline" className="hidden sm:block py-2 text-xs" onClick={() => setStep('onboarding')}>
              New Strategy
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-24 pb-24"
            >
              {/* Hero Section */}
              <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh] relative">
                <div className="absolute top-0 left-0 w-full h-full -z-20 overflow-hidden pointer-events-none">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 90, 0],
                      x: [0, 100, 0],
                      y: [0, 50, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl"
                  />
                  <motion.div 
                    animate={{ 
                      scale: [1.2, 1, 1.2],
                      rotate: [90, 0, 90],
                      x: [0, -100, 0],
                      y: [0, -50, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-24 -right-24 w-96 h-96 bg-yellow-100/30 rounded-full blur-3xl"
                  />
                </div>
                <div className="space-y-8">
                  <div className="inline-block bg-yellow-300 border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    The #1 AI Tool for Creators
                  </div>
                  <h1 className="text-6xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase italic">
                    The Content <br />
                    <span className="text-emerald-500">Operating System.</span>
                  </h1>
                  <p className="text-xl font-medium max-w-lg leading-relaxed opacity-80">
                    Stop guessing. Start growing. <b>CreatorFlow Pro</b> is the all-in-one AI engine that turns trends into viral content in seconds.
                  </p>
                  <div className="flex flex-wrap gap-6 pt-6">
                    <motion.div
                      whileHover={{ scale: 1.05, rotate: -1 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-emerald-500 translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform -z-10 border-2 border-black" />
                      <Button 
                        onClick={() => user ? setStep('onboarding') : handleLogin()} 
                        className="text-xl px-10 py-6 bg-black text-white border-2 border-black shadow-none relative z-10"
                      >
                        {user ? 'Launch 7-Day Sprint' : 'Login to Start'} <ArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05, rotate: 1 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-yellow-400 translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform -z-10 border-2 border-black" />
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(STRIPE_PRO_LINK, '_blank')} 
                        className="text-xl px-10 py-6 bg-white hover:bg-white hover:text-black border-2 border-black shadow-none relative z-10"
                      >
                        Go Pro Now <Zap className="w-6 h-6 ml-2 text-yellow-500 group-hover:scale-125 transition-transform" />
                      </Button>
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-4 pt-4 opacity-50">
                    <div className="flex -space-x-2">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-zinc-200 overflow-hidden">
                          <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="user" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Joined by 10,000+ creators</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50 -z-10"></div>
                  <Card className="rotate-2 bg-emerald-50 relative z-10 p-8" badge="LIVE TRENDS">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-black rounded-full overflow-hidden border-4 border-black flex items-center justify-center">
                        <BarChart3 className="text-white w-8 h-8" />
                      </div>
                      <div>
                        <div className="font-black text-xl">Trend Radar</div>
                        <div className="text-sm font-bold opacity-60 uppercase tracking-widest">Scanning {profile.platform}...</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        { tag: '#AI_AUTOMATION', growth: '+420%', color: 'text-emerald-600' },
                        { tag: '#CONTENT_STRATEGY', growth: '+180%', color: 'text-emerald-600' },
                        { tag: '#CREATOR_ECONOMY', growth: '+95%', color: 'text-blue-600' }
                      ].map((t, i) => (
                        <motion.div 
                          key={t.tag}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-4 bg-white border-2 border-black font-bold text-sm flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <span>{t.tag}</span>
                          <span className={cn("font-black", t.color)}>{t.growth}</span>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                  <motion.div 
                    animate={{ rotate: [-12, -8, -12] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-300 border-4 border-black z-20 flex items-center justify-center font-black text-center leading-none uppercase text-xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                  >
                    7-Day <br /> Sprint <br /> <span className="text-[10px] mt-2 block">Guaranteed Growth</span>
                  </motion.div>
                </div>
              </div>

              {/* Social Proof / Logos */}
              <div className="border-y-4 border-black py-12 overflow-hidden bg-white">
                <div className="flex items-center gap-12 animate-marquee whitespace-nowrap">
                  {[
                    { name: 'CREATOR_LAB', icon: Sparkles },
                    { name: 'VIRAL_STUDIO', icon: Zap },
                    { name: 'ALGO_HACKERS', icon: Target },
                    { name: 'CONTENT_OS', icon: Layout },
                    { name: 'SCALE_UP', icon: TrendingUp },
                    { name: 'INFLUENCE_PRO', icon: Users }
                  ].map((brand, i) => (
                    <div key={i} className="flex items-center gap-4 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default group">
                      <brand.icon className="w-8 h-8 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-2xl font-black uppercase italic tracking-tighter">{brand.name}</span>
                    </div>
                  ))}
                  {/* Duplicate for seamless loop */}
                  {[
                    { name: 'CREATOR_LAB', icon: Sparkles },
                    { name: 'VIRAL_STUDIO', icon: Zap },
                    { name: 'ALGO_HACKERS', icon: Target },
                    { name: 'CONTENT_OS', icon: Layout },
                    { name: 'SCALE_UP', icon: TrendingUp },
                    { name: 'INFLUENCE_PRO', icon: Users }
                  ].map((brand, i) => (
                    <div key={`dup-${i}`} className="flex items-center gap-4 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default group">
                      <brand.icon className="w-8 h-8 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-2xl font-black uppercase italic tracking-tighter">{brand.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* The Strategy */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-16"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">The Strategy.</h2>
                  <p className="text-lg font-bold opacity-60">Engineered for viral growth, not just content creation.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-12 relative">
                  <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-black/5 -translate-y-1/2 -z-10"></div>
                  {[
                    { step: '01', title: 'Grounding', desc: 'We scan Google Search trends to find what people are actually looking for in your niche.', icon: Globe, color: 'bg-blue-500' },
                    { step: '02', title: 'Architecting', desc: 'Our AI builds a 7-day sprint with high-retention scripts and scroll-stopping thumbnails.', icon: PenTool, color: 'bg-yellow-400' },
                    { step: '03', title: 'Scaling', desc: 'Execute the sprint, engage with fans via AI replies, and watch your metrics skyrocket.', icon: TrendingUp, color: 'bg-emerald-500' }
                  ].map((s, i) => (
                    <div key={s.step} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                      <div className={cn("w-16 h-16 flex items-center justify-center text-white border-4 border-black mb-6", s.color)}>
                        <s.icon className="w-8 h-8" />
                      </div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-30 mb-2">Phase {s.step}</div>
                      <h3 className="text-2xl font-black uppercase italic mb-4">{s.title}</h3>
                      <p className="font-medium opacity-70 leading-relaxed text-sm">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Features Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-16"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">The Toolkit.</h2>
                  <p className="text-lg font-bold opacity-60">Everything you need to scale without the burnout.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  <Card title="Trend Radar" icon={TrendingUp} className="md:col-span-2 bg-white">
                    <div className="grid sm:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <p className="text-sm font-medium opacity-70 leading-relaxed">
                          We don't just guess what's trending. We use real-time Google Search grounding to find exactly what your audience is searching for <b>right now</b>.
                        </p>
                        <ul className="space-y-2 text-xs font-bold uppercase tracking-widest">
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Live Search Grounding</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Niche-Specific Insights</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Competitor Analysis</li>
                        </ul>
                      </div>
                      <div className="bg-zinc-100 border-2 border-black p-4 space-y-2">
                        <div className="h-2 w-3/4 bg-black/10 rounded-full"></div>
                        <div className="h-2 w-1/2 bg-black/10 rounded-full"></div>
                        <div className="h-8 w-full bg-emerald-500/20 border border-emerald-500/30 rounded-sm"></div>
                      </div>
                    </div>
                  </Card>
                  <Card title="Script Architect" icon={PenTool} className="bg-yellow-50">
                    <p className="text-sm font-medium opacity-70 leading-relaxed">
                      Full breakdowns of hook, value, and CTA for every single video idea. Optimized for high retention.
                    </p>
                  </Card>
                  <Card title="Thumbnail Vision" icon={Layout} className="bg-blue-50">
                    <p className="text-sm font-medium opacity-70 leading-relaxed">
                      Visual descriptions and AI-generated previews for high-CTR thumbnails that stop the scroll.
                    </p>
                  </Card>
                  <Card title="Engagement Engine" icon={MessageSquare} className="md:col-span-2 bg-emerald-50">
                    <div className="grid sm:grid-cols-2 gap-8 items-center">
                      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="text-[10px] font-black uppercase opacity-40 mb-2">Incoming Comment</div>
                        <div className="text-xs font-bold italic">"How do I start with AI?"</div>
                        <div className="mt-4 pt-4 border-t-2 border-black/5">
                          <div className="text-[10px] font-black uppercase text-emerald-600 mb-2">AI Reply</div>
                          <div className="text-xs font-bold">"Start by defining your niche! Check my latest sprint..."</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-sm font-medium opacity-70 leading-relaxed">
                          Never leave a fan hanging. Generate witty, brand-aligned replies to comments in one click.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>

              {/* Testimonial */}
              <div className="bg-black text-white p-12 md:p-24 relative overflow-hidden">
                <Quote className="absolute top-12 left-12 w-24 h-24 opacity-10" />
                <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
                  <h3 className="text-3xl md:text-5xl font-black italic leading-tight">
                    "CreatorFlow Pro took me from 0 to 50k followers in 3 months. The 7-day sprints are a cheat code for growth."
                  </h3>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden">
                      <img src="https://picsum.photos/seed/creator/100/100" alt="creator" referrerPolicy="no-referrer" />
                    </div>
                    <div className="font-black uppercase tracking-widest text-sm">Alex Rivera</div>
                    <div className="text-xs font-bold opacity-60 uppercase">Tech Creator @rivera_tech</div>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-16"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">Common Questions.</h2>
                  <p className="text-lg font-bold opacity-60">Everything you need to know before you scale.</p>
                </div>
                <div className="max-w-3xl mx-auto space-y-6">
                  {[
                    { q: "How does the AI find trends?", a: "We use Google Search grounding to scan real-time search data. This ensures your content is based on what people are actually looking for, not just old data." },
                    { q: "Is this only for TikTok?", a: "No! CreatorFlow Pro is optimized for TikTok, YouTube Shorts, and Instagram Reels. We tailor the strategy to each platform's unique algorithm." },
                    { q: "Can I cancel my Pro subscription?", a: "Absolutely. You can manage your subscription directly from your dashboard. No hidden fees, no brutal contracts." },
                    { q: "Do I own the content generated?", a: "100%. All scripts, hooks, and ideas generated are yours to use, modify, and monetize however you see fit." }
                  ].map((faq, i) => (
                    <Card key={i} className="bg-white">
                      <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer list-none">
                          <span className="text-lg font-black uppercase italic tracking-tight">{faq.q}</span>
                          <ChevronDown className="w-6 h-6 group-open:rotate-180 transition-transform" />
                        </summary>
                        <p className="mt-4 font-medium opacity-70 leading-relaxed border-t-2 border-black/5 pt-4">
                          {faq.a}
                        </p>
                      </details>
                    </Card>
                  ))}
                </div>
              </motion.div>

              {/* Contact Section */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-emerald-50 border-4 border-black p-12 md:p-24 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">Ready to <br /> <span className="text-emerald-600">Level Up?</span></h2>
                    <p className="text-lg font-bold opacity-60">Have questions or need a custom agency plan? Our team of growth experts is ready to help you dominate the feed.</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black"><Mail className="w-5 h-5" /></div>
                        <span className="font-black uppercase italic">support@creatorflow.pro</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black"><MessageSquare className="w-5 h-5" /></div>
                        <span className="font-black uppercase italic">Live Chat (Pro Only)</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border-4 border-black p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="space-y-4">
                      <input placeholder="Your Name" className="w-full p-4 border-2 border-black font-bold outline-none focus:bg-emerald-50" />
                      <input placeholder="Email Address" className="w-full p-4 border-2 border-black font-bold outline-none focus:bg-emerald-50" />
                      <textarea placeholder="How can we help you grow?" className="w-full p-4 border-2 border-black font-bold outline-none focus:bg-emerald-50 min-h-[120px]" />
                    </div>
                    <Button className="w-full py-4 text-xl">Send Message</Button>
                  </div>
                </div>
              </motion.div>

              {/* Community Preview */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-16"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">The Network.</h2>
                  <p className="text-lg font-bold opacity-60">You're not just buying a tool. You're joining a movement.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    <h3 className="text-3xl font-black uppercase italic leading-tight">
                      Connect with 10,000+ <br />
                      <span className="text-emerald-500">Elite Creators.</span>
                    </h3>
                    <p className="font-medium opacity-70 leading-relaxed">
                      Share your viral wins, get feedback on your hooks, and collaborate with the world's most ambitious creators in our exclusive community feed.
                    </p>
                    <ul className="space-y-4">
                      {[
                        { text: "Daily Growth Challenges", icon: Target },
                        { text: "Viral Hook Database", icon: Anchor },
                        { text: "Creator Networking", icon: Users }
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-4 font-black uppercase text-sm tracking-widest">
                          <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]">
                            <item.icon className="w-5 h-5" />
                          </div>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                    <Button onClick={() => setStep('community')} variant="outline" className="px-8 py-4">
                      Explore Community
                    </Button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/10 blur-3xl -z-10 rotate-12"></div>
                    <div className="space-y-4">
                      {[
                        { name: "Sarah J.", content: "Just hit 1M views using the Day 3 strategy! 🚀", likes: 142 },
                        { name: "Mike D.", content: "The Hook Lab is a game changer. My retention is up 40%.", likes: 89 }
                      ].map((post, i) => (
                        <Card key={i} className={cn("bg-white", i === 1 && "translate-x-8")}>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 bg-zinc-200 border-2 border-black shrink-0" />
                            <div className="space-y-1">
                              <div className="font-black uppercase text-[10px] italic">{post.name}</div>
                              <p className="text-xs font-bold leading-tight">"{post.content}"</p>
                              <div className="flex gap-4 pt-2">
                                <span className="text-[8px] font-black uppercase flex items-center gap-1 opacity-40"><Star className="w-3 h-3" /> {post.likes}</span>
                                <span className="text-[8px] font-black uppercase flex items-center gap-1 opacity-40"><MessageCircle className="w-3 h-3" /> 12</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* FAQ Section */}
              <div className="space-y-16">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">Common Questions.</h2>
                  <p className="text-lg font-bold opacity-60">Everything you need to know before you start.</p>
                </div>
                <div className="max-w-3xl mx-auto space-y-4">
                  {[
                    { q: "Is this just another AI wrapper?", a: "No. We use real-time Google Search grounding to ensure your content is based on what's actually trending today, not data from 2 years ago." },
                    { q: "Which platforms do you support?", a: "Currently we optimize for TikTok, YouTube Shorts, and Instagram Reels. Full-length YouTube support is coming soon." },
                    { q: "Can I cancel my Pro plan anytime?", a: "Absolutely. No contracts, no hidden fees. Cancel with one click from your settings." },
                    { q: "Do you offer a free trial?", a: "We have a generous free tier that gives you 3 full content sprints per month to test the waters." }
                  ].map((faq, i) => (
                    <Card key={i} className="bg-white">
                      <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer list-none font-black uppercase italic text-lg">
                          {faq.q}
                          <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
                        </summary>
                        <p className="mt-4 font-medium opacity-70 leading-relaxed">
                          {faq.a}
                        </p>
                      </details>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Final CTA */}
              <div className="text-center space-y-8 py-12">
                <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">Ready to Dominate?</h2>
                <p className="text-xl font-bold opacity-60 max-w-2xl mx-auto">
                  Join 10,000+ creators who are scaling their content without the burnout.
                </p>
                <Button onClick={() => user ? setStep('onboarding') : handleLogin()} className="text-2xl px-12 py-6 shadow-[8px_8px_0px_0px_rgba(16,185,129,1)] hover:shadow-none transition-all">
                  Get Started for Free
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'pricing' && (
            <motion.div 
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black uppercase italic tracking-tighter">Simple, Brutal Pricing.</h2>
                <p className="text-lg font-bold opacity-60">Choose the plan that fits your growth stage.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <Card title="Starter" className="bg-white">
                  <div className="space-y-6">
                    <div className="text-4xl font-black">$0<span className="text-sm opacity-40">/mo</span></div>
                    <ul className="space-y-3 text-sm font-bold">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3 Sprints / Month</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Basic Trend Radar</li>
                      <li className="flex items-center gap-2 opacity-30"><X className="w-4 h-4" /> AI Thumbnail Previews</li>
                    </ul>
                    <Button variant="outline" className="w-full" onClick={() => setStep('onboarding')}>Get Started</Button>
                  </div>
                </Card>
                <Card title="Pro" className="bg-emerald-50 border-emerald-500 border-4" badge="MOST POPULAR">
                  <div className="space-y-6">
                    <div className="text-4xl font-black">$29<span className="text-sm opacity-40">/mo</span></div>
                    <ul className="space-y-3 text-sm font-bold">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited Sprints</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-time Trend Grounding</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> AI Thumbnail Generation</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Teleprompter Mode</li>
                    </ul>
                    <Button className="w-full" onClick={() => window.open(STRIPE_PRO_LINK, '_blank')}>Go Pro Now</Button>
                  </div>
                </Card>
                <Card title="Agency" className="bg-black text-white">
                  <div className="space-y-6">
                    <div className="text-4xl font-black">$99<span className="text-sm opacity-40">/mo</span></div>
                    <ul className="space-y-3 text-sm font-bold">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-Creator Support</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> White-label Reports</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Priority AI Rendering</li>
                    </ul>
                    <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-black">Contact Sales</Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {step === 'community' && (
            <motion.div 
              key="community"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter">Creator Community.</h2>
                  <p className="text-lg font-bold opacity-60">Share your sprints, get feedback, and grow together.</p>
                </div>
                <Button onClick={() => !user && handleLogin()} className="shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]">
                  {user ? 'Share a Win' : 'Login to Join'}
                </Button>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b-4 border-black pb-8">
                <div className="flex flex-wrap gap-2">
                  {['All', 'Win', 'Feedback', 'Question', 'Collaboration', 'Strategy'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCommunityFilter(cat)}
                      className={cn(
                        "px-4 py-2 border-2 border-black font-black uppercase text-[10px] tracking-widest transition-all",
                        communityFilter === cat ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]" : "bg-white hover:bg-zinc-50"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <input 
                    className="w-full pl-10 pr-4 py-2 border-2 border-black font-bold text-xs outline-none focus:bg-emerald-50"
                    placeholder="Search posts..."
                    value={communitySearch}
                    onChange={e => setCommunitySearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {user && (
                    <Card className="bg-white border-4 border-black" title="Creator Lab">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {[
                            { id: 'Win', icon: Trophy, color: 'bg-yellow-400' },
                            { id: 'Feedback', icon: MessageSquare, color: 'bg-blue-400' },
                            { id: 'Question', icon: HelpCircle, color: 'bg-purple-400' },
                            { id: 'Collaboration', icon: Users, color: 'bg-emerald-400' },
                            { id: 'Strategy', icon: Target, color: 'bg-red-400' }
                          ].map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => setNewPostCategory(cat.id)}
                              className={cn(
                                "px-3 py-1 border-2 border-black font-black uppercase text-[8px] tracking-widest transition-all flex items-center gap-2",
                                newPostCategory === cat.id ? cn(cat.color, "text-black translate-y-[-2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]") : "bg-white hover:bg-zinc-50"
                              )}
                            >
                              <cat.icon className="w-3 h-3" />
                              {cat.id}
                            </button>
                          ))}
                        </div>
                        <textarea 
                          className="w-full p-4 border-2 border-black font-bold outline-none min-h-[120px] resize-none focus:bg-emerald-50 text-sm"
                          placeholder={
                            newPostCategory === 'Win' ? "Just hit a milestone? Share the stats! 🚀" :
                            newPostCategory === 'Feedback' ? "Drop a link or script for the community to review..." :
                            "What's on your mind, creator?"
                          }
                          value={newPostContent}
                          onChange={e => setNewPostContent(e.target.value)}
                        />
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <button className="p-2 border-2 border-black hover:bg-zinc-100"><ImageIcon className="w-4 h-4" /></button>
                            <button className="p-2 border-2 border-black hover:bg-zinc-100"><Rocket className="w-4 h-4" /></button>
                          </div>
                          <Button onClick={handleCreatePost} disabled={loading || !newPostContent.trim()} className="px-8">
                            {loading ? 'Publishing...' : 'Publish to Network'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div className="space-y-6">
                    {posts
                      .filter(p => communityFilter === 'All' || p.category === communityFilter)
                      .filter(p => p.content.toLowerCase().includes(communitySearch.toLowerCase()) || p.userName.toLowerCase().includes(communitySearch.toLowerCase()))
                      .map((post) => (
                      <Card key={post.id} className="bg-white group hover:border-emerald-500 transition-colors">
                        <div className="flex gap-4">
                          <div className="relative">
                            <img 
                              src={post.userPhoto} 
                              alt={post.userName} 
                              className="w-12 h-12 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                              onClick={() => handleViewCreator(post.userId)}
                            />
                            {post.userId === user?.uid && (
                              <div className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-500 border border-black rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="font-black uppercase text-sm italic cursor-pointer hover:text-emerald-600 transition-colors"
                                    onClick={() => handleViewCreator(post.userId)}
                                  >
                                    {post.userName}
                                  </div>
                                  {post.category && (
                                    <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                      {getCategoryIcon(post.category)}
                                      {post.category}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-bold opacity-40 uppercase">
                                  {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                </div>
                              </div>
                              {user?.uid === post.userId && (
                                <button onClick={() => handleDeletePost(post.id)} className="opacity-0 group-hover:opacity-40 hover:opacity-100 text-red-600 transition-opacity">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="font-medium text-sm leading-relaxed">
                              {renderContentWithHashtags(post.content)}
                            </p>
                            
                            <div className="flex gap-6 pt-4 border-t-2 border-black/5">
                              <button 
                                onClick={() => handleLikePost(post.id, post.likes)}
                                className="flex items-center gap-2 text-[10px] font-black uppercase hover:text-emerald-600 transition-colors"
                              >
                                <Star className={cn("w-4 h-4", post.likes > 0 && "fill-yellow-400 text-yellow-400")} />
                                {post.likes || 0}
                              </button>
                              <button className="flex items-center gap-2 text-[10px] font-black uppercase hover:text-blue-600 transition-colors">
                                <MessageCircle className="w-4 h-4" />
                                {post.replies?.length || 0}
                              </button>
                              <button className="flex items-center gap-2 text-[10px] font-black uppercase hover:text-zinc-600 transition-colors">
                                <Rocket className="w-4 h-4" />
                                Share
                              </button>
                            </div>

                            {/* Replies Section */}
                            {post.replies && post.replies.length > 0 && (
                              <div className="mt-4 space-y-3 pl-4 border-l-2 border-black/10 bg-zinc-50/50 p-3">
                                {post.replies.map((reply, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="font-black uppercase text-[8px] italic cursor-pointer hover:text-emerald-600"
                                        onClick={() => handleViewCreator(reply.userId)}
                                      >
                                        {reply.userName}
                                      </span>
                                      <span className="text-[8px] opacity-40 uppercase">
                                        {reply.createdAt?.seconds ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                      </span>
                                    </div>
                                    <p className="text-xs font-medium opacity-80">{reply.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {user && (
                              <div className="mt-4 flex gap-2">
                                <input 
                                  className="flex-1 p-2 border-2 border-black font-bold text-[10px] outline-none focus:bg-emerald-50 bg-transparent"
                                  placeholder="Write a reply..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                      handleAddReply(post.id, e.currentTarget.value);
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <Card title="Network Stats" icon={BarChart3} className="bg-black text-white">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-2 border border-white/20">
                        <div className="text-2xl font-black italic">{posts.length}+</div>
                        <div className="text-[8px] font-black uppercase opacity-60">Total Posts</div>
                      </div>
                      <div className="text-center p-2 border border-white/20">
                        <div className="text-2xl font-black italic">1.2K</div>
                        <div className="text-[8px] font-black uppercase opacity-60">Active Now</div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Trending Topics" icon={Hash} className="bg-zinc-50">
                    <div className="space-y-3">
                      {getTrendingHashtags().length > 0 ? getTrendingHashtags().map(([tag, count], i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between cursor-pointer group"
                          onClick={() => setCommunitySearch(tag)}
                        >
                          <span className="text-xs font-black uppercase italic group-hover:text-emerald-600 transition-colors">{tag}</span>
                          <span className="text-[10px] font-bold opacity-40">{count} posts</span>
                        </div>
                      )) : (
                        <p className="text-[10px] font-bold opacity-40 uppercase italic">No trends yet...</p>
                      )}
                    </div>
                  </Card>

                  <Card title="Top Creators" icon={TrendingUp} className="bg-yellow-50">
                    <div className="space-y-4">
                      {[
                        { name: 'Sarah J.', niche: 'AI Art', growth: '+2.4k' },
                        { name: 'Mike D.', niche: 'Fitness', growth: '+1.8k' },
                        { name: 'Elena R.', niche: 'SaaS', growth: '+1.2k' }
                      ].map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-[10px] italic">
                              {c.name[0]}
                            </div>
                            <div>
                              <div className="text-xs font-black uppercase italic">{c.name}</div>
                              <div className="text-[8px] font-bold opacity-40 uppercase">{c.niche}</div>
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-emerald-600">{c.growth}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Community Challenges" icon={Target} className="bg-emerald-50">
                    <div className="space-y-4">
                      <div className="p-4 border-2 border-black bg-white">
                        <div className="text-[10px] font-black uppercase text-emerald-600 mb-1">Active Now</div>
                        <div className="font-black uppercase italic text-sm mb-2">7-Day Hook Challenge</div>
                        <p className="text-[10px] font-bold opacity-60 leading-tight mb-4">Post 7 viral hooks in 7 days and win a Pro subscription.</p>
                        <div className="flex justify-between items-center">
                          <div className="text-[10px] font-black uppercase">420 Participants</div>
                          <Button className="py-1 px-3 text-[8px]">Join</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'profile-dashboard' && user && (
            <motion.div 
              key="profile-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                  <img 
                    src={user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`} 
                    alt={user.displayName || ''} 
                    className="w-24 h-24 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1">
                    <h2 className="text-5xl font-black uppercase italic tracking-tighter">{user.displayName || 'Creator'}</h2>
                    <div className="flex items-center gap-3">
                      <div className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black">
                        {profile.isPro ? 'Pro Creator' : 'Free Plan'}
                      </div>
                      <div className="text-xs font-bold opacity-60 uppercase tracking-widest">{profile.niche} • {profile.platform}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  {!profile.isPro && (
                    <Button onClick={() => window.open(STRIPE_PRO_LINK, '_blank')} className="bg-yellow-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      Upgrade to Pro
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setStep('brand-profile')}>Edit Profile</Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                  {dashboardTab === 'overview' && (
                    <>
                      <div className="grid md:grid-cols-3 gap-6">
                        {[
                          { label: 'Total Sprints', value: savedSprints.length, icon: Rocket, color: 'bg-emerald-500' },
                          { label: 'Community Posts', value: posts.filter(p => p.userId === user.uid).length, icon: MessageSquare, color: 'bg-blue-500' },
                          { label: 'Total Likes', value: posts.filter(p => p.userId === user.uid).reduce((acc, p) => acc + (p.likes || 0), 0), icon: Star, color: 'bg-yellow-400' }
                        ].map((stat, i) => (
                          <Card key={i} className="bg-white">
                            <div className="flex items-center gap-4">
                              <div className={cn("w-12 h-12 flex items-center justify-center text-white border-2 border-black", stat.color)}>
                                <stat.icon className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black uppercase opacity-40">{stat.label}</div>
                                <div className="text-3xl font-black italic">{stat.value}</div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter">Your Sprints</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          {savedSprints.length > 0 ? savedSprints.map((sprint) => (
                            <Card key={sprint.id} className="bg-white hover:translate-y-[-4px] transition-transform cursor-pointer" onClick={() => {
                              setCreatorIdeas(sprint);
                              setStep('dashboard');
                            }}>
                              <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                  <div className="bg-black text-white px-2 py-1 text-[8px] font-black uppercase tracking-widest">
                                    {new Date(sprint.createdAt?.seconds * 1000).toLocaleDateString()}
                                  </div>
                                  <PlatformIcon platform={sprint.platform} />
                                </div>
                                <div className="font-black uppercase italic text-lg">{sprint.niche} Sprint</div>
                                <p className="text-[10px] font-bold opacity-60 line-clamp-2">{sprint.growthAdvice}</p>
                                <div className="flex justify-between items-center pt-4 border-t-2 border-black/5">
                                  <div className="text-[10px] font-black uppercase">7 Days Generated</div>
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                              </div>
                            </Card>
                          )) : (
                            <div className="col-span-2 p-12 border-4 border-dashed border-black/10 text-center space-y-4">
                              <Rocket className="w-12 h-12 mx-auto opacity-20" />
                              <p className="font-bold opacity-40 uppercase tracking-widest text-sm">No sprints generated yet.</p>
                              <Button onClick={() => setStep('onboarding')} variant="outline">Start Your First Sprint</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {dashboardTab === 'billing' && (
                    <Card title="Billing & Subscription" className="bg-white">
                      <div className="space-y-8">
                        <div className="p-6 border-4 border-black bg-zinc-50 flex justify-between items-center">
                          <div>
                            <div className="text-[10px] font-black uppercase opacity-40">Current Plan</div>
                            <div className="text-3xl font-black italic uppercase tracking-tighter">{profile.isPro ? 'Pro Creator' : 'Free Tier'}</div>
                          </div>
                          <Button 
                            onClick={() => window.open(STRIPE_PRO_LINK, '_blank')}
                            className={cn(profile.isPro ? "bg-black text-white" : "bg-yellow-400 text-black")}
                          >
                            {profile.isPro ? 'Manage Subscription' : 'Upgrade Now'}
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-black uppercase text-xs tracking-widest">Billing History</h4>
                          <div className="border-2 border-black">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-black text-white uppercase font-black">
                                <tr>
                                  <th className="p-3">Date</th>
                                  <th className="p-3">Amount</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3">Invoice</th>
                                </tr>
                              </thead>
                              <tbody className="font-bold">
                                <tr className="border-b-2 border-black/5">
                                  <td className="p-3">Mar 18, 2026</td>
                                  <td className="p-3">$0.00</td>
                                  <td className="p-3 text-emerald-600 uppercase">Active</td>
                                  <td className="p-3"><button className="underline">Download</button></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {dashboardTab === 'api' && (
                    <Card title="API Integrations" className="bg-white">
                      <div className="space-y-6">
                        <p className="text-sm font-medium opacity-70">Connect your social accounts to enable one-click publishing and real-time analytics sync.</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {[
                            { name: 'YouTube', icon: Youtube, connected: false },
                            { name: 'TikTok', icon: Music, connected: false },
                            { name: 'Instagram', icon: Instagram, connected: false }
                          ].map(platform => (
                            <div key={platform.name} className="p-4 border-2 border-black flex items-center justify-between group hover:bg-zinc-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <platform.icon className="w-5 h-5" />
                                <span className="font-black uppercase italic">{platform.name}</span>
                              </div>
                              <Button variant="outline" className="py-1 px-3 text-[10px]">Connect</Button>
                            </div>
                          ))}
                        </div>
                        <div className="p-4 bg-yellow-50 border-2 border-black text-[10px] font-bold uppercase tracking-widest">
                          Pro tip: Connect your YouTube account to unlock AI-powered thumbnail A/B testing.
                        </div>
                      </div>
                    </Card>
                  )}

                  {dashboardTab === 'security' && (
                    <Card title="Security & Privacy" className="bg-white">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="font-black uppercase text-xs tracking-widest">Account Security</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 border-2 border-black">
                              <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase">Two-Factor Authentication</div>
                                <div className="text-[8px] font-bold opacity-40">Add an extra layer of security to your account.</div>
                              </div>
                              <Button variant="outline" className="py-1 px-3 text-[10px]">Enable</Button>
                            </div>
                            <div className="flex justify-between items-center p-3 border-2 border-black">
                              <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase">Change Password</div>
                                <div className="text-[8px] font-bold opacity-40">Last changed 3 months ago.</div>
                              </div>
                              <Button variant="outline" className="py-1 px-3 text-[10px]">Update</Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-6 border-t-2 border-black/5 space-y-4">
                          <h4 className="font-black uppercase text-xs tracking-widest text-red-600">Danger Zone</h4>
                          <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 w-full">Delete Account</Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-8">
                  <Card title="Account Settings" icon={Settings}>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setDashboardTab('overview')}
                        className={cn(
                          "w-full text-left p-3 border-2 border-black font-bold text-xs transition-all flex justify-between items-center",
                          dashboardTab === 'overview' ? "bg-black text-white" : "hover:bg-zinc-50"
                        )}
                      >
                        Overview
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDashboardTab('billing')}
                        className={cn(
                          "w-full text-left p-3 border-2 border-black font-bold text-xs transition-all flex justify-between items-center",
                          dashboardTab === 'billing' ? "bg-black text-white" : "hover:bg-zinc-50"
                        )}
                      >
                        Billing & Subscription
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDashboardTab('api')}
                        className={cn(
                          "w-full text-left p-3 border-2 border-black font-bold text-xs transition-all flex justify-between items-center",
                          dashboardTab === 'api' ? "bg-black text-white" : "hover:bg-zinc-50"
                        )}
                      >
                        API Integrations
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDashboardTab('security')}
                        className={cn(
                          "w-full text-left p-3 border-2 border-black font-bold text-xs transition-all flex justify-between items-center",
                          dashboardTab === 'security' ? "bg-black text-white" : "hover:bg-zinc-50"
                        )}
                      >
                        Security & Privacy
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button onClick={handleLogout} className="w-full text-left p-3 border-2 border-black font-bold text-xs hover:bg-red-50 text-red-600 flex justify-between items-center">
                        Sign Out
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>

                  <Card title="Creator Resources" icon={HelpCircle} className="bg-zinc-50">
                    <ul className="space-y-3 text-[10px] font-bold uppercase">
                      <li className="hover:underline cursor-pointer">Viral Hook Database</li>
                      <li className="hover:underline cursor-pointer">Thumbnail Masterclass</li>
                      <li className="hover:underline cursor-pointer">Algorithm Deep Dives</li>
                      <li className="hover:underline cursor-pointer">Community Guidelines</li>
                    </ul>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'onboarding' && (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <Card title="Step 1: Platform & Niche">
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {['TikTok', 'YouTube', 'Instagram'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProfile({...profile, platform: p})}
                        className={cn(
                          "p-4 border-2 border-black font-black uppercase text-xs transition-all flex flex-col items-center gap-2",
                          profile.platform === p ? "bg-black text-white translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]" : "bg-white hover:bg-zinc-50"
                        )}
                      >
                        <PlatformIcon platform={p} />
                        {p}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-2">Your Niche</label>
                    <input 
                      required
                      className="w-full p-4 border-2 border-black focus:bg-emerald-50 outline-none font-bold"
                      placeholder="e.g. AI Tools, Cooking, Fitness"
                      value={profile.niche}
                      onChange={e => setProfile({...profile, niche: e.target.value})}
                    />
                  </div>
                  <Button onClick={() => setStep('brand-profile')} className="w-full py-4 text-xl">
                    Next Step <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'brand-profile' && (
            <motion.div 
              key="brand-profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <Card title="Step 2: Brand Identity">
                <form onSubmit={handleOnboarding} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-2">Brand Voice</label>
                    <select 
                      className="w-full p-4 border-2 border-black focus:bg-emerald-50 outline-none font-bold bg-white"
                      value={profile.brandVoice}
                      onChange={e => setProfile({...profile, brandVoice: e.target.value})}
                    >
                      <option>Witty & Bold</option>
                      <option>Educational & Calm</option>
                      <option>High Energy & Viral</option>
                      <option>Professional & Corporate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-2">Target Audience</label>
                    <input 
                      required
                      className="w-full p-4 border-2 border-black focus:bg-emerald-50 outline-none font-bold"
                      placeholder="e.g. Gen Z Creators, SaaS Founders"
                      value={profile.targetAudience}
                      onChange={e => setProfile({...profile, targetAudience: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-2">Primary Goal</label>
                    <input 
                      required
                      className="w-full p-4 border-2 border-black focus:bg-emerald-50 outline-none font-bold"
                      placeholder="e.g. Get 10k subscribers, Go viral"
                      value={profile.goals}
                      onChange={e => setProfile({...profile, goals: e.target.value})}
                    />
                  </div>
                  <Button disabled={loading} className="w-full py-4 text-xl">
                    {loading ? 'Scanning Trends...' : 'Generate 7-Day Sprint'}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {step === 'brand-profile' && user && (
            <motion.div 
              key="brand-profile-manage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Brand Profile</h2>
                <Button variant="outline" onClick={() => setStep('dashboard')}>Back to Dashboard</Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <Card title="Core Identity">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Niche</label>
                      <input 
                        className="w-full p-4 border-2 border-black font-bold focus:bg-emerald-50 outline-none"
                        value={profile.niche}
                        onChange={e => setProfile({...profile, niche: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Platform</label>
                      <select 
                        className="w-full p-4 border-2 border-black font-bold bg-white outline-none"
                        value={profile.platform}
                        onChange={e => setProfile({...profile, platform: e.target.value})}
                      >
                        <option>TikTok</option>
                        <option>YouTube</option>
                        <option>Instagram</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Primary Goal</label>
                      <input 
                        className="w-full p-4 border-2 border-black font-bold focus:bg-emerald-50 outline-none"
                        value={profile.goals}
                        onChange={e => setProfile({...profile, goals: e.target.value})}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Voice & Audience">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Brand Voice</label>
                      <select 
                        className="w-full p-4 border-2 border-black font-bold bg-white outline-none"
                        value={profile.brandVoice}
                        onChange={e => setProfile({...profile, brandVoice: e.target.value})}
                      >
                        <option>Witty & Bold</option>
                        <option>Educational & Calm</option>
                        <option>High Energy & Viral</option>
                        <option>Professional & Corporate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Target Audience</label>
                      <input 
                        className="w-full p-4 border-2 border-black font-bold focus:bg-emerald-50 outline-none"
                        value={profile.targetAudience}
                        onChange={e => setProfile({...profile, targetAudience: e.target.value})}
                      />
                    </div>
                    <Button onClick={() => saveProfileToFirebase(profile)} className="w-full py-4">
                      Save Changes
                    </Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {step === 'dashboard' && creatorIdeas && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Quick Actions Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'New Sprint', icon: Rocket, action: () => setStep('onboarding'), color: 'bg-emerald-500' },
                  { label: 'Brand Profile', icon: Settings, action: () => setStep('brand-profile'), color: 'bg-blue-500' },
                  { label: 'Hook Lab', icon: Anchor, action: () => {
                    const el = document.getElementById('hook-lab');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, color: 'bg-yellow-400' },
                  { label: 'Trend Radar', icon: BarChart3, action: () => {}, color: 'bg-zinc-400' },
                  { label: 'Upgrade', icon: Zap, action: () => setStep('pricing'), color: 'bg-black' }
                ].map((act, i) => (
                  <button 
                    key={i}
                    onClick={act.action}
                    className="flex items-center gap-3 p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <div className={cn("w-10 h-10 flex items-center justify-center text-white border-2 border-black", act.color)}>
                      <act.icon className="w-5 h-5" />
                    </div>
                    <span className="font-black uppercase text-[10px] tracking-widest">{act.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">7-Day Viral Sprint</h2>
                  <div className="bg-emerald-500 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <TrendingUp className="w-4 h-4" />
                    Trend Grounded
                  </div>
                </div>
                <div className="flex gap-4">
                  {savedSprints.length > 0 && (
                    <select 
                      className="p-2 border-2 border-black font-bold text-xs bg-white outline-none"
                      onChange={(e) => {
                        const sprint = savedSprints.find(s => s.id === e.target.value);
                        if (sprint) setCreatorIdeas(sprint);
                      }}
                    >
                      <option value="">History</option>
                      {savedSprints.map(s => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.createdAt?.seconds * 1000).toLocaleDateString()} - {s.niche}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button variant="outline" className="py-2 text-xs" onClick={() => setStep('onboarding')}>New Sprint</Button>
                  <Button variant="secondary" className="py-2 text-xs" onClick={() => setStep('pricing')}>Upgrade Pro</Button>
                </div>
              </div>

              {/* Growth Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Est. Reach', value: '45.2K', trend: '+18%', color: 'text-emerald-600' },
                  { label: 'Avg. Retention', value: '64%', trend: '+5%', color: 'text-emerald-600' },
                  { label: 'Engagement', value: '8.4%', trend: '-2%', color: 'text-red-600' },
                  { label: 'Conversion', value: '3.1%', trend: '+12%', color: 'text-emerald-600' }
                ].map((m, i) => (
                  <div key={i} className="p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-[10px] font-black uppercase opacity-40 mb-1">{m.label}</div>
                    <div className="flex justify-between items-end">
                      <div className="text-2xl font-black italic">{m.value}</div>
                      <div className={cn("text-[10px] font-black", m.color)}>{m.trend}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-4 gap-8">
                {/* Sidebar: Trends & Advice */}
                <div className="space-y-8">
                  <Card title="Creator Score" icon={Star} className="bg-emerald-50">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="text-4xl font-black italic">84<span className="text-sm opacity-40">/100</span></div>
                        <div className="text-[10px] font-black uppercase text-emerald-600">+12% this week</div>
                      </div>
                      <div className="h-4 w-full bg-white border-2 border-black relative overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 border-r-2 border-black animate-progress" 
                          style={{ '--progress-width': '84%' } as any}
                        ></div>
                      </div>
                      <p className="text-[9px] font-bold opacity-60 leading-tight">
                        Your content consistency is high. Focus on <b>hook retention</b> to reach 90+.
                      </p>
                    </div>
                  </Card>

                  <Card title="Brand Kit" icon={Users} className="bg-zinc-50">
                    <div className="space-y-2 text-[10px] font-bold uppercase">
                      <div className="flex justify-between">
                        <span className="opacity-40">Voice:</span>
                        <span>{profile.brandVoice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40">Audience:</span>
                        <span>{profile.targetAudience}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40">Platform:</span>
                        <span>{profile.platform}</span>
                      </div>
                    </div>
                  </Card>
                  <Card title="Trend Radar" icon={TrendingUp} className="bg-yellow-50">
                    <div className="space-y-4">
                      {creatorIdeas.trends.map((trend, i) => (
                        <div key={i} className="space-y-1">
                          <div className="font-black text-xs uppercase text-emerald-600">{trend.title}</div>
                          <p className="text-[10px] font-bold leading-tight opacity-70">{trend.insight}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Sprint Logic" icon={Zap}>
                    <p className="text-[10px] font-bold leading-relaxed italic">
                      {creatorIdeas.growthAdvice}
                    </p>
                  </Card>

                  <Card title="Caption Lab" icon={PenTool}>
                    <div className="space-y-4">
                      <input 
                        className="w-full p-3 border-2 border-black font-bold outline-none text-xs bg-transparent"
                        placeholder="Day {activeDay} topic..."
                        value={captionTopic}
                        onChange={e => setCaptionTopic(e.target.value)}
                      />
                      <Button onClick={handleGenerateCaptions} disabled={loading} className="w-full py-2 text-xs">
                        {loading ? '...' : 'Generate'}
                      </Button>
                      <div className="space-y-2">
                        {captions.slice(0, 1).map((cap, i) => (
                          <div key={i} className="p-3 bg-zinc-50 border-l-4 border-black text-[10px] font-medium">
                            {cap}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card title="Title Optimizer" icon={TypeIcon} className="bg-blue-50">
                    <div className="space-y-4">
                      <input 
                        className="w-full p-3 border-2 border-black font-bold outline-none text-xs bg-transparent"
                        placeholder="Paste draft title..."
                        value={titleToOptimize}
                        onChange={e => setTitleToOptimize(e.target.value)}
                      />
                      <Button onClick={handleOptimizeTitle} disabled={loading} className="w-full py-2 text-xs">
                        {loading ? '...' : 'Optimize'}
                      </Button>
                      <div className="space-y-2">
                        {optimizedTitles.map((opt, i) => (
                          <div key={i} className="p-2 bg-white border-2 border-black text-[9px] font-bold group relative">
                            <div className="text-[7px] uppercase opacity-40 mb-1">{opt.type}</div>
                            {opt.title}
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(opt.title);
                                setCopyFeedback('Copied!');
                                setTimeout(() => setCopyFeedback(null), 2000);
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card id="hook-lab" title="Hook Lab" icon={Anchor} className="bg-yellow-50">
                    <div className="space-y-4">
                      <textarea 
                        className="w-full p-3 border-2 border-black font-bold outline-none text-xs bg-transparent min-h-[80px] resize-none"
                        placeholder="What is your video about? (e.g. My morning routine as a software engineer)"
                        value={hookContext}
                        onChange={e => setHookContext(e.target.value)}
                      />
                      <Button onClick={handleGenerateHooks} disabled={loading} className="w-full py-2 text-xs">
                        {loading ? '...' : 'Generate Hooks'}
                      </Button>
                      <div className="space-y-2">
                        {hooks.map((h, i) => (
                          <div key={i} className="p-2 bg-white border-2 border-black text-[9px] font-bold group relative">
                            <div className="text-[7px] uppercase opacity-40 mb-1">{h.type}</div>
                            {h.hook}
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(h.hook);
                                setCopyFeedback('Copied!');
                                setTimeout(() => setCopyFeedback(null), 2000);
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card title="Reply Lab" icon={MessageCircle} className="bg-emerald-50">
                    <div className="space-y-4">
                      <input 
                        className="w-full p-3 border-2 border-black font-bold outline-none text-xs bg-transparent"
                        placeholder="Paste comment here..."
                        value={engagementComment}
                        onChange={e => setEngagementComment(e.target.value)}
                      />
                      <Button onClick={handleGenerateReplies} variant="secondary" disabled={loading} className="w-full py-2 text-xs">
                        {loading ? '...' : 'Witty Reply'}
                      </Button>
                      <div className="space-y-2">
                        {engagementReplies.slice(0, 1).map((rep, i) => (
                          <div key={i} className="p-3 bg-white border-l-4 border-emerald-500 text-[10px] font-medium">
                            {rep}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Main Content: 7-Day Sprint */}
                <div className="lg:col-span-3 space-y-8">
                  {/* Day Selector */}
                  <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                    {creatorIdeas.sprint.map((s) => (
                      <button
                        key={s.day}
                        onClick={() => setActiveDay(s.day)}
                        className={cn(
                          "px-6 py-3 border-2 border-black font-black uppercase text-sm transition-all shrink-0",
                          activeDay === s.day ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]" : "bg-white hover:bg-zinc-50"
                        )}
                      >
                        Day 0{s.day}
                      </button>
                    ))}
                  </div>

                  {/* Day Detail */}
                  <AnimatePresence mode="wait">
                    {creatorIdeas.sprint.filter(s => s.day === activeDay).map(s => (
                      <motion.div
                        key={s.day}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid md:grid-cols-2 gap-8"
                      >
                        <Card title="Concept & Hook" icon={Lightbulb} className="bg-white">
                          <div className="space-y-6">
                            <div>
                              <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Video Concept</label>
                              <p className="text-xl font-black leading-tight italic">"{s.concept}"</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase opacity-40 block mb-1">Viral Hook</label>
                              <div className="p-4 bg-emerald-50 border-2 border-black font-bold italic relative group">
                                "{s.hook}"
                                <button 
                                  onClick={() => copyToClipboard(s.hook, 'Hook')}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[8px] px-2 py-1 uppercase font-black flex items-center gap-1"
                                >
                                  <Copy className="w-2 h-2" /> Copy
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase opacity-40 block mb-1">High-CTR Title</label>
                              <div className="flex items-center justify-between group">
                                <p className="font-black text-lg text-emerald-600 uppercase tracking-tighter">{s.title}</p>
                                <button 
                                  onClick={() => copyToClipboard(s.title, 'Title')}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-black hover:text-emerald-600"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="pt-4 border-t-2 border-black/5 grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[8px] font-black uppercase opacity-40 block mb-1 flex items-center gap-1">
                                  <Music className="w-2 h-2" /> Audio Suggestion
                                </label>
                                <p className="text-[10px] font-bold">{s.audio}</p>
                              </div>
                              <div>
                                <label className="text-[8px] font-black uppercase opacity-40 block mb-1 flex items-center gap-1">
                                  <ShieldAlert className="w-2 h-2" /> Algo Hack
                                </label>
                                <p className="text-[10px] font-bold text-red-600 uppercase">{s.algoHack}</p>
                              </div>
                            </div>
                          </div>
                        </Card>

                        <div className="space-y-8">
                          <Card title="Script Architect" icon={PenTool} badge="STRUCTURE">
                            <div className="space-y-4 relative group">
                              <div className="absolute -top-2 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button 
                                  onClick={() => handlePlayAudio(s.day, `${s.outline.hook}. ${s.outline.value}. ${s.outline.cta}`)}
                                  disabled={playingAudio === s.day}
                                  className="bg-emerald-500 text-white text-[8px] px-2 py-1 uppercase font-black flex items-center gap-1"
                                >
                                  {playingAudio === s.day ? <Loader2 className="w-2 h-2 animate-spin" /> : <Volume2 className="w-2 h-2" />} Listen
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(`${s.outline.hook}\n\n${s.outline.value}\n\n${s.outline.cta}`, 'Script')}
                                  className="bg-black text-white text-[8px] px-2 py-1 uppercase font-black"
                                >
                                  Copy
                                </button>
                                <button 
                                  onClick={() => setTeleprompterOpen(true)}
                                  className="bg-yellow-400 text-black text-[8px] px-2 py-1 uppercase font-black flex items-center gap-1"
                                >
                                  <Maximize2 className="w-2 h-2" /> Film
                                </button>
                              </div>
                              <div className="flex gap-4">
                                <div className="w-1 bg-emerald-500 shrink-0" />
                                <div>
                                  <div className="text-[8px] font-black uppercase opacity-40">Intro (0-3s)</div>
                                  <p className="text-xs font-bold">{s.outline.hook}</p>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="w-1 bg-black shrink-0" />
                                <div>
                                  <div className="text-[8px] font-black uppercase opacity-40">Value (3-45s)</div>
                                  <p className="text-xs font-bold">{s.outline.value}</p>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="w-1 bg-yellow-400 shrink-0" />
                                <div>
                                  <div className="text-[8px] font-black uppercase opacity-40">CTA (45-60s)</div>
                                  <p className="text-xs font-bold">{s.outline.cta}</p>
                                </div>
                              </div>
                            </div>
                          </Card>

                          <Card title="Thumbnail Vision" icon={Layout} className="bg-white">
                            <div className="space-y-4">
                              <p className="text-xs font-medium leading-relaxed opacity-80 italic">
                                {s.thumbnail}
                              </p>
                              
                              {thumbnails[s.day] ? (
                                <div className="border-2 border-black/20 overflow-hidden">
                                  <img 
                                    src={thumbnails[s.day]} 
                                    alt="AI Generated Thumbnail" 
                                    className="w-full aspect-video object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <Button 
                                  variant="secondary" 
                                  className="w-full py-2 text-[10px]"
                                  onClick={() => handleGenerateThumbnail(s.day, s.thumbnail)}
                                  disabled={generatingThumbnail === s.day}
                                >
                                  {generatingThumbnail === s.day ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <><ImageIcon className="w-3 h-3" /> Generate AI Preview</>
                                  )}
                                </Button>
                              )}

                              <div className="flex flex-wrap gap-2 pt-2">
                                {s.keywords?.map((kw, i) => (
                                  <span key={i} className="text-[8px] font-black uppercase px-2 py-1 bg-black/5 rounded-sm flex items-center gap-1">
                                    <Hash className="w-2 h-2" /> {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </Card>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Teleprompter Overlay */}
        <AnimatePresence>
          {teleprompterOpen && creatorIdeas && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-12 text-center"
            >
              <button 
                onClick={() => setTeleprompterOpen(false)}
                className="absolute top-8 right-8 p-4 border-2 border-white hover:bg-white hover:text-black transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              
              <div className="max-w-4xl space-y-12">
                <div className="space-y-4">
                  <span className="text-emerald-500 font-black uppercase tracking-[0.3em] text-xl italic">Day 0{activeDay} Teleprompter</span>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter opacity-40">
                    {creatorIdeas.sprint.find(s => s.day === activeDay)?.title}
                  </h2>
                </div>

                <div id="teleprompter-content" className="space-y-12 h-[60vh] overflow-y-auto py-24 px-8 no-scrollbar mask-fade">
                  {creatorIdeas.sprint.filter(s => s.day === activeDay).map(s => (
                    <div key={s.day} className="space-y-24">
                      <div className="space-y-4">
                        <span className="text-emerald-500 font-black uppercase text-sm tracking-widest">Hook</span>
                        <p className="text-5xl md:text-7xl font-black leading-tight italic">
                          {s.outline.hook}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <span className="text-white font-black uppercase text-sm tracking-widest">Value</span>
                        <p className="text-5xl md:text-7xl font-black leading-tight italic">
                          {s.outline.value}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <span className="text-yellow-400 font-black uppercase text-sm tracking-widest">CTA</span>
                        <p className="text-5xl md:text-7xl font-black leading-tight italic">
                          {s.outline.cta}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={cn(
                      "px-8 py-4 text-xl border-2 border-white",
                      autoScroll ? "bg-white text-black" : "bg-transparent text-white"
                    )}
                  >
                    {autoScroll ? 'Stop Scroll' : 'Auto Scroll'}
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white border-none px-12 py-6 text-2xl">
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse mr-2" /> REC
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Creator Profile Modal */}
      <AnimatePresence>
        {showProfileModal && selectedCreator && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8"
            >
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-zinc-100 border-2 border-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <img 
                    src={selectedCreator.photoURL} 
                    alt={selectedCreator.displayName} 
                    className="w-24 h-24 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    referrerPolicy="no-referrer"
                  />
                  {selectedCreator.isPro && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 border-2 border-black px-2 py-0.5 font-black text-[8px] uppercase italic">PRO</div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">{selectedCreator.displayName}</h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-widest">{selectedCreator.niche || 'Digital Creator'}</span>
                    <span className="text-[10px] font-bold opacity-40 uppercase">{selectedCreator.platform || 'Multi-platform'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full py-6 border-y-4 border-black">
                  <div className="text-center">
                    <div className="text-xl font-black italic">{selectedCreator.stats?.totalSprints || 0}</div>
                    <div className="text-[8px] font-black uppercase opacity-40">Sprints</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black italic">{selectedCreator.stats?.communityPosts || 0}</div>
                    <div className="text-[8px] font-black uppercase opacity-40">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black italic">{selectedCreator.stats?.totalLikes || 0}</div>
                    <div className="text-[8px] font-black uppercase opacity-40">Likes</div>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  <div className="text-left">
                    <div className="text-[10px] font-black uppercase mb-2 opacity-40">Creator Bio</div>
                    <p className="text-sm font-medium leading-relaxed italic">
                      "{selectedCreator.brandVoice || 'Building something epic in the creator economy.'}"
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]"
                    onClick={() => {
                      setCommunitySearch(selectedCreator.displayName);
                      setShowProfileModal(false);
                    }}
                  >
                    View Recent Sprints
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white p-12 md:p-24 mt-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black italic text-xl border-2 border-white">CF</div>
              <span className="font-black text-2xl uppercase italic tracking-tighter">CreatorFlow Pro</span>
            </div>
            <p className="font-bold opacity-60 max-w-sm leading-relaxed">
              The ultimate operating system for modern creators. Scale your presence across TikTok, YouTube, and Instagram with AI-driven strategy.
            </p>
            <div className="flex gap-4">
              {[Globe, Instagram, Youtube].map((Icon, i) => (
                <button key={i} className="w-10 h-10 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-black uppercase text-xs mb-6 tracking-widest">Platform</h4>
            <ul className="space-y-3 text-sm font-bold opacity-60">
              <li className="hover:opacity-100 cursor-pointer transition-opacity" onClick={() => setStep('landing')}>Trend Radar</li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity" onClick={() => setStep('onboarding')}>Script Architect</li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity" onClick={() => setStep('pricing')}>Pricing</li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">Affiliates</li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="font-black uppercase text-xs mb-2 tracking-widest">Newsletter</h4>
            <p className="text-xs font-bold opacity-60">Get weekly viral trends delivered to your inbox.</p>
            <div className="flex">
              <input 
                type="email" 
                placeholder="Email address" 
                className="flex-1 p-3 border-2 border-black border-r-0 font-bold text-xs outline-none focus:bg-emerald-50"
              />
              <button className="bg-black text-white px-4 border-2 border-black font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t-2 border-black/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
          <div>© 2026 CreatorFlow Pro. All rights reserved.</div>
          <div className="flex gap-8">
            <span className="hover:opacity-100 cursor-pointer">Privacy Policy</span>
            <span className="hover:opacity-100 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
