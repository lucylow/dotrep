import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EnhancedThemeProvider } from "./contexts/EnhancedThemeContext";
import { PageLoader } from "./components/ui/PageLoader";

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
const NotFound = lazy(() => import("./pages/NotFound"));

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
      <Route path={"/"}>
        <Suspense fallback={<PageLoader />}>
          <LandingPageLovable />
        </Suspense>
      </Route>
      <Route path="/docs">
        <Suspense fallback={<PageLoader />}>
          <DocsPage />
        </Suspense>
      </Route>
      <Route path="/reputation">
        <Suspense fallback={<PageLoader />}>
          <ReputationPage />
        </Suspense>
      </Route>
      <Route path="/dashboard">
        <Suspense fallback={<PageLoader />}>
          <EnhancedDashboard />
        </Suspense>
      </Route>
      <Route path="/dashboard-old">
        <Suspense fallback={<PageLoader />}>
          <DashboardImproved />
        </Suspense>
      </Route>
      <Route path="/connect">
        <Suspense fallback={<PageLoader />}>
          <ConnectPage />
        </Suspense>
      </Route>
      <Route path="/proof-explorer">
        <Suspense fallback={<PageLoader />}>
          <ProofExplorerPage />
        </Suspense>
      </Route>
      <Route path="/sbt-mint">
        <Suspense fallback={<PageLoader />}>
          <SbtMintPage />
        </Suspense>
      </Route>
      <Route path="/telemetry">
        <Suspense fallback={<PageLoader />}>
          <TelemetryPage />
        </Suspense>
      </Route>
      <Route path="/governance">
        <Suspense fallback={<PageLoader />}>
          <GovernancePage />
        </Suspense>
      </Route>
      <Route path="/xcm-gateway">
        <Suspense fallback={<PageLoader />}>
          <XcmGatewayPage />
        </Suspense>
      </Route>
      <Route path="/identity">
        <Suspense fallback={<PageLoader />}>
          <IdentityPage />
        </Suspense>
      </Route>
      <Route path="/nft-gallery">
        <Suspense fallback={<PageLoader />}>
          <NftGalleryPage />
        </Suspense>
      </Route>
      <Route path="/analytics">
        <Suspense fallback={<PageLoader />}>
          <AnalyticsPage />
        </Suspense>
      </Route>
      <Route path="/leaderboard">
        <Suspense fallback={<PageLoader />}>
          <LeaderboardPage />
        </Suspense>
      </Route>
      <Route path="/contributor/:username">
        <Suspense fallback={<PageLoader />}>
          <ContributorProfilePage />
        </Suspense>
      </Route>
      <Route path="/anchors">
        <Suspense fallback={<PageLoader />}>
          <AnchorExplorerPage />
        </Suspense>
      </Route>
      <Route path="/chain-info">
        <Suspense fallback={<PageLoader />}>
          <ChainInfoPage />
        </Suspense>
      </Route>
      <Route path="/multi-chain">
        <Suspense fallback={<PageLoader />}>
          <MultiChainReputationPage />
        </Suspense>
      </Route>
      <Route path="/context-aware">
        <Suspense fallback={<PageLoader />}>
          <ContextAwareReputationPage />
        </Suspense>
      </Route>
      <Route path="/cloud-verification">
        <Suspense fallback={<PageLoader />}>
          <CloudVerificationPage />
        </Suspense>
      </Route>
      <Route path={"/404"}>
        <Suspense fallback={<PageLoader />}>
          <NotFound />
        </Suspense>
      </Route>
      {/* Final fallback route */}
      <Route>
        <Suspense fallback={<PageLoader />}>
          <NotFound />
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
