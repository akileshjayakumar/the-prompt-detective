"use client";

import { useState, useEffect } from "react";
import {
  generateCase,
  generateRectificationOptions,
  generateAuditCase,
  getMentorFeedback,
  CaseData,
  RectificationOption,
  AuditCaseData,
  MentorFeedback,
} from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  ShieldAlert,
  Cpu,
  BookOpen,
  Target,
  Palette,
  MessageSquare,
  Users,
  FileText,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import Image from "next/image";

const CO_STAR_ELEMENTS = [
  {
    key: "context",
    label: "Context",
    description: "Background information the AI needs",
    color: "bg-blue-100 text-blue-800",
  },
  {
    key: "objective",
    label: "Objective",
    description: "What you want the AI to do",
    color: "bg-amber-100 text-amber-800",
  },
  {
    key: "style",
    label: "Style",
    description: "Writing style (formal, casual, etc.)",
    color: "bg-purple-100 text-purple-800",
  },
  {
    key: "tone",
    label: "Tone",
    description: "Emotional quality (friendly, serious)",
    color: "bg-pink-100 text-pink-800",
  },
  {
    key: "audience",
    label: "Audience",
    description: "Who will read/use the output",
    color: "bg-green-100 text-green-800",
  },
  {
    key: "response",
    label: "Response",
    description: "Format of the output (list, essay)",
    color: "bg-orange-100 text-orange-800",
  },
] as const;

type GameMode = "detective" | "auditor" | "sandbox";
type GamePhase =
  | "loading"
  | "investigate"
  | "rectify"
  | "verdict"
  | "auditing"
  | "sandbox-input";

export default function Home() {
  const [mode, setMode] = useState<GameMode>("detective");
  const [phase, setPhase] = useState<GamePhase>("loading");

  // Detective Mode State
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [rectificationOptions, setRectificationOptions] = useState<
    RectificationOption[]
  >([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [deductionResult, setDeductionResult] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [rectifyResult, setRectifyResult] =
    useState<RectificationOption | null>(null);

  // Auditor Mode State
  const [auditData, setAuditData] = useState<AuditCaseData | null>(null);
  const [flaggedBugs, setFlaggedBugs] = useState<string[]>([]);
  const [showAuditResult, setShowAuditResult] = useState(false);

  // Sandbox Mode State
  const [sandboxPrompt, setSandboxPrompt] = useState("");
  const [mentorFeedback, setMentorFeedback] = useState<MentorFeedback | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Common UI State
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showRectifyResultModal, setShowRectifyResultModal] = useState(false);

  // Show onboarding only once on initial page load
  useEffect(() => {
    setShowOnboarding(true);

    // Pre-generate content for Detective and Auditor modes in parallel
    const preGenerateContent = async () => {
      setPhase("loading");

      // Generate both cases in parallel
      const [detectiveCase, auditorCase] = await Promise.all([
        generateCase(),
        generateAuditCase(),
      ]);

      setCaseData(detectiveCase);
      setAuditData(auditorCase);

      // Pre-generate rectification options for detective mode
      generateRectificationOptions(detectiveCase).then((options) => {
        setRectificationOptions(options);
      });

      // Set initial phase based on default mode (detective)
      setPhase("investigate");
    };

    preGenerateContent();
  }, []); // Empty dependency - runs only once on mount

  // Handle mode changes without re-fetching already pre-generated data
  useEffect(() => {
    if (mode === "detective") {
      // If we have caseData, show investigate phase; otherwise stay loading
      if (caseData) {
        setPhase("investigate");
      }
    } else if (mode === "auditor") {
      // If we have auditData, show auditing phase; otherwise stay loading
      if (auditData) {
        setPhase("auditing");
      }
    } else if (mode === "sandbox") {
      setPhase("sandbox-input");
    }
  }, [mode, caseData, auditData]);

  const loadNewCase = async () => {
    setPhase("loading");
    setSelectedElement(null);
    setDeductionResult(null);
    setRectificationOptions([]);
    setSelectedOption(null);
    setRectifyResult(null);

    const newCase = await generateCase();
    setCaseData(newCase);
    setPhase("investigate");

    generateRectificationOptions(newCase).then((options) => {
      setRectificationOptions(options);
    });
  };

  const loadAuditCase = async () => {
    setPhase("loading");
    setFlaggedBugs([]);
    setShowAuditResult(false);
    const data = await generateAuditCase();
    setAuditData(data);
    setPhase("auditing");
  };

  const handleSandboxSubmit = async () => {
    if (!sandboxPrompt.trim()) return;
    setIsAnalyzing(true);
    const feedback = await getMentorFeedback(sandboxPrompt);
    setMentorFeedback(feedback);
    setIsAnalyzing(false);
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
  };

  const submitGuess = () => {
    if (selectedElement === caseData?.botchedElement) {
      setDeductionResult("correct");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setShowResultModal(true);
    } else {
      setDeductionResult("incorrect");
      setShowResultModal(true);
    }
  };

  const proceedAfterDeduction = () => {
    setShowResultModal(false);
    if (deductionResult === "correct") {
      // Options already pre-generated, just switch to rectify phase
      setPhase("rectify");
    }
    setDeductionResult(null);
  };

  const submitRectifyChoice = () => {
    const chosenOption = rectificationOptions.find(
      (opt) => opt.id === selectedOption
    );
    if (chosenOption) {
      setRectifyResult(chosenOption);
      if (chosenOption.isCorrect) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
        });
      }
      setShowRectifyResultModal(true);
    }
  };

  const proceedAfterRectify = () => {
    setShowRectifyResultModal(false);
    if (rectifyResult?.isCorrect) {
      setPhase("verdict");
    }
    setRectifyResult(null);
    setSelectedOption(null);
  };

  return (
    <>
      {/* Onboarding Modal - renders even during loading so user reads while case generates */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
        >
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl sm:text-3xl font-serif flex items-center justify-center gap-2">
              Welcome! <span className="text-2xl sm:text-4xl">🔍</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-1 sm:mt-2 text-center">
              Master the CO-STAR prompt engineering framework through fun
              mystery puzzles!
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 sm:py-6 space-y-3 sm:space-y-6">
            {/* Three Modes Section */}
            <div className="grid gap-3 sm:gap-4">
              <h3 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wider text-center mx-auto">
                Choose Your Challenge
              </h3>

              {/* Detective Mode */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="bg-blue-600 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base sm:text-lg text-blue-900">
                    🔎 Solve
                  </p>
                  <p className="text-blue-700 text-xs sm:text-sm">
                    Find missing CO-STAR elements and fix flawed prompts!
                  </p>
                </div>
              </div>

              {/* Auditor Mode */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="bg-red-600 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base sm:text-lg text-red-900">
                    🛡️ Audit
                  </p>
                  <p className="text-red-700 text-xs sm:text-sm">
                    Spot hallucinations in AI generated outputs!
                  </p>
                </div>
              </div>

              {/* Sandbox Mode */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="bg-emerald-600 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base sm:text-lg text-emerald-900">
                    🧪 Practice
                  </p>
                  <p className="text-emerald-700 text-xs sm:text-sm">
                    Write prompts with real-time CO-STAR AI mentor feedback!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={dismissOnboarding}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
              size="lg"
            >
              Start Playing!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show loading background while onboarding is visible and case is loading */}
      {phase === "loading" && (
        <main className="min-h-screen flex items-center justify-center bg-white pb-20 md:pb-14">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">🔍</div>
            <p className="text-stone-600 font-serif italic">
              Preparing your case...
            </p>
          </div>
        </main>
      )}

      {phase !== "loading" && (
        <>
          {/* Deduction Result Modal */}
          <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle
                  className={`text-2xl font-serif ${
                    deductionResult === "correct"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {deductionResult === "correct"
                    ? "🎉 Correct Deduction!"
                    : "❌ Not Quite Right"}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {deductionResult === "correct" ? (
                  <div className="space-y-3">
                    <p className="text-stone-600">
                      Excellent detective work! The flawed element was indeed{" "}
                      <strong className="text-green-700">
                        {caseData?.botchedElement?.toUpperCase()}
                      </strong>
                      .
                    </p>
                    <p className="text-sm text-stone-500">
                      {caseData?.botchedExplanation}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-stone-600">
                      Your deduction was{" "}
                      <strong className="text-red-600">
                        {selectedElement?.toUpperCase()}
                      </strong>
                      , but that&apos;s not the culprit.
                    </p>
                    <p className="text-sm text-stone-500">
                      Look more carefully at the evidence. What&apos;s missing
                      from the original prompt that caused this flawed output?
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-row gap-2">
                <Button onClick={proceedAfterDeduction} className="flex-1">
                  {deductionResult === "correct"
                    ? "Rectify the Prompt →"
                    : "Try Again"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Rectify Result Modal */}
          <Dialog
            open={showRectifyResultModal}
            onOpenChange={setShowRectifyResultModal}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle
                  className={`text-2xl font-serif ${
                    rectifyResult?.isCorrect ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {rectifyResult?.isCorrect
                    ? "🎉 Case Solved!"
                    : "❌ Wrong Choice"}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-stone-600 mb-3">
                  {rectifyResult?.explanation}
                </p>
                {!rectifyResult?.isCorrect && (
                  <p className="text-sm text-stone-500">
                    Look at the flaw again and choose the prompt that
                    specifically addresses the{" "}
                    {caseData?.botchedElement?.toUpperCase()} issue.
                  </p>
                )}
              </div>
              <DialogFooter className="flex-row gap-2">
                <Button onClick={proceedAfterRectify} className="flex-1">
                  {rectifyResult?.isCorrect ? "View Summary →" : "Try Again"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Header + CO-STAR Badges - Scrollable */}
          <div className="bg-white pb-2 md:pb-4">
            <div className="max-w-6xl mx-auto pt-2 md:pt-4">
              {/* Header */}
              <header className="text-center mb-4">
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800">
                  The Prompt Detective
                </h1>
                <p className="text-stone-600 mt-1 text-sm md:text-base px-4">
                  Master the CO-STAR Framework Through Mystery Puzzles
                </p>
              </header>

              {/* CO-STAR Legend - Responsive */}
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 px-2 mb-4">
                {CO_STAR_ELEMENTS.map((el) => (
                  <Badge
                    key={el.key}
                    variant="outline"
                    className={`${el.color} border-0 text-xs sm:text-sm py-1 sm:py-1.5 px-2 sm:px-4 font-semibold`}
                  >
                    {el.label}
                  </Badge>
                ))}
              </div>

              {/* Mode Selector - Horizontal for all screen sizes */}
              <div className="flex justify-center gap-2 max-w-md mx-auto px-2">
                <button
                  onClick={() => setMode("detective")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                    mode === "detective"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white border border-stone-200 text-stone-600 hover:border-blue-300"
                  }`}
                >
                  <Search className="w-5 h-5" />
                  <span className="text-sm font-medium">Solve</span>
                </button>
                <button
                  onClick={() => setMode("auditor")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                    mode === "auditor"
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-white border border-stone-200 text-stone-600 hover:border-red-300"
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-sm font-medium">Audit</span>
                </button>
                <button
                  onClick={() => setMode("sandbox")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                    mode === "sandbox"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-white border border-stone-200 text-stone-600 hover:border-emerald-300"
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                  <span className="text-sm font-medium">Practice</span>
                </button>
              </div>
            </div>
          </div>

          <main className="bg-white p-2 md:p-4 pb-20 md:pb-16">
            <div className="max-w-6xl mx-auto w-full">
              {/* Main Content Area */}
              <div className="flex-1 max-w-4xl w-full mx-auto">
                {/* Detective Mode */}
                {mode === "detective" &&
                  phase === "investigate" &&
                  caseData && (
                    <div className="space-y-4 max-w-4xl mx-auto">
                      {/* Header */}
                      <div className="text-center">
                        <Badge className="bg-red-600 text-white mb-2">
                          Case #{caseData.id}
                        </Badge>
                        <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-800">
                          {caseData.title}
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">
                          🔎 Find the missing CO-STAR element!
                        </p>
                      </div>

                      {/* Case File Card */}
                      <Card className="border-stone-300 shadow-lg bg-[#f5f0e8]">
                        <CardHeader className="p-2.5 pb-1.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="font-serif text-lg md:text-xl leading-tight text-stone-800 flex items-start gap-2">
                                <span className="text-xl md:text-2xl">📖</span>
                                <span className="underline decoration-stone-600 underline-offset-4 decoration-2">
                                  Backstory
                                </span>
                              </CardTitle>
                              <CardDescription className="text-xs mt-1 text-stone-600 ml-8">
                                Read the context to understand the situation.
                              </CardDescription>
                            </div>
                            <span className="bg-stone-200/80 text-stone-700 text-xs font-bold px-2.5 py-1 rounded-full border border-stone-300 shadow-sm">
                              📂 CASE FILE
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-2.5 pt-0">
                          <div className="bg-white/70 p-2.5 rounded-lg border border-stone-200">
                            <p className="text-stone-700 italic text-sm md:text-base leading-relaxed">
                              {caseData.backstory}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Investigation Card */}
                      <Card className="border-stone-300 shadow-lg bg-white">
                        <CardHeader className="p-2.5 pb-1.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="font-serif text-lg md:text-xl leading-tight text-stone-800 flex items-start gap-2">
                                <span className="text-xl md:text-2xl">🧪</span>
                                <span className="underline decoration-stone-500 underline-offset-4 decoration-2">
                                  Evidence Analysis
                                </span>
                              </CardTitle>
                              <CardDescription className="text-xs mt-1 text-stone-600 ml-8">
                                Analyze the flawed interaction for clues.
                              </CardDescription>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                              🧪 INVESTIGATION
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-2.5 pt-0">
                          <div className="grid md:grid-cols-2 gap-2.5">
                            {/* Evidence Panel */}
                            <div className="bg-red-50 p-2.5 rounded-lg border border-red-200">
                              <p className="text-red-600 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                                <span className="text-base">⚠️</span> FLAWED AI
                                OUTPUT
                              </p>
                              <p className="text-stone-700 leading-relaxed text-sm md:text-base font-mono">
                                {caseData.faultyOutput}
                              </p>
                            </div>

                            {/* Suspect Prompt Panel */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <p className="text-slate-500 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                                <span className="text-base">📝</span> SUSPECT
                                PROMPT
                              </p>
                              <p className="text-stone-700 leading-relaxed text-sm md:text-base italic">
                                &quot;{caseData.faultyPrompt}&quot;
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Detective's Notebook Card */}
                      <Card className="border-stone-300 shadow-lg bg-blue-50">
                        <CardHeader className="p-2.5 pb-1.5">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="font-serif text-lg md:text-xl leading-tight text-stone-800 flex items-start gap-2">
                                <span className="text-xl md:text-2xl">🕵️</span>
                                <span className="underline decoration-stone-500 underline-offset-4 decoration-2">
                                  Detective&apos;s Notebook
                                </span>
                              </CardTitle>
                              <CardDescription className="text-xs mt-1 text-stone-600 ml-8">
                                Which CO-STAR element was missing or flawed?
                              </CardDescription>
                            </div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200 shadow-sm">
                              🕵️ NOTEBOOK
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-2.5 pt-0 space-y-2.5">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {CO_STAR_ELEMENTS.map((el) => (
                              <button
                                key={el.key}
                                onClick={() =>
                                  setSelectedElement(
                                    selectedElement === el.key ? null : el.key
                                  )
                                }
                                className={`p-2.5 md:p-3 rounded-xl border-2 transition-all duration-200 text-left flex flex-col justify-center min-h-12.5 md:min-h-15 ${
                                  selectedElement === el.key
                                    ? "border-blue-600 bg-blue-600 text-white shadow-lg scale-[1.02] ring-2 ring-blue-200"
                                    : `border-stone-200 hover:border-stone-300 ${el.color} hover:shadow-md hover:scale-[1.01]`
                                }`}
                              >
                                <span className="font-bold text-xs md:text-sm leading-tight mb-0.5">
                                  {el.label}
                                </span>
                                <span
                                  className={`text-[10px] md:text-xs leading-tight ${
                                    selectedElement === el.key
                                      ? "text-blue-100"
                                      : "opacity-75"
                                  }`}
                                >
                                  {el.description}
                                </span>
                              </button>
                            ))}
                          </div>

                          <Button
                            onClick={submitGuess}
                            disabled={!selectedElement}
                            className="w-full bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
                            size="lg"
                          >
                            Submit Answer →
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                {phase === "rectify" && caseData && (
                  <Card className="border-stone-300 shadow-lg max-w-4xl mx-auto">
                    <CardHeader className="py-4 md:py-5 text-center border-b border-stone-200">
                      <Badge className="w-fit mx-auto mb-2 bg-green-600 text-xs px-3 py-1">
                        CORRECT DEDUCTION
                      </Badge>
                      <CardTitle className="font-serif text-xl md:text-2xl">
                        Choose the Correct Prompt
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Select the prompt that best fixes the{" "}
                        <span className="font-semibold text-stone-700">
                          {caseData.botchedElement.toUpperCase()}
                        </span>{" "}
                        issue.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 space-y-4">
                      <div className="bg-amber-50 p-3 md:p-4 rounded-lg border border-amber-200">
                        <p className="text-sm md:text-base text-amber-800">
                          <strong>The Flaw:</strong>{" "}
                          {caseData.botchedExplanation}
                        </p>
                      </div>

                      {isLoadingOptions ? (
                        <div className="text-center py-8">
                          <div className="animate-pulse text-4xl mb-3">🔍</div>
                          <p className="text-stone-600 font-serif italic">
                            Generating prompt options...
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          {rectificationOptions.map((option) => {
                            const letterColors: Record<string, string> = {
                              A: "bg-blue-600",
                              B: "bg-emerald-600",
                              C: "bg-indigo-600",
                              D: "bg-rose-600",
                            };
                            return (
                              <button
                                key={option.id}
                                onClick={() =>
                                  setSelectedOption(
                                    selectedOption === option.id
                                      ? null
                                      : option.id
                                  )
                                }
                                className={`p-4 text-left rounded-xl border-2 transition-all hover:shadow-lg ${
                                  selectedOption === option.id
                                    ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200"
                                    : "border-stone-200 hover:border-stone-300 bg-white"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                      selectedOption === option.id
                                        ? "bg-blue-700"
                                        : letterColors[option.id] ||
                                          "bg-stone-400"
                                    }`}
                                  >
                                    {option.id}
                                  </span>
                                  <p className="text-stone-700 text-sm md:text-base leading-relaxed flex-1">
                                    &quot;{option.promptText}&quot;
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <Button
                        onClick={submitRectifyChoice}
                        disabled={!selectedOption || isLoadingOptions}
                        className="w-full mt-4"
                        size="lg"
                      >
                        Submit Answer
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {phase === "verdict" && caseData && (
                  <Card className="border-stone-300 shadow-lg max-w-4xl mx-auto">
                    <CardHeader className="text-center border-b border-stone-200">
                      <Badge className="bg-green-600 w-fit mx-auto mb-2">
                        CASE CLOSED
                      </Badge>
                      <CardTitle className="font-serif text-2xl mt-2">
                        🎉 Congratulations, Detective!
                      </CardTitle>
                      <CardDescription>
                        You successfully identified and rectified the prompt
                        flaw.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      {/* Case Summary */}
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-xs text-green-600 mb-2 font-semibold">
                          THE FLAW:
                        </p>
                        <p className="text-stone-700 text-sm">
                          The original prompt was missing proper{" "}
                          <strong>
                            {caseData.botchedElement.toUpperCase()}
                          </strong>{" "}
                          specification.
                        </p>
                        <p className="text-stone-600 text-sm mt-2">
                          {caseData.botchedExplanation}
                        </p>
                      </div>

                      {/* Ideal Prompt Reveal */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-600 mb-2 font-semibold">
                          💡 IDEAL PROMPT:
                        </p>
                        <p className="text-stone-700 text-sm">
                          &quot;{caseData.idealPrompt}&quot;
                        </p>
                      </div>

                      <Button
                        onClick={loadNewCase}
                        className="w-full"
                        size="lg"
                      >
                        🔍 Take on New Case
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Auditor Mode - Simplified Card-Based UI */}
                {mode === "auditor" && phase === "auditing" && auditData && (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center">
                      <Badge className="bg-red-600 text-white mb-2">
                        Case #{auditData.id}
                      </Badge>
                      <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-800">
                        {auditData.title}
                      </h2>
                      <p className="text-stone-500 text-sm mt-1">
                        🔍 Find the AI mistakes!
                      </p>
                    </div>

                    {/* The Prompt */}
                    <Card className="border-blue-200 bg-blue-50/50">
                      <CardContent className="p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                          📋 The Prompt
                        </p>
                        <p className="text-sm sm:text-base text-stone-700 italic">
                          "{auditData.originalPrompt}"
                        </p>
                      </CardContent>
                    </Card>

                    {/* AI Response - Interactive Text Block */}
                    <Card className="border-stone-300 shadow-sm bg-white overflow-hidden">
                      <CardHeader className="bg-stone-50/50 pb-3 border-b border-stone-100">
                        <div className="flex items-center justify-between">
                          <CardTitle className="font-serif text-lg text-stone-800 flex items-center gap-2">
                            <span>🤖</span> AI Response
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className="font-normal text-stone-500 bg-white"
                          >
                            {showAuditResult
                              ? "Review Results"
                              : "Click sentences to flag"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <p className="text-lg leading-loose text-stone-700 font-serif">
                          {(
                            auditData.sentences ||
                            auditData.aiOutput
                              .split(/(?<=[.!?])\s+/)
                              .filter((s) => s.trim())
                          ).map((sentence, idx) => {
                            const isFlagged = flaggedBugs.includes(sentence);
                            const isBug = auditData.bugs.some(
                              (b) =>
                                b.text.includes(sentence) ||
                                sentence.includes(b.text)
                            );

                            // Determine styles based on state
                            let spanClass =
                              "inline-block mr-1.5 px-1 py-0.5 rounded transition-all cursor-pointer select-none decoration-2 underline-offset-4";

                            if (showAuditResult) {
                              if (isBug && isFlagged) {
                                // Correctly identified
                                spanClass +=
                                  " bg-emerald-200 text-emerald-900 font-semibold";
                              } else if (isBug && !isFlagged) {
                                // Missed bug
                                spanClass +=
                                  " bg-amber-100 text-amber-900 border-b-2 border-amber-400";
                              } else if (!isBug && isFlagged) {
                                // False positive
                                spanClass +=
                                  " bg-stone-200 text-stone-400 line-through decoration-stone-400";
                              } else {
                                // Correctly ignored
                                spanClass += " hover:bg-stone-100 opacity-60";
                              }
                            } else {
                              // Interactive mode
                              if (isFlagged) {
                                spanClass +=
                                  " bg-red-100 text-red-900 underline decoration-red-400 font-medium";
                              } else {
                                spanClass +=
                                  " hover:bg-stone-100 hover:text-stone-900 hover:underline decoration-stone-300";
                              }
                            }

                            return (
                              <span
                                key={idx}
                                onClick={() => {
                                  if (showAuditResult) return;
                                  setFlaggedBugs((prev) =>
                                    prev.includes(sentence)
                                      ? prev.filter((s) => s !== sentence)
                                      : [...prev, sentence]
                                  );
                                }}
                                className={spanClass}
                                title={
                                  showAuditResult && isBug
                                    ? "This segment contains a hallucination"
                                    : undefined
                                }
                              >
                                {sentence}
                              </span>
                            );
                          })}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {!showAuditResult && (
                        <Button
                          variant="outline"
                          onClick={loadAuditCase}
                          className="flex-1"
                        >
                          Skip Case
                        </Button>
                      )}
                      {!showAuditResult ? (
                        <Button
                          onClick={() => setShowAuditResult(true)}
                          disabled={flaggedBugs.length === 0}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          Check Answers
                        </Button>
                      ) : (
                        <Button
                          onClick={loadAuditCase}
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                          Next Case →
                        </Button>
                      )}
                    </div>

                    {/* Results - Simple Score */}
                    {showAuditResult && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Score */}
                        <Card className="border-stone-200 bg-stone-50 text-center py-4">
                          <div className="text-4xl font-bold text-stone-800">
                            {
                              auditData.bugs.filter((bug) =>
                                flaggedBugs.some(
                                  (f) =>
                                    f.includes(bug.text) || bug.text.includes(f)
                                )
                              ).length
                            }{" "}
                            / {auditData.bugs.length}
                          </div>
                          <p className="text-stone-500 text-sm mt-1">
                            {auditData.bugs.filter((bug) =>
                              flaggedBugs.some(
                                (f) =>
                                  f.includes(bug.text) || bug.text.includes(f)
                              )
                            ).length === auditData.bugs.length
                              ? "🌟 Perfect! You're an AI Detective!"
                              : auditData.bugs.filter((bug) =>
                                  flaggedBugs.some(
                                    (f) =>
                                      f.includes(bug.text) ||
                                      bug.text.includes(f)
                                  )
                                ).length >= 1
                              ? "👍 Good catch! Keep practicing!"
                              : "💪 Don't worry, try again!"}
                          </p>
                        </Card>

                        {/* Explanations */}
                        <div className="space-y-2">
                          {auditData.bugs.map((bug, i) => {
                            const wasFound = flaggedBugs.some(
                              (f) =>
                                f.includes(bug.text) || bug.text.includes(f)
                            );
                            return (
                              <div
                                key={i}
                                className={`p-3 rounded-lg border ${
                                  wasFound
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-amber-50 border-amber-200"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">
                                    {wasFound ? "✅" : "❌"}
                                  </span>
                                  <span
                                    className={`text-xs font-bold ${
                                      wasFound
                                        ? "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {wasFound
                                      ? "You found it!"
                                      : "Missed this one"}
                                  </span>
                                </div>
                                <p className="text-sm text-stone-700 font-medium">
                                  "{bug.text}"
                                </p>
                                <p className="text-xs text-stone-500 mt-1">
                                  {bug.explanation}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Simple Tip */}
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                          <p className="text-blue-800 text-sm">
                            💡 <span className="font-semibold">Tip:</span>{" "}
                            Always compare what was asked vs. what the AI wrote!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sandbox Mode - Prompt Lab */}
                {/* Sandbox Mode - Prompt Lab */}
                {/* Sandbox Mode - Prompt Lab */}
                {mode === "sandbox" && (
                  <div className="max-w-screen-2xl mx-auto space-y-8 px-4 md:px-8">
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-serif font-bold text-stone-800">
                        CO-STAR Prompt Lab
                      </h2>
                      <p className="text-stone-500 max-w-lg mx-auto">
                        Practice your prompt engineering skills. Write a prompt
                        and get instant feedback from your AI Mentor based on
                        the CO-STAR framework.
                      </p>
                    </div>

                    {/* Main Workspace - Vertical Stack */}
                    <div className="space-y-12">
                      {/* Top Section: Input */}
                      <div className="w-full">
                        <Card className="border-stone-200 shadow-sm bg-white overflow-hidden ring-1 ring-stone-900/5">
                          <div className="bg-stone-50/80 backdrop-blur-sm px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></span>
                              Input Console
                            </span>
                            <div className="flex gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-stone-200"></div>
                              <div className="w-2 h-2 rounded-full bg-stone-200"></div>
                              <div className="w-2 h-2 rounded-full bg-stone-200"></div>
                            </div>
                          </div>

                          <CardContent className="p-0">
                            <div className="relative">
                              <Textarea
                                placeholder="Type your prompt here..."
                                className="min-h-100 border-0 focus-visible:ring-0 resize-none p-6 text-lg leading-relaxed bg-white text-stone-700 placeholder:text-stone-300 font-medium"
                                value={sandboxPrompt}
                                onChange={(e) =>
                                  setSandboxPrompt(e.target.value)
                                }
                              />
                              {/* Quick Actions overlay or footer */}
                            </div>

                            <div className="bg-stone-50 border-t border-stone-100 p-4 space-y-4">
                              {/* Integrated Quick Start Templates */}
                              <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                                  Populate from Template
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    "Professional Email Request",
                                    "Creative Story Concept",
                                    "Detailed Product Review",
                                    "Code Debugging Request",
                                  ].map((label, i) => (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        const texts = [
                                          "Write a polite email to my manager asking for more time on the Q3 report.",
                                          "Give me a story idea about a time traveler who forgets their mission.",
                                          "Write a comprehensive review for the new iPhone 16 Pro focusing on camera quality.",
                                          "Debug this React component that isn't rendering the state update correctly.",
                                        ];
                                        setSandboxPrompt(texts[i]);
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium bg-white border border-stone-200 text-stone-600 rounded-md hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm"
                                    >
                                      ✨ {label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all h-14 text-lg font-bold tracking-wide rounded-xl"
                                onClick={handleSandboxSubmit}
                                disabled={isAnalyzing || !sandboxPrompt.trim()}
                              >
                                {isAnalyzing ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Analyzing Prompt Structure...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-5 h-5 mr-2 text-emerald-100" />
                                    Analyze Prompt
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Bottom Section: Feedback / Mentor */}
                      <div className="w-full">
                        {!mentorFeedback && !isAnalyzing ? (
                          <div className="h-full min-h-125 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/30">
                            <div className="w-28 h-28 rounded-2xl bg-emerald-600 shadow-xl shadow-emerald-600/20 border border-emerald-500 flex items-center justify-center mb-8">
                              <Cpu className="w-14 h-14 text-white" />
                            </div>
                            <h4 className="text-2xl font-serif font-bold text-stone-800 mb-3">
                              Your CO-STAR AI Mentor is Ready
                            </h4>
                            <p className="text-stone-500 text-base max-w-md leading-relaxed mb-10">
                              I'll analyze your prompt using the{" "}
                              <strong className="text-emerald-700 font-semibold">
                                CO-STAR framework
                              </strong>{" "}
                              (Context, Objective, Style, Tone, Audience,
                              Response) to ensure it's perfect.
                            </p>

                            <div className="grid grid-cols-3 gap-4 w-full max-w-lg opacity-40 grayscale">
                              {/* Visual placeholder grid */}
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className="h-2 w-full bg-stone-200 rounded-full"
                                ></div>
                              ))}
                            </div>
                          </div>
                        ) : isAnalyzing ? (
                          <div className="h-full min-h-125 flex flex-col items-center justify-center p-8 text-center border border-stone-200 rounded-2xl bg-white shadow-sm">
                            <Loader2 className="w-16 h-16 text-emerald-500 mb-6 animate-spin" />
                            <h4 className="text-xl font-medium text-stone-800">
                              Deconstructing Prompt...
                            </h4>
                            <p className="text-stone-400 text-base mt-2">
                              Applying CO-STAR framework analysis
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            {/* Overall Assessment Bubble - Light Theme */}
                            <div className="bg-linear-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 p-8 rounded-2xl shadow-md relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Sparkles className="w-48 h-48 text-indigo-600" />
                              </div>
                              <div className="relative z-10">
                                <h4 className="flex items-center gap-3 font-serif text-2xl font-bold text-indigo-950 mb-3">
                                  <Lightbulb className="w-6 h-6 text-indigo-600" />
                                  CO-STAR Mentor's Feedback
                                </h4>
                                <p className="text-stone-700 text-lg leading-relaxed font-medium">
                                  {mentorFeedback?.overallAssessment}
                                </p>
                              </div>
                            </div>

                            {/* CO-STAR Grid - 2 Columns (Dials side-by-side) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {
                                // We map manually or find the element to ensure specific icons/colors match
                                // CO_STAR_ELEMENTS definitions.
                                mentorFeedback?.feedback.map((item, i) => {
                                  // Find the matching definition to get colors and key
                                  const def =
                                    CO_STAR_ELEMENTS.find(
                                      (e) =>
                                        e.label.toLowerCase() ===
                                        item.element.toLowerCase()
                                    ) || CO_STAR_ELEMENTS[i];

                                  // Map icons
                                  const Icon =
                                    {
                                      context: BookOpen,
                                      objective: Target,
                                      style: Palette,
                                      tone: MessageSquare,
                                      audience: Users,
                                      response: FileText,
                                    }[def.key] || Sparkles;

                                  const isComplete = item.status === "complete";
                                  const isPartial = item.status === "partial";

                                  return (
                                    <Card
                                      key={i}
                                      className={`border transition-colors ${
                                        isComplete
                                          ? "border-emerald-100 bg-emerald-50/10"
                                          : isPartial
                                          ? "border-amber-100 bg-amber-50/10"
                                          : "border-red-100 bg-red-50/10"
                                      }`}
                                    >
                                      <CardContent className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                          <div className="flex items-center gap-3">
                                            <div
                                              className={`p-2.5 rounded-xl ${
                                                def.color.split(" ")[0]
                                              } bg-opacity-30`}
                                            >
                                              <Icon
                                                className={`w-5 h-5 ${
                                                  def.color.split(" ")[1]
                                                }`}
                                              />
                                            </div>
                                            <span className="font-bold text-lg text-stone-800">
                                              {item.element}
                                            </span>
                                          </div>
                                          {/* Status Icon: Tick or Cross */}
                                          {isComplete ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                              <CheckCircle2 className="w-5 h-5" />
                                              <span className="text-xs font-bold uppercase tracking-wider">
                                                Present
                                              </span>
                                            </div>
                                          ) : isPartial ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                                              <AlertCircle className="w-5 h-5" />
                                              <span className="text-xs font-bold uppercase tracking-wider">
                                                Partial
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 rounded-full">
                                              <XCircle className="w-5 h-5" />
                                              <span className="text-xs font-bold uppercase tracking-wider">
                                                Missing
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        <p className="text-stone-600 leading-relaxed text-[15px]">
                                          {item.comment}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  );
                                })
                              }
                            </div>

                            {/* Improved Prompt Preview */}
                            {mentorFeedback?.improvedPrompt && (
                              <Card className="border-stone-200 bg-emerald-50/50 overflow-hidden ring-1 ring-emerald-100/50">
                                <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Improved Version
                                  </span>
                                  <span className="text-[10px] text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">
                                    Optimized for CO-STAR
                                  </span>
                                </div>
                                <CardContent className="p-5 font-medium text-stone-700 leading-relaxed text-[15px]">
                                  {mentorFeedback.improvedPrompt}
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* End Main Content Area */}
            </div>
          </main>

          <footer className="w-full md:fixed md:bottom-0 md:left-0 md:right-0 bg-white/95 backdrop-blur-sm md:border-t border-stone-200 py-2.5 z-50">
            <div className="max-w-360 mx-auto px-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-y-2">
              {/* Spacer for centering logic */}
              <div className="hidden md:block"></div>

              {/* Center: Links */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-stone-600">
                <a
                  href="https://antigravity.google"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 group"
                >
                  <Image
                    src="/antigravity-icon.png"
                    alt="Antigravity"
                    width={18}
                    height={18}
                    className="h-4 w-4"
                  />
                  <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                    Built with Antigravity
                  </span>
                </a>

                <span className="text-stone-300">|</span>

                <a
                  href="https://blog.google/products/gemini/gemini-3-flash/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 group"
                >
                  <Image
                    src="/gemini-icon.svg"
                    alt="Gemini"
                    width={18}
                    height={18}
                    className="h-4 w-4"
                  />
                  <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                    Powered by Gemini 3 Flash
                  </span>
                </a>

                <span className="text-stone-300 hidden sm:inline">|</span>

                <a
                  href="https://www.tech.gov.sg/technews/mastering-the-art-of-prompt-engineering-with-empower/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 group"
                  title="Read about the CO-STAR framework"
                >
                  <img
                    src="https://isomer-user-content.by.gov.sg/85/c4c99415-74e9-47da-ad2d-7e1b5be60deb/GovTech%20Stacked%20Logo_V4.gif"
                    alt="GovTech Singapore"
                    className="h-6 w-auto object-contain"
                  />
                  <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                    Inspired by GovTech&apos;s CO-STAR Framework
                  </span>
                </a>

                <span className="text-stone-300 hidden sm:inline">|</span>

                <a
                  href="https://www.akileshjayakumar.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 group"
                >
                  <span className="text-stone-600">made by</span>
                  <span>👨‍💻</span>
                  <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                    akileshjayakumar.com
                  </span>
                </a>

                <span className="text-stone-300">|</span>

                <span className="text-sm text-stone-700 font-medium">
                  Dec 2025
                </span>
              </div>

              {/* Right: Spacer */}
              <div className="hidden md:block"></div>
            </div>
          </footer>
        </>
      )}

      {/* Footer - Always visible */}
      {phase === "loading" && (
        <footer className="w-full md:fixed md:bottom-0 md:left-0 md:right-0 bg-white/95 backdrop-blur-sm md:border-t border-stone-200 py-2.5 z-50">
          <div className="max-w-360 mx-auto px-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-y-2">
            {/* Spacer for centering logic */}
            <div className="hidden md:block"></div>

            {/* Center: Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-stone-600">
              <a
                href="https://antigravity.google"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 group"
              >
                <Image
                  src="/antigravity-icon.png"
                  alt="Antigravity"
                  width={18}
                  height={18}
                  className="h-4 w-4"
                />
                <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                  Built with Antigravity
                </span>
              </a>

              <span className="text-stone-300">|</span>

              <a
                href="https://ai.google.dev/gemini-api/docs/gemini-3"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 group"
              >
                <Image
                  src="/gemini-icon.svg"
                  alt="Gemini"
                  width={18}
                  height={18}
                  className="h-4 w-4"
                />
                <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                  Powered by Gemini 3 Flash
                </span>
              </a>

              <span className="text-stone-300 hidden sm:inline">|</span>

              <a
                href="https://www.tech.gov.sg/technews/mastering-the-art-of-prompt-engineering-with-empower/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 group"
                title="Read about the CO-STAR framework"
              >
                <img
                  src="https://isomer-user-content.by.gov.sg/85/c4c99415-74e9-47da-ad2d-7e1b5be60deb/GovTech%20Stacked%20Logo_V4.gif"
                  alt="GovTech Singapore"
                  className="h-6 w-auto object-contain"
                />
                <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                  Inspired by GovTech&apos;s CO-STAR Framework
                </span>
              </a>

              <span className="text-stone-300 hidden sm:inline">|</span>

              <a
                href="https://www.akileshjayakumar.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 group"
              >
                <span className="text-stone-600">made by</span>
                <span>👨‍💻</span>
                <span className="underline underline-offset-4 decoration-stone-500 group-hover:decoration-stone-900 group-hover:text-stone-900 group-hover:-translate-y-0.5 transition-all inline-block">
                  akileshjayakumar.com
                </span>
              </a>

              <span className="text-stone-300">|</span>

              <span className="text-sm text-stone-700 font-medium">
                Dec 2025
              </span>
            </div>

            {/* Right: Spacer */}
            <div className="hidden md:block"></div>
          </div>
        </footer>
      )}
    </>
  );
}
