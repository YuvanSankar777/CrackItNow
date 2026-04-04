import React from 'react';

const CodeAnalysis = ({ analysis, isLoading }) => {
  if (!analysis && !isLoading) {
    return (
      <div className="p-4 text-center text-theme-text-muted text-sm">
        Submit code to see analysis
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin">
          <svg className="w-5 h-5 text-theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className={`p-3 rounded-lg ${
        analysis.passed
          ? 'bg-green-500/20 border border-green-500/50'
          : 'bg-red-500/20 border border-red-500/50'
      }`}>
        <p className={`font-bold text-sm ${analysis.passed ? 'text-green-600' : 'text-red-600'}`}>
          {analysis.passed ? '✓ All Tests Passed' : '✗ Tests Failed'}
        </p>
      </div>

      {/* Complexity */}
      {analysis.timeComplexity && (
        <div className="space-y-2">
          <h4 className="font-semibold text-theme-text text-sm">Complexity Analysis</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-theme-bg rounded border border-theme-border">
              <p className="text-xs text-theme-text-muted">Time</p>
              <p className="font-mono text-sm text-theme-accent">{analysis.timeComplexity}</p>
            </div>
            <div className="p-2 bg-theme-bg rounded border border-theme-border">
              <p className="text-xs text-theme-text-muted">Space</p>
              <p className="font-mono text-sm text-theme-accent">{analysis.spaceComplexity}</p>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-theme-text text-sm">Optimization Tips</h4>
          <ul className="space-y-1">
            {analysis.suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-xs text-theme-text-muted flex gap-2">
                <span className="text-theme-accent">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Test Results */}
      {analysis.testResults && analysis.testResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-theme-text text-sm">Test Cases</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {analysis.testResults.map((test, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded border ${
                  test.passed
                    ? 'bg-green-500/10 border-green-500/30 text-green-700'
                    : 'bg-red-500/10 border-red-500/30 text-red-700'
                }`}
              >
                <p className="font-mono">{test.input}</p>
                <p className="text-xs opacity-75">Expected: {test.expected}</p>
                {!test.passed && <p className="text-xs opacity-75">Got: {test.actual}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {analysis.feedback && (
        <div className="p-3 bg-theme-bg rounded-lg border border-theme-border">
          <p className="text-xs text-theme-text-muted leading-relaxed">{analysis.feedback}</p>
        </div>
      )}
    </div>
  );
};

export default CodeAnalysis;
