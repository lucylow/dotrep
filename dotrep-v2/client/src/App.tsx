import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EnhancedThemeProvider } from "./contexts/EnhancedThemeContext";
import LandingPageLovable from "./pages/LandingPageLovable";
import DocsPage from "./pages/DocsPage";
import ReputationPage from "./pages/ReputationPage";
import DashboardImproved from "./pages/DashboardImproved";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import ConnectPage from "./pages/ConnectPage";
import ProofExplorerPage from "./pages/ProofExplorerPage";
import SbtMintPage from "./pages/SbtMintPage";
import TelemetryPage from "./pages/TelemetryPage";
import GovernancePage from "./pages/GovernancePage";
import XcmGatewayPage from "./pages/XcmGatewayPage";
import IdentityPage from "./pages/IdentityPage";
import NftGalleryPage from "./pages/NftGalleryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ContributorProfilePage from "./pages/ContributorProfilePage";
import AnchorExplorerPage from "./pages/AnchorExplorerPage";
import ChainInfoPage from "./pages/ChainInfoPage";
import MultiChainReputationPage from "./pages/MultiChainReputationPage";
import ContextAwareReputationPage from "./pages/ContextAwareReputationPage";
import CloudVerificationPage from "./pages/CloudVerificationPage";

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
      <Route path={"/"} component={LandingPageLovable} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/reputation" component={ReputationPage} />
      <Route path="/dashboard" component={EnhancedDashboard} />
      <Route path="/dashboard-old" component={DashboardImproved} />
      <Route path="/connect" component={ConnectPage} />
      <Route path="/proof-explorer" component={ProofExplorerPage} />
      <Route path="/sbt-mint" component={SbtMintPage} />
      <Route path="/telemetry" component={TelemetryPage} />
      <Route path="/governance" component={GovernancePage} />
      <Route path="/xcm-gateway" component={XcmGatewayPage} />
      <Route path="/identity" component={IdentityPage} />
      <Route path="/nft-gallery" component={NftGalleryPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/contributor/:username" component={ContributorProfilePage} />
      <Route path="/anchors" component={AnchorExplorerPage} />
      <Route path="/chain-info" component={ChainInfoPage} />
      <Route path="/multi-chain" component={MultiChainReputationPage} />
      <Route path="/context-aware" component={ContextAwareReputationPage} />
      <Route path="/cloud-verification" component={CloudVerificationPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
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
