import Link from "next/link";
import { ShoppingBag, ArrowRight, Zap, Target, Repeat, HeartHandshake } from "lucide-react";

export default function SolutionsPage() {
  const solutions = [
    {
      badge: "RETENTION & LOYALTY",
      title: "Prevent Churn Before It Happens",
      description: "Detect slipping purchase velocity weeks before customers disappear. Automatically flag at-risk cohorts and trigger targeted win-back campaigns.",
      metrics: ["-28% Churn Rate", "3.4x ROI on Win-backs"],
      icon: Repeat
    },
    {
      badge: "CUSTOMER LIFETIME VALUE",
      title: "VIP Maximisation & High-Yield Upgrades",
      description: "Identify the top 10% of customers that generate 40%+ of your profit. Provide white-glove treatment and curated bundles tailored to high spenders.",
      metrics: ["+45% LTV Growth", "82% VIP Retention"],
      icon: Target
    },
    {
      badge: "MARKETING EFFICIENCY",
      title: "Eliminate Spray-and-Pray Ad Spend",
      description: "Stop spending acquisition dollars on churned audiences. Sync hyper-specific cohorts directly to Meta Ads, Google Ads, and Klaviyo campaigns.",
      metrics: ["-35% CAC", "2.1x ROAS on Cohorts"],
      icon: Zap
    },
    {
      badge: "MERCHANDISING & EXPANSION",
      title: "Cross-Selling & Category Expansion",
      description: "Discover which products act as gateway items to high-value loyalty. Target one-time purchasers with the exact SKU proven to unlock repeat orders.",
      metrics: ["+22% Repeat Purchase Rate", "+18% Basket Size"],
      icon: ShoppingBag
    }
  ];

  return (
    <div className="gradient-hero min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/80 mb-4">
            SOLUTIONS & USE CASES
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Built for Real E-commerce Objectives
          </h1>
          <p className="text-base sm:text-lg text-white/60">
            Tailored workflows designed specifically for DTC brands, multi-brand retailers, and marketplace sellers.
          </p>
        </div>

        <div className="space-y-6 mb-16">
          {solutions.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="glass rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 card-hover">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-400 tracking-wider mb-1 block">{s.badge}</span>
                    <h3 className="text-white text-xl font-bold mb-2">{s.title}</h3>
                    <p className="text-white/60 text-sm max-w-xl leading-relaxed">{s.description}</p>
                  </div>
                </div>
                <div className="flex flex-row md:flex-col gap-3 shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  {s.metrics.map((m) => (
                    <div key={m} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-center">
                      <span className="text-xs font-bold text-emerald-400">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Transform your customer data today</h2>
          <p className="text-white/60 text-sm mb-6 max-w-xl mx-auto">
            Experience the power of automated segmentation and predictive analytics on your store.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white gradient-primary hover:opacity-90 transition-all shadow-lg"
          >
            Launch CustomerIQ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
