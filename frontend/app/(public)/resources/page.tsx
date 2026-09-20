import Link from "next/link";
import { BookOpen, FileCode, HelpCircle, Download, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ResourcesPage() {
  const guides = [
    {
      category: "METHODOLOGY",
      title: "The Ultimate Guide to RFM Analysis in 2024",
      description: "Learn how mathematical quintile scoring on Recency, Frequency, and Monetary dimensions outperforms blunt demographic grouping.",
      readTime: "8 min read"
    },
    {
      category: "MACHINE LEARNING",
      title: "Demystifying K-Means Clustering & PCA for DTC",
      description: "A plain-English breakdown of unsupervised learning, inertia curves, and how 2D Principal Component Analysis maps customer psychology.",
      readTime: "12 min read"
    },
    {
      category: "PLAYBOOK",
      title: "Win-Back Sequences That Actually Recover Churned Customers",
      description: "Tested email timing, discount decay psychology, and subject lines that revive lapsed shoppers without eroding margin.",
      readTime: "6 min read"
    }
  ];

  return (
    <div className="gradient-hero min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/80 mb-4">
            DOCUMENTATION & KNOWLEDGE
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Customer Intelligence Knowledge Hub
          </h1>
          <p className="text-base sm:text-lg text-white/60">
            Guides, templates, and specifications to help you master customer retention and predictive modeling.
          </p>
        </div>

        {/* Dataset Template Download Card */}
        <div className="glass rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 border-indigo-500/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white text-lg font-bold mb-1">Download Sample E-Commerce Dataset</h3>
              <p className="text-white/60 text-sm max-w-xl">
                Need sample data to test the platform? Download the standardized UCI Online Retail format CSV with 500+ customer records.
              </p>
            </div>
          </div>
          <a
            href="/data/sample_retail_data.csv"
            download
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all shrink-0"
          >
            Download CSV (2.4 MB)
          </a>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {guides.map((g) => (
            <div key={g.title} className="glass rounded-2xl p-6 flex flex-col justify-between card-hover">
              <div>
                <span className="text-[11px] font-bold text-indigo-400 tracking-wider mb-2 block">{g.category}</span>
                <h3 className="text-white text-base font-bold mb-2 leading-snug">{g.title}</h3>
                <p className="text-white/60 text-xs leading-relaxed mb-4">{g.description}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-white/40">
                <span>{g.readTime}</span>
                <span className="text-primary font-medium flex items-center gap-1">Read article <ArrowRight className="w-3 h-3" /></span>
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Have questions or need assistance?</h2>
          <p className="text-white/60 text-sm mb-6 max-w-xl mx-auto">
            Our engineering team is available to assist with custom pipeline configurations and API integrations.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white gradient-primary hover:opacity-90 transition-all shadow-lg"
          >
            Join CustomerIQ Community <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
