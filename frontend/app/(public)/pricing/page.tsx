import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      description: "For emerging stores looking to understand customer cohorts and RFM scores.",
      price: "₹0",
      period: "Forever Free",
      popular: false,
      features: [
        "Up to 10,000 transaction rows",
        "Full RFM Quintile Scoring",
        "K-Means Clustering (4 Segments)",
        "2D PCA Visualisation",
        "Weekly CSV Data Ingestion",
        "Community Support",
      ],
      cta: "Get Started Free",
      href: "/sign-up"
    },
    {
      name: "Growth Pro",
      description: "For scaling brands needing automated business intelligence and actionable playbooks.",
      price: "₹3,999",
      period: "/month",
      popular: true,
      features: [
        "Up to 500,000 transaction rows",
        "Automated Rule-based Insights Engine",
        "Segment-specific Action Playbooks",
        "Full Sales Analytics & SKU Breakdown",
        "Unlimited CSV Uploads",
        "Automated Exportable Reports",
        "Priority Email & Slack Support",
      ],
      cta: "Start 14-Day Pro Trial",
      href: "/sign-up"
    },
    {
      name: "Enterprise",
      description: "For high-volume retail operations requiring custom ML tuning and dedicated data pipelines.",
      price: "Custom",
      period: "Contact Sales",
      popular: false,
      features: [
        "Unlimited transaction capacity",
        "Custom ML Feature Engineering",
        "Real-time Webhook & API Ingestion",
        "Dedicated PostgreSQL Instance",
        "Single Sign-On (SSO / SAML)",
        "Dedicated Data Scientist SLA",
      ],
      cta: "Talk to Sales",
      href: "/sign-up"
    }
  ];

  return (
    <div className="gradient-hero min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/80 mb-4">
            TRANSPARENT PRICING
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Simple Plans for Every Stage
          </h1>
          <p className="text-base sm:text-lg text-white/60">
            No hidden setup fees. Upgrade or cancel anytime as your store scales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`glass rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative ${
                p.popular ? "border-indigo-500/80 shadow-2xl shadow-indigo-500/20 scale-105 z-10" : ""
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider text-white gradient-primary uppercase">
                  MOST POPULAR
                </span>
              )}
              <div>
                <h3 className="text-white text-xl font-bold mb-2">{p.name}</h3>
                <p className="text-white/60 text-xs mb-6 min-h-[36px]">{p.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">{p.price}</span>
                  <span className="text-white/60 text-sm ml-2">{p.period}</span>
                </div>
                <ul className="space-y-3 pt-6 border-t border-white/10 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-white/80">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={p.href}
                className={`w-full py-3 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-2 ${
                  p.popular
                    ? "gradient-primary text-white hover:opacity-90 shadow-lg shadow-indigo-500/30"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                }`}
              >
                {p.cta} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
