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
  // Service-based / campus-placement recruiters (theory + scenario coding + HR)
  { id: 'Hexaware',   name: 'Hexaware',   domain: 'hexaware.com' },
  { id: 'TCS',        name: 'TCS',        domain: 'tcs.com' },
  { id: 'Infosys',    name: 'Infosys',    domain: 'infosys.com' },
  { id: 'Wipro',      name: 'Wipro',      domain: 'wipro.com' },
  { id: 'Cognizant',  name: 'Cognizant',  domain: 'cognizant.com' },
  { id: 'Accenture',  name: 'Accenture',  domain: 'accenture.com' },
  { id: 'Capgemini',  name: 'Capgemini',  domain: 'capgemini.com' },
];

const CompanyLogo = ({ company }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-12 h-12 rounded-[14px] clay-well flex items-center justify-center text-2xl clay-display" style={{ color: 'var(--clay-violet)' }}>
        {company.name[0]}
      </div>
    );
  }
  const src = company.logoUrl || `https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`;
  // Wordmarks like IBM need extra horizontal room; square marks use a fixed box.
  const sizing = company.wide ? 'h-9 w-auto max-w-[100px] object-contain' : 'w-8 h-8 object-contain';
  return <img src={src} alt={`${company.name} logo`} className={sizing} loading="lazy" onError={() => setFailed(true)} />;
};

const CompaniesPage = () => {
  const navigate = useNavigate();
  const go = (c) => navigate('/setup', { state: { company: c.id } });

  return (
    <div className="min-h-screen py-12 md:py-20">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="clay-eyebrow">Choose your room</span>
          <h1 className="clay-display mt-3 mb-3" style={{ fontSize: 'clamp(30px,4vw,46px)' }}>Select a target company</h1>
          <p className="clay-ink-soft text-base md:text-lg">
            Pick a top tech company to tailor your interview — the AI adapts difficulty and question style to mirror real interviews for that company.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => go(c)}
              className="clay-card group flex flex-col items-center justify-center gap-4 p-6 min-h-[170px] cursor-pointer transition-transform hover:-translate-y-1.5"
            >
              <span className="w-[62px] h-[62px] rounded-[18px] grid place-items-center clay-well">
                <CompanyLogo company={c} />
              </span>
              <h3 className="clay-display text-sm clay-ink group-hover:text-[var(--clay-violet)] transition-colors">{c.name}</h3>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompaniesPage;
