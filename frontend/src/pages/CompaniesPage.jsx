import React from 'react';
import { useNavigate } from 'react-router-dom';

const companies = [
  { id: 'Google', name: 'Google', color: 'from-red-500 to-yellow-500', logoText: 'G' },
  { id: 'Amazon', name: 'Amazon', color: 'from-orange-400 to-yellow-600', logoText: 'a' },
  { id: 'Microsoft', name: 'Microsoft', color: 'from-blue-500 to-green-500', logoText: 'M' },
  { id: 'Meta', name: 'Meta', color: 'from-blue-600 to-blue-400', logoText: '∞' },
  { id: 'Apple', name: 'Apple', color: 'from-gray-600 to-gray-400', logoText: '' },
  { id: 'Netflix', name: 'Netflix', color: 'from-red-600 to-red-800', logoText: 'N' },
  { id: 'Adobe', name: 'Adobe', color: 'from-red-500 to-red-700', logoText: 'A' },
  { id: 'IBM', name: 'IBM', color: 'from-blue-700 to-blue-900', logoText: 'IBM' },
  { id: 'Oracle', name: 'Oracle', color: 'from-red-600 to-rose-700', logoText: 'O' },
  { id: 'Salesforce', name: 'Salesforce', color: 'from-cyan-500 to-blue-500', logoText: '☁' },
];

const CompaniesPage = () => {
  const navigate = useNavigate();

  const handleSelectCompany = (company) => {
    navigate('/setup', { state: { company: company.id } });
  };

  return (
    <div className="min-h-screen py-12 md:py-20 animate-fade">
      <div className="container max-w-6xl space-y-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-serif mb-4">Select Target Company</h1>
          <p className="text-theme-text-muted text-base md:text-lg leading-relaxed">
            Choose a top tech company to customize your interview experience. Our AI will automatically adapt the difficulty and question style to mirror real-world interviews.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleSelectCompany(company)}
              className="card-premium group relative overflow-hidden flex flex-col items-center justify-center p-8 transition-transform hover:-translate-y-1 hover:shadow-xl cursor-pointer min-h-[200px]"
            >
              {/* Animated background gradient */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${company.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} 
              />
              
              <div className={`w-20 h-20 rounded-2xl mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-lg bg-gradient-to-br ${company.color} transition-transform group-hover:scale-110 duration-300`}>
                {company.logoText}
              </div>
              
              <h3 className="text-xl font-serif text-theme-text font-semibold relative z-10">{company.name}</h3>
              
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-theme-accent/20 rounded-2xl transition-colors duration-300 pointer-events-none" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompaniesPage;
