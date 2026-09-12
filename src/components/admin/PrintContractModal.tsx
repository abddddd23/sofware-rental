import React from 'react';
import type { RentalContract, Car, AgencySettings } from '../../types';
import { formatCurrency, formatMileage, formatDate } from '../../utils/formatters';
import { Printer, X, Shield, CheckCircle2, Car as CarIcon, User, Calendar, DollarSign, AlertTriangle } from 'lucide-react';

interface PrintContractModalProps {
  contract: RentalContract | null;
  car?: Car | null;
  settings: AgencySettings;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintContractModal: React.FC<PrintContractModalProps> = ({
  contract,
  car,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !contract) return null;

  const handlePrint = () => {
    const printArea = document.getElementById('printable-contract-area');
    if (!printArea) {
      window.print();
      return;
    }

    // Nettoyer tout iframe antérieur
    const existingFrame = document.getElementById('contract-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    // Création d'un iframe dédié à l'impression
    const iframe = document.createElement('iframe');
    iframe.id = 'contract-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return;
    }

    // Récupérer toutes les balises styles & links de la page
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Contrat_${contract.id.toUpperCase()}</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .print-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 4px !important;
              background-color: #ffffff !important;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Délai pour que le navigateur charge les polices et CSS avant d'ouvrir la boîte de dialogue d'impression
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Erreur impression iframe, repli window.print:', err);
        window.print();
      }
    }, 350);
  };

  const allowedKm = contract.totalDays * (settings.dailyKmAllowance || 100);
  const totalCashDeparture = contract.advancePaid + (contract.cautionType === 'especes' ? contract.cautionAmount : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm print:p-0 print:bg-white">
      {/* Conteneur Modal */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:border-none print:shadow-none print:bg-white print:rounded-none">
        
        {/* Barre d'actions supérieure (Masquée à l'impression) */}
        <div className="no-print shrink-0 p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Bon de Location & Contrat Officiel</h3>
              <p className="text-xs text-slate-400">Prêt à être imprimé et remis en main propre au client</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Bon / Sauvegarder PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEUILLE IMPRIMABLE A4 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/40 print:p-0 print:overflow-visible print:bg-white">
          <div 
            id="printable-contract-area"
            className="w-full max-w-3xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-2 text-xs leading-relaxed"
          >
            {/* EN-TÊTE AGENCE */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                  {settings.agencyName || 'AutoLoc Prestige'}
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">{settings.slogan}</p>
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                  <p>📍 {settings.address}</p>
                  <p>📞 Tél : <strong className="text-slate-900">{settings.phonePrimary}</strong> {settings.phoneSecondary ? ` / ${settings.phoneSecondary}` : ''}</p>
                  <p>💬 WhatsApp : {settings.whatsappNumber} • ✉️ {settings.email}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded font-mono font-bold text-xs uppercase mb-1">
                  N° {contract.id.toUpperCase()}
                </div>
                <p className="text-[10px] text-slate-500">Date d'émission :</p>
                <p className="text-[11px] font-bold text-slate-800">
                  {formatDate(contract.createdAt || new Date().toISOString())}
                </p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  contract.status === 'active' 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>
                  {contract.status === 'active' ? 'Contrat en cours (Véhicule sorti)' : 'Contrat clôturé & restitué'}
                </span>
              </div>
            </div>

            {/* TITRE DU DOCUMENT */}
            <div className="text-center bg-slate-100 py-1.5 rounded border border-slate-300 mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                {contract.status === 'active' 
                  ? 'BON DE SORTIE & CONTRAT DE LOCATION DE VÉHICULE' 
                  : 'BON DE RESTITUTION & CLÔTURE DE LOCATION'}
              </h2>
            </div>

            {/* GRILLE : CLIENT & VÉHICULE */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Locataire */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-700" />
                  1. Renseignements Locataire
                </h3>
                <div className="space-y-1">
                  <p><span className="text-slate-500">Nom & Prénom :</span> <strong className="text-slate-950 font-bold">{contract.customerName}</strong></p>
                  <p><span className="text-slate-500">Téléphone :</span> <strong className="text-slate-900">{contract.customerPhone}</strong></p>
                  <p><span className="text-slate-500">N° NIN / Passeport :</span> <span className="font-mono">{contract.customerNationalId || 'Présenté'}</span></p>
                  <p><span className="text-slate-500">N° Permis Conduire :</span> <span className="font-mono font-bold">{contract.customerPermitNumber || 'Présenté'}</span></p>
                </div>
              </div>

              {/* Véhicule & Compteur */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
                  <CarIcon className="w-3.5 h-3.5 text-slate-700" />
                  2. Véhicule & État Départ
                </h3>
                <div className="space-y-1">
                  <p><span className="text-slate-500">Modèle :</span> <strong className="text-slate-950">{contract.carName}</strong></p>
                  <p><span className="text-slate-500">Matricule :</span> <span className="font-mono font-bold">{car?.matricule || 'En règle'}</span></p>
                  <p><span className="text-slate-500">Compteur Départ :</span> <strong className="font-mono text-slate-900">{formatMileage(contract.departureKm)}</strong></p>
                  <p><span className="text-slate-500">Carburant Départ :</span> <strong className="text-slate-900">{contract.departureFuel}</strong></p>
                  <p><span className="text-slate-500">Forfait Kilométrique :</span> <span className="font-bold text-slate-900">{allowedKm} km</span> ({settings.dailyKmAllowance} km/j)</p>
                </div>
              </div>
            </div>

            {/* PÉRIODE DE LOCATION */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-700" />
                3. Période de Location
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Date de Départ</span>
                  <strong className="text-slate-950">{contract.startDate}</strong>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Date de Retour Prévue</span>
                  <strong className="text-slate-950">{contract.endDate}</strong>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Durée Totale</span>
                  <strong className="text-slate-950">{contract.totalDays} Jour{contract.totalDays > 1 ? 's' : ''}</strong>
                </div>
              </div>
            </div>

            {/* DÉCOMPTE FINANCIER & CAUTION SÉPARÉE */}
            <div className="p-3.5 bg-amber-50/60 rounded-lg border border-amber-200 mb-4">
              <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-amber-200 pb-1 mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                4. Décompte Financier & Caution Déposée
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Volet Location */}
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Tarif par jour :</span>
                    <span className="font-mono">{formatCurrency(contract.dailyRate)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Total Location ({contract.totalDays} jours) :</span>
                    <span className="font-mono">{formatCurrency(contract.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Montant réglé au départ :</span>
                    <span className="font-mono">{formatCurrency(contract.advancePaid)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                    <span>Reste dû sur la location :</span>
                    <span className="font-mono">{formatCurrency(contract.remainingAmount)}</span>
                  </div>
                </div>

                {/* Volet Caution */}
                <div className="space-y-1 bg-white p-2.5 rounded border border-amber-200">
                  <div className="flex justify-between items-center text-slate-900 font-bold">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-amber-600" />
                      Caution (Dépôt de Garantie) :
                    </span>
                    <span className="font-mono text-amber-700">{formatCurrency(contract.cautionAmount)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Format : <strong>{contract.cautionType === 'especes' ? 'Espèces gardées en coffre' : contract.cautionType === 'cheque' ? 'Chèque de caution' : contract.cautionType === 'passeport' ? 'Passeport conservé' : 'Autre garantie'}</strong>
                  </p>
                  <p className="text-[10px] text-slate-600 leading-tight pt-1">
                    * La caution est un dépôt conservé par l'agence et <strong>restitué à 100% au locataire</strong> au retour si le véhicule revient conforme.
                  </p>
                </div>
              </div>

              {/* Total liquide remis en main au départ */}
              <div className="mt-2.5 pt-2 border-t border-amber-200 flex justify-between items-center font-bold text-xs text-slate-900">
                <span>TOTAL LIQUIDE ENCAISSÉ EN MAIN AU DÉPART (Loyer + Caution) :</span>
                <span className="text-sm font-black text-slate-950 font-mono">
                  {formatCurrency(totalCashDeparture)}
                </span>
              </div>
            </div>

            {/* SI CONTRAT RETOURNÉ : SECTION CLÔTURE */}
            {contract.status === 'completed' && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
                <h3 className="font-bold text-emerald-900 uppercase text-[11px] border-b border-emerald-200 pb-1 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  5. Constat de Clôture au Retour
                </h3>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>Compteur Retour : <strong>{formatMileage(contract.returnKm || 0)}</strong></div>
                  <div>Distance réelle : <strong>{formatMileage((contract.returnKm || 0) - contract.departureKm)}</strong></div>
                  <div>Carburant Retour : <strong>{contract.returnFuel || 'Conforme'}</strong></div>
                </div>
                <div className="mt-2 pt-1 border-t border-emerald-200 flex justify-between items-center font-bold text-emerald-800">
                  <span>Statut de la Caution :</span>
                  <span>
                    {contract.cautionStatus === 'returned'
                      ? `✅ Caution restituée intégralement (${formatCurrency(contract.cautionReturnedAmount ?? contract.cautionAmount)})`
                      : `⚠️ Caution retenue : Restitué ${formatCurrency(contract.cautionReturnedAmount ?? 0)} (${contract.cautionNotes})`}
                  </span>
                </div>
              </div>
            )}

            {/* RELEVÉ DES DÉGÂTS PRÉEXISTANTS */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />
                {contract.status === 'completed' ? '6. Relevé d\'État Carrosserie' : '5. Relevé d\'État & Dégâts Préexistants au Départ'}
              </h3>
              {contract.departureDamages && contract.departureDamages.length > 0 ? (
                <div className="space-y-1 text-[11px]">
                  {contract.departureDamages.map((d, i) => (
                    <div key={i} className="flex justify-between text-slate-700">
                      <span>• <strong className="capitalize">{d.location}</strong> ({d.type}) : {d.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 italic text-[11px]">
                  ✓ Véhicule remis propre et en parfait état. Aucun choc ni rayure préexistant constaté.
                </p>
              )}
            </div>

            {/* CONDITIONS ESSENTIELLES */}
            <div className="border border-slate-200 rounded p-2.5 text-[10px] text-slate-600 space-y-1 mb-6">
              <p><strong>Conditions :</strong> 1. Le véhicule doit être conduit exclusivement par le locataire désigné. 2. Les procès-verbaux (radars, infractions) survenus durant la location sont à la charge exclusive du locataire. 3. Le véhicule doit être restitué avec le même niveau de carburant et dans le même état de propreté. 4. Dépassement kilométrique facturé à {settings.extraKmFee} DA / km.</p>
            </div>

            {/* CADRE SIGNATURES */}
            <div className="grid grid-cols-2 gap-8 pt-2">
              <div className="border border-slate-300 rounded-lg p-3 text-center min-h-[90px] flex flex-col justify-between">
                <p className="font-bold text-slate-800 text-[11px]">Le Locataire</p>
                <p className="text-[10px] text-slate-400 italic">Mention manuscrite « Lu et approuvé »</p>
                <div className="h-10"></div>
              </div>
              <div className="border border-slate-300 rounded-lg p-3 text-center min-h-[90px] flex flex-col justify-between">
                <p className="font-bold text-slate-800 text-[11px]">Pour l'Agence {settings.agencyName}</p>
                <p className="text-[10px] text-slate-400 italic">Cachet & Signature autorisée</p>
                <div className="h-10"></div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Modal */}
        <div className="no-print shrink-0 p-3.5 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-400/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Lancer l'Impression
          </button>
        </div>

      </div>

      {/* RÈGLES CSS POUR IMPRESSION DIRECTE */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
