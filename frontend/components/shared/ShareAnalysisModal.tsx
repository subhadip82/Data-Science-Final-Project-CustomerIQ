"use client";

import { useState } from "react";
import { X, Mail, Link as LinkIcon, Check, Loader2, Send, ShieldCheck, AlertCircle } from "lucide-react";
import { useApi } from "@/lib/hooks/useApi";
import { shareApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ShareAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId?: string;
  datasetName?: string;
  reportId?: string;
}

export function ShareAnalysisModal({
  isOpen,
  onClose,
  datasetId,
  datasetName = "Dataset Analysis",
  reportId,
}: ShareAnalysisModalProps) {
  const { request } = useApi();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeVisualizations, setIncludeVisualizations] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includeReportLink, setIncludeReportLink] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      setStatusMessage({ type: "error", text: "Please enter a valid recipient email address." });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    const sections: string[] = [];
    if (includeSummary) sections.push("summary");
    if (includeVisualizations) sections.push("visualizations");
    if (includeInsights) sections.push("insights");
    if (includeRecommendations) sections.push("recommendations");
    if (includeReportLink) sections.push("report_link");

    try {
      await request((token) =>
        shareApi.sendEmail(token, {
          recipient_email: recipientEmail,
          dataset_id: datasetId,
          report_id: reportId,
          custom_message: customMessage || undefined,
          include_sections: sections,
        })
      );
      setStatusMessage({
        type: "success",
        text: `Analysis report was successfully sent to ${recipientEmail}!`,
      });
      setRecipientEmail("");
      setCustomMessage("");
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to dispatch email. Please retry.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopySecureLink = async () => {
    setIsCreatingLink(true);
    setStatusMessage(null);

    const sections: string[] = [];
    if (includeSummary) sections.push("summary");
    if (includeVisualizations) sections.push("visualizations");
    if (includeInsights) sections.push("insights");
    if (includeRecommendations) sections.push("recommendations");

    try {
      const res = await request((token) =>
        shareApi.createLink(token, {
          dataset_id: datasetId,
          report_id: reportId,
          title: `Analysis: ${datasetName}`,
          allowed_sections: sections,
          expires_in_days: 7,
        })
      );

      const fullUrl = `${window.location.origin}${res.share_url}`;
      setGeneratedLink(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      setStatusMessage({
        type: "success",
        text: "Secure signed link copied to clipboard! (Expires in 7 days)",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to generate secure link.",
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-card bg-background/95 border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Share Analysis</h2>
              <p className="text-xs text-muted-foreground truncate max-w-xs">{datasetName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {statusMessage && (
            <div
              className={cn(
                "p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border",
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              )}
            >
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Recipient Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Optional Message / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Here are the key takeaways from our latest dataset..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none resize-none"
              />
            </div>

            {/* Checkboxes for included sections */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Include in email & report:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-foreground text-xs">Summary KPIs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVisualizations}
                    onChange={(e) => setIncludeVisualizations(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-foreground text-xs">Visualizations</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInsights}
                    onChange={(e) => setIncludeInsights(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-foreground text-xs">Insights</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRecommendations}
                    onChange={(e) => setIncludeRecommendations(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-foreground text-xs">Recommendations</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={includeReportLink}
                    onChange={(e) => setIncludeReportLink(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-foreground text-xs">Interactive Secure Report Link</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopySecureLink}
                disabled={isCreatingLink}
                className="px-3.5 py-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                {isCreatingLink ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5 text-primary" />
                )}
                {copied ? "Link Copied!" : "Copy Secure Link"}
              </button>

              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2.5 rounded-xl gradient-primary text-white text-xs font-semibold hover:opacity-90 shadow-md flex items-center gap-2 transition-all ml-auto"
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Email
              </button>
            </div>
          </form>

          {/* Security footnote */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 border-t border-border/40 pt-3">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span>
              Recipients only view permitted summary data. No internal workspace or account access is granted.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
