"use client";

import { useState, useEffect } from "react";
import {
  generateCase,
  generateRectificationOptions,
  CaseData,
  RectificationOption,
} from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type GamePhase = "loading" | "investigate" | "rectify" | "verdict";

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [rectificationOptions, setRectificationOptions] = useState<
    RectificationOption[]
  >([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showRectifyResultModal, setShowRectifyResultModal] = useState(false);
  const [deductionResult, setDeductionResult] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [rectifyResult, setRectifyResult] =
    useState<RectificationOption | null>(null);

  useEffect(() => {
    // Always show onboarding on page load to remind users how the game works
    setShowOnboarding(true);
    loadNewCase();
  }, []);

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

    // Pre-generate rectification options in background while user investigates
    generateRectificationOptions(newCase).then((options) => {
      setRectificationOptions(options);
    });
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-serif">
              Welcome, Detective! 🔍
            </DialogTitle>
            <DialogDescription className="text-base">
              Learn how to write better AI prompts by solving fun puzzles!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-6">
            <div className="flex items-start gap-4">
              <div className="bg-stone-100 rounded-full w-10 h-10 flex items-center justify-center text-base font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold text-lg">Investigate the Puzzle</p>
                <p className="text-stone-500">
                  See what went wrong when someone asked an AI for help
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-stone-100 rounded-full w-10 h-10 flex items-center justify-center text-base font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold text-lg">Find the Problem</p>
                <p className="text-stone-500">
                  Figure out what was missing from the original prompt
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-stone-100 rounded-full w-10 h-10 flex items-center justify-center text-base font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold text-lg">Fix & Solve</p>
                <p className="text-stone-500">
                  Pick the improved prompt that solves the puzzle
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={dismissOnboarding} className="w-full" size="lg">
              Let&apos;s Play! 🕵️
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show loading background while onboarding is visible and case is loading */}
      {phase === "loading" && (
        <main className="min-h-screen flex items-center justify-center bg-stone-50 pb-20 md:pb-14">
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

          <main className="min-h-screen bg-stone-50 p-2 md:p-4 pb-20 md:pb-16">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <header className="text-center mb-3 pt-2">
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800">
                  The Prompt Detective
                </h1>
                <p className="text-stone-600 mt-1 text-sm md:text-base px-4">
                  Master the CO-STAR Framework Through Mystery Puzzles
                </p>
              </header>

              {/* CO-STAR Legend */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {CO_STAR_ELEMENTS.map((el) => (
                  <Badge
                    key={el.key}
                    variant="outline"
                    className={`${el.color} border-0 text-[10px] py-0 px-1.5 font-medium`}
                  >
                    {el.label}
                  </Badge>
                ))}
              </div>

              {phase === "investigate" && caseData && (
                <div className="space-y-4 max-w-6xl mx-auto">
                  {/* Case File Card */}
                  <Card className="border-stone-300 shadow-lg bg-[#f5f0e8]">
                    <CardHeader className="p-2.5 pb-1.5">
                      <div className="flex items-start justify-between">
                        <CardTitle className="font-serif text-lg md:text-xl leading-tight text-stone-800 flex items-start gap-2">
                          <span className="text-xl md:text-2xl">🔎</span>
                          <span>{caseData.title}</span>
                        </CardTitle>
                        <div className="flex flex-col items-end gap-1">
                          <span className="bg-stone-200/80 text-stone-700 text-xs font-bold px-2.5 py-1 rounded-full border border-stone-300 shadow-sm">
                            📂 CASE FILE
                          </span>
                          <Badge
                            variant="destructive"
                            className="text-[10px] py-0.5 px-2 font-semibold"
                          >
                            #{caseData.id}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2.5 pt-0">
                      <div className="bg-white/70 p-2.5 rounded-lg border border-stone-200">
                        <p className="text-stone-600 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                          <span className="text-base">📖</span> BACKSTORY
                        </p>
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
                        <CardTitle className="font-serif text-lg md:text-xl leading-tight text-stone-800 flex items-start gap-2">
                          <span className="text-xl md:text-2xl">🧪</span>
                          <span>Evidence Analysis</span>
                        </CardTitle>
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
                            <span className="text-base">📝</span> SUSPECT PROMPT
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
                            <span>Detective&apos;s Notebook</span>
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5 text-stone-600 ml-8">
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
                            className={`p-2.5 md:p-3 rounded-xl border-2 transition-all duration-200 text-left flex flex-col justify-center min-h-[50px] md:min-h-[60px] ${
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
                <Card className="border-stone-300 shadow-lg max-w-5xl mx-auto">
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
                        <strong>The Flaw:</strong> {caseData.botchedExplanation}
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
                                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
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
                <Card className="border-stone-300 shadow-lg max-w-3xl mx-auto">
                  <CardHeader className="text-center border-b border-stone-200">
                    <Badge className="bg-green-600 w-fit mx-auto mb-2">
                      CASE CLOSED
                    </Badge>
                    <CardTitle className="font-serif text-2xl mt-2">
                      🎉 Congratulations, Detective!
                    </CardTitle>
                    <CardDescription>
                      You successfully identified and rectified the prompt flaw.
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
                        <strong>{caseData.botchedElement.toUpperCase()}</strong>{" "}
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

                    <Button onClick={loadNewCase} className="w-full" size="lg">
                      🔍 Take on New Case
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>

          <footer className="w-full md:fixed md:bottom-0 md:left-0 md:right-0 bg-white/95 backdrop-blur-sm md:border-t border-stone-200 py-2 md:py-2.5 mt-4 md:mt-0 z-50">
            <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-2.5 md:gap-x-6 gap-y-1.5 text-stone-600 text-[10px] md:text-sm">
              <a
                href="https://antigravity.google"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-stone-800 transition-all hover:-translate-y-0.5 underline underline-offset-4"
              >
                <Image
                  src="/antigravity-icon.png"
                  alt="Antigravity"
                  width={18}
                  height={18}
                  className="h-3.5 w-3.5 md:h-5 md:w-5"
                />
                <span>Built with Antigravity</span>
              </a>

              <span className="text-stone-400">|</span>

              <a
                href="https://ai.google.dev/gemini-api/docs/gemini-3"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-stone-800 transition-all hover:-translate-y-0.5 underline underline-offset-4"
              >
                <Image
                  src="/gemini-icon.svg"
                  alt="Gemini"
                  width={18}
                  height={18}
                  className="h-3.5 w-3.5 md:h-5 md:w-5"
                />
                <span>Powered by Gemini 3 Flash</span>
              </a>

              <span className="hidden sm:inline text-stone-400">|</span>

              <a
                href="https://www.tech.gov.sg/technews/mastering-the-art-of-prompt-engineering-with-empower/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-stone-800 transition-all hover:-translate-y-0.5 underline underline-offset-4"
                title="Read about the CO-STAR framework"
              >
                <img
                  src="https://isomer-user-content.by.gov.sg/85/c4c99415-74e9-47da-ad2d-7e1b5be60deb/GovTech%20Stacked%20Logo_V4.gif"
                  alt="GovTech Singapore"
                  className="h-7 w-auto md:h-9 object-contain"
                />
                <span>Inspired by GovTech&apos;s CO-STAR framework</span>
              </a>

              <span className="hidden sm:inline text-stone-400">|</span>

              <a
                href="https://www.akileshjayakumar.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-stone-800 transition-all hover:-translate-y-0.5 font-medium sm:w-auto w-full justify-center"
              >
                <span>👨‍💻</span>
                <span className="underline underline-offset-4">
                  akileshjayakumar.com
                </span>
              </a>
            </div>
          </footer>
        </>
      )}

      {/* Footer - Always visible */}
      {phase === "loading" && (
        <footer className="w-full md:fixed md:bottom-0 md:left-0 md:right-0 bg-white/95 backdrop-blur-sm md:border-t border-stone-200 py-2 md:py-2.5 z-50">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-2.5 md:gap-x-6 gap-y-1.5 text-stone-600 text-[10px] md:text-sm">
            <a
              href="https://antigravity.google"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-stone-800 transition-colors underline underline-offset-4"
            >
              <Image
                src="/antigravity-icon.png"
                alt="Antigravity"
                width={18}
                height={18}
                className="h-3.5 w-3.5 md:h-5 md:w-5"
              />
              <span>Built with Antigravity</span>
            </a>

            <span className="text-stone-400">|</span>

            <a
              href="https://ai.google.dev/gemini-api/docs/gemini-3"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-stone-800 transition-colors underline underline-offset-4"
            >
              <Image
                src="/gemini-icon.svg"
                alt="Gemini"
                width={18}
                height={18}
                className="h-3.5 w-3.5 md:h-5 md:w-5"
              />
              <span>Powered by Gemini 3 Flash</span>
            </a>

            <span className="hidden sm:inline text-stone-400">|</span>

            <a
              href="https://www.tech.gov.sg/technews/mastering-the-art-of-prompt-engineering-with-empower/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-stone-800 transition-colors underline underline-offset-4"
              title="Read about the CO-STAR framework"
            >
              <img
                src="https://isomer-user-content.by.gov.sg/85/c4c99415-74e9-47da-ad2d-7e1b5be60deb/GovTech%20Stacked%20Logo_V4.gif"
                alt="GovTech Singapore"
                className="h-7 w-auto md:h-9 object-contain"
              />
              <span>Inspired by GovTech&apos;s CO-STAR framework</span>
            </a>

            <span className="hidden sm:inline text-stone-400">|</span>

            <a
              href="https://www.akileshjayakumar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-stone-800 transition-all hover:-translate-y-0.5 font-medium sm:w-auto w-full justify-center"
            >
              <span>👨‍💻</span>
              <span className="underline underline-offset-4">
                akileshjayakumar.com
              </span>
            </a>
          </div>
        </footer>
      )}
    </>
  );
}
