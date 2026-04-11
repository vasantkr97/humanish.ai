"use client";

import React, { useState } from "react";
import {
  Search,
  GitBranch,
  Cpu,
  Shield,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  Layers,
  Zap,
  BarChart3,
  Network,
  RefreshCw,
} from "lucide-react";

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <div className="border-2 border-black p-3 sm:p-5 text-center hover:bg-gray-50 transition-colors">
      <div className="text-2xl sm:text-4xl font-bold mb-1">{value}</div>
      <div className="text-xs sm:text-sm font-bold uppercase tracking-wide mb-2">
        {label}
      </div>
      <p className="text-xs text-gray-600 leading-snug hidden sm:block">
        {description}
      </p>
    </div>
  );
}

// ─── Comparison Table ────────────────────────────────────────
function ComparisonTable() {
  return (
    <div className="border-2 border-black overflow-hidden">
      <div className="grid grid-cols-3 bg-black text-white text-xs sm:text-sm font-bold">
        <div className="p-2 sm:p-3 border-r border-gray-700">Capability</div>
        <div className="p-2 sm:p-3 border-r border-gray-700 text-center">
          Grep Only
        </div>
        <div className="p-2 sm:p-3 text-center">100xSWE</div>
      </div>
      {[
        ["Semantic understanding", "✗", "✓"],
        ["Exact keyword matching", "✓", "✓"],
        ["Ranked results", "✗", "✓"],
        ["Cross-file dependency awareness", "✗", "✓"],
        ["Token-efficient retrieval", "✗", "✓"],
        ["Context compression", "✗", "✓"],
      ].map(([capability, grep, hybrid], idx) => (
        <div
          key={idx}
          className={`grid grid-cols-3 text-xs sm:text-sm ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${idx < 5 ? "border-b border-gray-200" : ""}`}
        >
          <div className="p-2 sm:p-3 border-r border-gray-200 font-medium">
            {capability}
          </div>
          <div className="p-2 sm:p-3 border-r border-gray-200 text-center text-gray-400">
            {grep}
          </div>
          <div className="p-2 sm:p-3 text-center font-bold">{hybrid}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Research Citation ───────────────────────────────────────
function Citation({
  source,
  finding,
  url,
}: {
  source: string;
  finding: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-l-4 border-black pl-4 py-3 hover:bg-gray-50 transition-colors group"
    >
      <p className="text-sm text-gray-700 leading-relaxed mb-1">{finding}</p>
      <span className="text-xs font-mono text-gray-500 flex items-center gap-1 group-hover:text-black transition-colors">
        {source}
        <ExternalLink className="w-3 h-3" />
      </span>
    </a>
  );
}

// ─── Expandable Section ──────────────────────────────────────
function ExpandableSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-black overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 sm:p-5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {icon}
          <span className="text-base sm:text-lg font-bold">{title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t-2 border-black p-3 sm:p-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Flow Step ───────────────────────────────────────────────
function FlowStep({
  number,
  title,
  description,
  tech,
  isLast = false,
}: {
  number: number;
  title: string;
  description: string;
  tech: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-black flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
          {number}
        </div>
        {!isLast && <div className="w-0.5 h-8 bg-black mt-1" />}
      </div>
      <div className="pb-4 sm:pb-6">
        <h4 className="font-bold text-sm sm:text-base mb-1">{title}</h4>
        <p className="text-xs sm:text-sm text-gray-700 mb-2">{description}</p>
        <span className="text-xs font-mono border border-black px-2 py-0.5">
          {tech}
        </span>
      </div>
    </div>
  );
}

// ─── Main Deep Dive Component ────────────────────────────────
export default function DeepDive() {
  return (
    <section className="mb-12 sm:mb-16">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
        <BookIcon />
        Design Philosophy &amp; Technical Deep Dive
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
        How we built an AI agent that understands your codebase and raises PRs —
        from research to production.
      </p>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
        <StatCard
          value="40%+"
          label="Token Reduction"
          description="Compared to grep-only retrieval via hybrid search"
        />
        <StatCard
          value="12.5%"
          label="Higher Accuracy"
          description="Semantic search vs. grep alone (Cursor research)"
        />
        <StatCard
          value="70-80%"
          label="Context Compression"
          description="Code skeletons reduce LLM context requirements"
        />
        <StatCard
          value="3x"
          label="Retry Loop"
          description="Automated validation with error-aware retries"
        />
      </div>

      {/* ── The Problem ── */}
      <div className="mb-10">
        <h3 className="text-lg sm:text-xl font-bold mb-4">The Problem</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="border-2 border-black p-4 sm:p-5">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              How other agents work
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">✗</span>
                Search codebase with grep — pure keyword matching
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">✗</span>
                Dump flat, unranked file list to LLM
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">✗</span>
                LLM burns tokens reading irrelevant files
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">✗</span>
                No awareness of cross-file dependencies
              </li>
            </ul>
          </div>
          <div className="border-2 border-black p-4 sm:p-5 bg-gray-50">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              How 100xSWE works
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                Hybrid search: semantic embeddings + BM25 keyword matching
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                RRF-fused ranked results — most relevant files first
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                Code skeletons compress context by 70-80%
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">✓</span>
                AST-based dependency graph tracks cross-file impact
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <Citation
            source="Milvus Engineering Blog"
            finding="Switching from grep to vector search based RAG reduced token usage by 40% or more across tested codebases."
            url="https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md"
          />
        </div>
      </div>

      {/* ── Technical Deep Dive Sections ── */}
      <div className="space-y-4 mb-10">
        {/* Phase 1: Retrieval */}
        <ExpandableSection
          title="Intelligent Code Retrieval"
          icon={<Search className="w-5 h-5" />}
          defaultOpen={true}
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            The retrieval system combines two complementary search strategies
            and fuses their results for optimal relevance.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
            <div className="border border-black p-4">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Vector Search
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Code is parsed into AST-aware chunks (functions, classes,
                imports) using Babel, then embedded as vectors and stored in
                Pinecone. Matches by meaning, not just keywords.
              </p>
            </div>
            <div className="border border-black p-4">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                BM25 Search
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                An inverted index built from every word in the codebase.
                Computes relevance using term frequency, document frequency, and
                chunk length. Excels at exact matches.
              </p>
            </div>
            <div className="border border-black p-4 bg-gray-50">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                RRF Fusion
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                Reciprocal Rank Fusion merges both ranked lists using
                position-based scoring:
              </p>
              <code className="text-xs font-mono bg-white border border-black px-2 py-1 block text-center">
                score = 1 / (60 + rank)
              </code>
            </div>
          </div>

          <ComparisonTable />

          <div className="space-y-2">
            <Citation
              source="Cursor Engineering Blog"
              finding="Semantic search gave agents 12.5% higher accuracy on codebase questions compared to grep alone. On 1,000+ file codebases, code retention increased by 2.6%."
              url="https://cursor.com/blog/semsearch"
            />
            <Citation
              source="SWE-Fixer — arXiv:2501.05040"
              finding="BM25 combined with a lightweight model achieved 22% on SWE-Bench Lite using only two model calls per instance, using coarse-to-fine file retrieval."
              url="https://arxiv.org/abs/2501.05040"
            />
            <Citation
              source="TigerData Engineering Blog"
              finding="Reciprocal Rank Fusion rewards documents appearing high in multiple result sets while giving partial credit to those excelling in just one — a parameter-free way to merge rankings."
              url="https://www.tigerdata.com/blog/introducing-pg_textsearch-true-bm25-ranking-hybrid-retrieval-postgres"
            />
          </div>
        </ExpandableSection>

        {/* Phase 2: Context Engineering */}
        <ExpandableSection
          title="Context Engineering &amp; Dependency Analysis"
          icon={<Network className="w-5 h-5" />}
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            Retrieving the right files is half the challenge. The other half is
            deciding what to send to the LLM without exceeding context limits or
            diluting signal quality.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
            <div className="border border-black p-4">
              <h4 className="font-bold text-sm mb-2">The Goldilocks Problem</h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0" />
                  <span>
                    <strong>Too little context</strong> — LLM hallucinates
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0" />
                  <span>
                    <strong>Too much context</strong> — attention dilutes,
                    output degrades
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full flex-shrink-0" />
                  <span>
                    <strong>Right context</strong> — exact what the agent needs,
                    nothing more
                  </span>
                </div>
              </div>
            </div>
            <div className="border border-black p-4">
              <h4 className="font-bold text-sm mb-2">AST-Based Code Graph</h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                Every file is parsed to extract imports, function calls, and
                exports. These form a directed graph where:
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>
                  • <strong>Nodes</strong> = files in the repository
                </li>
                <li>
                  • <strong>Edges</strong> = import / call dependencies
                </li>
                <li>
                  • <strong>Output</strong> = function signatures + call maps +
                  imports
                </li>
              </ul>
            </div>
          </div>

          <div className="border border-black p-4 bg-gray-50 mt-2">
            <h4 className="font-bold text-sm mb-2">
              Code Skeleton Compression
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              Instead of sending full source files, the system generates
              compressed code skeletons for the LLM to reason over:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="border border-black bg-white p-3">
                <div className="font-bold text-gray-500 mb-1">
                  FUNCTION SIGNATURES
                </div>
                <div className="text-gray-700">
                  async validateToken(token: string): Promise&lt;boolean&gt;
                </div>
              </div>
              <div className="border border-black bg-white p-3">
                <div className="font-bold text-gray-500 mb-1">CALLS</div>
                <div className="text-gray-700">
                  decryptJWT, checkExpiry, queryDB
                </div>
              </div>
              <div className="border border-black bg-white p-3">
                <div className="font-bold text-gray-500 mb-1">IMPORTS</div>
                <div className="text-gray-700">jwt, prisma, crypto</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Citation
              source="CodeRabbit Engineering Blog"
              finding="Maintaining roughly a 1:1 ratio of code to context in prompts — too little leads to hallucinations, too much dilutes the signal."
              url="https://www.coderabbit.ai/blog/the-art-and-science-of-context-engineering"
            />
            <Citation
              source="Entelligence Engineering Blog"
              finding="Renaming a function seems harmless in one file but could break critical functionality elsewhere if the dependency graph isn't considered."
              url="https://entelligence.ai/blogs/deep-review"
            />
          </div>
        </ExpandableSection>

        {/* Phase 3: Code Generation & Validation */}
        <ExpandableSection
          title="Code Generation &amp; Validation Pipeline"
          icon={<Cpu className="w-5 h-5" />}
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            The generation pipeline uses LangGraph to orchestrate multi-step
            code generation with automated validation and retry logic.
          </p>

          <div className="mt-2">
            <FlowStep
              number={1}
              title="Code Generation"
              description="LLM receives code skeletons, dependency maps, and the issue description. Generates targeted file modifications."
              tech="LangGraph + OpenAI / Gemini"
            />
            <FlowStep
              number={2}
              title="Type & Syntax Validation"
              description="Generated code is validated for type consistency and syntax correctness. Exact error messages are captured."
              tech="TypeScript Compiler API"
            />
            <FlowStep
              number={3}
              title="Error-Aware Retry"
              description="If validation fails, error messages + previous attempt context are fed back to the LLM. Up to 3 focused retries."
              tech="LangGraph State Machine"
            />
            <FlowStep
              number={4}
              title="PR Creation"
              description="Once all validations pass, the system opens a pull request with AI-generated description linked to the original issue."
              tech="GitHub API + Octokit"
              isLast
            />
          </div>

          <Citation
            source="Stripe Engineering — Minions"
            finding="Getting to a PR is not enough if the code doesn't hold up under validation. The end-to-end loop matters just as much as any individual step."
            url="https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents"
          />
        </ExpandableSection>

        {/* Phase 4: Production Optimizations */}
        <ExpandableSection
          title="Production Optimizations"
          icon={<RefreshCw className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <OptCard
              icon={<GitBranch className="w-4 h-4" />}
              title="Incremental Indexing"
              description="Git webhooks detect changed files on push. Only modified chunks are upserted in the vector store and BM25 index — no full re-indexing."
            />
            <OptCard
              icon={<Zap className="w-4 h-4" />}
              title="Parallel Processing"
              description="Vector index and BM25 index updates run concurrently, cutting indexing time roughly in half."
            />
            <OptCard
              icon={<Layers className="w-4 h-4" />}
              title="Sliding Window Cache"
              description="Redis caches repository indexes with a 7-day TTL that resets on each access. Active repos stay warm; unused repos naturally expire."
            />
            <OptCard
              icon={<Shield className="w-4 h-4" />}
              title="Isolated Execution"
              description="All generated code runs in E2B sandboxes. OAuth-only authentication. No custom credentials, no host access."
            />
          </div>

          <div className="border border-black p-4 bg-gray-50 mt-4">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Job Queue Architecture
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              BullMQ manages concurrent request processing with ordered queuing,
              automatic retry on failure, and backpressure handling. No single
              slow job blocks the pipeline.
            </p>
          </div>
        </ExpandableSection>
      </div>

      {/* ── Roadmap ── */}
      <div className="border-2 border-black p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-bold mb-4">Roadmap</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              title: "Grep Fallback",
              description:
                "Fall back to keyword search when hybrid search doesn't surface the right files — used as a last resort after smarter methods.",
              status: "Planned",
            },
            {
              title: "Planning Agent",
              description:
                "Agent presents a plan before writing code. Developers review, leave feedback, and iterate before any PR is created.",
              status: "Planned",
            },
            {
              title: "Test Validation",
              description:
                "Run existing test suites against generated code and feed failures back into the fix loop for higher reliability.",
              status: "Planned",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="border border-black p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm">{item.title}</h4>
                <span className="text-xs font-mono border border-black px-2 py-0.5">
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── References ── */}
      <div className="mt-6 border-t-2 border-black pt-5">
        <h3 className="text-sm font-bold uppercase tracking-wide mb-3 text-gray-500">
          Research &amp; References
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2">
          {[
            {
              text: "Milvus — Grep-Only Retrieval Burns Tokens",
              url: "https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md",
            },
            {
              text: "Cursor — Improving Agent with Semantic Search",
              url: "https://cursor.com/blog/semsearch",
            },
            {
              text: "SWE-Fixer — Open-Source LLMs for Issue Resolution",
              url: "https://arxiv.org/abs/2501.05040",
            },
            {
              text: "TigerData — BM25 Ranking & Hybrid Retrieval",
              url: "https://www.tigerdata.com/blog/introducing-pg_textsearch-true-bm25-ranking-hybrid-retrieval-postgres",
            },
            {
              text: "Entelligence — Deep Review Agent",
              url: "https://entelligence.ai/blogs/deep-review",
            },
            {
              text: "CodeRabbit — Context Engineering",
              url: "https://www.coderabbit.ai/blog/the-art-and-science-of-context-engineering",
            },
            {
              text: "Stripe — Minions End-to-End Coding Agents",
              url: "https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents",
            },
          ].map((ref, idx) => (
            <a
              key={idx}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors py-1"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{ref.text}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Small Helper Components ─────────────────────────────────
function BookIcon() {
  return (
    <svg
      className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function OptCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-black p-3 sm:p-4 hover:bg-gray-50 transition-colors">
      <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
