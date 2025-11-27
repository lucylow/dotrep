import { Suspense, lazy, ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EnhancedThemeProvider } from "./contexts/EnhancedThemeContext";
import { PageLoader } from "./components/ui/PageLoader";
import { AppLayout } from "./components/layout/AppLayout";

// Lazy load all pages for code splitting
const LandingPageLovable = lazy(() => import("./pages/LandingPageLovable"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const ReputationPage = lazy(() => import("./pages/ReputationPage"));
const DashboardImproved = lazy(() => import("./pages/DashboardImproved"));
const EnhancedDashboard = lazy(() => import("./pages/EnhancedDashboard"));
const ConnectPage = lazy(() => import("./pages/ConnectPage"));
const ProofExplorerPage = lazy(() => import("./pages/ProofExplorerPage"));
const SbtMintPage = lazy(() => import("./pages/SbtMintPage"));
const TelemetryPage = lazy(() => import("./pages/TelemetryPage"));
const GovernancePage = lazy(() => import("./pages/GovernancePage"));
const XcmGatewayPage = lazy(() => import("./pages/XcmGatewayPage"));
const IdentityPage = lazy(() => import("./pages/IdentityPage"));
const NftGalleryPage = lazy(() => import("./pages/NftGalleryPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const ContributorProfilePage = lazy(() => import("./pages/ContributorProfilePage"));
const AnchorExplorerPage = lazy(() => import("./pages/AnchorExplorerPage"));
const ChainInfoPage = lazy(() => import("./pages/ChainInfoPage"));
const MultiChainReputationPage = lazy(() => import("./pages/MultiChainReputationPage"));
const ContextAwareReputationPage = lazy(() => import("./pages/ContextAwareReputationPage"));
const CloudVerificationPage = lazy(() => import("./pages/CloudVerificationPage"));
const CloudStoragePage = lazy(() => import("./pages/CloudStoragePage"));
const ReputationCalculatorPage = lazy(() => import("./pages/ReputationCalculatorPage"));
const MetricsPage = lazy(() => import("./pages/MetricsPage"));
const CommunityNotesPage = lazy(() => import("./pages/CommunityNotesPage"));
const TrustLayerPage = lazy(() => import("./pages/TrustLayerPage"));
const AgentDashboardPage = lazy(() => import("./pages/AgentDashboardPage"));
const DKGInteractionPage = lazy(() => import("./pages/DKGInteractionPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Helper component to wrap pages with layout (except landing page)
function PageWrapper({ children, useLayout = true }: { children: ReactNode; useLayout?: boolean }) {
  if (useLayout) {
    return <AppLayout>{children}</AppLayout>;
  }
  return <>{children}</>;
}

function Router() {
  // Complete page structure with Polkadot SDK integration:
  // 1. Landing (/) - Landing page
  // 2. Docs (/docs) - Documentation
  // 3. Reputation (/reputation) - Reputation system info
  // 4. Dashboard (/dashboard) - User dashboard
  // 5. Connect (/connect) - Wallet connection
  // 6. Proof Explorer (/proof-explorer) - Proof verification
  // 7. SBT Mint (/sbt-mint) - Soulbound token minting
  // 8. Telemetry (/telemetry) - Network telemetry
  // 9. Governance (/governance) - Governance proposals
  // 10. XCM Gateway (/xcm-gateway) - Cross-chain messaging
  // 11. Identity (/identity) - Identity management
  // 12. NFT Gallery (/nft-gallery) - NFT achievements
  // 13. Analytics (/analytics) - Analytics dashboard
  // 14. Leaderboard (/leaderboard) - Top contributors
  // 15. Contributor Profile (/contributor/:username) - Individual profiles
  // 16. Anchor Explorer (/anchors) - On-chain anchors
  // 17. Chain Info (/chain-info) - Chain information
  // 18. Multi-Chain Reputation (/multi-chain) - Cross-chain reputation
  return (
    <Switch>
      {/* Landing page - no layout */}
      <Route path={"/"}>
        <Suspense fallback={<PageLoader />}>
          <PageWrapper useLayout={false}>
            <LandingPageLovable />
          </PageWrapper>
        </Suspense>
      </Route>
      
      {/* All other pages - with layout */}
      <Route path="/docs">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <DocsPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/reputation">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <ReputationPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/dashboard">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <EnhancedDashboard />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/dashboard-old">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <DashboardImproved />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/connect">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <ConnectPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/proof-explorer">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <ProofExplorerPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/sbt-mint">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <SbtMintPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/telemetry">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <TelemetryPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/governance">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <GovernancePage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/xcm-gateway">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <XcmGatewayPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/identity">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <IdentityPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/nft-gallery">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <NftGalleryPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/analytics">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <AnalyticsPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/leaderboard">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <LeaderboardPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/contributor/:username">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <ContributorProfilePage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/anchors">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <AnchorExplorerPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/chain-info">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <ChainInfoPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/multi-chain">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <MultiChainReputationPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/context-aware">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <ContextAwareReputationPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/cloud-verification">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <CloudVerificationPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/cloud-storage">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <CloudStoragePage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/reputation-calculator">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <ReputationCalculatorPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/metrics">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <MetricsPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/community-notes">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <CommunityNotesPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/trust-layer">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <TrustLayerPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/agents">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <AgentDashboardPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path="/dkg-interaction">
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <DKGInteractionPage />
          </PageWrapper>
        </Suspense>
      </Route>
      <Route path={"/404"}>
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <NotFound />
          </PageWrapper>
        </Suspense>
      </Route>
      {/* Final fallback route */}
      <Route>
        <Suspense fallback={<PageLoader />}>
          <PageWrapper>
            <NotFound />
          </PageWrapper>
        </Suspense>
      </Route>
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <EnhancedThemeProvider>
        <ThemeProvider
          defaultTheme="light"
          // switchable
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </EnhancedThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
