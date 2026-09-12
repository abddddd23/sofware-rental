/**
 * Utilitaires de formatage pour l'application de location
 */

// Formate un montant en Dinars Algériens (ex: 35 000 DA)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' DA';
}

// Formate un kilométrage (ex: 48 500 km)
export function formatMileage(km: number): string {
  return new Intl.NumberFormat('fr-DZ').format(km) + ' km';
}

// Formate une date ISO ou standard en affichage lisible (ex: 15 Septembre 2026)
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Calcule la différence en jours entre deux dates (validé chronologiquement)
export function calculateDaysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  if (end.getTime() < start.getTime()) return 0;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 0 ? 1 : diffDays;
}

// Analyse de l'état de vidange
export interface VidangeStatus {
  remainingKm: number;
  isUrgent: boolean; // Moins de 0 km (dépassement) ou incohérence
  isWarning: boolean; // Moins de 1 000 km
  isInconsistent?: boolean; // dernière vidange > km actuel
  statusText: string;
  badgeColor: string;
}

export function getVidangeStatus(currentKm: number, nextVidangeKm: number, lastVidangeKm?: number): VidangeStatus {
  // Détection d'incohérence : comment la dernière vidange pourrait être dans le futur par rapport au compteur actuel ?
  if (lastVidangeKm !== undefined && lastVidangeKm > currentKm) {
    return {
      remainingKm: nextVidangeKm - currentKm,
      isUrgent: true,
      isWarning: false,
      isInconsistent: true,
      statusText: '⚠️ Compteur incohérent',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold',
    };
  }

  const remainingKm = nextVidangeKm - currentKm;

  if (remainingKm <= 0) {
    return {
      remainingKm,
      isUrgent: true,
      isWarning: false,
      statusText: `Dépassement de ${Math.abs(remainingKm)} km !`,
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
  }

  if (remainingKm <= 1000) {
    return {
      remainingKm,
      isUrgent: false,
      isWarning: true,
      statusText: `Vidange proche (${remainingKm} km)`,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
  }

  return {
    remainingKm,
    isUrgent: false,
    isWarning: false,
    statusText: `Reste ${remainingKm} km`,
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
}

// Invariants et calculs unifiés pour la gestion de la caution
export interface ContractCautionDetails {
  retainedAmount: number;
  returnedAmount: number;
  isDeducted: boolean;
  isHeld: boolean;
  isReturned: boolean;
}

export function getContractCautionDetails(contract: {
  cautionAmount?: number;
  cautionStatus?: string;
  cautionReturnedAmount?: number;
  cautionRetainedAmount?: number;
}): ContractCautionDetails {
  const isDeducted = contract.cautionStatus === 'deducted';
  const isReturned = contract.cautionStatus === 'returned';
  const isHeld = contract.cautionStatus === 'held' || !contract.cautionStatus;
  
  const retainedAmount = contract.cautionRetainedAmount !== undefined && contract.cautionRetainedAmount > 0
    ? contract.cautionRetainedAmount
    : isDeducted
    ? Math.max(0, (contract.cautionAmount || 0) - (contract.cautionReturnedAmount || 0))
    : 0;

  const returnedAmount = contract.cautionReturnedAmount !== undefined
    ? contract.cautionReturnedAmount
    : isDeducted
    ? Math.max(0, (contract.cautionAmount || 0) - retainedAmount)
    : (contract.cautionAmount || 0);

  return {
    retainedAmount,
    returnedAmount,
    isDeducted,
    isHeld,
    isReturned,
  };
}

