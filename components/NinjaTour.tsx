import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useDimensionalMusic } from "@/contexts/DimensionalMusicContext";
import { useLocation } from "wouter";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Code2, ThumbsUp, MessageSquare, Sparkles, CheckCircle2 } from "lucide-react";
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

interface TourStep {
  message: string;
  messageId: string;
  dimension?: string;
}

interface CodeSuggestion {
  pattern: string;
  context: string;
  confidence: number;
  dimension?: string;
  usage: number;
  lastUsed: Date;
}

interface CommunityFeedback {
  id: string;
  category: string;
  dimension: string;
  sentiment: number;
  impact: number;
  suggestions: string[];
  votes: number;
  status: 'new' | 'reviewing' | 'implemented' | 'declined';
  lastUpdated: Date;
  actionable: boolean;
  priority: number;
}

export function NinjaTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<CodeSuggestion | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('feature');
  const controls = useAnimation();

  const { isPlaying, currentSong } = useMusicPlayer();
  const { t } = useDimensionalTranslation();
  const { address } = useAccount();
  const [location] = useLocation();
  const {
    currentDimension,
    dimensionalState,
    isDimensionallyAligned
  } = useDimensionalMusic();

  const animationFrameRef = useRef(0);
  const [freqData, setFreqData] = useState<Uint8Array | null>(null);

  const dimensionalWisdomQuotes = useMemo(() => ({
    prime: [
      "Music is the harmony of the universe made audible.",
      "The journey of a thousand songs begins with a single note.",
      "Music in the heart can be heard by the universe.",
    ],
    quantum: [
      "In the quantum realm, every note exists in superposition.",
      "Dimensional harmony transcends space and time.",
      "The observer and the music become one in quantum space.",
    ],
    ethereal: [
      "Beyond the veil, music flows like starlight.",
      "In ethereal dimensions, silence speaks volumes.",
      "Time is but a rhythm in the cosmic dance.",
    ],
    neural: [
      "The mind's symphony creates reality.",
      "Neural pathways dance to consciousness's tune.",
      "In the mind's eye, music paints infinite worlds.",
    ]
  }), []);

  const { data: codeSuggestions } = useQuery({
    queryKey: ['code-suggestions', currentDimension],
    queryFn: async () => {
      const response = await fetch(`/api/lumira/code-suggestions?dimension=${currentDimension}`);
      if (!response.ok) throw new Error('Failed to fetch code suggestions');
      return response.json() as Promise<CodeSuggestion[]>;
    },
    enabled: isVisible,
    refetchInterval: isDimensionallyAligned ? 10000 : 5000
  });

  const { data: communityInsights } = useQuery({
    queryKey: ['community-insights', currentDimension],
    queryFn: async () => {
      const response = await fetch(`/api/lumira/community-insights?dimension=${currentDimension}`);
      if (!response.ok) throw new Error('Failed to fetch community insights');
      return response.json() as Promise<CommunityFeedback[]>;
    },
    enabled: showFeedback,
    refetchInterval: 30000
  });

  useEffect(() => {
    if (codeSuggestions) {
      setSuggestions(codeSuggestions.filter(s =>
        !s.dimension || s.dimension === currentDimension
      ));
    }
  }, [codeSuggestions, currentDimension]);

  const tourSteps: TourStep[] = useMemo(() => [
    {
      message: t('tour.welcome'),
      messageId: "tour.welcome",
      dimension: "prime"
    },
    {
      message: t('tour.dimensional.intro'),
      messageId: "tour.dimensional.intro",
      dimension: currentDimension
    },
    {
      message: t('tour.connect'),
      messageId: "tour.connect"
    },
    {
      message: t('tour.upload'),
      messageId: "tour.upload"
    }
  ], [t, currentDimension]);

  const getDimensionalEffects = () => {
    const { entropy, harmonicAlignment, dimensionalShift } = dimensionalState;
    return {
      scale: 1 + (entropy * 0.1),
      rotate: dimensionalShift * 45,
      opacity: harmonicAlignment
    };
  };

  const animateDimensionalShift = async () => {
    await controls.start({
      scale: [1, 1.2, 0.8, 1],
      rotate: [0, 180, 360, 0],
      transition: { duration: 2, ease: "easeInOut" }
    });
  };

  useEffect(() => {
    if (isDimensionallyAligned) {
      animateDimensionalShift();
    }
  }, [currentDimension, isDimensionallyAligned]);

  useEffect(() => {
    const shouldShowTour = () => {
      if (location !== '/') return false;
      const tourDismissed = localStorage.getItem('ninja-tour-dismissed');
      const lastWalletAddress = localStorage.getItem('last-wallet-address');
      if (!tourDismissed || (address && lastWalletAddress !== address)) {
        if (address) {
          localStorage.setItem('last-wallet-address', address);
        }
        return true;
      }
      return false;
    };

    setIsVisible(shouldShowTour());
  }, [location, address]);

  useEffect(() => {
    if (currentStep < tourSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, tourSteps.length]);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % dimensionalWisdomQuotes[currentDimension as keyof typeof dimensionalWisdomQuotes].length);
    }, 8000);

    return () => clearInterval(quoteInterval);
  }, [currentDimension, dimensionalWisdomQuotes]);

  const handleDismiss = () => {
    localStorage.setItem('ninja-tour-dismissed', 'true');
    setIsVisible(false);
  };

  const handleSuggestionApply = async (suggestion: CodeSuggestion) => {
    try {
      setActiveSuggestion(suggestion);
      await fetch('/api/lumira/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'code',
          data: {
            pattern: suggestion.pattern,
            context: suggestion.context,
            success: true,
            impact: 1,
            dimension: currentDimension
          }
        })
      });

      await controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.3 }
      });
    } catch (error) {
      console.error('Error applying suggestion:', error);
    } finally {
      setActiveSuggestion(null);
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      const response = await fetch('/api/lumira/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: feedbackCategory,
          sentiment: 1,
          impact: 8,
          suggestions: [feedbackInput],
          source: 'ninja-helper',
          dimension: currentDimension
        })
      });

      if (response.ok) {
        setFeedbackInput('');
        await controls.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.3 }
        });
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleVote = async (feedbackId: string) => {
    try {
      await fetch(`/api/lumira/feedback/${feedbackId}/vote`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error voting on feedback:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-20 left-0 right-0 z-50 pointer-events-none"
        style={{
          height: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '1rem',
        }}
        animate={getDimensionalEffects()}
      >
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <motion.svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <motion.path
              d="M60 25c-6 0-11 4-11 9s5 9 11 9 11-4 11-9-5-9-11-9z"
              fill="currentColor"
              animate={freqData ? {
                scale: 1 + ((freqData[30] || 0) / 255) * 0.1,
                rotate: ((freqData[31] || 0) / 255) * 10 - 5
              } : {
                scale: 1,
                rotate: 0
              }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M52 34v36c0 4.4 3.6 8 8 8s8-3.6 8-8V34H52z"
              fill="currentColor"
              animate={freqData ? {
                scaleY: 1 + ((freqData[0] || 0) / 255) * 0.2,
                rotate: ((freqData[1] || 0) / 255) * 10 - 5
              } : {
                scaleY: 1,
                rotate: 0
              }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M52 70l-3 20"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[5] || 0) / 255) * 20 - 10,
                x: ((freqData[6] || 0) / 255) * 2 - 1
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '52px 70px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M68 70l3 20"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[7] || 0) / 255) * -20 + 10,
                x: ((freqData[8] || 0) / 255) * -2 + 1
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '68px 70px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M52 34c-4 0-8 4-8 12s4 12 8 12"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[20] || 0) / 255) * 30 - 15,
                x: ((freqData[21] || 0) / 255) * 4 - 2
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '52px 34px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M68 34c4 0 8 4 8 12s-4 12-8 12"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[22] || 0) / 255) * -30 + 15,
                x: ((freqData[23] || 0) / 255) * -4 + 2
              } : {
                rotate: 0,
                x: 0
              }}
              style={{ transformOrigin: '68px 34px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
            <motion.path
              d="M60 15v-10M60 5l2 3M60 5l-2 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              animate={freqData ? {
                rotate: ((freqData[50] || 0) / 255) * 20 - 10,
                scale: 1 + ((freqData[51] || 0) / 255) * 0.1
              } : {
                rotate: 0,
                scale: 1
              }}
              style={{ transformOrigin: '60px 15px' }}
              transition={{ type: "tween", duration: 0.1 }}
            />
          </motion.svg>

          <motion.div
            className={`absolute left-full ml-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg pointer-events-auto ${
              currentDimension !== 'prime' ? 'dimensional-glow' : ''
            }`}
            style={{
              width: "max-content",
              maxWidth: "300px",
              top: "50%",
              transform: "translateY(-50%)",
              borderColor: `var(--${currentDimension}-border)`,
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm mb-2">
              {t(tourSteps[currentStep].messageId, { dimension: currentDimension })}
            </p>

            {suggestions.length > 0 && (
              <div className="mt-4 border-t border-border pt-2">
                <p className="text-xs font-medium mb-2">
                  {t('ninja.suggestions')}
                </p>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={`${suggestion.pattern}_${index}`}
                      className="flex items-center gap-2 text-xs"
                      whileHover={{ scale: 1.02 }}
                    >
                      <Code2 className="h-3 w-3" />
                      <span className="flex-1">{suggestion.pattern}</span>
                      <motion.button
                        className="text-primary hover:text-primary/80 disabled:opacity-50"
                        onClick={() => handleSuggestionApply(suggestion)}
                        disabled={!!activeSuggestion}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {activeSuggestion?.pattern === suggestion.pattern ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          'Apply'
                        )}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <motion.p
              className="text-xs italic text-muted-foreground mt-2 border-t border-border pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={`${currentDimension}-${currentQuote}`}
              transition={{ duration: 0.5 }}
            >
              "{dimensionalWisdomQuotes[currentDimension as keyof typeof dimensionalWisdomQuotes][currentQuote]}"
            </motion.p>

            {currentStep === tourSteps.length - 1 && (
              <motion.button
                className="mt-2 text-xs text-primary hover:text-primary/80"
                onClick={handleDismiss}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('tour.gotIt')}
              </motion.button>
            )}
          </motion.div>
        </motion.div>

        <motion.div className="fixed bottom-4 right-4 z-50">
          <motion.button
            className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFeedback(!showFeedback)}
          >
            <MessageSquare className="h-6 w-6" />
          </motion.button>

          {showFeedback && (
            <motion.div
              className="absolute bottom-full right-0 mb-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{ width: '300px' }}
            >
              <h3 className="text-sm font-medium mb-2">
                {t('community.feedback')}
              </h3>

              <div className="space-y-4">
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2"
                >
                  <option value="feature">{t('community.feedback.feature')}</option>
                  <option value="bug">{t('community.feedback.bug')}</option>
                  <option value="improvement">{t('community.feedback.improvement')}</option>
                </select>

                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder={t('community.feedback.placeholder')}
                  className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2 min-h-[100px]"
                />

                <motion.button
                  className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFeedbackSubmit}
                  disabled={!feedbackInput.trim()}
                >
                  {t('community.feedback.submit')}
                </motion.button>
              </div>

              {communityInsights && communityInsights.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <h4 className="text-xs font-medium mb-2">
                    {t('community.insights')}
                  </h4>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {communityInsights.map((insight) => (
                      <motion.div
                        key={insight.id}
                        className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/50"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{insight.suggestions[0]}</p>
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {insight.votes}
                            </span>
                            {insight.actionable && (
                              <span className="flex items-center gap-1 text-yellow-500">
                                <Sparkles className="h-3 w-3" />
                                {t('community.actionable')}
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.button
                          className="text-primary hover:text-primary/80"
                          onClick={() => handleVote(insight.id)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}