import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { useEffect, lazy, Suspense } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import LandingPage from "@/pages/landing-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { CollabAuthProvider, useCollabAuth } from "./hooks/use-collab-auth";
import { LancingAuthProvider, useLancingAuth } from "./hooks/use-lancing-auth";
import { CartProvider } from "./hooks/use-cart";
import { ErrorBoundary } from "./components/error-boundary";
import { FeedSkeleton, MarketplaceGridSkeleton, UserProfileSkeleton } from "@/components/ui/skeletons";
import TopNav from "./components/navigation/top-nav";
import MobileNav from "./components/layout/mobile-nav";
import CollabMobileNav from "./components/collab/collab-mobile-nav";
import RouteSEO from "./components/seo/route-seo";

const HomePage = lazy(() => import("@/pages/home-page"));
const ProductDetailPage = lazy(() => import("@/pages/product-detail"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const CartPage = lazy(() => import("@/pages/cart-page"));
const EnhancedSellPage = lazy(() => import("@/pages/enhanced-sell-page"));
const OrdersPage = lazy(() => import("@/pages/orders-page"));
const CheckoutPage = lazy(() => import("@/pages/checkout-page"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const DatabaseMonitor = lazy(() => import("@/pages/database-monitor"));
const TermsPage = lazy(() => import("@/pages/terms-page"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));
const DisclaimerPage = lazy(() => import("@/pages/disclaimer"));
const AboutPage = lazy(() => import("@/pages/about-page"));
const PoliciesPage = lazy(() => import("@/pages/policies-page"));
const BrowsePage = lazy(() => import("@/pages/browse-page"));
const BuyerRequestsPage = lazy(() => import("@/pages/buyer-requests-page"));
const SEODashboard = lazy(() => import("@/pages/seo-dashboard"));
const ClearCachePage = lazy(() => import("@/pages/clear-cache"));
const SellerListings = lazy(() => import("@/pages/seller-listings"));
const AchievementsPage = lazy(() => import("@/pages/achievements-page"));
const StudentCollabPage = lazy(() => import("@/pages/student-collab-page"));
const CollabMessagesPage = lazy(() => import("@/pages/collab-messages-page"));
const CollabProfilePage = lazy(() => import("@/pages/collab-profile-page"));
const CollabNewProfileView = lazy(() => import("@/pages/collab-new-profile-view"));
const CollabMatchingPage = lazy(() => import("@/pages/collab-matching-page"));
const CollabPostCreate = lazy(() => import("@/pages/collab-post-create"));
const CollabPostDirect = lazy(() => import("@/pages/collab-post-direct"));
const CollabPostGroup = lazy(() => import("@/pages/collab-post-group"));
const CollabPostEvent = lazy(() => import("@/pages/collab-post-event"));
const CollabSearchPage = lazy(() => import("@/pages/collab-search-page"));
const CollabGroupManagement = lazy(() => import("@/pages/collab-group-management"));
const CollabGroupPage = lazy(() => import("@/pages/collab-group-page"));
const CollabNotificationsPage = lazy(() => import("@/pages/collab-notifications-page"));
const CollabUserProfilePage = lazy(() => import("@/pages/collab-user-profile-page"));
const UserProfilePage = lazy(() => import("@/pages/user-profile-page"));
const CollabOrgSelector = lazy(() => import("@/pages/collab-org-selector"));
const CollabOrgProfile = lazy(() => import("@/pages/collab-org-profile"));
const CollabStudentProfileBuilder = lazy(() => import("@/pages/collab-student-profile-builder"));
const CollabOrgProfileView = lazy(() => import("@/pages/collab-org-profile-view"));
const ElectionsPage = lazy(() => import("@/pages/elections-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const CollabAdminDashboard = lazy(() => import("@/pages/collab-admin-dashboard"));
const CollabArenaPage = lazy(() => import("@/pages/collab-arena-page"));
const CollabArenaInfo = lazy(() => import("@/pages/collab-arena-info"));
const CollabArenaRegister = lazy(() => import("@/pages/collab-arena-register"));
const CollabArenaPayment = lazy(() => import("@/pages/collab-arena-payment"));
const CollabArenaSubmit = lazy(() => import("@/pages/collab-arena-submit"));
const CollabArenaAdmin = lazy(() => import("@/pages/collab-arena-admin"));
const CollabArenaResults = lazy(() => import("@/pages/collab-arena-results"));
const StatetechPage = lazy(() => import("@/pages/statetech-page"));
const NatConf2026Page = lazy(() => import("@/pages/nat-conf-2026"));
const NatConfRegister = lazy(() => import("@/pages/nat-conf-register"));
const NatConfAdmin = lazy(() => import("@/pages/nat-conf-admin"));
const Hastech2026Page = lazy(() => import("@/pages/hastech-2026"));
const Netx2026Page = lazy(() => import("@/pages/netx-2026"));
const NetxRegisterPage = lazy(() => import("@/pages/netx-register"));
const NetxAdminPage = lazy(() => import("@/pages/netx-admin"));
const HastechRegister = lazy(() => import("@/pages/hastech-register"));
const HastechAdmin = lazy(() => import("@/pages/hastech-admin"));
const StatetechRegister = lazy(() => import("@/pages/statetech-register"));
const StatetechPayment = lazy(() => import("@/pages/statetech-payment"));
const StatetechAdmin = lazy(() => import("@/pages/statetech-admin"));
const StatetechStatus = lazy(() => import("@/pages/statetech-status"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const PaymentFailurePage = lazy(() => import("@/pages/payment-failure"));
const LancingHomePage = lazy(() => import("@/pages/lancing-home-page"));
const LancingLoginPage = lazy(() => import("@/pages/lancing-login-page"));
const LancingRoleSelect = lazy(() => import("@/pages/lancing-role-select"));
const LancingFreelancerProfile = lazy(() => import("@/pages/lancing-freelancer-profile"));
const LancingCompanyProfile = lazy(() => import("@/pages/lancing-company-profile"));
const LancingFreelancerDashboard = lazy(() => import("@/pages/lancing-freelancer-dashboard"));
const LancingCompanyDashboard = lazy(() => import("@/pages/lancing-company-dashboard"));
const LancingProfileEditPage = lazy(() => import("@/pages/lancing-profile-edit"));
const LancingCompanyProfileEdit = lazy(() => import("@/pages/lancing-company-profile-edit"));
const LancingInternshipsPage = lazy(() => import("@/pages/lancing-internships"));
const LancingAngelProfile = lazy(() => import("@/pages/lancing-angel-profile"));
const LancingAngelDashboard = lazy(() => import("@/pages/lancing-angel-dashboard"));
const LancingAdminDashboard = lazy(() => import("@/pages/lancing-admin-dashboard"));
const LancingAIMatchPage = lazy(() => import("@/pages/lancing-ai-match"));
const LancingSureShotPage = lazy(() => import("@/pages/lancing-sure-shot"));
const CareerCompassPage = lazy(() => import("@/pages/career-compass"));
const LancingProfileBoardPage = lazy(() => import("@/pages/lancing-profile-board"));
const COEDashboardPage = lazy(() => import("@/pages/coe-dashboard"));
const CompanyProblemBankPage = lazy(() => import("@/pages/company-problem-bank"));
const LancingPlacementCellProfile = lazy(() => import("@/pages/lancing-placement-cell-profile"));
const LancingPlacementCellDashboard = lazy(() => import("@/pages/lancing-placement-cell-dashboard"));
const LancingPlacementCellPostDrive = lazy(() => import("@/pages/lancing-placement-cell-post-drive"));
const LancingPlacementCellDriveDetail = lazy(() => import("@/pages/lancing-placement-cell-drive-detail"));
const LancingCampusDrives = lazy(() => import("@/pages/lancing-campus-drives"));
const LancingDriveDetail = lazy(() => import("@/pages/lancing-drive-detail"));
const LancingDriveTest = lazy(() => import("@/pages/lancing-drive-test"));
const LancingMyApplications = lazy(() => import("@/pages/lancing-my-applications"));
const LancingApplicantHub = lazy(() => import("@/pages/lancing-applicant-hub"));
const LancingAttendancePage = lazy(() => import("@/pages/lancing-attendance"));
const LancingPCAttendancePage = lazy(() => import("@/pages/lancing-pc-attendance"));
const LancingPCAssessmentsPage = lazy(() => import("@/pages/lancing-pc-assessments"));
const LancingPCExamMonitorPage = lazy(() => import("@/pages/lancing-pc-exam-monitor"));
const LancingPCExamResultsPage = lazy(() => import("@/pages/lancing-pc-exam-results"));
const LancingMyExamsPage = lazy(() => import("@/pages/lancing-my-exams"));
const LancingExamTakePage = lazy(() => import("@/pages/lancing-exam-take"));
const CompetitionsPage = lazy(() => import("@/pages/competitions-page"));
const CompetitionsAdmin = lazy(() => import("@/pages/competitions-admin"));


function PageLoader() {
  const [location] = useLocation();

  if (location.startsWith("/collab") || location.startsWith("/student-collab") || location.startsWith("/u/")) {
    if (location.startsWith("/u/") || location === "/collab-profile" || location.startsWith("/collab-profile/")) {
      return (
        <div className="min-h-screen bg-gray-50">
          <UserProfileSkeleton />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto px-4 pt-4">
        <FeedSkeleton count={3} />
      </div>
    );
  }

  if (
    location === "/marketplace" ||
    location === "/browse" ||
    location.startsWith("/product/")
  ) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MarketplaceGridSkeleton count={8} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ contain: "layout paint" }}
      aria-busy="true"
      aria-live="polite"
    />
  );
}


function LancingRouter() {
  return (
    <LancingAuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/student-lancing" component={LancingHomePage} />
          <Route path="/lancing/login" component={LancingLoginPage} />
          <Route path="/lancing/role-select" component={LancingRoleSelect} />
          <Route path="/lancing/freelancer-profile" component={LancingFreelancerProfile} />
          <Route path="/lancing/company-profile" component={LancingCompanyProfile} />
          <Route path="/lancing/angel-profile" component={LancingAngelProfile} />
          <Route path="/lancing/freelancer-dashboard" component={LancingFreelancerDashboard} />
          <Route path="/lancing/company-dashboard" component={LancingCompanyDashboard} />
          <Route path="/lancing/angel-dashboard" component={LancingAngelDashboard} />
          <Route path="/lancing/profile" component={LancingProfileEditPage} />
          <Route path="/lancing/company-profile-edit" component={LancingCompanyProfileEdit} />
          <Route path="/lancing/micro-tasks"><Redirect to="/lancing/freelancer-dashboard" replace /></Route>
          <Route path="/lancing/internships" component={LancingInternshipsPage} />
          <Route path="/lancing/ai-match" component={LancingAIMatchPage} />
          <Route path="/lancing/sure-shot" component={LancingSureShotPage} />
          <Route path="/lancing/career-compass" component={CareerCompassPage} />
          <Route path="/lancing/profile-board" component={LancingProfileBoardPage} />
          <Route path="/coe-dashboard" component={COEDashboardPage} />
          <Route path="/lancing/companies" component={CompanyProblemBankPage} />
          <Route path="/lancing/company-problem-bank" component={CompanyProblemBankPage} />
          <Route path="/lancing/placement-cell-profile" component={LancingPlacementCellProfile} />
          <Route path="/lancing/placement-cell-dashboard" component={LancingPlacementCellDashboard} />
          <Route path="/lancing/placement-cell-post-drive" component={LancingPlacementCellPostDrive} />
          <Route path="/lancing/placement-cell-drive/:driveId" component={LancingPlacementCellDriveDetail} />
          <Route path="/lancing/campus-drives" component={LancingCampusDrives} />
          <Route path="/lancing/drive/:driveId" component={LancingDriveDetail} />
          <Route path="/lancing/drive/:driveId/test" component={LancingDriveTest} />
          <Route path="/lancing/my-applications" component={LancingMyApplications} />
          <Route path="/lancing/applicant-hub" component={LancingApplicantHub} />
          <Route path="/lancing/attendance" component={LancingAttendancePage} />
          <Route path="/lancing/pc-attendance" component={LancingPCAttendancePage} />
          <Route path="/lancing/pc-assessments" component={LancingPCAssessmentsPage} />
          <Route path="/lancing/pc-exam-monitor/:examId" component={LancingPCExamMonitorPage} />
          <Route path="/lancing/pc-exam-results/:examId" component={LancingPCExamResultsPage} />
          <Route path="/lancing/my-exams" component={LancingMyExamsPage} />
          <Route path="/lancing/exam/:examId" component={LancingExamTakePage} />
          <Route path="/admin-lancing" component={LancingAdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </LancingAuthProvider>
  );
}

function CollabRoutes() {
  const { status } = useCollabAuth();
  const [location, setLocation] = useLocation();
  
  // Keep administrative event routes behind the Collab auth gate.  The
  // individual admin pages perform their own role checks as well, but making
  // them public here briefly rendered those pages for signed-out visitors.
  const publicPaths = ['/student-collab', '/collab', '/collab-org-selector', '/collab-post-create', '/collab-arena', '/collab-search', '/statetech-2026', '/nat-conf-2026', '/nat-conf-register', '/hastech-2026', '/hastech-register', '/netx-2026', '/netx', '/netx-register'];
  const isPublicPath = publicPaths.some(p => location === p || location.startsWith(p + '/'));
  
  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicPath) {
      // Student Collab uses an inline login dialog rather than a separate
      // login route. Keep the originally requested internal URL so the
      // dialog can return the user here after authentication.
      try {
        if (location.startsWith('/') && !location.startsWith('//')) {
          sessionStorage.setItem('collab_return_after_login', location);
        }
      } catch {}
      setLocation('/student-collab');
    }
  }, [status, isPublicPath, setLocation]);
  
  if (status === 'loading' && !isPublicPath) {
    return <PageLoader />;
  }
  
  if (status === 'unauthenticated' && !isPublicPath) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/student-collab" component={StudentCollabPage} />
        <Route path="/collab" component={StudentCollabPage} />
        <Route path="/collab-messages/:chatId?" component={CollabMessagesPage} />
        <Route path="/collab-org-selector" component={CollabOrgSelector} />
        <Route path="/collab-student-builder" component={CollabStudentProfileBuilder} />
        <Route path="/collab-org-profile" component={CollabOrgProfile} />
        <Route path="/collab-org-profile-view" component={CollabOrgProfileView} />
        <Route path="/u/:username" component={UserProfilePage} />
        <Route path="/collab-profile/:uid" component={CollabUserProfilePage} />
        <Route path="/collab-profile" component={CollabNewProfileView} />
        <Route path="/collab-student-profile-builder" component={CollabStudentProfileBuilder} />
        <Route path="/collab-matching" component={CollabMatchingPage} />
        <Route path="/collab-search" component={CollabSearchPage} />
        <Route path="/collab-post-create" component={CollabPostCreate} />
        <Route path="/collab-post-direct" component={CollabPostDirect} />
        <Route path="/collab-post-group" component={CollabPostGroup} />
        <Route path="/collab-post-event" component={CollabPostEvent} />
        <Route path="/collab-group-management" component={CollabGroupManagement} />
        <Route path="/collab-groups/:groupId" component={CollabGroupPage} />
        <Route path="/collab-notifications" component={CollabNotificationsPage} />
        <Route path="/collab-arena" component={CollabArenaPage} />
        <Route path="/collab-arena/info" component={CollabArenaInfo} />
        <Route path="/collab-arena/register" component={CollabArenaRegister} />
        <Route path="/collab-arena/payment" component={CollabArenaPayment} />
        <Route path="/collab-arena/admin" component={CollabArenaAdmin} />
        <Route path="/collab-arena/results" component={CollabArenaResults} />
        <Route path="/collab-arena-submit" component={CollabArenaSubmit} />
        <Route path="/nat-conf-2026" component={NatConf2026Page} />
        <Route path="/nat-conf-register" component={NatConfRegister} />
        <Route path="/nat-conf-admin" component={NatConfAdmin} />
        <Route path="/hastech-2026" component={Hastech2026Page} />
        <Route path="/hastech-register" component={HastechRegister} />
        <Route path="/hastech-admin" component={HastechAdmin} />
        <Route path="/netx-2026" component={Netx2026Page} />
        <Route path="/netx" component={Netx2026Page} />
        <Route path="/netx-register" component={NetxRegisterPage} />
        <Route path="/netx-admin" component={NetxAdminPage} />
        <Route path="/statetech-2026" component={StatetechPage} />
        <Route path="/statetech-2026/register" component={StatetechRegister} />
        <Route path="/statetech-2026/payment" component={StatetechPayment} />
        <Route path="/statetech-2026/status" component={StatetechStatus} />
        <Route path="/statetech-2026/admin" component={StatetechAdmin} />
        <Route path="/elections" component={ElectionsPage} />
        <Route path="/collab-admin" component={CollabAdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}


function Router() {
  const [location] = useLocation();
  
  useAnalytics();

  const isLandingPage = location === '/';
  const isCollabPage = location.startsWith('/collab') || location.startsWith('/student-collab') || location.startsWith('/elections') || location.startsWith('/statetech') || location.startsWith('/nat-conf') || location.startsWith('/hastech-2026') || location === '/hastech-register' || location === '/hastech-admin' || location.startsWith('/netx');
  const isLancingPage = location.startsWith('/student-lancing') || location.startsWith('/lancing') || location.startsWith('/admin-lancing');

  return (
    <>
      <RouteSEO />
      {!isLandingPage && !isLancingPage && !isCollabPage && (
        <TopNav />
      )}
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/marketplace" component={HomePage} />
          <Route path="/product/:id" component={ProductDetailPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <ProtectedRoute path="/cart" component={CartPage} />
          <ProtectedRoute path="/checkout" component={CheckoutPage} />
          <ProtectedRoute path="/sell" component={EnhancedSellPage} />
          <ProtectedRoute path="/seller-listings" component={SellerListings} />
          <ProtectedRoute path="/orders" component={OrdersPage} />
          <ProtectedRoute path="/achievements" component={AchievementsPage} />
          <ProtectedRoute path="/admin" component={AdminDashboard} />
          <ProtectedRoute path="/database-monitor" component={DatabaseMonitor} />
          <Route path="/about" component={AboutPage} />
          <Route path="/policies" component={PoliciesPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/disclaimer" component={DisclaimerPage} />
          <Route path="/payment-success" component={PaymentSuccessPage} />
          <Route path="/payment-failure" component={PaymentFailurePage} />
          <Route path="/browse" component={BrowsePage} />
          <ProtectedRoute path="/buyer-requests" component={BuyerRequestsPage} />
          <Route path="/student-collab" component={CollabRoutes} />
          <Route path="/collab" component={CollabRoutes} />
          <Route path="/collab-messages/:chatId?" component={CollabRoutes} />
          <Route path="/collab-org-selector" component={CollabRoutes} />
          <Route path="/collab-student-builder" component={CollabRoutes} />
          <Route path="/collab-org-profile" component={CollabRoutes} />
          <Route path="/collab-org-profile-view" component={CollabRoutes} />
          <Route path="/collab-profile/:uid?" component={CollabRoutes} />
          <Route path="/collab-student-profile-builder" component={CollabRoutes} />
          <Route path="/collab-matching" component={CollabRoutes} />
          <Route path="/collab-search" component={CollabRoutes} />
          <Route path="/collab-post-create" component={CollabRoutes} />
          <Route path="/collab-post-direct" component={CollabRoutes} />
          <Route path="/collab-post-group" component={CollabRoutes} />
          <Route path="/collab-post-event" component={CollabRoutes} />
          <Route path="/collab-group-management" component={CollabRoutes} />
          <Route path="/collab-groups/:groupId" component={CollabRoutes} />
          <Route path="/collab-notifications" component={CollabRoutes} />
          <Route path="/collab-arena" component={CollabRoutes} />
          <Route path="/collab-arena/info" component={CollabRoutes} />
          <Route path="/collab-arena/register" component={CollabRoutes} />
          <Route path="/collab-arena/payment" component={CollabRoutes} />
          <Route path="/collab-arena/admin" component={CollabRoutes} />
          <Route path="/collab-arena/results" component={CollabRoutes} />
          <Route path="/collab-arena-submit" component={CollabRoutes} />
          <Route path="/nat-conf-2026" component={CollabRoutes} />
          <Route path="/nat-conf-register" component={CollabRoutes} />
          <Route path="/nat-conf-admin" component={CollabRoutes} />
          <Route path="/hastech-2026" component={CollabRoutes} />
          <Route path="/hastech-register" component={CollabRoutes} />
          <Route path="/hastech-admin" component={CollabRoutes} />
          <Route path="/netx-2026" component={CollabRoutes} />
          <Route path="/netx" component={CollabRoutes} />
          <Route path="/netx-register" component={CollabRoutes} />
          <Route path="/netx-admin" component={CollabRoutes} />
          <Route path="/statetech-2026" component={CollabRoutes} />
          <Route path="/statetech-2026/register" component={CollabRoutes} />
          <Route path="/statetech-2026/payment" component={CollabRoutes} />
          <Route path="/statetech-2026/status" component={CollabRoutes} />
          <Route path="/statetech-2026/admin" component={CollabRoutes} />
          <Route path="/collab-admin" component={CollabRoutes} />
          <Route path="/elections" component={CollabRoutes} />
          <Route path="/collab-:rest*" component={CollabRoutes} />
          <Route path="/student-lancing" component={LancingRouter} />
          <Route path="/lancing/:rest*" component={LancingRouter} />
          <Route path="/admin-lancing" component={LancingRouter} />
          <Route path="/competitions" component={CompetitionsPage} />
          <Route path="/competitions-admin" component={CompetitionsAdmin} />
          <Route path="/profiles/:id" component={ProfilePage} />
          <Route path="/seo-dashboard" component={SEODashboard} />
          <Route path="/clear-cache" component={ClearCachePage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {!isLandingPage && !isCollabPage && !isLancingPage && (
        <MobileNav />
      )}
      {isCollabPage && (
        <CollabMobileNav />
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      initGA();
    }
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CollabAuthProvider>
            <CartProvider>
              <Router />
              <Toaster />
            </CartProvider>
          </CollabAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
