import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Default source is Google's s2 favicon service (cached, works for any domain).
// Per-company `logoUrl` overrides exist where the favicon version looks off
// (e.g. IBM — the classic blue-striped wordmark is served locally).
const companies = [
  { id: 'Google',     name: 'Google',     domain: 'google.com' },
  { id: 'Amazon',     name: 'Amazon',     domain: 'amazon.com' },
  { id: 'Microsoft',  name: 'Microsoft',  domain: 'microsoft.com' },
  { id: 'Meta',       name: 'Meta',       domain: 'meta.com' },
  { id: 'Apple',      name: 'Apple',      domain: 'apple.com' },
  { id: 'Netflix',    name: 'Netflix',    domain: 'netflix.com' },
  { id: 'Adobe',      name: 'Adobe',      domain: 'adobe.com' },
  { id: 'IBM',        name: 'IBM',        domain: 'ibm.com',      logoUrl: '/ibm-logo.svg', wide: true },
  { id: 'Oracle',     name: 'Oracle',     domain: 'oracle.com' },
  { id: 'Salesforce', name: 'Salesforce', domain: 'salesforce.com' },
];

const CompanyLogo = ({ company }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-14 h-14 rounded-xl bg-theme-accent/10 text-theme-accent flex items-center justify-center text-2xl font-bold">
        {company.name[0]}
      </div>
    );
  }
  const src = company.logoUrl || `https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`;
  // Wordmarks like IBM need extra horizontal room; square marks use a fixed box.
  const sizing = company.wide ? 'h-10 w-auto max-w-[110px] object-contain' : 'w-14 h-14 object-contain';
  return (
    <img src={src} alt={`${company.name} logo`} className={sizing} loading="lazy" onError={() => setFailed(true)} />
  );
};

const CompaniesPage = () => {
  const navigate = useNavigate();
  const go = (c) => navigate('/setup', { state: { company: c.id } });

  return (
    <div className="min-h-screen bg-theme-bg py-12 md:py-20 animate-fade">
      <div className="container max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-serif mb-4 text-theme-text">Select Target Company</h1>
          <p className="text-theme-text-muted text-base md:text-lg leading-relaxed">
            Choose a top tech company to tailor your interview. The AI adapts difficulty and
            question style to mirror real interviews for that company.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => go(c)}
              className="group bg-theme-surface border border-theme-border hover:border-theme-accent hover:shadow-md transition-all rounded-2xl flex flex-col items-center justify-center gap-4 p-6 min-h-[180px] cursor-pointer"
            >
              <div className="h-16 flex items-center justify-center">
                <CompanyLogo company={c} />
              </div>
              <h3 className="text-sm font-semibold text-theme-text group-hover:text-theme-accent transition-colors">
                {c.name}
              </h3>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompaniesPage;
