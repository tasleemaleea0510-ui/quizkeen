/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Zap, 
  Code2, 
  ArrowRight, 
  LayoutDashboard, 
  Database, 
  CheckCircle2,
  Palette,
  Terminal,
  Cpu
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
}

function FeatureCard({ icon, title, description, tag }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-zinc-800/80 text-indigo-400 group-hover:text-indigo-300 group-hover:scale-105 transition-all">
            {icon}
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {tag}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'capabilities'>('overview');

  const capabilities = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      title: "Interactive Dashboards",
      description: "Data visualization, real-time analytics, filtering, charts, and modern UI cards.",
      tag: "UI / UX"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Full-Stack Web Apps",
      description: "Express APIs, custom workflows, task managers, CRM tools, or SaaS prototypes.",
      tag: "Full-Stack"
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: "AI-Powered Tools",
      description: "Smart assistants, content generation, summarization, multimodal analysis with Gemini.",
      tag: "AI & ML"
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "Databases & Storage",
      description: "Firebase Firestore, Cloud SQL, auth flows, state persistence, and real-time syncing.",
      tag: "Backend"
    },
    {
      icon: <Palette className="w-5 h-5" />,
      title: "Custom Creative Tools",
      description: "Canvas editors, games, simulations, calculators, audio tools, and bespoke designs.",
      tag: "Creative"
    },
    {
      icon: <Code2 className="w-5 h-5" />,
      title: "Production Ready",
      description: "Built with Tailwind CSS, React 19, TypeScript, and clean responsive layout patterns.",
      tag: "Clean Code"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-base bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Nexus Studio
              </span>
              <span className="ml-2 text-xs font-mono text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">
                v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Workspace
            </button>
            <button
              onClick={() => setActiveTab('capabilities')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'capabilities'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Capabilities
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
            <Terminal className="w-3.5 h-3.5" />
            <span>Environment ready for building</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-100 leading-[1.1] mb-6">
            Hello! What would you like to{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              build today?
            </span>
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed mb-8 max-w-2xl">
            I'm ready to build whatever application you have in mind. Tell me your project idea, desired features, or workflow, and I'll generate the complete interface and functionality.
          </p>
        </div>

        {/* Feature / Idea Grid */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Ready-to-build ideas & modules
            </h2>
            <span className="text-xs text-zinc-500 font-mono">React 19 • Tailwind CSS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((item, idx) => (
              <FeatureCard key={idx} {...item} />
            ))}
          </div>
        </div>

        {/* Prompt Suggestions */}
        <div className="mt-12 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Quick prompt examples you can send:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {[
              "Build a personal finance tracker with expense analytics and charts",
              "Create a kanban board with drag-and-drop tasks and priority tags",
              "Build an interactive recipe planner with shopping list and timer",
              "Design a SaaS landing page with dark mode, pricing, and testimonial slider",
              "Build a markdown documentation reader with search and code syntax highlighting",
              "Create an audio synthesizer with keyboard controls and sound visualizer"
            ].map((prompt, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors flex items-start gap-2.5"
              >
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>"{prompt}"</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Ready to build your next web app</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Development server active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
