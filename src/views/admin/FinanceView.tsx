import React, { useState } from 'react';
import type { Car, RentalContract, Expense } from '../../types';
import { ExpenseService, resetAgencyFinancials, restoreDemoData } from '../../services/dataService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Car as CarIcon, 
  Receipt,
  Search,
  PieChart,
  RotateCcw,
  RefreshCw,
  Shield,
  ShieldAlert,
  Banknote
} from 'lucide-react';

interface FinanceViewProps {
  cars: Car[];
  rentals: RentalContract[];
  expenses: Expense[];
  onOpenNewExpense: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  cars,
  rentals,
  expenses,
  onOpenNewExpense,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Calcul des totaux financiers (Location, Caution, et Total Global)
  const totalIncome = rentals.reduce((acc, r) => {
    const rentCollected = Math.max(0, (r.totalAmount || 0) - (r.remainingAmount || 0));
    return acc + rentCollected + (r.extraFees || 0);
  }, 0);

  // Total des cautions actuellement gardées en coffre/séquestre (contrats en cours)
  const totalCautionHeld = rentals.reduce((acc, r) => {
    if (r.status === 'active' && (r.cautionStatus === 'held' || !r.cautionStatus)) {
      return acc + (r.cautionAmount || 0);
    }
    return acc;
  }, 0);

  // Total des cautions conservées définitivement par l'agence (dégâts / dédommagement)
  const totalCautionRetained = rentals.reduce((acc, r) => {
    if (r.cautionRetainedAmount !== undefined && r.cautionRetainedAmount > 0) {
      return acc + r.cautionRetainedAmount;
    }
    if (r.cautionStatus === 'deducted') {
      return acc + Math.max(0, (r.cautionAmount || 0) - (r.cautionReturnedAmount || 0));
    }
    return acc;
  }, 0);

  // Total liquide physique encaissé en caisse (Locations perçues + Cautions dégâts gardées + Cautions séquestre)
  const totalCaisseCash = totalIncome + totalCautionRetained + totalCautionHeld;

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = (totalIncome + totalCautionRetained) - totalExpense;

  // 2. Rentabilité par voiture ("Drahm" par véhicule)
  const carProfitability = cars.map((car) => {
    // Recettes de cette voiture (loyers + cautions retenues pour dégâts sur ce véhicule)
    const carRentalIncome = rentals
      .filter((r) => r.carId === car.id)
      .reduce((acc, r) => {
        const rentCollected = Math.max(0, (r.totalAmount || 0) - (r.remainingAmount || 0));
        return acc + rentCollected + (r.extraFees || 0);
      }, 0);

    const carCautionRetained = rentals
      .filter((r) => r.carId === car.id)
      .reduce((acc, r) => {
        if (r.cautionRetainedAmount !== undefined && r.cautionRetainedAmount > 0) {
          return acc + r.cautionRetainedAmount;
        }
        if (r.cautionStatus === 'deducted') {
          return acc + Math.max(0, (r.cautionAmount || 0) - (r.cautionReturnedAmount || 0));
        }
        return acc;
      }, 0);

    const carIncome = carRentalIncome + carCautionRetained;

    // Dépenses de cette voiture
    const carExpenseTotal = expenses
      .filter((e) => e.carId === car.id)
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    return {
      car,
      rentalIncome: carRentalIncome,
      cautionRetained: carCautionRetained,
      income: carIncome,
      expenses: carExpenseTotal,
      expense: carExpenseTotal,
      net: carIncome - carExpenseTotal,
    };
  });

  // Filtre dépenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesSearch = 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    return matchesCat && matchesSearch;
  });

  const handleDeleteExpense = async (e: Expense) => {
    if (window.confirm(`Supprimer la dépense de ${formatCurrency(e.amount)} (${e.description}) ?`)) {
      await ExpenseService.deleteExpense(e.id);
    }
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleResetCaisse = async () => {
    const confirmation = window.prompt(
      "⚠️ ACTION IRRÉVERSIBLE : Remise à zéro de la Caisse (0 DA) !\n\n" +
      "Cela effacera l'ensemble des contrats de location et des dépenses enregistrées.\n" +
      "Toutes les voitures redeviendront disponibles.\n\n" +
      "Pour confirmer définitivement, tapez exactement SUPPRIMER :"
    );
    if (confirmation !== 'SUPPRIMER') {
      if (confirmation !== null) {
        alert("Action annulée : mot de confirmation incorrect.");
      }
      return;
    }

    setIsResetting(true);
    try {
      await resetAgencyFinancials();
    } catch (err) {
      console.error('Erreur reset caisse:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRestoreDemo = async () => {
    const ok = window.confirm("Restaurer les contrats et dépenses de démonstration ?");
    if (!ok) return;

    setIsResetting(true);
    try {
      await restoreDemoData();
    } catch (err) {
      console.error('Erreur restore démo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-400" />
            Gestion Financière & Caisse ("Drahm")
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Bilan des recettes de location, charges opérationnelles et rentabilité nette de chaque véhicule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {rentals.length > 0 || expenses.length > 0 ? (
            <button
              onClick={handleResetCaisse}
              disabled={isResetting}
              title="Remettre la caisse à 0 DA pour tester de nouveaux contrats et voir le calcul en direct"
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Remise à zéro...' : 'Remise à zéro (0 DA)'}
            </button>
          ) : (
            <button
              onClick={handleRestoreDemo}
              disabled={isResetting}
              title="Restaurer les données d'exemple"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Restaurer Démo
            </button>
          )}

          <button
            onClick={onOpenNewExpense}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-400/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Enregistrer une Dépense
          </button>
        </div>
      </div>

      {/* 1. LES 4 FLUX DE LA CAISSE : LOCATION, CAUTIONS DÉGÂTS, SÉQUESTRE ET TOTAL GLOBAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recettes de Location */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recettes de Location</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-400">{formatCurrency(totalIncome)}</h3>
            <p className="text-xs text-slate-400 mt-1">Loyer perçu (acomptes + soldes réglés)</p>
          </div>
        </div>

        {/* Cautions Gardées Définitivement (Dégâts) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-rose-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Cautions Gardées (Dégâts)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-400">{formatCurrency(totalCautionRetained)}</h3>
            <p className="text-xs text-slate-400 mt-1">Retenues définitives (dédommagements)</p>
          </div>
        </div>

        {/* Cautions en Séquestre (Damana en Coffre) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Cautions en Séquestre</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-300">{formatCurrency(totalCautionHeld)}</h3>
            <p className="text-xs text-slate-400 mt-1">Dépôts clients sous séquestre (à rendre au retour)</p>
          </div>
        </div>

        {/* Total Caisse : Location + Caution */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/40 shadow-lg shadow-indigo-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Total Caisse (Tout compris)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-indigo-300">{formatCurrency(totalCaisseCash)}</h3>
            <p className="text-xs text-indigo-200/80 mt-1">Total liquide physique présent à l'agence</p>
          </div>
        </div>
      </div>

      {/* 2. DÉPENSES & BÉNÉFICE NET RÉEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dépenses & Charges</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-rose-400">{formatCurrency(totalExpense)}</h3>
            <p className="text-xs text-slate-400 mt-1">Entretien, vidanges, pièces, assurance, local...</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 bg-gradient-to-br from-slate-900 to-amber-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Bénéfice Net Réel</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-3xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(netProfit)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Loyers ({formatCurrency(totalIncome)}) + Dégâts ({formatCurrency(totalCautionRetained)}) − Dépenses ({formatCurrency(totalExpense)}).
            </p>
          </div>
        </div>
      </div>

      {/* Tableau : Rentabilité par Voiture */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-amber-400" />
            Rentabilité Détaillée par Véhicule (Recettes vs Charges)
          </h3>
          <span className="text-xs text-slate-400">Pour savoir quelle voiture rapporte le plus</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Véhicule</th>
                <th className="p-3">Matricule</th>
                <th className="p-3 text-right">Recettes Locations</th>
                <th className="p-3 text-right">Dépenses Cumulées</th>
                <th className="p-3 text-right">Bénéfice Net Dégagé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {carProfitability.map(({ car, income, expenses, net }) => (
                <tr key={car.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <CarIcon className="w-3.5 h-3.5 text-amber-400" />
                    {car.brand} {car.model}
                  </td>
                  <td className="p-3 font-mono text-slate-400">{car.matricule}</td>
                  <td className="p-3 text-right font-semibold text-emerald-400">{formatCurrency(income)}</td>
                  <td className="p-3 text-right font-semibold text-rose-400">{formatCurrency(expenses)}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                      net >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {formatCurrency(net)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journal des Dépenses de l'Agence */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            Journal des Dépenses & Factures
          </h3>

          {/* Filtres : recherche et catégorie */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher dépense..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="all">Toutes les catégories</option>
              <option value="vidange">Vidange</option>
              <option value="pieces">Pièces & Mécanique</option>
              <option value="assurance">Assurance</option>
              <option value="controle_technique">Contrôle Technique</option>
              <option value="lavage">Lavage</option>
              <option value="loyer_agence">Loyer Agence</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Véhicule</th>
                  <th className="p-3">Fournisseur</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Montant (DA)</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 whitespace-nowrap">{formatDate(exp.date)}</td>
                    <td className="p-3 font-semibold capitalize text-amber-400">{exp.category.replace('_', ' ')}</td>
                    <td className="p-3 text-white font-medium">{exp.carName || 'Frais Généraux'}</td>
                    <td className="p-3 text-slate-400">{exp.supplier || '-'}</td>
                    <td className="p-3 text-slate-300">{exp.description}</td>
                    <td className="p-3 text-right font-bold text-rose-400">{formatCurrency(exp.amount)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Supprimer la dépense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500 text-xs">
            Aucune dépense enregistrée dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
};
