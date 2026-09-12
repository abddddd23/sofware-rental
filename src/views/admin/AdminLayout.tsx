import { useState } from 'react';
import type { Car, BookingDemand, RentalContract, Expense, AgencySettings } from '../../types';
import { defaultAgencySettings } from '../../types';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import type { AdminTab } from '../../components/admin/AdminSidebar';
import { DashboardOverview } from './DashboardOverview';
import { BookingsView } from './BookingsView';
import { FleetView } from './FleetView';
import { RentalsView } from './RentalsView';
import { MaintenanceView } from './MaintenanceView';
import { FinanceView } from './FinanceView';
import { AgencySettingsView } from './AgencySettingsView';
import { CarFormModal } from '../../components/admin/CarFormModal';
import { InspectionModal } from '../../components/admin/InspectionModal';
import { ExpenseModal } from '../../components/admin/ExpenseModal';
import { CarHistoryModal } from '../../components/admin/CarHistoryModal';
import { PrintContractModal } from '../../components/admin/PrintContractModal';
import { EditContractModal } from '../../components/admin/EditContractModal';
import { isFirebaseConfigured } from '../../lib/firebase';
import { Bell, Database, Zap, LogOut } from 'lucide-react';

interface AdminLayoutProps {
  cars: Car[];
  bookings: BookingDemand[];
  rentals: RentalContract[];
  expenses: Expense[];
  agencySettings?: AgencySettings;
  onLogout?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  cars,
  bookings,
  rentals,
  expenses,
  agencySettings = defaultAgencySettings,
  onLogout,
}) => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');

  // Modals state
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [carToEdit, setCarToEdit] = useState<Car | null>(null);

  const [inspectionMode, setInspectionMode] = useState<'departure' | 'return'>('departure');
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [selectedInspectionCar, setSelectedInspectionCar] = useState<Car | null>(null);
  const [selectedInspectionBooking, setSelectedInspectionBooking] = useState<BookingDemand | null>(null);
  const [selectedInspectionContract, setSelectedInspectionContract] = useState<RentalContract | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [preselectedExpenseCarId, setPreselectedExpenseCarId] = useState<string | undefined>();

  const [selectedHistoryCar, setSelectedHistoryCar] = useState<Car | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // État impression du Bon de Location officiel
  const [contractToPrint, setContractToPrint] = useState<RentalContract | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // État modification d'un contrat existant (Correction des erreurs)
  const [contractToEdit, setContractToEdit] = useState<RentalContract | null>(null);
  const [isEditContractModalOpen, setIsEditContractModalOpen] = useState(false);

  const handleOpenEditContract = (contract: RentalContract) => {
    setContractToEdit(contract);
    setIsEditContractModalOpen(true);
  };

  const handleOpenPrintContract = (contract: RentalContract) => {
    setContractToPrint(contract);
    setIsPrintModalOpen(true);
  };

  const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
  const urgentVidangesCount = cars.filter((c) => (c.nextOilChangeMileage - c.currentMileage) <= 1000).length;
  const availableCars = cars.filter((c) => c.status === 'AVAILABLE' || c.status === ('available' as any));

  // Handlers
  const handleOpenNewCar = () => {
    setCarToEdit(null);
    setIsCarModalOpen(true);
  };

  const handleEditCar = (car: Car) => {
    setCarToEdit(car);
    setIsCarModalOpen(true);
  };

  const handleOpenDepartureContract = (car?: Car, booking?: BookingDemand) => {
    setInspectionMode('departure');
    setSelectedInspectionCar(car || null);
    setSelectedInspectionBooking(booking || null);
    setSelectedInspectionContract(null);
    setIsInspectionModalOpen(true);
  };

  const handleOpenReturnContract = (contract: RentalContract) => {
    setInspectionMode('return');
    setSelectedInspectionContract(contract);
    setSelectedInspectionCar(null);
    setSelectedInspectionBooking(null);
    setIsInspectionModalOpen(true);
  };

  const handleLogVidange = (car: Car) => {
    setPreselectedExpenseCarId(car.id);
    setIsExpenseModalOpen(true);
  };

  const handleOpenNewExpense = () => {
    setPreselectedExpenseCarId(undefined);
    setIsExpenseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingBookingsCount={pendingBookingsCount}
        urgentVidangesCount={urgentVidangesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">
              Espace Administration Agence
            </span>
            <div className="h-4 w-[1px] bg-slate-800" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-3 h-3" />
              Temps Réel Actif
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Firestore */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isFirebaseConfigured ? (
                  <span className="text-emerald-400 font-semibold">Connecté à Cloud Firestore</span>
                ) : (
                  <span className="text-amber-400 font-medium">Mode Local Démo (Prêt pour vos clés .env)</span>
                )}
              </span>
            </div>

            {/* Notification Badge */}
            <button
              onClick={() => setCurrentTab('bookings')}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Nouvelles réservations"
            >
              <Bell className="w-4 h-4" />
              {pendingBookingsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center">
                  {pendingBookingsCount}
                </span>
              )}
            </button>

            {/* Bouton Déconnexion */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Se déconnecter du logiciel agence"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic View Body */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardOverview
              cars={cars}
              bookings={bookings}
              rentals={rentals}
              expenses={expenses}
              onOpenNewCar={handleOpenNewCar}
              onOpenNewRental={() => handleOpenDepartureContract()}
              onOpenNewExpense={handleOpenNewExpense}
              onSelectBooking={(b) => handleOpenDepartureContract(undefined, b)}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {currentTab === 'bookings' && (
            <BookingsView
              bookings={bookings}
              cars={cars}
              onTransformToContract={(b) => handleOpenDepartureContract(undefined, b)}
            />
          )}

          {currentTab === 'fleet' && (
            <FleetView
              cars={cars}
              onOpenNewCar={handleOpenNewCar}
              onEditCar={handleEditCar}
              onRentCar={(c) => handleOpenDepartureContract(c)}
              onViewHistory={(c) => {
                setSelectedHistoryCar(c);
                setIsHistoryModalOpen(true);
              }}
            />
          )}

          {currentTab === 'rentals' && (
            <RentalsView
              rentals={rentals}
              cars={cars}
              onOpenNewContract={() => handleOpenDepartureContract()}
              onCheckInContract={handleOpenReturnContract}
              onPrintContract={handleOpenPrintContract}
              onEditContract={handleOpenEditContract}
            />
          )}

          {currentTab === 'maintenance' && (
            <MaintenanceView
              cars={cars}
              expenses={expenses}
              onLogVidange={handleLogVidange}
            />
          )}

          {currentTab === 'finances' && (
            <FinanceView
              cars={cars}
              rentals={rentals}
              expenses={expenses}
              onOpenNewExpense={handleOpenNewExpense}
            />
          )}

          {currentTab === 'settings' && (
            <AgencySettingsView settings={agencySettings} />
          )}
        </main>
      </div>

      {/* Modals */}
      <CarFormModal
        carToEdit={carToEdit}
        isOpen={isCarModalOpen}
        onClose={() => setIsCarModalOpen(false)}
      />

      <InspectionModal
        mode={inspectionMode}
        car={selectedInspectionCar}
        booking={selectedInspectionBooking}
        activeContract={selectedInspectionContract}
        availableCars={availableCars}
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        onContractCreated={handleOpenPrintContract}
        onContractUpdated={handleOpenPrintContract}
        dailyKmAllowance={agencySettings.dailyKmAllowance}
        extraKmFee={agencySettings.extraKmFee}
      />

      <ExpenseModal
        cars={cars}
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        preselectedCarId={preselectedExpenseCarId}
      />

      <CarHistoryModal
        car={selectedHistoryCar}
        rentals={rentals}
        expenses={expenses}
        bookings={bookings}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <PrintContractModal
        contract={contractToPrint}
        car={cars.find((c) => c.id === contractToPrint?.carId)}
        settings={agencySettings}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      <EditContractModal
        key={contractToEdit?.id || 'edit-modal'}
        contract={contractToEdit}
        isOpen={isEditContractModalOpen}
        onClose={() => {
          setIsEditContractModalOpen(false);
          setContractToEdit(null);
        }}
        onContractUpdated={(updated) => {
          if (contractToPrint?.id === updated.id) {
            setContractToPrint(updated);
          }
        }}
        onContractDeleted={(deletedId) => {
          if (contractToPrint?.id === deletedId) {
            setContractToPrint(null);
          }
        }}
      />
    </div>
  );
};
