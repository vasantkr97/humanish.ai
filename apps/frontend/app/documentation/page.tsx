import React from "react";
import Image from "next/image";
import {
  Code,
  GitBranch,
  Database,
  Cpu,
  CheckCircle,
  AlertCircle,
  Zap,
  FileCode,
  Search,
  GitPullRequest,
} from "lucide-react";
import DeepDive from "@/components/DeepDive";

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            100xSWE
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-700">
            Automated Pull Request Generation System with AI-Powered Code
            Intelligence
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Architecture Image */}
        <section className="mb-12 sm:mb-16">
          <div className="border-2 border-black overflow-hidden">
            <Image
              src="/Architecture.png"
              alt="100xSWE System Architecture Diagram"
              width={1200}
              height={675}
              className="w-full h-auto"
              priority
            />
          </div>
          <p className="text-sm text-gray-500 text-center mt-3">
            High-level system architecture — from GitHub issue to pull request
          </p>
        </section>

        {/* Overview Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            Project Overview
          </h2>
          <div className="border-2 border-black p-4 sm:p-6 bg-gray-50">
            <p className="text-base sm:text-lg leading-relaxed mb-4">
              This system automates the entire pull request workflow by
              combining TypeScript AST parsing, hybrid search algorithms, and
              LangGraph orchestration to generate, validate, and test code
              changes with minimal manual intervention.
            </p>
            <p className="text-base sm:text-lg leading-relaxed">
              The architecture leverages vector embeddings, BM25 keyword
              indexing, and reciprocal rank fusion to intelligently retrieve
              relevant code files, while E2B sandboxes provide isolated testing
              environments with automated rollback capabilities.
            </p>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Cpu className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            System Architecture
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <ArchitectureCard
              title="Frontend"
              description="Next.js + TypeScript interface for monitoring PR generation, viewing logs, and managing GitHub integrations"
              deployment="Vercel"
              icon={<FileCode className="w-6 h-6" />}
            />
            <ArchitectureCard
              title="Backend"
              description="Node.js + Express API handling webhooks, authentication, and orchestrating the entire PR workflow"
              deployment="DigitalOcean"
              icon={<Database className="w-6 h-6" />}
            />
            <ArchitectureCard
              title="Worker"
              description="Redis-based queue processor executing long-running code generation and validation tasks asynchronously"
              deployment="DigitalOcean"
              icon={<GitBranch className="w-6 h-6" />}
            />
          </div>
        </section>

        {/* Core Features Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            Core Features
          </h2>

          <div className="space-y-6">
            <FeatureBlock
              title="1. TypeScript AST Parsing"
              description="Parses TypeScript source code into Abstract Syntax Trees to understand code structure, dependencies, and relationships between functions, classes, and modules."
              techStack={[
                "TypeScript Compiler API",
                "ts-morph",
                "AST Traversal",
              ]}
              useCases={[
                "Extract function signatures and dependencies",
                "Identify import/export relationships",
                "Generate code skeletons for token efficiency",
                "Map cross-file references and call graphs",
              ]}
            />

            <FeatureBlock
              title="2. Hybrid Search & Retrieval"
              description="Combines BM25 keyword-based search with vector embeddings to retrieve the most relevant code files for any given task or issue."
              techStack={[
                "BM25 Algorithm",
                "Vector Embeddings",
                "Reciprocal Rank Fusion",
                "Pinecone/Vector DB",
              ]}
              useCases={[
                "Find relevant files when user describes a feature",
                "Retrieve semantically similar code patterns",
                "Balance keyword matching with semantic understanding",
                "Reduce context window by selecting only relevant files",
              ]}
            />

            <FeatureBlock
              title="3. LangGraph Orchestration"
              description="Uses LangGraph to orchestrate multi-step validation workflows with parallel consistency checks, retry logic, and state management."
              techStack={[
                "LangGraph",
                "LangChain",
                "State Machines",
                "Parallel Execution",
              ]}
              useCases={[
                "Validate code changes across multiple files simultaneously",
                "Check for breaking changes and type errors",
                "Coordinate between code generation and testing phases",
                "Implement retry strategies with exponential backoff",
              ]}
            />

            <FeatureBlock
              title="4. E2B Sandbox Testing"
              description="Executes generated code in isolated E2B sandbox environments to run tests, validate functionality, and ensure no regressions before creating PRs."
              techStack={[
                "E2B SDK",
                "Docker Containers",
                "Automated Testing",
                "Rollback Mechanisms",
              ]}
              useCases={[
                "Run unit and integration tests in isolation",
                "Validate code changes don't break existing functionality",
                "Automatically rollback failed changes",
                "Capture test outputs and error logs for debugging",
              ]}
            />

            <FeatureBlock
              title="5. GitHub Integration"
              description="Deep integration with GitHub API for webhooks, OAuth authentication, repository cloning, and automated PR creation with detailed descriptions."
              techStack={[
                "GitHub App API",
                "Webhooks",
                "OAuth 2.0",
                "Octokit SDK",
              ]}
              useCases={[
                "Listen to push events and issue comments",
                "Authenticate users and clone private repositories",
                "Create PRs with AI-generated code and descriptions",
                "Update PR status based on validation results",
              ]}
            />
          </div>
        </section>

        {/* Workflow Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <GitPullRequest className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            End-to-End Workflow
          </h2>

          <div className="border-2 border-black">
            {[
              {
                step: 1,
                title: "Trigger Event",
                description:
                  "User creates an issue or comments on a PR describing the desired code change",
              },
              {
                step: 2,
                title: "Webhook Reception",
                description:
                  "GitHub webhook fires to backend, validated via signature verification and queued in Redis",
              },
              {
                step: 3,
                title: "Code Indexing",
                description:
                  "Worker clones repository, parses all TypeScript files into ASTs, generates embeddings and BM25 index",
              },
              {
                step: 4,
                title: "Intelligent Retrieval",
                description:
                  "Hybrid search uses reciprocal rank fusion to find top-k most relevant files based on user request",
              },
              {
                step: 5,
                title: "Code Generation",
                description:
                  "LLM receives code skeletons (compressed ASTs) + context to generate proposed changes with minimal tokens",
              },
              {
                step: 6,
                title: "LangGraph Validation",
                description:
                  "Parallel validation checks: type consistency, breaking changes, cross-file dependencies",
              },
              {
                step: 7,
                title: "Sandbox Testing",
                description:
                  "E2B sandbox executes tests on generated code; rollback if tests fail",
              },
              {
                step: 8,
                title: "PR Creation",
                description:
                  "If all validations pass, create GitHub PR with AI-generated description and link to issue",
              },
            ].map((item, index) => (
              <WorkflowStep
                key={index}
                step={item.step}
                title={item.title}
                description={item.description}
                isLast={index === 7}
              />
            ))}
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Code className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            Technology Stack
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <TechStackCard
              category="Backend"
              technologies={[
                "Node.js + Express",
                "TypeScript",
                "Prisma ORM",
                "PostgreSQL",
                "Redis + BullMQ",
                "JWT Authentication",
              ]}
            />
            <TechStackCard
              category="AI & ML"
              technologies={[
                "LangGraph",
                "LangChain",
                "OpenAI / Gemini API",
                "Vector Embeddings",
                "BM25 Search",
                "Reciprocal Rank Fusion",
              ]}
            />
            <TechStackCard
              category="Frontend"
              technologies={[
                "Next.js 14+",
                "React",
                "TypeScript",
                "Tailwind CSS",
                "Lucide Icons",
              ]}
            />
            <TechStackCard
              category="DevOps & Testing"
              technologies={[
                "E2B Sandbox",
                "Docker",
                "DigitalOcean",
                "Vercel",
                "GitHub Actions",
                "Daytona",
              ]}
            />
          </div>
        </section>

        {/* Technical Deep Dive */}
        <DeepDive />

        {/* Key Optimizations Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            Key Optimizations
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <OptimizationCard
              title="Token Efficiency"
              points={[
                "Code skeleton compression reduces context by 70-80%",
                "Only sends function signatures and type definitions to LLM",
                "Hybrid search limits files to top-k most relevant",
                "Incremental indexing only processes changed files",
              ]}
            />
            <OptimizationCard
              title="Performance"
              points={[
                "Redis queue prevents webhook timeouts",
                "Parallel validation with LangGraph workers",
                "Prisma connection pooling for database efficiency",
                "Vector index caching for fast retrieval",
              ]}
            />
            <OptimizationCard
              title="Reliability"
              points={[
                "E2B sandbox isolation prevents code injection",
                "Automated rollback on test failures",
                "Exponential backoff retry logic",
                "Webhook signature verification prevents spoofing",
              ]}
            />
            <OptimizationCard
              title="Scalability"
              points={[
                "Stateless backend enables horizontal scaling",
                "Worker processes can scale independently",
                "Database indexes on frequently queried fields",
                "CDN deployment for frontend (Vercel)",
              ]}
            />
          </div>
        </section>

        {/* User Journey Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
            User Journey Example
          </h2>

          <div className="border-2 border-black p-4 sm:p-6 bg-gray-50">
            <div className="space-y-4">
              <JourneyStep
                number={1}
                action="Install GitHub App"
                detail="User installs the GitHub App on their repository, granting access to read code and create PRs"
              />
              <JourneyStep
                number={2}
                action="Create Issue"
                detail='User creates an issue: "Add input validation to user registration endpoint"'
              />
              <JourneyStep
                number={3}
                action="Automatic Processing"
                detail="System indexes the repository (if not already done), identifies relevant files using hybrid search, and generates validation code"
              />
              <JourneyStep
                number={4}
                action="Validation & Testing"
                detail="LangGraph validates the generated code for type safety and cross-file consistency, then E2B sandbox runs all tests"
              />
              <JourneyStep
                number={5}
                action="PR Creation"
                detail="System creates a PR with the validation code, detailed description, and links back to the original issue"
              />
              <JourneyStep
                number={6}
                action="Review & Merge"
                detail="User reviews the AI-generated code, requests changes if needed, and merges when satisfied"
              />
            </div>
          </div>
        </section>

        {/* Future Enhancements Section */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Search className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            Future Enhancements
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EnhancementCard
              title="Multi-language Support"
              description="Extend AST parsing to Python, Java, Go, and Rust codebases"
            />
            <EnhancementCard
              title="Conversational Refinement"
              description="Allow users to iterate on generated code through chat interface"
            />
            <EnhancementCard
              title="Cost Optimization"
              description="Implement caching layer for repeated queries and code patterns"
            />
            <EnhancementCard
              title="Analytics Dashboard"
              description="Track PR success rates, token usage, and code generation metrics"
            />
            <EnhancementCard
              title="Custom Validation Rules"
              description="Let users define project-specific linting and validation rules"
            />
            <EnhancementCard
              title="Multi-agent Collaboration"
              description="Deploy specialized agents for testing, documentation, and refactoring"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black mt-12 sm:mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <p className="text-center text-gray-600 text-sm sm:text-base">
            Built with TypeScript, LangGraph, and Next.js | Deployed on
            DigitalOcean & Vercel
          </p>
        </div>
      </footer>
    </div>
  );
}

// Component Definitions

interface ArchitectureCardProps {
  title: string;
  description: string;
  deployment: string;
  icon: React.ReactNode;
}

function ArchitectureCard({
  title,
  description,
  deployment,
  icon,
}: ArchitectureCardProps) {
  return (
    <div className="border-2 border-black p-4 sm:p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
      </div>
      <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
        {description}
      </p>
      <div className="inline-block border border-black px-3 py-1 text-sm font-mono">
        {deployment}
      </div>
    </div>
  );
}

interface FeatureBlockProps {
  title: string;
  description: string;
  techStack: string[];
  useCases: string[];
}

function FeatureBlock({
  title,
  description,
  techStack,
  useCases,
}: FeatureBlockProps) {
  return (
    <div className="border-2 border-black p-4 sm:p-6 hover:bg-gray-50 transition-colors">
      <h3 className="text-xl sm:text-2xl font-bold mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
        {description}
      </p>

      <div className="mb-4">
        <h4 className="font-bold mb-2">Tech Stack:</h4>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech, idx) => (
            <span
              key={idx}
              className="border border-black px-3 py-1 text-sm font-mono"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-2">Use Cases:</h4>
        <ul className="space-y-1">
          {useCases.map((useCase, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-black mt-1">▪</span>
              <span className="text-gray-700">{useCase}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface WorkflowStepProps {
  step: number;
  title: string;
  description: string;
  isLast: boolean;
}

function WorkflowStep({ step, title, description, isLast }: WorkflowStepProps) {
  return (
    <div
      className={`flex gap-3 sm:gap-6 p-4 sm:p-6 ${!isLast ? "border-b border-black" : ""}`}
    >
      <div className="flex-shrink-0">
        <div className="w-9 h-9 sm:w-12 sm:h-12 border-2 border-black flex items-center justify-center font-bold text-sm sm:text-lg">
          {step}
        </div>
      </div>
      <div className="flex-grow min-w-0">
        <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">{title}</h3>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

interface TechStackCardProps {
  category: string;
  technologies: string[];
}

function TechStackCard({ category, technologies }: TechStackCardProps) {
  return (
    <div className="border-2 border-black p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold mb-4">{category}</h3>
      <ul className="space-y-2">
        {technologies.map((tech, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-black"></div>
            <span className="font-mono text-sm">{tech}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface OptimizationCardProps {
  title: string;
  points: string[];
}

function OptimizationCard({ title, points }: OptimizationCardProps) {
  return (
    <div className="border-2 border-black p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold mb-4">{title}</h3>
      <ul className="space-y-2">
        {points.map((point, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface JourneyStepProps {
  number: number;
  action: string;
  detail: string;
}

function JourneyStep({ number, action, detail }: JourneyStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 border-2 border-black flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-bold text-lg mb-1">{action}</h4>
        <p className="text-gray-700">{detail}</p>
      </div>
    </div>
  );
}

interface EnhancementCardProps {
  title: string;
  description: string;
}

function EnhancementCard({ title, description }: EnhancementCardProps) {
  return (
    <div className="border-2 border-black p-3 sm:p-4 hover:bg-gray-50 transition-colors">
      <h3 className="font-bold mb-2 flex items-center gap-2 text-sm sm:text-base">
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        {title}
      </h3>
      <p className="text-gray-700 text-xs sm:text-sm">{description}</p>
    </div>
  );
}
