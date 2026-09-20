"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Play, Check, CheckCircle2, ChevronDown,
  Users, DollarSign, ShoppingCart, Tag, TrendingUp,
  BarChart2, PieChart, Shield, Lightbulb, Bell, UploadCloud,
  Rocket, ArrowUpRight, FileText, Activity, Layers, Sparkles, Send
} from "lucide-react";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#5B4DF6] selection:text-white">
      {/* ──────────────────────────────────────────────────────────────────────────
          HERO SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A0D1D] via-[#101633] to-[#F3F5FC] overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5B4DF6]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#EC4899]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Content (5 cols) */}
          <div className="lg:col-span-5 space-y-6 text-left z-10">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-md border border-[#5B4DF6]/30 shadow-sm">
              <span className="text-xs font-semibold text-[#5B4DF6] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5B4DF6]" />
                AI-Powered • Data-Driven • Actionable Insights
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.15] text-white">
              Turn E-commerce Data Into{" "}
              <span className="text-[#6C5CE7] block sm:inline">Customer Intelligence</span>
            </h1>

            {/* Subheading */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-lg">
              Analyze, segment and understand your customers better with AI-powered analytics and actionable business insights.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/sign-up"
                className="px-6 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#5B4DF6] to-[#7B42F6] hover:opacity-95 transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2"
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("mockup-preview");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-3.5 rounded-full text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 transition-all border border-slate-200 shadow-sm flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center">
                  <Play className="w-2.5 h-2.5 fill-slate-700 text-slate-700 ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            {/* Value Props / Checkmarks */}
            <div className="flex flex-wrap items-center gap-5 pt-2 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 14-Day Free Trial
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Cancel Anytime
              </span>
            </div>
          </div>

          {/* Right Column: Hero Interactive Dashboard Mockup (7 cols) */}
          <div id="mockup-preview" className="lg:col-span-7 z-10">
            <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-indigo-950/20 overflow-hidden text-slate-800 transition-all transform hover:scale-[1.005]">
              {/* Mockup Top Window Bar */}
              <div className="px-4 py-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-4">
                    <span className="w-1 h-2 rounded-full bg-[#6366F1]" />
                    <span className="w-1 h-3 rounded-full bg-[#A855F7]" />
                    <span className="w-1 h-4 rounded-full bg-[#EC4899]" />
                  </div>
                  <span className="font-bold text-xs text-slate-900 tracking-tight">CustomerIQ</span>
                </div>
                <div className="text-xs font-bold text-slate-700">Dashboard Overview</div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                    Last 30 Days <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#5B4DF6] text-white text-[10px] font-bold flex items-center justify-center">
                    S
                  </div>
                </div>
              </div>

              {/* Mockup Body: Mini-Sidebar + Main Dashboard */}
              <div className="grid grid-cols-12 min-h-[380px]">
                {/* Mini Sidebar (2 cols) */}
                <div className="hidden sm:block sm:col-span-3 border-r border-slate-100 bg-[#FAFBFD] p-2.5 space-y-1 text-[11px] font-medium text-slate-500">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#5B4DF6] text-white font-semibold shadow-sm">
                    <Layers className="w-3.5 h-3.5" /> Dashboard
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <BarChart2 className="w-3.5 h-3.5" /> Analytics
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <Users className="w-3.5 h-3.5" /> Customers
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <PieChart className="w-3.5 h-3.5" /> Segments
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <Activity className="w-3.5 h-3.5" /> RFM Analysis
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <TrendingUp className="w-3.5 h-3.5" /> Sales
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <Lightbulb className="w-3.5 h-3.5" /> Insights
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Recommendations
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" /> Upload Data
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <FileText className="w-3.5 h-3.5" /> Reports
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <Bell className="w-3.5 h-3.5" /> Notifications
                  </div>
                </div>

                {/* Main Content (9 cols) */}
                <div className="col-span-12 sm:col-span-9 p-3 sm:p-4 space-y-3 bg-white">
                  {/* Top 4 KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* Card 1 */}
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-[#F9FAFC]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#5B4DF6] flex items-center justify-center">
                          <Users className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">Total Customers</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900">24,532</div>
                      <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">↑ 12.5% vs last month</div>
                    </div>

                    {/* Card 2 */}
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-[#F9FAFC]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <DollarSign className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">Total Revenue</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900">₹48.2M</div>
                      <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">↑ 16.4% vs last month</div>
                    </div>

                    {/* Card 3 */}
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-[#F9FAFC]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <ShoppingCart className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">Total Orders</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900">82,340</div>
                      <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">↑ 15.3% vs last month</div>
                    </div>

                    {/* Card 4 */}
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-[#F9FAFC]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Tag className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">Avg Order Value</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900">₹1,965</div>
                      <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">↑ 8.0% vs last month</div>
                    </div>
                  </div>

                  {/* Middle Row: Revenue Chart + Segments Donut */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Revenue Over Time Chart (7 cols) */}
                    <div className="sm:col-span-7 p-2.5 rounded-xl border border-slate-100 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-800">Revenue Over Time</span>
                        <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5">
                          Last 30 Days <ChevronDown className="w-2.5 h-2.5" />
                        </span>
                      </div>
                      {/* SVG Line Chart */}
                      <div className="relative h-28 w-full pt-2">
                        <div className="absolute top-0 right-12 px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] font-semibold shadow z-10">
                          ₹4.2M <span className="text-slate-400 font-normal text-[8px]">May 24</span>
                        </div>
                        <svg viewBox="0 0 320 90" className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="revHeroGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#5B4DF6" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#5B4DF6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          <line x1="0" y1="20" x2="320" y2="20" stroke="#F1F5F9" strokeDasharray="2 2" />
                          <line x1="0" y1="45" x2="320" y2="45" stroke="#F1F5F9" strokeDasharray="2 2" />
                          <line x1="0" y1="70" x2="320" y2="70" stroke="#F1F5F9" strokeDasharray="2 2" />
                          {/* Area */}
                          <path
                            d="M 0 75 Q 30 65 60 70 T 120 50 T 180 40 T 240 20 T 280 35 T 320 25 L 320 85 L 0 85 Z"
                            fill="url(#revHeroGrad)"
                          />
                          {/* Line */}
                          <path
                            d="M 0 75 Q 30 65 60 70 T 120 50 T 180 40 T 240 20 T 280 35 T 320 25"
                            fill="none"
                            stroke="#5B4DF6"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          {/* Points */}
                          <circle cx="60" cy="70" r="2.5" fill="#5B4DF6" stroke="#fff" strokeWidth="1.5" />
                          <circle cx="120" cy="50" r="2.5" fill="#5B4DF6" stroke="#fff" strokeWidth="1.5" />
                          <circle cx="180" cy="40" r="2.5" fill="#5B4DF6" stroke="#fff" strokeWidth="1.5" />
                          <circle cx="240" cy="20" r="3.5" fill="#5B4DF6" stroke="#fff" strokeWidth="2" />
                          <circle cx="320" cy="25" r="2.5" fill="#5B4DF6" stroke="#fff" strokeWidth="1.5" />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-400 pt-1">
                        <span>May 1</span>
                        <span>May 6</span>
                        <span>May 11</span>
                        <span>May 16</span>
                        <span>May 21</span>
                        <span>May 26</span>
                        <span>May 30</span>
                      </div>
                    </div>

                    {/* Customer Segments Donut (5 cols) */}
                    <div className="sm:col-span-5 p-2.5 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[11px] font-bold text-slate-800 block mb-2">Customer Segments</span>
                      <div className="flex items-center gap-3">
                        {/* Donut graphic */}
                        <div className="relative w-20 h-20 shrink-0">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            {/* Segment 1: VIP Purple (18%) */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#8B5CF6" strokeWidth="4.5" strokeDasharray="18 100" strokeDashoffset="0" />
                            {/* Segment 2: Loyal Blue (31%) */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="4.5" strokeDasharray="31 100" strokeDashoffset="-18" />
                            {/* Segment 3: Potential Green (27%) */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="4.5" strokeDasharray="27 100" strokeDashoffset="-49" />
                            {/* Segment 4: At-Risk Orange (24%) */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#F97316" strokeWidth="4.5" strokeDasharray="24 100" strokeDashoffset="-76" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-bold text-slate-800 leading-tight">24,532</span>
                            <span className="text-[7px] text-slate-400">Total</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-1 text-[9px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" /> VIP Customers
                            </span>
                            <span className="font-bold text-slate-800">18%</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" /> Loyal Customers
                            </span>
                            <span className="font-bold text-slate-800">31%</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Potential Customers
                            </span>
                            <span className="font-bold text-slate-800">27%</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" /> At-Risk Customers
                            </span>
                            <span className="font-bold text-slate-800">24%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Top Products Table + Orders Over Time Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Top Products Table (7 cols) */}
                    <div className="sm:col-span-7 p-2.5 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[11px] font-bold text-slate-800 block mb-2">Top Products</span>
                      <table className="w-full text-left text-[9px]">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100">
                            <th className="pb-1 font-medium">Product</th>
                            <th className="pb-1 font-medium text-right">Revenue</th>
                            <th className="pb-1 font-medium text-right">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                          <tr>
                            <td className="py-1">Wireless Headphones</td>
                            <td className="py-1 text-right font-semibold">₹12.3M</td>
                            <td className="py-1 text-right text-slate-500">12,430</td>
                          </tr>
                          <tr>
                            <td className="py-1">Smart Watch</td>
                            <td className="py-1 text-right font-semibold">₹8.6M</td>
                            <td className="py-1 text-right text-slate-500">8,920</td>
                          </tr>
                          <tr>
                            <td className="py-1">Running Shoes</td>
                            <td className="py-1 text-right font-semibold">₹6.1M</td>
                            <td className="py-1 text-right text-slate-500">6,842</td>
                          </tr>
                          <tr>
                            <td className="py-1">Backpack</td>
                            <td className="py-1 text-right font-semibold">₹4.2M</td>
                            <td className="py-1 text-right text-slate-500">5,120</td>
                          </tr>
                          <tr>
                            <td className="py-1">Sunglasses</td>
                            <td className="py-1 text-right font-semibold">₹3.7M</td>
                            <td className="py-1 text-right text-slate-500">4,890</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Orders Over Time Bars (5 cols) */}
                    <div className="sm:col-span-5 p-2.5 rounded-xl border border-slate-100 bg-white flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-800">Orders Over Time</span>
                        <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5">
                          Last 30 Days <ChevronDown className="w-2.5 h-2.5" />
                        </span>
                      </div>
                      {/* Bar graph */}
                      <div className="h-20 flex items-end gap-1 px-1">
                        {[40, 65, 35, 80, 50, 45, 55, 70, 85, 45, 60, 90, 75, 95].map((h, i) => (
                          <div
                            key={i}
                            style={{ height: `${h}%` }}
                            className="flex-1 bg-[#5B4DF6] rounded-t-sm hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[7px] text-slate-400 pt-1 border-t border-slate-100 mt-1">
                        <span>May 1</span>
                        <span>May 6</span>
                        <span>May 11</span>
                        <span>May 16</span>
                        <span>May 21</span>
                        <span>May 26</span>
                        <span>May 30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          TRUSTED BY LOGOS SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-14 border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
            Trusted by growing businesses worldwide
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16 opacity-85">
            {/* Shopify */}
            <div className="flex items-center gap-1.5 text-[#95BF47] font-bold text-xl sm:text-2xl tracking-tight">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M15.33 2.13a.66.66 0 0 0-.64.06l-.52.36a3.67 3.67 0 0 0-1.44-.3 3.6 3.6 0 0 0-3.6 3.6c0 .35.04.68.12 1L4.8 8.4A.66.66 0 0 0 4.3 9l3.4 12.3a.66.66 0 0 0 .64.48h10.9a.66.66 0 0 0 .65-.54l1.6-11.2a.66.66 0 0 0-.46-.72l-5.7-6.69zm-4.7 3.67a2.27 2.27 0 0 1 2.27-2.27c.45 0 .86.13 1.2.36l-3.3 2.28a2.3 2.3 0 0 1-.17-.37z"/>
              </svg>
              <span className="text-slate-900">shopify</span>
            </div>

            {/* Amazon */}
            <div className="text-slate-900 font-extrabold text-xl sm:text-2xl tracking-tight relative">
              amazon
              <div className="w-8 h-1.5 border-b-2 border-orange-500 rounded-full mx-auto -mt-1"></div>
            </div>

            {/* Flipkart */}
            <div className="flex items-center gap-1 text-[#2874F0] font-bold text-xl sm:text-2xl italic tracking-tight">
              <div className="w-6 h-6 rounded bg-[#FFE500] text-[#2874F0] flex items-center justify-center font-extrabold text-sm not-italic shadow-xs">
                f
              </div>
              <span>Flipkart</span>
            </div>

            {/* Meesho */}
            <div className="text-[#9C1D60] font-extrabold text-xl sm:text-2xl tracking-tight">
              meesho
            </div>

            {/* Myntra */}
            <div className="flex items-center gap-1 font-bold text-xl sm:text-2xl tracking-tight">
              <span className="text-[#FF3F6C] font-black text-2xl">M</span>
              <span className="text-slate-800">Myntra</span>
            </div>

            {/* AJIO */}
            <div className="text-slate-900 font-black text-xl sm:text-2xl tracking-widest">
              AJIO
            </div>

            {/* NYKAA */}
            <div className="text-[#FC2779] font-black text-xl sm:text-2xl tracking-wider uppercase italic">
              NYKAA
            </div>

            {/* FirstCry */}
            <div className="font-bold text-lg sm:text-xl tracking-tight">
              <span className="text-amber-500">first</span>
              <span className="text-blue-500">cry</span>
              <span className="text-pink-500 text-xs">.com</span>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          WHY CHOOSE CUSTOMERIQ? SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#FBFBFE]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Why Choose <span className="text-[#5B4DF6]">CustomerIQ?</span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto mb-14">
            All the tools you need to understand your customers and grow your business.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Advanced Analytics */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center mb-4">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Advanced Analytics</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Deep dive into your data with interactive dashboards.
              </p>
            </div>

            {/* Card 2: Customer Segmentation */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Customer Segmentation</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Identify high-value and at-risk customers using ML.
              </p>
            </div>

            {/* Card 3: RFM Analysis */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">RFM Analysis</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Understand customer behavior with Recency, Frequency, Monetary.
              </p>
            </div>

            {/* Card 4: Business Insights */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Business Insights</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Get AI-powered insights and recommendations to grow.
              </p>
            </div>

            {/* Card 5: Real-time Reports */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Real-time Reports</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Stay updated with automated reports and notifications.
              </p>
            </div>

            {/* Card 6: Secure & Reliable */}
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Secure & Reliable</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Enterprise-grade security to keep your data safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          HOW CUSTOMERIQ WORKS? SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            How CustomerIQ works?
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto mb-14">
            Simple steps to transform your e-commerce data into growth.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#F8F9FE] border border-slate-100 shadow-sm text-center flex flex-col items-center relative group hover:border-[#5B4DF6]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[#5B4DF6] text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-sm font-bold text-slate-900">Upload Data</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload your e-commerce transaction data securely.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#F8F9FE] border border-slate-100 shadow-sm text-center flex flex-col items-center relative group hover:border-[#5B4DF6]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[#5B4DF6] text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-sm font-bold text-slate-900">We Analyze</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our AI processes and analyzes your data using advanced models.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#F8F9FE] border border-slate-100 shadow-sm text-center flex flex-col items-center relative group hover:border-[#5B4DF6]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                <PieChart className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[#5B4DF6] text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-sm font-bold text-slate-900">Get Insights</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Explore powerful visualizations and customer segments.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-[#F8F9FE] border border-slate-100 shadow-sm text-center flex flex-col items-center relative group hover:border-[#5B4DF6]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                <Rocket className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[#5B4DF6] text-white text-xs font-bold flex items-center justify-center">4</span>
                <h3 className="text-sm font-bold text-slate-900">Take Action</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Make data-driven decisions and grow your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          BANNER CTA SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-10 bg-gradient-to-r from-[#170E43] via-[#2A177A] to-[#5031E9] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
            {/* Glowing neon chart illustration on the left */}
            <div className="hidden md:flex items-center gap-2 shrink-0 opacity-90">
              <div className="w-20 h-14 relative flex items-end gap-1">
                <div className="w-3 h-6 bg-[#A855F7]/40 rounded-t" />
                <div className="w-3 h-9 bg-[#A855F7]/60 rounded-t" />
                <div className="w-3 h-12 bg-[#A855F7]/80 rounded-t" />
                <div className="w-3 h-14 bg-[#EC4899] rounded-t shadow-lg shadow-pink-500/50" />
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 50">
                  <path d="M 5 35 Q 25 25 45 15 T 75 5" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="75" cy="5" r="3" fill="#FFF" />
                </svg>
              </div>
            </div>

            {/* Center Text */}
            <div className="text-center md:text-left flex-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                Ready to unlock your customer intelligence?
              </h3>
              <p className="text-white/70 text-sm">
                Join thousands of businesses using CustomerIQ to grow smarter.
              </p>
            </div>

            {/* Right Button */}
            <Link
              href="/sign-up"
              className="px-6 py-3.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#5B4DF6] to-[#7B42F6] hover:opacity-95 transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 shrink-0"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          FOOTER
      ────────────────────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0A0D1D] text-slate-400 text-xs pt-16 pb-12 border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-8 mb-12">
            {/* Col 1: Brand & Socials (2 cols on md) */}
            <div className="col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex items-end gap-1 h-5">
                  <span className="w-1 h-2.5 rounded-full bg-[#6366F1]" />
                  <span className="w-1 h-3.5 rounded-full bg-[#A855F7]" />
                  <span className="w-1 h-5 rounded-full bg-[#EC4899]" />
                </div>
                <span className="font-extrabold text-base text-white tracking-tight">CustomerIQ</span>
              </Link>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                The all-in-one customer intelligence platform for e-commerce businesses.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors" aria-label="GitHub">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors" aria-label="LinkedIn">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors" aria-label="Twitter">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors" aria-label="YouTube">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/app/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
                <li><Link href="/app/segments" className="hover:text-white transition-colors">Segmentation</Link></li>
                <li><Link href="/app/rfm" className="hover:text-white transition-colors">RFM Analysis</Link></li>
                <li><Link href="/app/reports" className="hover:text-white transition-colors">Reports</Link></li>
              </ul>
            </div>

            {/* Col 3: Solutions */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Solutions</h4>
              <ul className="space-y-2">
                <li><Link href="/solutions" className="hover:text-white transition-colors">E-commerce</Link></li>
                <li><Link href="/solutions" className="hover:text-white transition-colors">Retail</Link></li>
                <li><Link href="/solutions" className="hover:text-white transition-colors">D2C Brands</Link></li>
                <li><Link href="/solutions" className="hover:text-white transition-colors">Marketplaces</Link></li>
              </ul>
            </div>

            {/* Col 4: Resources */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/resources" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/resources" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/resources" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><a href="http://127.0.0.1:8000/api/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">API Reference</a></li>
              </ul>
            </div>

            {/* Col 5: Company */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/features" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/features" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/features" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            {/* Col 6 & 7: Stay in the Loop (2 cols on md) */}
            <div className="col-span-2 md:col-span-1 space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Compliance</Link></li>
              </ul>
            </div>
          </div>

          {/* Newsletter Subscribe bar */}
          <div className="border-t border-white/10 pt-8 pb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-xs">Stay in the loop</p>
              <p className="text-slate-400 text-xs">Subscribe to get the latest updates and insights.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-[#5B4DF6] w-full md:w-64"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#5B4DF6] hover:bg-[#6D5EFC] text-white font-bold text-xs transition-colors shrink-0"
              >
                {subscribed ? "Subscribed!" : "Subscribe"}
              </button>
            </form>
          </div>

          {/* Copyright */}
          <div className="text-center text-slate-500 text-[11px] pt-4 border-t border-white/[0.05]">
            © 2024 CustomerIQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
