import { ArrowDown, Code, Shield, TestTube, CheckCircle } from "lucide-react";

const LangGraphFlow = () => {
  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <h3 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight text-foreground mb-4 sm:mb-8">
        How It Works
      </h3>

      <div className="space-y-3 sm:space-y-4">
        {/* Indexing Step */}
        <div className="bg-white border border-foreground rounded-xl p-4 sm:p-6 transition-all hover:shadow-lg">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-foreground flex items-center justify-center flex-shrink-0">
              <Code className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-sans text-base sm:text-lg font-bold text-foreground mb-1 sm:mb-2">
                Understand Your Codebase
              </h4>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground">
                AI indexes your repository to deeply understand how your code is
                structured and connected.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
        </div>

        {/* Search Step */}
        <div className="bg-white border border-foreground rounded-xl p-4 sm:p-6 transition-all hover:shadow-lg">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-foreground flex items-center justify-center flex-shrink-0">
              <TestTube className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-sans text-base sm:text-lg font-bold text-foreground mb-1 sm:mb-2">
                Find Relevant Files
              </h4>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground">
                Intelligent search identifies exactly which files need to be
                modified for your request.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
        </div>

        {/* Validation Step */}
        <div className="bg-white border border-foreground rounded-xl p-4 sm:p-6 transition-all hover:shadow-lg">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-foreground flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-sans text-base sm:text-lg font-bold text-foreground mb-1 sm:mb-2">
                Generate & Validate
              </h4>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground">
                Code is generated and tested in isolated environments to ensure
                it works correctly.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
        </div>

        {/* PR Creation */}
        <div className="bg-foreground text-background rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
            <div className="flex-1 text-left">
              <h4 className="font-sans text-base sm:text-lg font-bold mb-1 sm:mb-2">
                Ready for Review
              </h4>
              <p className="font-sans text-xs sm:text-sm opacity-90">
                A pull request is created with all changes ready for your
                approval.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted border border-border rounded-xl p-4 sm:p-6 mt-6 sm:mt-8">
        <p className="font-sans text-xs sm:text-sm text-foreground">
          <strong>Fully Automated:</strong> From understanding your request to
          delivering a validated pull request—no manual steps required.
        </p>
      </div>
    </div>
  );
};

export default LangGraphFlow;
