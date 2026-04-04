import React, { useState } from 'react';

const InterviewSidebar = ({ isCollapsed, onToggleCollapse, chatHistory, questions, currentQuestionId }) => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'questions'

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed left-0 top-6 z-40 p-2 bg-theme-accent text-white rounded-r-lg hover:bg-blue-600 transition-all"
        title="Expand sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-96 flex flex-col h-screen bg-theme-surface border-r border-theme-border">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-theme-border">
        <h2 className="text-xl font-bold text-theme-text">Interview</h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-theme-bg rounded transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-5 h-5 text-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-theme-border">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 px-4 font-medium transition-colors ${
            activeTab === 'chat'
              ? 'border-b-2 border-theme-accent text-theme-accent'
              : 'text-theme-text-muted hover:text-theme-text'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-3 px-4 font-medium transition-colors ${
            activeTab === 'questions'
              ? 'border-b-2 border-theme-accent text-theme-accent'
              : 'text-theme-text-muted hover:text-theme-text'
          }`}
        >
          Questions
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'chat' ? (
          // Chat Panel
          <div className="space-y-3">
            {chatHistory.length === 0 ? (
              <p className="text-theme-text-muted text-sm text-center py-8">No messages yet</p>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.speaker === 'User' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.speaker === 'User'
                        ? 'bg-theme-accent text-white'
                        : 'bg-theme-bg text-theme-text border border-theme-border'
                    }`}
                  >
                    <p className="font-semibold text-xs mb-1">{msg.speaker}</p>
                    <p className="break-words">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Questions Panel
          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-theme-text-muted text-sm text-center py-8">No questions yet</p>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    q.id === currentQuestionId
                      ? 'border-theme-accent bg-theme-accent/10'
                      : 'border-theme-border bg-theme-bg hover:border-theme-border/80'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-theme-accent">Q{idx + 1}</span>
                    <span className="text-xs px-2 py-1 bg-theme-border rounded text-theme-text-muted">
                      {q.is_coding ? 'Coding' : 'Behavioral'}
                    </span>
                  </div>
                  <p className="text-sm text-theme-text line-clamp-3">{q.question_text}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-theme-border bg-theme-bg text-xs text-theme-text-muted">
        <p>Status: <span className="text-theme-accent font-semibold">Active Interview</span></p>
      </div>
    </div>
  );
};

export default InterviewSidebar;
